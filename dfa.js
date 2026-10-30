// Input validation makes malformed encodings a separate, explicit case.
export function validateDFA(a){
 if(!a||typeof a!=='object')throw new Error('Expected a DFA object.');
 if(!Array.isArray(a.states)||a.states.length<1||a.states.length>12||new Set(a.states).size!==a.states.length||a.states.some(s=>typeof s!=='string'||!s.length||s.length>24))throw new Error('Use 1–12 unique state names (up to 24 characters each).');
 if(!Array.isArray(a.alphabet)||a.alphabet.length<1||a.alphabet.length>6||new Set(a.alphabet).size!==a.alphabet.length||a.alphabet.some(s=>typeof s!=='string'||s.length!==1))throw new Error('Use 1–6 unique one-character alphabet symbols.');
 if(!a.states.includes(a.start)||!Array.isArray(a.accept)||new Set(a.accept).size!==a.accept.length||a.accept.some(s=>!a.states.includes(s)))throw new Error('Start and accepting states must belong to states.');
 if(!Array.isArray(a.transitions))throw new Error('transitions must be an array.');
 const seen=new Set();
 for(const t of a.transitions){
  if(!t||!a.states.includes(t.from)||!a.states.includes(t.to)||!a.alphabet.includes(t.symbol))throw new Error('Every transition needs a valid from, symbol, and to.');
  const key=JSON.stringify([t.from,t.symbol]);if(seen.has(key))throw new Error('Duplicate state/symbol pair: a DFA must be deterministic.');seen.add(key);
 }
 if(seen.size!==a.states.length*a.alphabet.length)throw new Error('The DFA must be total: give exactly one transition per state and alphabet symbol.');
 return a;
}
export function buildProduct(a){
 validateDFA(a);
 const id=(state,parity)=>JSON.stringify([state,parity]);
 const states=a.states.flatMap(state=>[0,1].map(parity=>({id:id(state,parity),state,parity,accepting:a.accept.includes(state)&&parity===1})));
 const transitions=a.transitions.flatMap(t=>[0,1].map(parity=>({from:id(t.from,parity),symbol:t.symbol,to:id(t.to,parity^(t.symbol==='1'?1:0))})));
 return {states,start:id(a.start,0),transitions};
}
// This exact generator drives the UI's breadth-first search and source view.
export function* decideMDFA(a){
 const product=buildProduct(a),queue=[product.start],visited=new Set(queue),parent=new Map();
 yield {at:'initialize',queue:[...queue],visited:[...visited],current:null};
 for(let index=0;index<queue.length;index++){
  const current=queue[index],state=product.states.find(s=>s.id===current);
  yield {at:'visit',current,queue:queue.slice(index+1),visited:[...visited]};
  if(state.accepting){
   let cursor=current,witness='';const path=[cursor];
   while(parent.has(cursor)){const edge=parent.get(cursor);witness=edge.symbol+witness;cursor=edge.from;path.unshift(cursor);}
   yield {at:'counterexample',current,decision:false,witness,path,visited:[...visited],queue:queue.slice(index+1)};return;
  }
  for(const edge of product.transitions.filter(t=>t.from===current)){
   const fresh=!visited.has(edge.to);
   if(fresh){visited.add(edge.to);parent.set(edge.to,edge);queue.push(edge.to);}
   yield {at:'edge',current,edge,fresh,queue:queue.slice(index+1),visited:[...visited]};
  }
 }
 yield {at:'empty',decision:true,current:null,queue:[],visited:[...visited]};
}
export function acceptsDFA(a,word){
 validateDFA(a);let state=a.start;
 for(const symbol of word){if(!a.alphabet.includes(symbol))return false;state=a.transitions.find(t=>t.from===state&&t.symbol===symbol).to;}
 return a.accept.includes(state);
}
// Check a finite certificate without relying on the BFS's order or event log.
export function verifyCertificate(a,certificate){
 try{
  const product=buildProduct(a);
  if(certificate?.decision===false)return typeof certificate.witness==='string'&&acceptsDFA(a,certificate.witness)&&[...certificate.witness].filter(s=>s==='1').length%2===1;
  if(certificate?.decision!==true||!Array.isArray(certificate.visited))return false;
  const reached=new Set(certificate.visited);
  return reached.has(product.start)&&[...reached].every(id=>product.states.some(s=>s.id===id&&!s.accepting))&&product.transitions.every(t=>!reached.has(t.from)||reached.has(t.to));
 }catch{return false;}
}
export const dfaPresets={
 safe:{states:['even','odd'],alphabet:['0','1'],start:'even',accept:['even'],transitions:[{from:'even',symbol:'0',to:'even'},{from:'even',symbol:'1',to:'odd'},{from:'odd',symbol:'0',to:'odd'},{from:'odd',symbol:'1',to:'even'}]},
 unsafe:{states:['last0','last1'],alphabet:['0','1'],start:'last0',accept:['last1'],transitions:[{from:'last0',symbol:'0',to:'last0'},{from:'last0',symbol:'1',to:'last1'},{from:'last1',symbol:'0',to:'last0'},{from:'last1',symbol:'1',to:'last1'}]},
 unreachable:{states:['start','unreachable'],alphabet:['0','1'],start:'start',accept:['unreachable'],transitions:[{from:'start',symbol:'0',to:'start'},{from:'start',symbol:'1',to:'start'},{from:'unreachable',symbol:'0',to:'unreachable'},{from:'unreachable',symbol:'1',to:'unreachable'}]}
};
