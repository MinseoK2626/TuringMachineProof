import { closureProgram, compileReduction, createConfiguration, stepMachine, sameTape, presets } from './proof-engine.js';
import { compileMove } from './logic.js';
const $ = s => document.querySelector(s);
const node = (tag,text,className='') => {const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const deciders = {
  ends0: w => w.endsWith('0'),
  odd1: w => [...w].filter(c=>c==='1').length%2===1,
  evenLength: w => w.length%2===0,
  contains01: w => w.includes('01'),
  empty: w => w.length===0
};
const choices = '<option value="ends0">Ends in 0</option><option value="odd1">Odd number of 1s</option><option value="evenLength">Even length (includes ε)</option><option value="contains01">Contains 01</option><option value="empty">Only ε</option>';
function sourceView(element,fn,at) {
  element.replaceChildren();
  fn.toString().split('\n').forEach((line,i)=>{
    const row=node('div','',line.includes(`at: '${at}'`)?'source-line current':'source-line');
    row.append(node('span',String(i+1),'line-number'),node('code',line));element.append(row);
  });
}
function download(name,data){
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

$('.closure-layout').insertAdjacentHTML('afterend',`
<div class="workbench" id="closure-code">
  <div class="workbench-heading"><div><div class="eyebrow">IMPLEMENTATION LAB / EXECUTABLE CONSTRUCTIONS</div><h3>Step through the code that decides.</h3><p>Choose total deciders, supply an input, and inspect every split and function call. The code below is the exact generator driving this debugger.</p></div><a class="source-link" href="https://github.com/MinseoK2626/TuringMachineProof/blob/main/proof-engine.js" target="_blank" rel="noreferrer">Read engine source ↗</a></div>
  <div class="debug-controls"><label>Operation<select id="debug-op"><option value="union">Union</option><option value="concatenation" selected>Concatenation</option><option value="star">Kleene star</option><option value="complement">Complement</option><option value="intersection">Intersection</option></select></label><label>Decider A<select id="debug-a">${choices}</select></label><label>Decider B<select id="debug-b">${choices}</select></label><label>Input word<input id="debug-word" value="001" maxlength="10" autocomplete="off" spellcheck="false"></label></div>
  <div class="debug-toolbar"><button id="debug-reset" class="button">Load / reset</button><button id="debug-next" class="button">Next event →</button><button id="debug-run" class="button">Run to verdict</button><button id="debug-export" class="text-button">Export execution JSON ↓</button></div>
  <p class="debug-hint">Input limit: 10 binary symbols. Editing a control resets the trace. No arbitrary JavaScript is evaluated.</p>
  <div class="debug-grid"><div><div class="code-label">proof-engine.js · closureProgram() <span>ACTUAL EXECUTED SOURCE</span></div><pre id="closure-source" class="source-code" tabindex="0" aria-label="Executable closure construction source"></pre></div><div class="runtime-panel"><div class="eyebrow">RUNTIME / DECIDER CALLS & WITNESS</div><pre id="decider-source"></pre><div id="closure-current" role="status"></div><ol id="closure-log" class="execution-log"></ol><p class="scope-note">A bounded example is evidence about this input. The general termination proof uses a finite search and total deciders.</p></div></div>
</div>`);
$('#debug-b').value='odd1';
let iterator, events=[], completed=false, closureSetup;
function closureReset(){
  const op=$('#debug-op').value,w=$('#debug-word').value;
  $('#debug-b').disabled=['star','complement'].includes(op);
  events=[];completed=false;$('#closure-log').replaceChildren();$('#closure-current').className='';
  closureSetup={operation:op,word:w,A:$('#debug-a').value,B:$('#debug-b').value};
  sourceView($('#closure-source'),closureProgram);
  const A=deciders[closureSetup.A],B=deciders[closureSetup.B];
  $('#decider-source').textContent=`A = ${A.toString()}\nB = ${B.toString()}`;
  if(!/^[01]{0,10}$/.test(w)) {iterator=null;$('#closure-current').textContent='Use up to 10 symbols from {0,1}.';}
  else {iterator=closureProgram(op,w,A,B);$('#closure-current').textContent='Ready. Step into the construction.';}
  $('#debug-next').disabled=$('#debug-run').disabled=!iterator;
}
function closureNext(){
  if(!iterator||completed)return;
  const {value,done}=iterator.next();
  if(done){completed=true;return;}
  events.push(value);sourceView($('#closure-source'),closureProgram,value.at);
  let text=value.detail||value.at;
  if(value.parts)text+=` · [${value.parts.map(p=>p||'ε').join(' | ')}]`;
  if(value.checks)text+=` · calls: ${value.checks.map(c=>c?'accept':'reject').join(', ')}`;
  if('accepted' in value){text+=value.accepted?' → ACCEPT':' → REJECT';completed=true;}
  $('#closure-current').textContent=text;
  const item=node('li',text);$('#closure-log').append(item);
  if($('#closure-log').children.length>100)$('#closure-log').firstChild.remove();
  $('#closure-current').className=completed?'runtime-verdict':'';
  $('#debug-next').disabled=$('#debug-run').disabled=completed;
}
$('#debug-reset').addEventListener('click',closureReset);
$('#debug-next').addEventListener('click',closureNext);
$('#debug-run').addEventListener('click',()=>{for(let i=0;i<1100&&!completed&&iterator;i++)closureNext();});
$('#debug-export').addEventListener('click',()=>download('closure-execution.json',{...closureSetup,scope:'Concrete execution, not a formal proof certificate',complete:completed,events}));
['#debug-op','#debug-a','#debug-b'].forEach(s=>$(s).addEventListener('change',closureReset));
$('#debug-word').addEventListener('input',closureReset);closureReset();

// Replace the scripted illustration with a real transition-table compiler.
$('.reduction-grid').outerHTML=`
<div class="workbench machine-workbench">
 <div class="workbench-heading"><div><div class="eyebrow">IMPLEMENTATION LAB / MACHINE → MACHINE COMPILER</div><h3>Write M. Compile N. Inspect every transition.</h3><p>The outcome is computed from your transition table. Acceptance is never selected in advance.</p></div><a class="source-link" href="https://github.com/MinseoK2626/TuringMachineProof/blob/main/proof-engine.js" target="_blank" rel="noreferrer">Inspect the implementation ↗</a></div>
 <div class="tm-layout"><div class="machine-editor"><label for="tm-preset">Example machine</label><select id="tm-preset"><option value="accept">Accept after three original left moves</option><option value="reject">Reject after a stationary move</option><option value="loop">Move right forever (known example)</option></select><label for="tm-json">Editable M · deterministic transition table (JSON)</label><textarea id="tm-json" spellcheck="false" aria-describedby="tm-format"></textarea><p id="tm-format" class="debug-hint">_ = blank · L / R / S · two-way infinite tape. Missing rules reject. Accept and reject states halt.</p><label for="tm-word">Hardcode input w into N</label><input id="tm-word" value="1" maxlength="32" autocomplete="off" spellcheck="false"><button id="tm-compile" class="button">Compile reduction →</button><p id="tm-error" role="alert"></p><p class="scope-note">Editing the machine invalidates the compiled run. Compile again to apply your changes. The compiler constructs a finite table without executing M.</p></div>
 <div class="machine-debugger"><div class="debug-toolbar"><button id="tm-step" class="button">Step N →</button><button id="tm-run" class="button">Run 100 steps</button><button id="tm-reset" class="text-button">↺ Reset execution</button><button id="tm-export" class="text-button">Export N + trace ↓</button></div><div id="tm-stats" class="tm-stats"></div><div class="comparison"><div><div class="code-label">ORIGINAL M · MACRO BOUNDARIES</div><div id="original-state" class="state-readout"></div><div id="original-tape" class="runtime-tape"></div></div><div><div class="code-label">COMPILED N · PHYSICAL TRANSITIONS</div><div id="compiled-state" class="state-readout"></div><div id="compiled-tape" class="runtime-tape"></div></div></div><div id="tm-status" role="status"></div><div id="tm-invariant" class="invariant" role="status"></div><div class="trace-label">N · RECENT MOVES (LAST 60)</div><div id="real-moves" class="real-moves"></div><div class="code-label">LAST TRANSITION EXECUTED</div><pre id="active-rule"></pre><div class="code-label">GENERATED N · TRANSITION TABLE <span id="table-count"></span></div><div class="table-scroll"><table class="transition-table"><thead><tr><th>State</th><th>Read</th><th>Write</th><th>Move</th><th>Next</th><th>Origin</th></tr></thead><tbody id="compiled-table"></tbody></table></div><p class="scope-note">A 2,000-step execution budget limits this session. Reaching it means “unknown,” never “does not halt.” Source and compiled configurations are compared only at simulation boundaries.</p></div></div>
 <details class="compiler-details"><summary>How the compiler is implemented · actual source</summary><p>State names are generated to avoid collisions. Each source rule writes once; auxiliary states preserve the symbols they scan. Source-row metadata links generated transitions to your JSON.</p><pre id="compiler-source" class="source-code" tabindex="0"></pre></details>
</div>`;
let original,compiled,mc,nc,lastRule=null,history=[],invariant='Initialization pending.',valid=false;
const BUDGET=2000;
function drawTape(target,c){
 target.replaceChildren();
 for(let i=c.head-4;i<=c.head+4;i++){
  const cell=node('div','',i===c.head?'runtime-cell active':'runtime-cell');cell.append(node('strong',c.tape.get(i)||'□'),node('small',String(i)));target.append(cell);
 }
}
function updateMachine(){
 $('#original-state').textContent=`state ${mc.state} · head ${mc.head} · ${mc.steps} source steps`;
 $('#compiled-state').textContent=`state ${nc.state} · head ${nc.head} · ${nc.steps} physical steps`;
 drawTape($('#original-tape'),mc);drawTape($('#compiled-tape'),nc);
 const halted=nc.state===compiled.accept||nc.state===compiled.reject;
 $('#tm-status').textContent=nc.state===compiled.accept?'N accepted. Its signal contains LLL.':nc.state===compiled.reject?'N rejected. The compiled run halted without an acceptance signal.':nc.steps>=BUDGET?'Budget reached: outcome unknown. Reset to explore another execution.':`${lastRule?.phase||'ready'} · ${nc.moves.includes('LLL')?'LLL detected':'No LLL so far; this alone is not a negative decision.'}`;
 $('#tm-invariant').textContent=invariant;
 $('#real-moves').textContent=nc.moves.slice(-60)||'No transitions executed yet.';
 $('#active-rule').textContent=lastRule?JSON.stringify(lastRule,null,2):'Step to execute an actual transition.';
 $('#tm-step').disabled=$('#tm-run').disabled=halted||nc.steps>=BUDGET||!valid;
 $('#compiled-table').querySelectorAll('tr').forEach((row,i)=>row.classList.toggle('current',compiled.transitions[i]===lastRule));
}
function resetMachine(){
 if(!compiled||!valid)return;
 mc=createConfiguration(original,compiled.word);nc=createConfiguration(compiled);lastRule=null;history=[];invariant='Initialization pending. N starts on a blank tape.';updateMachine();
}
function compile(){
 try{
  if($('#tm-json').value.length>40000)throw new Error('Machine JSON exceeds the 40 KB editor limit.');
  const m=JSON.parse($('#tm-json').value),n=compileReduction(m,$('#tm-word').value);
  original=m;compiled=n;valid=true;$('#tm-error').textContent='';
  $('#tm-stats').textContent=`${m.transitions.length} source rules → ${n.transitions.length} generated rules · ${Object.keys(n.stateMap).length} source states · input ${n.word||'ε'}`;
  const table=$('#compiled-table');table.replaceChildren();
  n.transitions.forEach(t=>{const row=document.createElement('tr');[t.from,t.read,t.write,t.move,t.to,t.row===null?t.phase:`M rule ${t.row+1}`].forEach(value=>row.append(node('td',String(value))));table.append(row);});
  $('#table-count').textContent=`${n.transitions.length} RULES`;
  $('#tm-reset').disabled=$('#tm-export').disabled=false;resetMachine();
 }catch(e){valid=false;$('#tm-error').textContent=e.message;$('#tm-step').disabled=$('#tm-run').disabled=$('#tm-export').disabled=$('#tm-reset').disabled=true;}
}
function advance(){
 if(!valid||nc.steps>=BUDGET||nc.state===compiled.accept||nc.state===compiled.reject)return;
 lastRule=stepMachine(compiled,nc);
 if(lastRule?.phase==='simulate'&&lastRule.complete)stepMachine(original,mc);
 if(lastRule?.phase==='reject')stepMachine(original,mc);
 if((lastRule?.phase==='simulate'||lastRule?.phase==='initialize')&&lastRule.complete){
  const same=mc.head===nc.head&&sameTape(mc.tape,nc.tape)&&compiled.stateMap[mc.state]===nc.state;
  invariant=same?'✓ Boundary invariant: same tape, head position, and mapped source state.':'✗ Boundary invariant failed. Inspect the trace.';
 }
 const safe=lastRule?.phase==='signal'||!nc.moves.includes('LLL');
 if(!safe)invariant='✗ Safety invariant failed: LLL before the acceptance signal.';
 history.push({step:nc.steps,rule:lastRule,state:nc.state,head:nc.head,sourceState:mc.state,sourceHead:mc.head});
}
function dirty(){valid=false;$('#tm-error').textContent='Editor changed. Compile again to start a matching execution.';['#tm-step','#tm-run','#tm-export','#tm-reset'].forEach(s=>$(s).disabled=true);}
$('#tm-step').addEventListener('click',()=>{advance();updateMachine();});
$('#tm-run').addEventListener('click',()=>{for(let i=0;i<100;i++)advance();updateMachine();});
$('#tm-reset').addEventListener('click',resetMachine);
$('#tm-compile').addEventListener('click',compile);
$('#tm-export').addEventListener('click',()=>download('compiled-reduction.json',{scope:'Finite machine construction and bounded execution; not a proof of nontermination',original,input:compiled.word,compiled,execution:history,final:{state:nc.state,head:nc.head,tape:[...nc.tape],moves:nc.moves}}));
['#tm-json','#tm-word'].forEach(s=>$(s).addEventListener('input',dirty));
$('#tm-preset').addEventListener('change',()=>{if($('#tm-preset').value==='experiment')return;$('#tm-json').value=JSON.stringify(presets[$('#tm-preset').value],null,2);$('#tm-word').value='1';compile();});
$('#tm-json').value=JSON.stringify(presets.accept,null,2);compile();
$('#compiler-source').textContent=compileMove.toString()+'\n\n'+compileReduction.toString();

// Experiment results hand the actual generated machine to this debugger.
document.addEventListener('inspect-experiment-machine', event => {
  if (!$('#tm-preset').querySelector('option[value="experiment"]')) {
    const option=new Option('Imported experiment machine', 'experiment');option.disabled=true;$('#tm-preset').append(option);
  }
  $('#tm-preset').value='experiment';
  $('#tm-json').value=JSON.stringify(event.detail.machine,null,2);
  $('#tm-word').value=event.detail.word;
  compile();
});
