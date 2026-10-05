import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {PerspectiveCamera,Vector3} from 'three';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
await mkdir(new URL('../work/',import.meta.url),{recursive:true});
await build({stdin:{contents:"export * from './lib/spatial-layout';export * from './lib/spatial-data';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:'work/spatial-labels-test.mjs',logLevel:'silent'});
const {placeSpatialLabels,spatialNodes}=await import('../work/spatial-labels-test.mjs');

test('projected labels remain separate through a full orbit at desktop and narrow widths',()=>{
 for(const [width,height] of [[920,610],[360,460]])for(let angle=0;angle<360;angle+=30){
  const camera=new PerspectiveCamera(43,width/height,.1,160);
  const rad=angle*Math.PI/180;camera.position.set(Math.sin(rad)*28,25,Math.cos(rad)*28);camera.lookAt(0,2,0);camera.updateMatrixWorld();
  const anchors=spatialNodes.flatMap(n=>{const p=new Vector3(...n.position).project(camera);return p.z<-1||p.z>1?[]:[{id:n.id,x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:174,height:40,priority:n.id==='material'?10:1}]});
  const labels=placeSpatialLabels(anchors,width,height);
  assert.ok(labels.some(l=>l.id==='material'),`selected label missing at ${width}px / ${angle}°`);
  for(const [i,a] of labels.entries()){
   assert.ok(a.left>=0&&a.top>=54&&a.left+a.width<=width&&a.top+a.height<=height-64);
   for(const b of labels.slice(i+1))assert.ok(a.left>=b.left+b.width||a.left+a.width<=b.left||a.top>=b.top+b.height||a.top+a.height<=b.top,`${a.id} overlaps ${b.id} at ${width}px / ${angle}°`);
  }
 }
});
