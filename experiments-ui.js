import { runExperiment, measureWord, experimentCSV, courseMachine, oracle } from './experiments.js';
const $=s=>document.querySelector(s);
const el=(tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const names={balance:'Equal counts of 0 and 1',copy:'Repeated words: w#w'};
const SVG='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){const n=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
$('#closure').insertAdjacentHTML('beforebegin',`
<section id="course-lab" class="lab-section course-section">
 <div class="section-heading"><div><div class="eyebrow">DMT2 → CODE → DATA / CS 3120 · HOMEWORK Q1</div><h2>Turn a classroom algorithm into an experiment.</h2><p>Build a model. Generate inputs. Measure its behavior. Explain what the data can—and cannot—establish.</p></div><span class="pill">COMPUTATIONAL EXPERIMENTS</span></div>
 <div class="research-question"><span class="eyebrow">RESEARCH QUESTION</span><h3>Same input length. Same computational cost?</h3><p>The homework describes marking and rescanning a tape. This implementation turns those descriptions into transition tables, then measures actual physical steps across an exhaustive finite dataset.</p></div>
 <div class="course-controls"><label>Homework algorithm<select id="course-task"><option value="balance">Q1a · Equal counts of 0 and 1</option><option value="copy">Q1b · Repeated words: w#w</option></select></label><label>Enumerate through length<select id="course-length">${Array.from({length:8},(_,i)=>`<option value="${i}" ${i===6?'selected':''}>${i}</option>`).join('')}</select></label><button id="course-run" class="button">Generate & measure →</button><button id="course-export" class="text-button">Download raw CSV ↓</button></div>
 <p id="course-protocol" class="protocol-note"></p><p id="course-error" role="alert"></p>
 <div class="metric-grid" id="course-metrics" aria-live="polite"></div>
 <div class="analysis-grid"><div class="chart-panel"><div class="code-label">INPUT LENGTH vs. PHYSICAL TRANSITIONS <span>MEASURED, NOT FITTED</span></div><svg id="course-chart" viewBox="0 0 660 300" role="img" aria-labelledby="course-chart-title course-chart-desc"></svg><div class="chart-legend"><span>● Mean transitions</span><span>● Maximum transitions</span></div><p class="scope-note">Every input of each length has equal weight. The population changes when the alphabet changes; do not compare the two tasks as controlled benchmarks.</p></div><div class="analysis-notes"><div class="eyebrow">READ THE RESULTS</div><h3 id="course-finding"></h3><p id="course-interpretation"></p><div class="research-caution"><strong>Evidence ≠ proof</strong><p>Agreement with an independent predicate checks this finite dataset. It does not prove correctness on every input. A rising curve does not establish an asymptotic bound.</p></div><details><summary>Termination argument from the homework</summary><p id="course-termination"></p></details><a class="source-link" href="https://github.com/MinseoK2626/TuringMachineProof/blob/main/experiments.js" target="_blank" rel="noreferrer">Inspect machine construction & measurement code ↗</a></div></div>
 <div class="dataset-section"><div class="workbench-heading"><div><div class="eyebrow">REPRODUCIBLE DATASET</div><h3>Look beyond the average.</h3><p>Filter by length and outcome. Inspect a concrete row in the transition debugger.</p></div><div class="dataset-filters"><label>Length<select id="course-filter-length"><option value="all">All lengths</option></select></label><label>Outcome<select id="course-filter-outcome"><option value="all">All outcomes</option><option value="accept">Accept</option><option value="reject">Reject</option><option value="unknown">Unknown</option></select></label></div></div><p id="course-row-count" class="protocol-note"></p><div class="dataset-table-wrap"><table class="transition-table"><thead><tr><th>Word</th><th>Length</th><th>Outcome</th><th>Oracle</th><th>Transitions</th><th>L / R / S</th><th>Changed cells*</th><th>Trace</th></tr></thead><tbody id="course-data"></tbody></table></div><p class="scope-note">*Number of write operations that change a symbol, not the number of distinct cells. Table shows up to 50 matching rows; CSV includes every row.</p></div>
 <div class="compare-section"><div><div class="eyebrow">DESIGN A CONTROLLED COMPARISON</div><h3>Change the order. Hold the length fixed.</h3><p>Compare individual inputs under the same algorithm. Read the steps and state why the scan pattern changes.</p></div><form id="course-compare"><label>Input A<input id="compare-a" value="000111" maxlength="32" autocomplete="off" spellcheck="false"></label><label>Input B<input id="compare-b" value="010101" maxlength="32" autocomplete="off" spellcheck="false"></label><button class="button" type="submit">Compare →</button></form><p id="compare-results" role="status"></p></div>
 <details class="course-provenance"><summary>Course connection, model choices & experimental protocol</summary><p>Based on the supplied “Turing Machines and Decidability,” CS 3120: Discrete Math and Theory II, Fall 2026, Q1 (page 1), with the TM model and configurations introduced in “04-TuringMachines.” Q4 discusses two-way infinite tape equivalence; this project uses that variant and supports stationary moves. Q5 and Q7 motivate the closure and reduction labs below.</p><p>For each selected task, enumerate every word over its input alphabet from length 0 through the selected maximum (up to 7). No random sampling, timing noise, learned model, or external dataset is involved. Each word starts on a fresh sparse tape. Count executed transition rules, including halting transitions and validation work. Stop at a 10,000-transition safety budget; unfinished runs are “unknown,” never “reject.” Compare observed outcomes with a separate direct predicate. Measure L/R/S counts, changed-symbol writes, and tape span; export all rows as CSV.</p><p>The generated rules use X as a work marker and _ as blank; neither is an input symbol. Other than the selected binary alphabet (plus # for the copy task), input is rejected by the form validator. Uploaded coursework stays private and is not included in this repository.</p></details>
</section>`);
let result;
function drawChart(){
 const chart=$('#course-chart');chart.replaceChildren();
 chart.append(svg('title',{id:'course-chart-title'},'Mean and maximum transition counts by input length'));
 chart.append(svg('desc',{id:'course-chart-desc'},result.summary.map(s=>`Length ${s.length}: mean ${s.mean.toFixed(2)}, maximum ${s.max}, ${s.count} words.`).join(' ')));
 const left=58,top=22,width=570,height=222;const ceiling=Math.max(...result.summary.map(s=>s.max),1);
 const x=n=>left+(result.maxLength===0?width/2:n/result.maxLength*width),y=v=>top+height-v/ceiling*height;
 for(let i=0;i<=4;i++){const value=ceiling*i/4;chart.append(svg('line',{x1:left,x2:left+width,y1:y(value),y2:y(value),stroke:'#dce1d7'}),svg('text',{x:left-10,y:y(value)+4,'text-anchor':'end',class:'plot-text'},Math.round(value)));}
 result.summary.forEach(s=>chart.append(svg('text',{x:x(s.length),y:top+height+22,'text-anchor':'middle',class:'plot-text'},s.length)));
 chart.append(svg('text',{x:left+width/2,y:290,'text-anchor':'middle',class:'plot-text'},'Input length (symbols)'));
 for(const [key,color] of [['max','#9b6d39'],['mean','#29704b']]){
  chart.append(svg('polyline',{points:result.summary.map(s=>`${x(s.length)},${y(s[key])}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5}));
  for(const s of result.summary){const point=svg('circle',{cx:x(s.length),cy:y(s[key]),r:4,fill:color,tabindex:0});point.append(svg('title',{},`Length ${s.length}: ${key} ${s[key].toFixed(2)} transitions`));chart.append(point);}
 }
}
function inspect(word){
 document.dispatchEvent(new CustomEvent('inspect-course-machine',{detail:{machine:result.machine,word}}));
 $('#reduction').scrollIntoView({behavior:'smooth'});
}
function renderRows(){
 const length=$('#course-filter-length').value,outcome=$('#course-filter-outcome').value;
 const rows=result.rows.filter(r=>(length==='all'||r.length===Number(length))&&(outcome==='all'||r.outcome===outcome));
 $('#course-row-count').textContent=`${rows.length.toLocaleString()} matching rows · showing ${Math.min(50,rows.length)}`;
 const tbody=$('#course-data');tbody.replaceChildren();
 rows.slice(0,50).forEach(r=>{const tr=document.createElement('tr');[r.word||'ε',r.length,r.outcome,r.expected?'accept':'reject',r.steps,`${r.left} / ${r.right} / ${r.stationary}`,r.writes].forEach(v=>tr.append(el('td',String(v))));const td=document.createElement('td'),button=el('button','Inspect →','inspect-button');button.addEventListener('click',()=>inspect(r.word));td.append(button);tr.append(td);tbody.append(tr);});
}
function compare(){
 const task=$('#course-task').value,a=$('#compare-a').value,b=$('#compare-b').value;
 const pattern=task==='balance'?/^[01]{0,32}$/:/^[01#]{0,32}$/;
 if(!pattern.test(a)||!pattern.test(b)){$('#compare-results').textContent='Use at most 32 symbols from the selected input alphabet.';return;}
 const machine=courseMachine(task),ra=measureWord(machine,a),rb=measureWord(machine,b);
 $('#compare-results').textContent=`A (${a||'ε'}): ${ra.steps} transitions, ${ra.outcome}. B (${b||'ε'}): ${rb.steps} transitions, ${rb.outcome}. ${a.length===b.length?'Same length: '+a.length+'.':'Different lengths: '+a.length+' vs '+b.length+'; this does not control for length.'} ${a.length===b.length&&oracle(task,a)!==oracle(task,b)?'Outcomes differ, so acceptance is another varying factor.':''}`;
}
function run(){
 $('#course-error').textContent='';
 try{
  const task=$('#course-task').value,n=Number($('#course-length').value);result=runExperiment(task,n);
  $('#course-protocol').textContent=`${names[task]} · all words over {${result.alphabet.join(', ')}} · lengths 0–${n} · fresh tape per input · 10,000-transition budget per word.`;
  const metrics=[['INPUTS',result.rows.length.toLocaleString()],['ORACLE MISMATCHES',String(result.mismatches)],['UNFINISHED / UNKNOWN',String(result.unknown)],['ACCEPTED',String(result.rows.filter(r=>r.outcome==='accept').length)]];
  const grid=$('#course-metrics');grid.replaceChildren();metrics.forEach(([label,value])=>{const card=el('div','');card.append(el('span',label),el('strong',value));grid.append(card);});
  drawChart();
  const last=result.summary.at(-1),group=result.rows.filter(r=>r.length===n),fast=group.reduce((a,b)=>a.steps<b.steps?a:b),slow=group.reduce((a,b)=>a.steps>b.steps?a:b);
  $('#course-finding').textContent=`At length ${n}, observed costs range from ${fast.steps} to ${slow.steps} transitions.`;
  $('#course-interpretation').textContent=`For this complete finite set, the mean is ${last.mean.toFixed(2)} and median is ${last.median.toFixed(2)}. A low-cost example is ${fast.word||'ε'} (${fast.outcome}); a high-cost example is ${slow.word||'ε'} (${slow.outcome}). Input order, early rejection, and repeated scans can change the work. Inspect rows to explain the difference.`;
  $('#course-termination').textContent=task==='balance'?'Each successful round marks one 0 and one 1. There are finitely many input cells. If a partner is missing, the machine rejects; otherwise the number of unmarked symbols decreases by two until acceptance.':'Validation first checks for exactly one #. Each successful matching round marks one symbol on each side. A mismatch or extra unmatched symbol causes rejection. Finite scans and strictly decreasing unmarked left symbols ensure termination.';
  const filter=$('#course-filter-length');filter.replaceChildren(new Option('All lengths','all'));result.summary.forEach(s=>filter.append(new Option(String(s.length),String(s.length))));renderRows();compare();
 }catch(e){$('#course-error').textContent=e.message;}
}
$('#course-run').addEventListener('click',run);
$('#course-task').addEventListener('change',()=>{$('#compare-a').value=$('#course-task').value==='copy'?'010#010':'000111';$('#compare-b').value=$('#course-task').value==='copy'?'010#011':'010101';run();});
$('#course-length').addEventListener('change',run);
['#course-filter-length','#course-filter-outcome'].forEach(s=>$(s).addEventListener('change',renderRows));
$('#course-compare').addEventListener('submit',e=>{e.preventDefault();compare();});
$('#course-export').addEventListener('click',()=>{if(!result)return;const url=URL.createObjectURL(new Blob([experimentCSV(result)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`dmt2-${result.task}-length-${result.maxLength}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
run();
