import { evaluate } from './logic.js';
const $ = s => document.querySelector(s);
const display = w => w || 'ε';
const meta = {
  union: ['A ∪ B', 'Accept if either decider accepts.', 'Run deciders Dₐ and Dᵦ in sequence. Accept if either accepts; reject if both reject. Both deciders halt on every input, so the constructed machine always halts.'],
  intersection: ['A ∩ B', 'Accept only if both deciders accept.', 'Run Dₐ and Dᵦ. Accept exactly when both accept; otherwise reject. Both halt on every input, so this procedure always reaches a decision.'],
  complement: ['Σ* ∖ A', 'Same alphabet. Opposite decision.', 'Run Dₐ and swap acceptance with rejection. Since Dₐ halts on every input, the new machine is also a decider. This argument does not work for an arbitrary recognizer, which may run forever.'],
  concatenation: ['A · B', 'Try every possible split.', 'For a word w of length n, check all n+1 splits w = xy. Accept if Dₐ(x) and Dᵦ(y) both accept for some split; otherwise reject. There are finitely many splits, and each decider always halts, so the procedure terminates. Either piece may be ε.'],
  star: ['A*', 'A finite sequence of words from A.', 'Accept ε immediately as a concatenation of zero words. Otherwise, check every partition into nonempty pieces. Accept if Dₐ accepts every piece of some partition; reject if none works. For length n ≥ 1 there are only 2ⁿ⁻¹ partitions, so the procedure halts. Even if ε ∈ A, empty pieces can be removed without losing a valid decomposition.']
};
let op = 'union';
function render() {
  $('#operation-title').textContent = meta[op][0];
  $('#operation-description').textContent = meta[op][1];
  $('#proof-text').textContent = meta[op][2];
  $('#definition-b').hidden = ['star','complement'].includes(op);
  $('#word-error').textContent = '';
  let r;
  try { r = evaluate(op, $('#word').value); }
  catch(e) { $('#word-error').textContent = e.message; $('#result').replaceChildren(); return; }
  const result = $('#result'); result.replaceChildren();
  if ('a' in r) {
    const flow = document.createElement('div'); flow.className = 'decider-flow';
    const labels = op === 'complement' ? [['Dₐ',r.a]] : [['Dₐ',r.a],['Dᵦ',r.b]];
    labels.forEach(([label, accepted]) => {const el = document.createElement('div');el.className = 'decider';el.innerHTML = `<span>${label}</span><b class="${accepted?'yes':'no'}">${accepted?'ACCEPT':'REJECT'}</b>`;flow.append(el);});
    result.append(flow);
  } else {
    const title = document.createElement('p'); title.className = 'candidate-heading'; title.textContent = `${r.candidates.length} ${op === 'star' ? 'partitions' : 'splits'} checked · ${r.candidates.filter(c=>c.valid).length} successful`;
    result.append(title);
    const list = document.createElement('div'); list.className = 'candidates';
    // Show a successful witness first, while still evaluating every candidate.
    const sorted = [...r.candidates].sort((a,b)=>Number(b.valid)-Number(a.valid));
    sorted.slice(0, 24).forEach(c => {const row=document.createElement('div');row.className='candidate '+(c.valid?'valid':'');const parts=document.createElement('span');parts.textContent=c.parts.length?c.parts.map((p,i)=>`${display(p)} ${c.checks[i]?'✓':'×'}`).join('  |  '):'ε · zero pieces';const verdict=document.createElement('b');verdict.textContent=c.valid?'✓':'×';row.append(parts,verdict);list.append(row);});
    result.append(list);
    if(sorted.length>24){const note=document.createElement('small');note.textContent=`All ${sorted.length} candidates were evaluated. Showing the first 24.`;result.append(note);}
  }
  const verdict = document.createElement('div');verdict.className='verdict '+(r.accepted?'accepted':'rejected');verdict.innerHTML=`<span>${r.accepted?'✓ ACCEPTED':'× REJECTED'}</span><span>${display($('#word').value)} ${r.accepted?'∈':'∉'} ${meta[op][0]}</span>`;result.append(verdict);
}
document.querySelectorAll('[data-op]').forEach(button=>button.addEventListener('click',()=>{
  op=button.dataset.op;document.querySelectorAll('[data-op]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();
}));
$('#word-form').addEventListener('submit',e=>{e.preventDefault();render();});
render();

document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
  $('#quiz-feedback').textContent=b.dataset.answer==='right'?'Correct. LLL could occur later. Not observing it during a finite execution does not prove it will never occur.':'Try again. LLL could first appear after step 1,000. There is no fixed observation bound that settles every instance.';
}));

import './workshop.js';
