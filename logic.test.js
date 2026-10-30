import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, inA, inB, compileMove, reductionTrace } from './logic.js';

const words = [''];
for (let n = 1; n <= 7; n++) for (let i = 0; i < 2 ** n; i++) words.push(i.toString(2).padStart(n, '0'));
test('closure decisions agree with independent language characterizations, including ε', () => {
  for (const w of words) {
    assert.equal(evaluate('union',w).accepted, inA(w) || inB(w));
    assert.equal(evaluate('intersection',w).accepted, inA(w) && inB(w));
    assert.equal(evaluate('complement',w).accepted, !inA(w));
    // A* = {ε} ∪ A for this particular example language.
    assert.equal(evaluate('star',w).accepted, w === '' || w.endsWith('0'));
    // Independent reachable-prefix computation of A·B.
    let expected = false;
    for (let i=1;i<=w.length;i++) if (w[i-1]==='0' && [...w.slice(i)].filter(c=>c==='1').length%2===1) expected=true;
    const concat=evaluate('concatenation',w);
    assert.equal(concat.accepted,expected);
    assert.equal(concat.candidates.length,w.length+1);
    assert.equal(evaluate('star',w).candidates.length,w.length?2**(w.length-1):1);
  }
});
test('visualization rejects invalid alphabet and excessive input', () => {
  assert.throws(()=>evaluate('star','2'));
  assert.throws(()=>evaluate('star','0'.repeat(13)));
});
test('every macro preserves net displacement and all possible boundaries avoid LLL', () => {
  const delta=ms=>ms.reduce((sum,m)=>sum+(m==='R'?1:-1),0);
  for(const [move,offset] of [['L',-1],['R',1],['S',0]]) assert.equal(delta(compileMove(move)),offset);
  // A three-symbol forbidden pattern can span at most three nonempty macros.
  for(const a of ['L','R','S']) for(const b of ['L','R','S']) for(const c of ['L','R','S']) {
    for(const outcome of ['reject','loop']) assert.ok(!reductionTrace([a,b,c],outcome).moves.join('').includes('LLL'));
    const trace=reductionTrace([a,b,c],'accept');
    assert.ok(!trace.prefix.join('').includes('LLL'));
    assert.equal(trace.moves.join('').indexOf('LLL'),trace.prefix.length+1);
  }
});
test('initialization and return to origin are safe for all following macros',()=>{
  for(let n=0;n<20;n++) for(const move of ['L','R','S']) {
    const init=n===0?'':'R'.repeat(n)+'R'+'LRL'.repeat(n+1);
    assert.ok(!(init+compileMove(move).join('')).includes('LLL'));
    assert.equal([...init].reduce((p,m)=>p+(m==='R'?1:-1),0),0);
  }
});
