import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const chrome=spawn(process.env.CHROMIUM_BIN || '/usr/bin/chromium',['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-proxy-server','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port=9333','--user-data-dir=/tmp/proof-lab-browser-profile','about:blank'],{stdio:'ignore'});
let ws;
try{
 let targets;
 for(let i=0;i<80;i++){try{targets=await(await fetch('http://127.0.0.1:9333/json/list')).json();break;}catch{await new Promise(r=>setTimeout(r,150));}}
 assert.ok(targets,'Chromium started');
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let id=0;const pending=new Map(),errors=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+m.params.exceptionDetails.exception?.description);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||'browser exception');return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:3000/'});
 for(let i=0;i<80;i++){if(await evaluate("!!document.querySelector('#tm-stats')?.textContent"))break;await new Promise(r=>setTimeout(r,100));}
 assert.match(await evaluate("document.querySelector('#tm-stats').textContent"),/generated rules/);
 assert.equal(errors.length,0,errors.join('\n'));
 await evaluate("document.querySelector('#debug-next').click()");assert.equal(await evaluate("document.querySelectorAll('#closure-source .current').length"),1);
 await evaluate("document.querySelector('#debug-run').click()");assert.match(await evaluate("document.querySelector('#closure-current').textContent"),/ACCEPT/);
 await evaluate("document.querySelector('#tm-run').click()");assert.match(await evaluate("document.querySelector('#tm-status').textContent"),/N accepted/);assert.match(await evaluate("document.querySelector('#tm-invariant').textContent"),/✓ Boundary/);
 assert.equal(await evaluate("document.querySelectorAll('#compiled-table .current').length"),1);
 for(const [preset,status] of [['reject','N rejected'],['loop','No LLL so far']]){
  await evaluate(`document.querySelector('#tm-preset').value='${preset}';document.querySelector('#tm-preset').dispatchEvent(new Event('change'));document.querySelector('#tm-run').click()`);
  assert.ok((await evaluate("document.querySelector('#tm-status').textContent")).includes(status));
 }
 await evaluate("document.querySelector('#tm-json').value='invalid';document.querySelector('#tm-json').dispatchEvent(new Event('input'));document.querySelector('#tm-compile').click()");assert.ok(await evaluate("document.querySelector('#tm-error').textContent.length>0 && document.querySelector('#tm-step').disabled"));
 await evaluate("document.querySelector('#tm-preset').value='accept';document.querySelector('#tm-preset').dispatchEvent(new Event('change'))");
 await evaluate("document.querySelector('[data-op=star]').click();document.querySelector('#word').value='';document.querySelector('#word-form').dispatchEvent(new Event('submit',{cancelable:true}))");assert.match(await evaluate("document.querySelector('#result').textContent"),/ACCEPTED/);
 assert.ok((await evaluate("document.querySelector('#course-metrics').textContent")).includes('ORACLE MISMATCHES'));
 await evaluate("document.querySelector('#course-task').value='copy';document.querySelector('#course-task').dispatchEvent(new Event('change'))");
 assert.match(await evaluate("document.querySelector('#course-protocol').textContent"),/Repeated words/);
 assert.equal(await evaluate("document.querySelector('#course-metrics strong').textContent"),'1,093');
 await evaluate("document.querySelector('#course-filter-length').value='3';document.querySelector('#course-filter-outcome').value='accept';document.querySelector('#course-filter-outcome').dispatchEvent(new Event('change'))");
 assert.equal(await evaluate("document.querySelectorAll('#course-data tr').length"),2);
 await evaluate("document.querySelector('#course-data button').click()");
 assert.equal(await evaluate("document.querySelector('#tm-preset').value"),'course');
 assert.match(await evaluate("document.querySelector('#tm-json').value"),/validateLeft/);
 await evaluate("document.querySelector('#tm-run').click()");
 assert.ok(!(await evaluate("document.querySelector('#tm-invariant').textContent")).includes('failed'));
 await evaluate("document.querySelector('#compare-a').value='##';document.querySelector('#compare-b').value='#';document.querySelector('#course-compare').dispatchEvent(new Event('submit',{cancelable:true}))");
 assert.match(await evaluate("document.querySelector('#compare-results').textContent"),/reject/);
 await evaluate("document.querySelector('#course-lab').scrollIntoView({behavior:'instant'})");
 await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('/tmp/proof-lab-desktop.png',Buffer.from(r.data,'base64')));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'mobile has no horizontal overflow');
 await evaluate("document.querySelector('.machine-workbench').scrollIntoView({behavior:'instant'})");
 await send('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('/tmp/proof-lab-mobile.png',Buffer.from(r.data,'base64')));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('Browser smoke passed: closure source highlighting and verdict; compiled accept/reject/loop runs; invariant and row highlighting; invalid editor; epsilon; course dataset and filters; imported course machine; controlled comparison; mobile overflow; no JavaScript exceptions.');
}catch(e){console.error(e);process.exitCode=1;}finally{ws?.close();chrome.kill();}
