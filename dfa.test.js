import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDFA, buildProduct, decideMDFA, acceptsDFA, verifyCertificate, dfaPresets } from './dfa.js';
import { enumerateWords } from './experiments.js';
const decision=a=>[...decideMDFA(a)].at(-1);
test('product decisions and shortest witnesses agree with brute-force bounds for every binary two-state DFA',()=>{
 for(let bits=0;bits<16;bits++)for(let mask=0;mask<4;mask++)for(let start=0;start<2;start++){
  const a={states:['p','q'],alphabet:['0','1'],start:['p','q'][start],accept:['p','q'].filter((_,i)=>mask&(1<<i)),transitions:[]};
  let i=0;for(const from of a.states)for(const symbol of a.alphabet)a.transitions.push({from,symbol,to:a.states[(bits>>i++)&1]});
  const result=decision(a),words=enumerateWords(a.alphabet,3),bad=words.find(w=>acceptsDFA(a,w)&&[...w].filter(c=>c==='1').length%2===1);
  assert.equal(result.decision,bad===undefined);assert.ok(verifyCertificate(a,result));
  if(bad!==undefined){assert.equal(result.witness,bad);assert.ok(result.witness.length<2*a.states.length);}
  else{assert.ok(result.visited.length<=2*a.states.length);}
 }
});
test('presets, unreachable acceptance, epsilon, and alphabets without the symbol 1',()=>{
 assert.equal(decision(dfaPresets.safe).decision,true);
 assert.equal(decision(dfaPresets.unsafe).witness,'1');
 const un=decision(dfaPresets.unreachable);assert.equal(un.decision,true);assert.equal(un.visited.length,2);
 const unary={states:['s'],alphabet:['a'],start:'s',accept:['s'],transitions:[{from:'s',symbol:'a',to:'s'}]};assert.equal(acceptsDFA(unary,''),true);assert.equal(decision(unary).decision,true);
 const alphabet={states:['s'],alphabet:['a','1'],start:'s',accept:['s'],transitions:[{from:'s',symbol:'a',to:'s'},{from:'s',symbol:'1',to:'s'}]};assert.equal(decision(alphabet).witness,'1');
});
test('finite certificates reject tampered closed sets and invalid witnesses',()=>{
 const good=decision(dfaPresets.safe);assert.ok(verifyCertificate(dfaPresets.safe,good));
 assert.equal(verifyCertificate(dfaPresets.safe,{decision:true,visited:[JSON.stringify(['even',0])]}),false);
 assert.equal(verifyCertificate(dfaPresets.safe,{decision:true,visited:[...good.visited,'bogus']}),false);
 assert.equal(verifyCertificate(dfaPresets.unsafe,{decision:false,witness:'11'}),false);
 assert.equal(verifyCertificate(dfaPresets.unsafe,{decision:false,witness:'1'}),true);
});
test('product contains exactly twice the states and transitions; malformed descriptions are rejected',()=>{
 const p=buildProduct(dfaPresets.safe);assert.equal(p.states.length,4);assert.equal(p.transitions.length,8);
 assert.throws(()=>validateDFA({...dfaPresets.safe,transitions:dfaPresets.safe.transitions.slice(1)}));
 assert.throws(()=>validateDFA({...dfaPresets.safe,transitions:[...dfaPresets.safe.transitions,dfaPresets.safe.transitions[0]]}));
 assert.throws(()=>validateDFA({...dfaPresets.safe,accept:['missing']}));
 assert.throws(()=>validateDFA({...dfaPresets.safe,states:['even','even']}));
});
