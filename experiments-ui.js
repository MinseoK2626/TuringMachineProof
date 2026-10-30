import { runExperiment, measureWord, experimentCSV, buildMachine, oracle, summarizeRows } from './experiments.js';
const $=s=>document.querySelector(s);
const el=(tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
const names={balance:'Equal counts',copy:'Repeated words: w#w',palindrome:'Binary palindromes',parity:'Even parity',sorted:'Ordered blocks: 0*1*'};
const descriptions={balance:'Pair each 0 with a 1 by marking and rescanning.',copy:'Validate one separator, then match the left and right words.',palindrome:'Mark and compare the outermost remaining symbols.',parity:'Track the parity of 1s in the finite control during one scan.',sorted:'Track whether the scan has entered the block of 1s; reject a later 0.'};
const samples={balance:['000111','010101'],copy:['010#010','010#011'],palindrome:['011110','011010'],parity:['000011','101000'],sorted:['000111','010101']};
const terminations={balance:'Each successful round marks two opposite symbols. A missing partner rejects; otherwise the unmarked count strictly decreases.',copy:'Validation checks for exactly one separator. Each matching round marks one symbol on each side. Mismatches and unmatched tails reject.',palindrome:'Each successful round removes two unmarked endpoints. A lone center accepts, a mismatch rejects, and the finite unmarked region shrinks.',parity:'Every nonhalting transition moves right. After the finite input, the blank transition accepts in the even state and rejects in the odd state.',sorted:'Every nonhalting transition moves right. A 0 after a 1 causes rejection; reaching blank accepts. Thus every input halts.'};
const metricNames={steps:'physical transitions',left:'left moves',right:'right moves',writes:'symbol-changing writes',span:'tape span'};
const SVG='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){const n=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
$('#closure').insertAdjacentHTML('beforebegin',`
<section id="experiment-lab" class="lab-section experiment-section">
 <div class="section-heading"><div><div class="eyebrow">01 / COMPUTATIONAL EXPERIMENTS</div><h2>Different algorithms. Measurable behavior.</h2><p>Build a model. Generate inputs. Measure its behavior. Explain what the data can—and cannot—establish.</p></div><span class="pill">COMPUTATIONAL EXPERIMENTS</span></div>
 <div class="research-question"><span class="eyebrow">RESEARCH QUESTION</span><h3>Same input length. Same computational cost?</h3><p>Explore five language algorithms, from single-pass state tracking to repeated tape scans. Change the execution budget, choose a metric, and investigate the inputs behind each result.</p></div>
 <div class="experiment-controls"><label>Algorithm<select id="experiment-task"><option value="balance">Equal counts of 0 and 1</option><option value="copy">Repeated words: w#w</option><option value="palindrome">Binary palindromes</option><option value="parity">Even parity</option><option value="sorted">Ordered blocks: 0*1*</option></select></label><label>Enumerate through length<select id="experiment-length">${Array.from({length:8},(_,i)=>`<option value="${i}" ${i===6?'selected':''}>${i}</option>`).join('')}</select></label><label>Per-input step budget<select id="experiment-budget"><option>25</option><option>100</option><option>1000</option><option selected>10000</option></select></label><button id="experiment-run" class="button">Generate & measure →</button><button id="experiment-export" class="text-button">Download raw CSV ↓</button></div>
 <p id="experiment-protocol" class="protocol-note"></p><p id="experiment-error" role="alert"></p>
 <div class="metric-grid" id="experiment-metrics" aria-live="polite"></div>
 <div class="analysis-controls"><label>Measure<select id="experiment-metric"><option value="steps">Physical transitions</option><option value="left">Left moves</option><option value="right">Right moves</option><option value="writes">Symbol-changing writes</option><option value="span">Tape span</option></select></label><label>Analyze completed inputs<select id="experiment-subset"><option value="all">All outcomes</option><option value="accept">Accepted only</option><option value="reject">Rejected only</option></select></label><p>Unknown runs stay in the dataset and are excluded from completed-run averages.</p></div><div class="analysis-grid"><div class="chart-panel"><div class="code-label"><span id="plot-heading">INPUT LENGTH vs. PHYSICAL TRANSITIONS</span> <span>MEASURED, NOT FITTED</span></div><svg id="experiment-chart" viewBox="0 0 660 300" role="img" aria-labelledby="experiment-chart-title experiment-chart-desc"></svg><div class="chart-legend"><span>● Mean</span><span>● Maximum</span></div><p class="scope-note">Every input of each length has equal weight. The population changes when the alphabet changes; cross-language averages are not controlled benchmarks.</p></div><div class="analysis-notes"><div class="eyebrow">READ THE RESULTS</div><h3 id="experiment-finding"></h3><p id="experiment-interpretation"></p><div class="research-caution"><strong>Evidence ≠ proof</strong><p>Agreement with an independent predicate checks this finite dataset. It does not prove correctness on every input. A rising curve does not establish an asymptotic bound.</p></div><details><summary>Why this algorithm halts</summary><p id="experiment-termination"></p></details><a class="source-link" href="https://github.com/MinseoK2626/TuringMachineProof/blob/main/experiments.js" target="_blank" rel="noreferrer">Inspect machine construction & measurement code ↗</a></div></div>
 <div class="dataset-section"><div class="workbench-heading"><div><div class="eyebrow">REPRODUCIBLE DATASET</div><h3>Look beyond the average.</h3><p>Filter by length and outcome. Inspect a concrete row in the transition debugger.</p></div><div class="dataset-filters"><label>Length<select id="experiment-filter-length"><option value="all">All lengths</option></select></label><label>Outcome<select id="experiment-filter-outcome"><option value="all">All outcomes</option><option value="accept">Accept</option><option value="reject">Reject</option><option value="unknown">Unknown</option></select></label></div></div><p id="experiment-row-count" class="protocol-note"></p><div class="dataset-table-wrap"><table class="transition-table"><thead><tr><th>Word</th><th>Length</th><th>Outcome</th><th>Oracle</th><th>Transitions</th><th>L / R / S</th><th>Changed cells*</th><th>Trace</th></tr></thead><tbody id="experiment-data"></tbody></table></div><p class="scope-note">*Number of write operations that change a symbol, not the number of distinct cells. Table shows up to 50 matching rows; CSV includes every row.</p></div>
 <div class="compare-section"><div><div class="eyebrow">DESIGN A CONTROLLED COMPARISON</div><h3>Change the order. Hold the length fixed.</h3><p>Compare individual inputs under the same algorithm. Read the steps and state why the scan pattern changes.</p></div><form id="experiment-compare"><label>Input A<input id="compare-a" value="000111" maxlength="32" autocomplete="off" spellcheck="false"></label><label>Input B<input id="compare-b" value="010101" maxlength="32" autocomplete="off" spellcheck="false"></label><button class="button" type="submit">Compare →</button></form><p id="compare-results" role="status"></p></div>
 <details class="experiment-provenance"><summary>Model choices & reproducible protocol</summary><p>Each algorithm is an explicit deterministic transition table on a two-way infinite tape, using stationary moves where needed. X is a work marker and _ is blank; neither is an input symbol. Binary inputs are used except for the repeated-word language, which also includes #.</p><p>Enumerate every word from length 0 through the selected maximum (up to 7). Each word starts on a fresh tape. Count real transitions, including validation and halting transitions. Budget-limited executions remain unknown. Completed runs are checked against a separate predicate. Chart subsets change which completed inputs contribute to averages; exports retain every row. Costs across different languages are descriptive comparisons because their alphabets and acceptance distributions differ.</p></details>
</section>`);
let result;
function drawChart(){
 const metric=$('#experiment-metric').value,subset=$('#experiment-subset').value;
 const summary=summarizeRows(result.rows,result.maxLength,metric,subset),valid=summary.filter(s=>s.count);
 $('#plot-heading').textContent=`INPUT LENGTH vs. ${metricNames[metric].toUpperCase()}`;
 const chart=$('#experiment-chart');chart.replaceChildren();
 chart.append(svg('title',{id:'experiment-chart-title'},`Mean and maximum ${metricNames[metric]} by input length`));
 chart.append(svg('desc',{id:'experiment-chart-desc'},summary.map(s=>s.count?`Length ${s.length}: mean ${s.mean.toFixed(2)}, maximum ${s.max}, ${s.count} inputs.`:`Length ${s.length}: no completed matching inputs.`).join(' ')));
 const left=58,top=22,width=570,height=222,ceiling=Math.max(...valid.map(s=>s.max),1);
 const x=n=>left+(result.maxLength===0?width/2:n/result.maxLength*width),y=v=>top+height-v/ceiling*height;
 for(let i=0;i<=4;i++){const value=ceiling*i/4;chart.append(svg('line',{x1:left,x2:left+width,y1:y(value),y2:y(value),stroke:'#dce1d7'}),svg('text',{x:left-10,y:y(value)+4,'text-anchor':'end',class:'plot-text'},Number(value.toFixed(1))));}
 summary.forEach(s=>chart.append(svg('text',{x:x(s.length),y:top+height+22,'text-anchor':'middle',class:'plot-text'},s.length)));
 chart.append(svg('text',{x:left+width/2,y:290,'text-anchor':'middle',class:'plot-text'},'Input length (symbols)'));
 for(const [key,color] of [['max','#9b6d39'],['mean','#29704b']]){
  for(let i=0;i<summary.length;i++){
   const s=summary[i];if(!s.count)continue;
   if(i&&summary[i-1].count)chart.append(svg('line',{x1:x(i-1),x2:x(i),y1:y(summary[i-1][key]),y2:y(s[key]),stroke:color,'stroke-width':2.5}));
   const point=svg('circle',{cx:x(s.length),cy:y(s[key]),r:4,fill:color,tabindex:0});point.append(svg('title',{},`Length ${s.length}: ${key} ${s[key].toFixed(2)} ${metricNames[metric]} (${s.count} inputs)`));chart.append(point);
  }
 }
 const group=result.rows.filter(r=>r.length===result.maxLength&&r.outcome!=='unknown'&&(subset==='all'||r.outcome===subset));
 if(!group.length){$('#experiment-finding').textContent='No completed inputs match this selection at the maximum length.';$('#experiment-interpretation').textContent='Increase the execution budget or change the outcome subset. No values are imputed for missing groups.';return;}
 const last=summary.at(-1),fast=group.reduce((a,b)=>a[metric]<b[metric]?a:b),slow=group.reduce((a,b)=>a[metric]>b[metric]?a:b);
 $('#experiment-finding').textContent=`At length ${result.maxLength}, observed ${metricNames[metric]} range from ${fast[metric]} to ${slow[metric]}.`;
 $('#experiment-interpretation').textContent=`${group.length} completed inputs in this subset. Mean: ${last.mean.toFixed(2)}; median: ${last.median.toFixed(2)}. Low-cost example: ${fast.word||'ε'} (${fast.outcome}). High-cost example: ${slow.word||'ε'} (${slow.outcome}). ${descriptions[result.task]} Excluding unfinished inputs can bias averages toward faster runs.`;
}
function inspect(word){
 document.dispatchEvent(new CustomEvent('inspect-experiment-machine',{detail:{machine:result.machine,word}}));
 $('#reduction').scrollIntoView({behavior:'smooth'});
}
function renderRows(){
 const length=$('#experiment-filter-length').value,outcome=$('#experiment-filter-outcome').value;
 const rows=result.rows.filter(r=>(length==='all'||r.length===Number(length))&&(outcome==='all'||r.outcome===outcome));
 $('#experiment-row-count').textContent=`${rows.length.toLocaleString()} matching rows · showing ${Math.min(50,rows.length)}`;
 const tbody=$('#experiment-data');tbody.replaceChildren();
 rows.slice(0,50).forEach(r=>{const tr=document.createElement('tr');[r.word||'ε',r.length,r.outcome,r.expected?'accept':'reject',r.steps,`${r.left} / ${r.right} / ${r.stationary}`,r.writes].forEach(v=>tr.append(el('td',String(v))));const td=document.createElement('td'),button=el('button','Inspect →','inspect-button');button.addEventListener('click',()=>inspect(r.word));td.append(button);tr.append(td);tbody.append(tr);});
}
function compare(){
 const task=$('#experiment-task').value,a=$('#compare-a').value,b=$('#compare-b').value;
 const pattern=task==='copy'?/^[01#]{0,32}$/:/^[01]{0,32}$/;
 if(!pattern.test(a)||!pattern.test(b)){$('#compare-results').textContent='Use at most 32 symbols from the selected input alphabet.';return;}
 const machine=buildMachine(task),ra=measureWord(machine,a,Number($('#experiment-budget').value)),rb=measureWord(machine,b,Number($('#experiment-budget').value));
 $('#compare-results').textContent=`A (${a||'ε'}): ${ra.steps} transitions, ${ra.outcome}. B (${b||'ε'}): ${rb.steps} transitions, ${rb.outcome}. ${a.length===b.length?'Same length: '+a.length+'.':'Different lengths: '+a.length+' vs '+b.length+'; this does not control for length.'} ${a.length===b.length&&oracle(task,a)!==oracle(task,b)?'Outcomes differ, so acceptance is another varying factor.':''}`;
}
function run(){
 $('#experiment-error').textContent='';
 try{
  const task=$('#experiment-task').value,n=Number($('#experiment-length').value);result=runExperiment(task,n,Number($('#experiment-budget').value));
  $('#experiment-protocol').textContent=`${names[task]} · all words over {${result.alphabet.join(', ')}} · lengths 0–${n} · fresh tape per input · ${result.budget.toLocaleString()}-transition budget per word.`;
  const metrics=[['INPUTS',result.rows.length.toLocaleString()],['ORACLE MISMATCHES',String(result.mismatches)],['UNFINISHED / UNKNOWN',String(result.unknown)],['ACCEPTED',String(result.rows.filter(r=>r.outcome==='accept').length)]];
  const grid=$('#experiment-metrics');grid.replaceChildren();metrics.forEach(([label,value])=>{const card=el('div','');card.append(el('span',label),el('strong',value));grid.append(card);});
  drawChart();
  $('#experiment-termination').textContent=terminations[task];
  const filter=$('#experiment-filter-length');filter.replaceChildren(new Option('All lengths','all'));result.summary.forEach(s=>filter.append(new Option(String(s.length),String(s.length))));renderRows();compare();
 }catch(e){$('#experiment-error').textContent=e.message;}
}
$('#experiment-run').addEventListener('click',run);
$('#experiment-task').addEventListener('change',()=>{const pair=samples[$('#experiment-task').value];$('#compare-a').value=pair[0];$('#compare-b').value=pair[1];run();});
$('#experiment-length').addEventListener('change',run);
$('#experiment-budget').addEventListener('change',run);
['#experiment-metric','#experiment-subset'].forEach(s=>$(s).addEventListener('change',drawChart));
['#experiment-filter-length','#experiment-filter-outcome'].forEach(s=>$(s).addEventListener('change',renderRows));
$('#experiment-compare').addEventListener('submit',e=>{e.preventDefault();compare();});
$('#experiment-export').addEventListener('click',()=>{if(!result)return;const url=URL.createObjectURL(new Blob([experimentCSV(result)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`turing-lab-${result.task}-length-${result.maxLength}-budget-${result.budget}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
run();
