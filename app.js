import { evaluate, reductionTrace } from './logic.js';
const $ = s => document.querySelector(s);
const display = w => w || 'ε';
const meta = {
  union: ['A ∪ B', '둘 중 하나라도 받아들인다면.', '결정기 Dₐ, Dᵦ를 차례로 실행합니다. 하나라도 수락하면 수락하고, 둘 다 거부하면 거부합니다. 두 결정기가 항상 멈추므로 이 절차도 항상 멈춥니다.'],
  intersection: ['A ∩ B', '두 결정기가 모두 받아들인다면.', 'Dₐ와 Dᵦ를 실행하여 둘 다 수락할 때만 수락합니다. 둘 다 모든 입력에서 멈추므로 결과를 반드시 결정할 수 있습니다.'],
  complement: ['Σ* ∖ A', '같은 알파벳, 반대의 결정.', 'Dₐ를 실행하고 수락과 거부를 뒤집습니다. Dₐ는 모든 입력에서 멈추므로 뒤집힌 기계도 결정기입니다. 단순 인식기라면 비종료가 있을 수 있어 이 논증을 적용할 수 없습니다.'],
  concatenation: ['A · B', '가능한 모든 경계에서 나누어 본다면.', '길이 n인 w를 w = xy로 나누는 n+1개 경계를 모두 검사합니다. Dₐ(x)와 Dᵦ(y)가 둘 다 수락하는 경계가 있으면 수락합니다. 모든 경계가 실패하면 거부합니다. 유한한 경계와 항상 멈추는 결정기이므로 반드시 종료합니다. ε도 양쪽 조각으로 허용합니다.'],
  star: ['A*', '작은 문자열들의 유한한 연결.', 'w = ε이면 0개 조각의 연결로 즉시 수락합니다. 나머지는 비어 있지 않은 조각으로 나누는 모든 분할을 검사합니다. 각 조각을 Dₐ가 수락하는 분할이 있으면 수락하고, 없으면 거부합니다. 길이 n ≥ 1에서 분할은 2ⁿ⁻¹개뿐이므로 반드시 멈춥니다. ε ∈ A여도 빈 조각을 제거할 수 있어 빠지는 경우가 없습니다.']
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
    const title = document.createElement('p'); title.className = 'candidate-heading'; title.textContent = `${r.candidates.length}개 ${op === 'star' ? '분할' : '경계'} 검사 · ${r.candidates.filter(c=>c.valid).length}개 성공`;
    result.append(title);
    const list = document.createElement('div'); list.className = 'candidates';
    // Show a successful witness first, while still evaluating every candidate.
    const sorted = [...r.candidates].sort((a,b)=>Number(b.valid)-Number(a.valid));
    sorted.slice(0, 24).forEach(c => {const row=document.createElement('div');row.className='candidate '+(c.valid?'valid':'');const parts=document.createElement('span');parts.textContent=c.parts.length?c.parts.map((p,i)=>`${display(p)} ${c.checks[i]?'✓':'×'}`).join('  |  '):'ε · 0개 조각';const verdict=document.createElement('b');verdict.textContent=c.valid?'✓':'×';row.append(parts,verdict);list.append(row);});
    result.append(list);
    if(sorted.length>24){const note=document.createElement('small');note.textContent=`전체 ${sorted.length}개를 계산했습니다. 화면에는 24개만 표시합니다.`;result.append(note);}
  }
  const verdict = document.createElement('div');verdict.className='verdict '+(r.accepted?'accepted':'rejected');verdict.innerHTML=`<span>${r.accepted?'✓ ACCEPTED':'× REJECTED'}</span><span>${display($('#word').value)} ${r.accepted?'∈':'∉'} ${meta[op][0]}</span>`;result.append(verdict);
}
document.querySelectorAll('[data-op]').forEach(button=>button.addEventListener('click',()=>{
  op=button.dataset.op;document.querySelectorAll('[data-op]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});render();
}));
$('#word-form').addEventListener('submit',e=>{e.preventDefault();render();});
render();

let step=0;
const examples={accept:['R','L','L','S','R'],reject:['R','L','L','S','R'],loop:Array.from({length:8},()=>['R','L']).flat()};
function traceRender(){
  const scenario=$('#scenario').value;
  const trace=reductionTrace(examples[scenario],scenario); const visible=trace.moves.slice(0,step);
  $('#trace-counter').textContent=`STEP ${step} / ${trace.moves.length}`;
  const moves=$('#move-trace');moves.replaceChildren();
  if(!step){const placeholder=document.createElement('span');placeholder.className='trace-placeholder';placeholder.textContent='한 단계를 실행해 이동을 관찰하세요.';moves.append(placeholder);}
  visible.forEach((m,i)=>{const el=document.createElement('span');el.textContent=m;el.className=i>=trace.prefix.length+1?'trigger':'';moves.append(el);});
  let head=visible.reduce((p,m)=>p+(m==='R'?1:-1),0);
  const tape=$('#machine-tape');tape.replaceChildren();
  for(let p=head-3;p<=head+3;p++){const cell=document.createElement('span');cell.textContent=p===0?'⊢':'□';cell.className=p===head?'active':'';cell.title=`cell ${p}`;tape.append(cell);}
  const done=step===trace.moves.length;
  const hit=visible.join('').includes('LLL');
  $('#trace-status').className=hit?'hit':'';
  $('#trace-status').textContent=hit?'✓ LLL 검출 — M의 수락에 의해 신호 발생':done?(scenario==='loop'?'예시 표시 한도 도달 · 실제 N은 시뮬레이션을 계속합니다.':'M 거부 → N 정지 · LLL 없음'):step>trace.prefix.length?'M 수락 → RLLL 신호 실행 중':'안전한 시뮬레이션 · 아직 LLL 없음';
  $('#step-trace').disabled=done;
}
$('#step-trace').addEventListener('click',()=>{step++;traceRender();});
$('#reset-trace').addEventListener('click',()=>{step=0;traceRender();});
$('#scenario').addEventListener('change',()=>{step=0;traceRender();});traceRender();
document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{
  $('#quiz-feedback').textContent=b.dataset.answer==='right'?'정답입니다. LLL은 나중에 발생할 수도 있습니다. 유한한 시간 동안 관찰하지 못했다는 사실은 영원히 발생하지 않는다는 증명이 아닙니다.':'다시 생각해 보세요. 1,001번째 이후에 LLL이 나타날 수도 있습니다. 관찰 시간의 상한이 없는 것이 핵심입니다.';
}));
