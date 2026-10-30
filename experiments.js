import { createConfiguration, stepMachine } from './proof-engine.js';

// Implementation-level descriptions from homework Q1, compiled into explicit rules.
export function courseMachine(task) {
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
  if(task!=='copy')throw new Error('Unknown course task');
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
  if(task==='copy'){
    if(!/^[01]*#[01]*$/.test(word))return false;
    const [left,right]=word.split('#');return left===right;
  }
  throw new Error('Unknown course task');
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
export function runExperiment(task,maxLength){
  if(!Number.isInteger(maxLength)||maxLength<0||maxLength>7)throw new Error('Choose an integer maximum length from 0 to 7.');
  const alphabet=task==='balance'?['0','1']:['0','1','#'];
  const machine=courseMachine(task);
  const rows=enumerateWords(alphabet,maxLength).map(word=>{
    const r=measureWord(machine,word),expected=oracle(task,word);
    return {...r,expected,agrees:r.outcome==='unknown'?false:(r.outcome==='accept')===expected};
  });
  const summary=Array.from({length:maxLength+1},(_,n)=>{
    const group=rows.filter(r=>r.length===n);const sorted=group.map(r=>r.steps).sort((a,b)=>a-b);
    return {length:n,count:group.length,accepted:group.filter(r=>r.outcome==='accept').length,mean:group.reduce((s,r)=>s+r.steps,0)/group.length,median:(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2,max:sorted.at(-1)};
  });
  return {task,maxLength,alphabet,machine,rows,summary,mismatches:rows.filter(r=>r.outcome!=='unknown'&&!r.agrees).length,unknown:rows.filter(r=>r.outcome==='unknown').length};
}
export function experimentCSV(result){
  const fields=['word','length','outcome','expected','agrees','steps','left','right','stationary','writes','span'];
  const quote=value=>'"'+String(value).replaceAll('"','""')+'"';
  return fields.join(',')+'\n'+result.rows.map(r=>fields.map(k=>quote(r[k])).join(',')).join('\n')+'\n';
}
