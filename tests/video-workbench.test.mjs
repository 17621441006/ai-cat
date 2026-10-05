import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
await mkdir(new URL('../work/',import.meta.url),{recursive:true});
await build({entryPoints:['lib/video-workbench.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/video-test.mjs',logLevel:'silent'});
const {initialVideoProject,duration,locateClip,splitClip,moveClip,captionsFromClips,parseSrt,toSrt}=await import('../work/video-test.mjs');
test('split and reorder retain actual source ranges and total duration',()=>{
 const p=initialVideoProject();assert.equal(duration(p.clips),30);
 const parts=splitClip(p.clips,10);assert.equal(parts.length,5);assert.equal(duration(parts),30);
 assert.deepEqual(parts.slice(1,3).map(c=>[c.in,c.out]),[[26,29],[29,34]]);
 assert.equal(splitClip(p.clips,7),null);assert.equal(splitClip(p.clips,.1),null);
 const reordered=moveClip(parts,3,0);assert.equal(reordered[0].id,'p3');assert.equal(duration(reordered),30);
 assert.equal(locateClip(p.clips,7).clip.id,'p2');
});
test('caption times follow the edited sequence and SRT round trips multilingual content',()=>{
 const clips=initialVideoProject('warehouse').clips;const captions=captionsFromClips(clips);
 assert.deepEqual(captions.map(c=>[c.start,c.end]),[[0,6],[6,12],[12,18],[18,24]]);
 captions[1].text='移动货架\nAI / ERP 核对';const restored=parseSrt(toSrt(captions));
 assert.deepEqual(restored.map(({id,...c})=>c),captions.map(({id,...c})=>c));
});
test('malformed and empty subtitles are rejected; markup stays plain text',()=>{
 assert.throws(()=>parseSrt('普通文案，没有时间码'),/没有读到/);
 assert.throws(()=>parseSrt('1\n00:00:04,000 --> 00:00:02,000\n倒置'),/没有读到/);
 assert.equal(parseSrt('1\r\n00:00:01,200 --> 00:00:02,500\r\n<b>字幕</b>')[0].text,'字幕');
});
