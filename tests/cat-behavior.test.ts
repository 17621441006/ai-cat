import {test} from 'node:test';
import assert from 'node:assert/strict';
const {catDuration,nextCatActivity}=await import(new URL('../lib/cat-behavior.ts',import.meta.url).href);

test('brief curiosity and taps stop after a few loops, sleep lasts minutes',()=>{
 for(const random of [()=>0,()=>.5,()=>.999]){
  assert.ok(catDuration('curious',random)<=9_600);
  assert.ok(catDuration('tap',random)<=12_000);
  assert.ok(catDuration('sleep',random)>=180_000);
  assert.equal(catDuration('walk',random)%15_000,0);
  assert.ok(catDuration('drink',random)<catDuration('eat',random));
 }
 assert.notEqual(catDuration('sleep',()=>0),catDuration('sleep',()=>.9));
});
test('autonomous choices respect recent actions and meal cooldowns',()=>{
 for(let i=0;i<100;i++){
  const next=nextCatActivity(['tap','roll'],{eat:5_000,drink:5_000},10_000,()=>i/100);
  assert.ok(!['tap','roll','eat','drink'].includes(next));
 }
});
test('new hobbies linger naturally and do not repeat while cooling down',()=>{
 assert.ok(catDuration('work',()=>0)>60_000);
 assert.ok(catDuration('knit',()=>0)>70_000);
 assert.ok(catDuration('exercise',()=>.99)<catDuration('work',()=>0));
 const chosen=new Set();
 for(let i=0;i<100;i++){
  chosen.add(nextCatActivity([],{},0,()=>i/100));
  assert.ok(!['work','knit','exercise','tap'].includes(nextCatActivity([],{work:1_000,knit:1_000,exercise:1_000,tap:1_000},2_000,()=>i/100)));
 }
 for(const action of ['work','knit','exercise','tap'])assert.ok(chosen.has(action));
});
