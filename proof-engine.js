import { compileMove } from './logic.js';

// The UI displays this exact generator, not separately maintained pseudocode.
export function* closureProgram(op, w, A, B) {
  if (op === 'complement') {
    const a = A(w); yield { at: 'call-a-complement', detail: `A(${w || 'ε'}) = ${a}` };
    yield { at: 'return-complement', accepted: !a }; return;
  }
  if (op === 'union' || op === 'intersection') {
    const a = A(w); yield { at: 'call-a', detail: `A(${w || 'ε'}) = ${a}` };
    const b = B(w); yield { at: 'call-b', detail: `B(${w || 'ε'}) = ${b}` };
    yield { at: 'return-boolean', accepted: op === 'union' ? a || b : a && b }; return;
  }
  if (op === 'concatenation') {
    for (let i = 0; i <= w.length; i++) {
      const parts = [w.slice(0, i), w.slice(i)];
      yield { at: 'split', parts, detail: `Try boundary ${i}` };
      const checks = [A(parts[0]), B(parts[1])];
      yield { at: 'check-split', parts, checks };
      if (checks.every(Boolean)) { yield { at: 'witness-concat', accepted: true, parts }; return; }
    }
  } else if (op === 'star') {
    if (w === '') { yield { at: 'empty-star', accepted: true, parts: [] }; return; }
    for (let mask = 0; mask < 2 ** (w.length - 1); mask++) {
      const parts = []; let start = 0;
      for (let i = 0; i < w.length - 1; i++) {
        if (mask & (1 << i)) { parts.push(w.slice(start, i + 1)); start = i + 1; }
      }
      parts.push(w.slice(start));
      yield { at: 'partition', parts, detail: `Partition mask ${mask}` };
      const checks = parts.map(A); yield { at: 'check-parts', parts, checks };
      if (checks.every(Boolean)) { yield { at: 'witness-star', accepted: true, parts }; return; }
    }
  } else { throw new Error('Unknown operation'); }
  yield { at: 'exhausted', accepted: false };
}

export function validateMachine(m) {
  if (!m || typeof m !== 'object') throw new Error('Expected a machine object.');
  if (!Array.isArray(m.alphabet) || m.alphabet.length < 1 || m.alphabet.length > 10 || new Set(m.alphabet).size !== m.alphabet.length || !m.alphabet.includes('_') || m.alphabet.some(s => typeof s !== 'string' || s.length !== 1)) throw new Error('alphabet must contain 1–10 unique one-character symbols, including _ (blank).');
  if (![m.start,m.accept,m.reject].every(s => typeof s === 'string' && s.length > 0 && s.length <= 40) || new Set([m.accept,m.reject]).size !== 2) throw new Error('Provide start, accept and reject state names; accept and reject must differ.');
  if (!Array.isArray(m.transitions) || m.transitions.length > 100) throw new Error('transitions must be an array of at most 100 rules.');
  const seen = new Set();
  for (const t of m.transitions) {
    if (!t || ![t.from,t.to].every(s => typeof s === 'string' && s.length > 0 && s.length <= 40) || !m.alphabet.includes(t.read) || !m.alphabet.includes(t.write) || !['L','R','S'].includes(t.move)) throw new Error('Each rule needs valid from, read, write, move (L/R/S), and to fields.');
    if ([m.accept,m.reject].includes(t.from)) throw new Error('Halting states cannot have outgoing rules.');
    const key = JSON.stringify([t.from,t.read]);
    if (seen.has(key)) throw new Error('The machine must be deterministic: duplicate state/symbol pair.');
    seen.add(key);
  }
  return m;
}

// Construct a finite transition table without running M or deciding its outcome.
export function compileReduction(machine, word) {
  const m = validateMachine(machine);
  if (typeof word !== 'string' || word.length > 32 || [...word].some(s => !m.alphabet.includes(s) || s === '_')) throw new Error('Input: at most 32 nonblank symbols from the alphabet.');
  const transitions = [];
  let serial = 0;
  const fresh = () => `n${serial++}`;
  const states = [...new Set([m.start,m.accept,m.reject,...m.transitions.flatMap(t => [t.from,t.to])])];
  const map = Object.fromEntries(states.map(s => [s,fresh()]));
  const accept = fresh(), reject = map[m.reject], start = fresh();
  const emit = (from,read,write,move,to,phase,row=null,complete=false) => transitions.push({from,read,write,move,to,phase,row,complete});
  // Every intermediate transition preserves the symbol it scans.
  const chain = (from, moves, to, phase, row=null) => {
    moves.forEach((move,i) => {
      const next = i === moves.length-1 ? to : fresh();
      for (const symbol of m.alphabet) emit(from,symbol,symbol,move,next,phase,row,i===moves.length-1);
      from = next;
    });
  };
  let current = start;
  for (const symbol of word) {
    const next = fresh();
    for (const read of m.alphabet) emit(current,read,symbol,'R',next,'initialize');
    current = next;
  }
  if (word.length) chain(current,['R',...Array.from({length:word.length+1},()=>['L','R','L']).flat()],map[m.start],'initialize');
  else chain(current,['R','L'],map[m.start],'initialize');
  m.transitions.forEach((t,row) => {
    const moves = compileMove(t.move);
    const next = moves.length === 1 ? map[t.to] : fresh();
    emit(map[t.from],t.read,t.write,moves[0],next,'simulate',row,moves.length===1);
    if (moves.length > 1) chain(next,moves.slice(1),map[t.to],'simulate',row);
  });
  // Missing source rules mean rejection, also in the compiled machine.
  for (const state of states.filter(s => s!==m.accept && s!==m.reject)) {
    for (const symbol of m.alphabet) if (!m.transitions.some(t => t.from===state && t.read===symbol)) emit(map[state],symbol,symbol,'R',reject,'reject');
  }
  chain(map[m.accept],['R','L','L','L'],accept,'signal');
  return { alphabet:[...m.alphabet],start,accept,reject,transitions,stateMap:map,word };
}

export function createConfiguration(m, word='') {
  return {state:m.start,head:0,tape:new Map([...word].map((s,i)=>[i,s]).filter(([,s])=>s!=='_')),moves:'',steps:0};
}
export function stepMachine(m,c) {
  if (c.state===m.accept || c.state===m.reject) return null;
  const read=c.tape.get(c.head)||'_';
  const rule=m.transitions.find(t=>t.from===c.state && t.read===read);
  if (!rule) {c.state=m.reject;return {phase:'reject',missing:true};}
  if(rule.write==='_') c.tape.delete(c.head); else c.tape.set(c.head,rule.write);
  c.head+=rule.move==='R'?1:rule.move==='L'?-1:0;
  c.state=rule.to;c.moves+=rule.move;c.steps++;
  return rule;
}
export function sameTape(a,b) {
  return a.size===b.size && [...a].every(([position,symbol])=>b.get(position)===symbol);
}
export const presets = {
  accept: {alphabet:['0','1','_'],start:'q0',accept:'accept',reject:'reject',transitions:[{from:'q0',read:'1',write:'0',move:'L',to:'q1'},{from:'q1',read:'_',write:'1',move:'L',to:'q2'},{from:'q2',read:'_',write:'_',move:'L',to:'accept'}]},
  reject: {alphabet:['0','1','_'],start:'q0',accept:'accept',reject:'reject',transitions:[{from:'q0',read:'1',write:'0',move:'S',to:'reject'}]},
  loop: {alphabet:['0','1','_'],start:'q0',accept:'accept',reject:'reject',transitions:['0','1','_'].map(read=>({from:'q0',read,write:read,move:'R',to:'q0'}))}
};
