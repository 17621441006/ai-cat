import {test} from 'node:test';
import assert from 'node:assert/strict';
const {resolveLearningTab,adjacentLearningTab}=await import(new URL('../lib/learning-tabs.ts',import.meta.url).href);
const origin='https://learning.example';
const routes=[{id:'home',href:'/'},{id:'learn',href:'/learn'},{id:'tools',href:'/tools'},{id:'agents',href:'/agents'}];
const saved={learn:'/learn?lesson=project',tools:'/tools?category=images'};

test('returning through navigation restores the last selected lesson and tool',()=>{
 assert.deepEqual(resolveLearningTab('/learn',origin,routes,saved),{view:'learn',href:saved.learn,changed:false});
 assert.equal(resolveLearningTab('/tools/',origin,routes,saved)?.href,saved.tools);
});
test('explicit deep links override cached selections, including browser history',()=>{
 assert.deepEqual(resolveLearningTab('/learn?lesson=rag',origin,routes,saved),{view:'learn',href:'/learn?lesson=rag',changed:true});
 assert.equal(resolveLearningTab('/agents#agent-builder',origin,routes,saved)?.href,'/agents#agent-builder');
 assert.equal(resolveLearningTab('/learn',origin,routes,saved,true)?.href,'/learn');
});
test('external pages, downloads, and unknown paths remain regular links',()=>{
 for(const href of ['https://other.example/learn','/downloads/guide.docx','/api/assistant','/learn/missing'])assert.equal(resolveLearningTab(href,origin,routes,saved),null);
});
test('closing a tab chooses an adjacent page without dropping the remaining pages',()=>{
 const opened=['learn','tools','agents'];
 assert.equal(adjacentLearningTab(opened,'tools'),'learn');
 assert.equal(adjacentLearningTab(opened,'learn'),'tools');
 assert.equal(adjacentLearningTab(opened,'agents'),'tools');
 assert.equal(adjacentLearningTab(['learn'],'learn'),undefined);
 assert.deepEqual(opened,['learn','tools','agents']);
});
