import { buildProduct, decideMDFA, verifyCertificate, dfaPresets, acceptsDFA } from './dfa.js';
const $=s=>document.querySelector(s);
const node=(tag,text,cls='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;};
$('#reduction').insertAdjacentHTML('beforebegin',`
<section id="dfa-lab" class="lab-section dfa-section">
 <div class="section-heading"><div><div class="eyebrow">FINITE-STATE PROOF LAB / PRODUCT CONSTRUCTION</div><h2>Can this DFA accept an odd number of 1s?</h2><p>Decide a property of an infinite language by exploring a finite graph.</p></div><span class="pill">M<sub>DFA</sub> DECIDABILITY</span></div>
 <div class="dfa-definition"><p>M<sub>DFA</sub> = { ⟨A⟩ | A is a DFA and accepts no word with an odd number of 1s }</p><span>Construct B for odd parity. Build C = A × B. Decide whether L(C) = ∅.</span></div>
 <div class="dfa-layout"><div class="dfa-editor"><label for="dfa-preset">Explore a DFA</label><select id="dfa-preset"><option value="safe">Even parity · property holds</option><option value="unsafe">Ends in 1 · counterexample exists</option><option value="unreachable">Unreachable accepting state · property holds</option></select><label for="dfa-json">Editable A · total transition table</label><textarea id="dfa-json" spellcheck="false" aria-describedby="dfa-format"></textarea><p id="dfa-format" class="scope-note">Each state needs one transition per alphabet symbol. Only the literal symbol 1 toggles parity; every other symbol preserves it. Invalid encodings are rejected before graph construction.</p><button id="dfa-build" class="button">Build A × B →</button><p id="dfa-error" role="alert"></p><details><summary>B · fixed odd-parity DFA</summary><table class="transition-table"><thead><tr><th>State</th><th>1</th><th>Other</th></tr></thead><tbody><tr><td>even (start)</td><td>odd</td><td>even</td></tr><tr><td>odd (accept)</td><td>even</td><td>odd</td></tr></tbody></table></details></div>
 <div class="dfa-debugger"><div class="debug-toolbar"><button id="dfa-step" class="button">Next BFS event →</button><button id="dfa-run" class="button">Decide M_DFA</button><button id="dfa-reset" class="text-button">↺ Reset</button><button id="dfa-export" class="text-button" disabled>Export certificate ↓</button></div><p id="dfa-stats" class="protocol-note"></p><div class="product-labels"><span>EVEN #1s</span><span>ODD #1s</span></div><div id="dfa-nodes" class="product-nodes" aria-label="Product states with parity"></div><p class="scope-note">Double border = accepting in C (accepting in A and odd parity). Green = discovered. Dark = current. A discovered state is not necessarily accepting.</p><div id="dfa-status" role="status"></div><div class="dfa-queue"><span>FRONTIER</span><code id="dfa-queue"></code></div><div id="dfa-witness" class="dfa-witness"></div><div class="code-label">ACTUAL BFS EVENTS / PARENT LINKS</div><ol id="dfa-log" class="execution-log"></ol><div class="code-label">PRODUCT TRANSITIONS <span>δC((q,p),a) = (δA(q,a), p ⊕ [a = 1])</span></div><div class="table-scroll"><table class="transition-table"><thead><tr><th>From (A, parity)</th><th>Symbol</th><th>To (A, parity)</th></tr></thead><tbody id="dfa-transitions"></tbody></table></div></div></div>
 <div class="proof-steps"><div><span>01 / INTERSECTION</span><h4>Turn the property into emptiness</h4><p>B accepts exactly the words containing an odd number of 1s. The accepting states of C are F_A × {odd}. Therefore L(C) = L(A) ∩ L(B): precisely the forbidden words.</p></div><div><span>02 / FINITE REACHABILITY</span><h4>Search every reachable state</h4><p>C has 2|Q_A| states. Breadth-first search visits each at most once. A reachable accepting state gives a shortest counterexample; its parent edges reconstruct a word accepted by A with odd parity.</p></div><div><span>03 / TOTAL DECISION</span><h4>Exhaustion is conclusive here</h4><p>If the frontier empties without a reachable accepting state, no forbidden word exists: accept ⟨A⟩ into M_DFA. Otherwise reject ⟨A⟩. The finite graph guarantees termination, unlike waiting for an arbitrary Turing machine to halt.</p></div></div>
 <details class="compiler-details"><summary>Inspect the exact search implementation</summary><pre id="dfa-source" class="source-code" tabindex="0"></pre></details>
 <div class="dfa-word-check"><form id="dfa-word-form"><label>Test a candidate word<input id="dfa-word" value="101" maxlength="64" autocomplete="off" spellcheck="false"></label><button class="button" type="submit">Trace through A × B →</button></form><p id="dfa-word-result" role="status"></p><p class="scope-note">Testing one word illustrates the construction. The completed finite reachability search decides the property for all words.</p></div>
</section>`);
let machine,product,iterator,events=[],verdict=null,valid=false;
const label=id=>{const [state,parity]=JSON.parse(id);return `(${state}, ${parity?'odd':'even'})`;};
function renderSource(at){
 const pre=$('#dfa-source');pre.replaceChildren();
 decideMDFA.toString().split('\n').forEach((line,i)=>{const row=node('div','',line.includes(`at:'${at}'`)?'source-line current':'source-line');row.append(node('span',String(i+1),'line-number'),node('code',line));pre.append(row);});
}
function reset(){
 if(!valid)return;iterator=decideMDFA(machine);events=[];verdict=null;$('#dfa-log').replaceChildren();$('#dfa-witness').replaceChildren();$('#dfa-queue').textContent='Ready';$('#dfa-status').textContent='Ready. Step into the finite reachability search.';
 $('#dfa-export').disabled=true;$('#dfa-step').disabled=$('#dfa-run').disabled=false;
 $('#dfa-nodes').querySelectorAll('button').forEach(n=>n.classList.remove('visited','current','witness'));renderSource();
 $('#dfa-transitions').querySelectorAll('tr').forEach(n=>n.classList.remove('current'));
}
function build(){
 try{
  if($('#dfa-json').value.length>30000)throw new Error('DFA JSON exceeds the editor limit.');
  const input=JSON.parse($('#dfa-json').value),p=buildProduct(input);machine=input;product=p;valid=true;$('#dfa-error').textContent='';
  $('#dfa-stats').textContent=`${input.states.length} states in A × 2 parity states = ${p.states.length} product states · ${p.transitions.length} transitions`;
  const grid=$('#dfa-nodes');grid.replaceChildren();
  p.states.forEach(state=>{const button=node('button',label(state.id),'product-node'+(state.accepting?' accepting':''));button.type='button';button.dataset.state=state.id;button.addEventListener('click',()=>{
   $('#dfa-status').textContent=`${label(state.id)}: ${state.accepting?'accepting in C':'not accepting in C'}. ${state.id===p.start?'Initial product state. ':''}Outgoing: `+p.transitions.filter(t=>t.from===state.id).map(t=>`${t.symbol} → ${label(t.to)}`).join('; ');
  });grid.append(button);});
  const table=$('#dfa-transitions');table.replaceChildren();p.transitions.forEach(t=>{const tr=document.createElement('tr');[label(t.from),t.symbol,label(t.to)].forEach(v=>tr.append(node('td',v)));table.append(tr);});
  $('#dfa-reset').disabled=false;reset();
 }catch(e){valid=false;$('#dfa-error').textContent='Invalid DFA encoding: '+e.message;['#dfa-step','#dfa-run','#dfa-reset','#dfa-export'].forEach(s=>$(s).disabled=true);}
}
function next(){
 if(!valid||verdict)return;const {value:e,done}=iterator.next();if(done)return;events.push(e);renderSource(e.at);
 const visited=new Set(e.visited),path=new Set(e.path||[]);
 $('#dfa-nodes').querySelectorAll('button').forEach(button=>{button.classList.toggle('visited',visited.has(button.dataset.state));button.classList.toggle('current',e.current===button.dataset.state);button.classList.toggle('witness',path.has(button.dataset.state));});
 $('#dfa-queue').textContent=e.queue.map(label).join(' → ')||'∅';
 $('#dfa-transitions').querySelectorAll('tr').forEach((row,i)=>row.classList.toggle('current',!!e.edge&&product.transitions[i].from===e.edge.from&&product.transitions[i].symbol===e.edge.symbol));
 let text=e.at==='initialize'?`Enqueue ${label(product.start)}`:e.at==='visit'?`Dequeue ${label(e.current)}`:e.at==='edge'?`${label(e.edge.from)} —${e.edge.symbol}→ ${label(e.edge.to)} · ${e.fresh?'discover and enqueue':'already discovered'}`:e.decision?'Frontier exhausted. No accepting product state is reachable.':`Reached an accepting product state via ${e.witness||'ε'}.`;
 $('#dfa-status').textContent=text;$('#dfa-log').append(node('li',text));
 if('decision' in e){
  verdict=e;$('#dfa-step').disabled=$('#dfa-run').disabled=true;$('#dfa-export').disabled=false;
  const verified=verifyCertificate(machine,e),box=$('#dfa-witness');box.replaceChildren();
  box.append(node('strong',e.decision?'ACCEPT ⟨A⟩ INTO M_DFA':'REJECT ⟨A⟩ FROM M_DFA'));
  if(e.decision)box.append(node('p',`${e.visited.length} reachable states form a closed set with no accepting product state. Finite closure certificate: ${verified?'verified':'FAILED'}.`));
  else box.append(node('p',`Shortest counterexample: ${e.witness||'ε'} · A accepts: ${acceptsDFA(machine,e.witness)} · number of 1s: ${[...e.witness].filter(s=>s==='1').length}. Witness certificate: ${verified?'verified':'FAILED'}.`),node('p',e.path.map(label).join(' → ')));
 }
}
$('#dfa-build').addEventListener('click',build);$('#dfa-step').addEventListener('click',next);$('#dfa-run').addEventListener('click',()=>{for(let i=0;i<200&&!verdict&&valid;i++)next();});$('#dfa-reset').addEventListener('click',reset);
$('#dfa-preset').addEventListener('change',()=>{$('#dfa-json').value=JSON.stringify(dfaPresets[$('#dfa-preset').value],null,2);build();});
$('#dfa-json').addEventListener('input',()=>{valid=false;$('#dfa-error').textContent='Editor changed. Build the product again.';['#dfa-step','#dfa-run','#dfa-reset','#dfa-export'].forEach(s=>$(s).disabled=true);});
$('#dfa-export').addEventListener('click',()=>{if(!verdict||!valid)return;const url=URL.createObjectURL(new Blob([JSON.stringify({machine,product,events,certificate:verdict,verified:verifyCertificate(machine,verdict)},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dfa-decision-certificate.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#dfa-word-form').addEventListener('submit',e=>{
 e.preventDefault();if(!valid){$('#dfa-word-result').textContent='Build a valid DFA first.';return;}
 const word=$('#dfa-word').value;if([...word].some(s=>!machine.alphabet.includes(s))){$('#dfa-word-result').textContent='Use only symbols from the current DFA alphabet.';return;}
 let state=product.start;const path=[label(state)];for(const symbol of word){state=product.transitions.find(t=>t.from===state&&t.symbol===symbol).to;path.push(label(state));}
 $('#dfa-word-result').textContent=`${word||'ε'}: ${path.join(' → ')}. A ${acceptsDFA(machine,word)?'accepts':'rejects'}; parity ${JSON.parse(state)[1]?'odd':'even'}; C ${product.states.find(s=>s.id===state).accepting?'accepts (counterexample)':'rejects'}.`;
});
$('#dfa-preset').value='unsafe';$('#dfa-json').value=JSON.stringify(dfaPresets.unsafe,null,2);build();
