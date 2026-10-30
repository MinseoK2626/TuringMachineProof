import { createConfiguration, stepMachine } from './proof-engine.js';

// Construct explicit transition tables for each language recognizer.
export function buildMachine(task) {
  const transitions=[];
  const add=(from,read,write,move,to)=>transitions.push({from,read,write,move,to});
  const scan=(state,symbols,move,to=state)=>{for(const s of symbols)add(state,s,s,move,to);};
  const alphabet=['0','1','X','_'];
  if(task==='balance'){
    scan('choose',['X'],'R');add('choose','_','_','S','accept');
    for(const symbol of ['0','1']){
      const opposite=symbol==='0'?'1':'0';
      add('choose',symbol,'X','R',`find${opposite}`);
      scan(`find${opposite}`,[symbol,'X'],'R');
      add(`find${opposite}`,opposite,'X','L','rewind');
      add(`find${opposite}`,'_','_','S','reject');
    }
    scan('rewind',['0','1','X'],'L');add('rewind','_','_','R','choose');
    return {alphabet,start:'choose',accept:'accept',reject:'reject',transitions};
  }
  if(task==='parity' || task==='sorted'){
    const rules=task==='parity'
      ? [['even','0','even'],['even','1','odd'],['odd','0','odd'],['odd','1','even']]
      : [['zeros','0','zeros'],['zeros','1','ones'],['ones','1','ones'],['ones','0','reject']];
    for(const [from,symbol,to] of rules)add(from,symbol,symbol,'R',to);
    const states=task==='parity'?['even','odd']:['zeros','ones'];
    for(const state of states)add(state,'_','_','S',task==='parity'&&state==='odd'?'reject':'accept');
    return {alphabet,start:states[0],accept:'accept',reject:'reject',transitions};
  }
  if(task==='palindrome'){
    scan('choose',['X'],'R');add('choose','_','_','S','accept');
    for(const symbol of ['0','1']){
      add('choose',symbol,'X','R',`end${symbol}`);
      scan(`end${symbol}`,['0','1','X'],'R');add(`end${symbol}`,'_','_','L',`match${symbol}`);
      scan(`match${symbol}`,['X'],'L');add(`match${symbol}`,symbol,'X','L','rewind');
      const opposite=symbol==='0'?'1':'0';add(`match${symbol}`,opposite,opposite,'S','reject');
      add(`match${symbol}`,'_','_','S','accept');
    }
    scan('rewind',['0','1','X'],'L');add('rewind','_','_','R','choose');
    return {alphabet,start:'choose',accept:'accept',reject:'reject',transitions};
  }
  if(task!=='copy')throw new Error('Unknown experiment');
  alphabet.push('#');
  scan('validateLeft',['0','1'],'R');add('validateLeft','#','#','R','validateRight');add('validateLeft','_','_','S','reject');
  scan('validateRight',['0','1'],'R');add('validateRight','#','#','S','reject');add('validateRight','_','_','L','rewind');
  scan('rewind',['0','1','X','#'],'L');add('rewind','_','_','R','choose');
  scan('choose',['X'],'R');add('choose','#','#','R','verifyTail');
  for(const symbol of ['0','1']){
    add('choose',symbol,'X','R',`seekHash${symbol}`);
    scan(`seekHash${symbol}`,['0','1','X'],'R');add(`seekHash${symbol}`,'#','#','R',`match${symbol}`);
    scan(`match${symbol}`,['X'],'R');add(`match${symbol}`,symbol,'X','L','rewind');
    for(const bad of ['0','1','_'].filter(s=>s!==symbol))add(`match${symbol}`,bad,bad,'S','reject');
  }
  scan('verifyTail',['X'],'R');add('verifyTail','_','_','S','accept');
  for(const bad of ['0','1'])add('verifyTail',bad,bad,'S','reject');
  return {alphabet,start:'validateLeft',accept:'accept',reject:'reject',transitions};
}

// Independent, direct predicates provide labels; they do not use TM states.
export function oracle(task,word){
  if(task==='balance')return /^[01]*$/.test(word)&&[...word].filter(c=>c==='0').length===[...word].filter(c=>c==='1').length;
  if(task==='palindrome')return /^[01]*$/.test(word)&&word===[...word].reverse().join('');
  if(task==='parity')return /^[01]*$/.test(word)&&[...word].filter(c=>c==='1').length%2===0;
  if(task==='sorted')return /^0*1*$/.test(word);
  if(task==='copy'){
    if(!/^[01]*#[01]*$/.test(word))return false;
    const [left,right]=word.split('#');return left===right;
  }
  throw new Error('Unknown experiment');
}
export function enumerateWords(alphabet,maxLength){
  const words=[''];let level=[''];
  for(let n=1;n<=maxLength;n++){level=level.flatMap(w=>alphabet.map(s=>w+s));words.push(...level);}
  return words;
}
export function measureWord(machine,word,budget=10000){
  const c=createConfiguration(machine,word);
  let left=0,right=0,stationary=0,writes=0,min=0,max=Math.max(0,word.length-1);
  while(c.state!==machine.accept&&c.state!==machine.reject&&c.steps<budget){
    const read=c.tape.get(c.head)||'_';const t=stepMachine(machine,c);
    if(t?.missing)break;
    if(t.move==='L')left++;else if(t.move==='R')right++;else stationary++;
    if(t.write!==read)writes++;
    min=Math.min(min,c.head);max=Math.max(max,c.head);
  }
  const halted=c.state===machine.accept||c.state===machine.reject;
  return {word,length:word.length,outcome:halted?(c.state===machine.accept?'accept':'reject'):'unknown',steps:c.steps,left,right,stationary,writes,span:max-min+1};
}
export function runExperiment(task,maxLength,budget=10000){
  if(!Number.isInteger(maxLength)||maxLength<0||maxLength>7)throw new Error('Choose an integer maximum length from 0 to 7.');
  if(![25,100,1000,10000].includes(budget))throw new Error('Unsupported execution budget.');
  const alphabet=task==='copy'?['0','1','#']:['0','1'];
  const machine=buildMachine(task);
  const rows=enumerateWords(alphabet,maxLength).map(word=>{
    const r=measureWord(machine,word,budget),expected=oracle(task,word);
    return {...r,expected,agrees:r.outcome==='unknown'?false:(r.outcome==='accept')===expected};
  });
  const summary=summarizeRows(rows,maxLength).map(s=>({...s,accepted:rows.filter(r=>r.length===s.length&&r.outcome==='accept').length}));
  return {task,maxLength,budget,alphabet,machine,rows,summary,mismatches:rows.filter(r=>r.outcome!=='unknown'&&!r.agrees).length,unknown:rows.filter(r=>r.outcome==='unknown').length};
}
export function experimentCSV(result){
  const fields=['word','length','outcome','expected','agrees','steps','left','right','stationary','writes','span'];
  const quote=value=>'"'+String(value).replaceAll('"','""')+'"';
  return fields.join(',')+'\n'+result.rows.map(r=>fields.map(k=>quote(r[k])).join(',')).join('\n')+'\n';
}

export function summarizeRows(rows,maxLength,metric='steps',outcome='all'){
  if(!['steps','left','right','writes','span'].includes(metric))throw new Error('Unknown metric');
  return Array.from({length:maxLength+1},(_,length)=>{
    const group=rows.filter(r=>r.length===length&&r.outcome!=='unknown'&&(outcome==='all'||r.outcome===outcome));
    const values=group.map(r=>r[metric]).sort((a,b)=>a-b);
    return {length,count:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,median:values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:null,max:values.length?values.at(-1):null};
  });
}
