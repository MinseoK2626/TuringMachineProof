// Total example deciders over Σ = {0, 1}. Every computation below terminates.
export const inA = w => /^[01]*$/.test(w) && w.endsWith('0');
export const inB = w => /^[01]*$/.test(w) && [...w].filter(c => c === '1').length % 2 === 1;
export function evaluate(op, w) {
  if (!/^[01]*$/.test(w)) throw new Error('Σ = {0, 1}: please enter only 0s and 1s.');
  if (w.length > 12) throw new Error('The visualization supports words of at most 12 symbols.');
  const a = inA(w), b = inB(w);
  if (['union', 'intersection', 'complement'].includes(op)) {
    return { accepted: op === 'union' ? a || b : op === 'intersection' ? a && b : !a, a, b };
  }
  if (op === 'concatenation') {
    const candidates = Array.from({ length: w.length + 1 }, (_, i) => {
      const left = w.slice(0, i), right = w.slice(i);
      return { parts: [left, right], checks: [inA(left), inB(right)], valid: inA(left) && inB(right) };
    });
    return { accepted: candidates.some(c => c.valid), candidates };
  }
  if (op !== 'star') throw new Error('Unknown operation');
  if (!w.length) return { accepted: true, candidates: [{ parts: [], checks: [], valid: true }] };
  const candidates = [];
  for (let mask = 0; mask < 2 ** (w.length - 1); mask++) {
    const parts = []; let start = 0;
    for (let i = 0; i < w.length - 1; i++) if (mask & (1 << i)) { parts.push(w.slice(start, i + 1)); start = i + 1; }
    parts.push(w.slice(start));
    candidates.push({ parts, checks: parts.map(inA), valid: parts.every(inA) });
  }
  return { accepted: candidates.some(c => c.valid), candidates };
}

// Each simulated move is compiled into a block with no LLL substring.
// A stationary move on a two-way infinite tape is implemented by RL.
export const compileMove = move => {
  if (!['L', 'R', 'S'].includes(move)) throw new Error('Unknown move');
  return move === 'L' ? ['L', 'R', 'L'] : move === 'S' ? ['R', 'L'] : ['R'];
};
export function reductionTrace(moves, outcome) {
  const prefix = moves.flatMap(compileMove);
  // LRL | LRL has LL at the join, but never LLL. S=RL also
  // ends in L, while every macro has at most one initial/final L.
  return { prefix, moves: outcome === 'accept' ? [...prefix, 'R', 'L', 'L', 'L'] : prefix, outcome };
}
