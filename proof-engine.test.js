import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, inA, inB } from './logic.js';
import { closureProgram, validateMachine, compileReduction, createConfiguration, stepMachine, sameTape, presets } from './proof-engine.js';

const predicates=[inA,inB,w=>w.length%2===0,w=>w==='',w=>true,w=>false];
const words=[''];
for(let n=1;n<=5;n++)for(let i=0;i<2**n;i++)words.push(i.toString(2).padStart(n,'0'));
test('executable generator agrees with closure evaluator for every short word and operation',()=>{
 for(const w of words)for(const op of ['union','intersection','complement','concatenation','star']){
  const events=[...closureProgram(op,w,inA,inB)];
  assert.equal(events.at(-1).accepted,evaluate(op,w).accepted);
  if(events.at(-1).accepted&&events.at(-1).parts){
   assert.equal(events.at(-1).parts.join(''),w);
  }
 }
});
test('generator accepts arbitrary total deciders, including languages containing ε',()=>{
 for(const A of predicates)for(const B of predicates)for(const w of words.slice(0,15)){
  const concat=[...closureProgram('concatenation',w,A,B)].at(-1);
  const expected=Array.from({length:w.length+1},(_,i)=>A(w.slice(0,i))&&B(w.slice(i))).some(Boolean);
  assert.equal(concat.accepted,expected);
  // Independent dynamic programming characterization of A*.
  const reachable=Array(w.length+1).fill(false);reachable[0]=true;
  for(let end=1;end<=w.length;end++)for(let begin=0;begin<end;begin++) if(reachable[begin]&&A(w.slice(begin,end)))reachable[end]=true;
  assert.equal([...closureProgram('star',w,A,B)].at(-1).accepted,reachable[w.length]);
 }
});
function runPair(m,w,budget=250){
 const n=compileReduction(m,w),source=createConfiguration(m,w),compiled=createConfiguration(n);
 let signals=0,boundaries=0;
 for(let i=0;i<budget&&compiled.state!==n.accept&&compiled.state!==n.reject;i++){
  const rule=stepMachine(n,compiled);assert.ok(rule&&!rule.missing,'compiled machine has an explicit rule');
  if(rule.phase==='simulate'&&rule.complete)stepMachine(m,source);
  if(rule.phase==='reject')stepMachine(m,source);
  if(rule.phase==='signal'){signals++;assert.equal(source.state,m.accept);}
  else assert.ok(!compiled.moves.includes('LLL'),'no accidental signal');
  if((rule.phase==='initialize'||rule.phase==='simulate')&&rule.complete){
   boundaries++;assert.equal(compiled.head,source.head);assert.ok(sameTape(compiled.tape,source.tape));assert.equal(compiled.state,n.stateMap[source.state]);
  }
 }
 return {n,source,compiled,signals,boundaries};
}
test('compiled presets execute real writes, left moves, stationary moves and nonhalting prefixes',()=>{
 const yes=runPair(presets.accept,'1');assert.equal(yes.compiled.state,yes.n.accept);assert.ok(yes.source.moves.includes('LLL'));assert.ok(yes.compiled.moves.endsWith('RLLL'));assert.equal(yes.signals,4);
 const no=runPair(presets.reject,'1');assert.equal(no.compiled.state,no.n.reject);assert.equal(no.signals,0);
 const loop=runPair(presets.loop,'1');assert.notEqual(loop.compiled.state,loop.n.accept);assert.notEqual(loop.compiled.state,loop.n.reject);assert.equal(loop.compiled.steps,250);
});
test('initialization copies every short word and maps initially halting machines correctly',()=>{
 for(const w of words){
  const m={alphabet:['0','1','_'],start:'accept',accept:'accept',reject:'reject',transitions:[]};
  const r=runPair(m,w);assert.equal(r.compiled.state,r.n.accept);assert.equal(r.boundaries,1);assert.equal(r.signals,4);
  m.start='reject';const no=runPair(m,w);assert.equal(no.compiled.state,no.n.reject);assert.equal(no.signals,0);
 }
});
test('all pairs of source moves and write symbols preserve full configurations at boundaries',()=>{
 for(const a of ['L','R','S'])for(const b of ['L','R','S'])for(const write of ['0','1','_']){
  const m={alphabet:['0','1','_'],start:'q0',accept:'yes',reject:'no',transitions:[]};
  for(const read of m.alphabet){m.transitions.push({from:'q0',read,write,move:a,to:'q1'});m.transitions.push({from:'q1',read,write,move:b,to:'yes'});}
  const r=runPair(m,'10');assert.equal(r.compiled.state,r.n.accept);assert.equal(r.boundaries,3);
 }
});
test('missing transitions reject, generated transitions are deterministic, and input is validated',()=>{
 const m={alphabet:['0','1','_'],start:'q0',accept:'yes',reject:'no',transitions:[]};
 const r=runPair(m,'');assert.equal(r.compiled.state,r.n.reject);
 const keys=r.n.transitions.map(t=>JSON.stringify([t.from,t.read]));assert.equal(new Set(keys).size,keys.length);
 assert.throws(()=>compileReduction(m,'2'));assert.throws(()=>compileReduction(m,'_'));assert.throws(()=>compileReduction(m,'1'.repeat(33)));
 assert.throws(()=>validateMachine({...m,transitions:[{from:'q0',read:'_',write:'_',move:'Z',to:'yes'}]}));
 const rule={from:'q0',read:'_',write:'_',move:'L',to:'yes'};assert.throws(()=>validateMachine({...m,transitions:[rule,rule]}));
});
