import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMachine } from './proof-engine.js';
import { buildMachine, oracle, enumerateWords, measureWord, runExperiment, experimentCSV, summarizeRows } from './experiments.js';

test('experiment machines agree with independent predicates on all inputs through length seven',()=>{
 for(const task of ['balance','copy','palindrome','parity','sorted']){
  validateMachine(buildMachine(task));
  const result=runExperiment(task,7);
  assert.equal(result.rows.length,task==='copy'?3280:255);
  assert.equal(result.mismatches,0);assert.equal(result.unknown,0);
  for(const r of result.rows){assert.equal(r.steps,r.left+r.right+r.stationary);assert.ok(r.writes<=r.steps);assert.equal(r.agrees,true);}
  assert.equal(result.summary.reduce((n,s)=>n+s.count,0),result.rows.length);
 }
});
test('known edge cases include empty words, malformed separators, and order-sensitive copies',()=>{
 for(const [task,words] of Object.entries({balance:['','01','10','0011','1100','010101'],copy:['#','0#0','01#01','101#101']})){
  for(const word of words){assert.equal(oracle(task,word),true);assert.equal(measureWord(buildMachine(task),word).outcome,'accept');}
 }
 for(const word of ['','0','##','0#','01#10','1#1#','0##0'])assert.equal(measureWord(buildMachine('copy'),word).outcome,'reject');
 assert.equal(measureWord(buildMachine('balance'),'000').outcome,'reject');
});
test('measurements use actual transition costs, preserve unknowns, and reveal order effects',()=>{
 const machine=buildMachine('balance');
 const grouped=measureWord(machine,'000111'),alternating=measureWord(machine,'010101');
 assert.equal(grouped.outcome,'accept');assert.equal(alternating.outcome,'accept');assert.notEqual(grouped.steps,alternating.steps);
 assert.equal(measureWord(machine,'000111',1).outcome,'unknown');
 const loop={alphabet:['_'],start:'q',accept:'a',reject:'r',transitions:[{from:'q',read:'_',write:'_',move:'R',to:'q'}]};
 const r=measureWord(loop,'',12);assert.equal(r.outcome,'unknown');assert.equal(r.steps,12);assert.equal(r.right,12);
});
test('complete enumeration, summaries and CSV are reproducible',()=>{
 assert.deepEqual(enumerateWords(['0','1'],2),['','0','1','00','01','10','11']);
 const result=runExperiment('balance',2),summary=result.summary[2];
 assert.equal(summary.count,4);assert.equal(summary.accepted,2);
 const values=result.rows.filter(r=>r.length===2).map(r=>r.steps).sort((a,b)=>a-b);
 assert.equal(summary.mean,values.reduce((a,b)=>a+b,0)/4);assert.equal(summary.median,(values[1]+values[2])/2);assert.equal(summary.max,values[3]);
 const csv=experimentCSV(result);assert.equal(csv.trimEnd().split('\n').length,result.rows.length+1);assert.ok(csv.includes('"","0","accept"'));assert.equal(csv,experimentCSV(runExperiment('balance',2)));
 assert.throws(()=>runExperiment('copy',8));assert.throws(()=>runExperiment('copy',1.5));assert.throws(()=>buildMachine('invalid'));
});

test('new languages handle centers, parity and ordering; summaries exclude censored executions',()=>{
 for(const [task,yes,no] of [['palindrome','101','10'],['parity','101','111'],['sorted','000111','010']]){
  assert.equal(measureWord(buildMachine(task),yes).outcome,'accept');assert.equal(measureWord(buildMachine(task),no).outcome,'reject');assert.equal(measureWord(buildMachine(task),'').outcome,'accept');
 }
 const data=runExperiment('palindrome',7,25);assert.ok(data.unknown>0);
 const summaries=summarizeRows(data.rows,7,'writes','accept');
 for(const summary of summaries){const matching=data.rows.filter(r=>r.length===summary.length&&r.outcome==='accept');assert.equal(summary.count,matching.length);if(!matching.length)assert.equal(summary.mean,null);}
 assert.throws(()=>runExperiment('copy',2,1));
});
