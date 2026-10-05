// Uses the runtime's native canvas only for checking the site's renderer/export code.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dimensions,initialDesign,layoutDesign,ratios,drawVisual,exportVisual,defaultBrief,visualPrompt} from '../lib/visual-workbench.ts';
const require=createRequire(import.meta.url);
const {createCanvas,Image,loadImage}=require('@napi-rs/canvas');
const sharp=require('sharp');
const originalImage=globalThis.Image,originalDocument=globalThis.document;
class LocalImage extends Image{set src(value){sharp(readFileSync(new URL('../public'+value,import.meta.url))).png().toBuffer().then(bytes=>{super.src=bytes}).catch(error=>this.onerror?.(error))}}
globalThis.Image=LocalImage;
globalThis.document={createElement(name){assert.equal(name,'canvas');const canvas=createCanvas(1,1);canvas.toBlob=(fn,mime)=>fn(new Blob([canvas.toBuffer(mime)],{type:mime}));return canvas}};
let checks=0;async function test(name,run){await run();console.log('PASS',name);checks++}
try{
 await test('Every ratio and layout supplies finite positions and a real text color',()=>{for(const ratio of ratios)for(const layout of ['split','center','poster']){const d=layoutDesign(layout,ratio);assert.match(d.text.color,/^#[0-9a-f]{6}$/);for(const value of Object.values(d.image))assert(Number.isFinite(value));assert(dimensions(ratio).height>0)}});
 await test('The complete-scene layout keeps the image inside its canvas',async()=>{for(const ratio of ratios){const d={...initialDesign(),...layoutDesign('center',ratio)};const img=await loadImage(await sharp(readFileSync(new URL('../public'+d.src,import.meta.url))).png().toBuffer());const geometry=drawVisual(createCanvas(1,1),img,d);assert(geometry.image.y+geometry.image.height<94);assert(geometry.image.x>=0);assert(geometry.image.x+geometry.image.width<=100)}});
 await test('PNG and JPG exports have the right signatures and dimensions',async()=>{for(const format of ['png','jpeg']){const blob=await exportVisual(initialDesign(),format);const bytes=Buffer.from(await blob.arrayBuffer());assert(bytes.length>10000);if(format==='png')assert.equal(bytes.subarray(1,4).toString(),'PNG');else assert.equal(bytes.readUInt16BE(0),0xffd8);const img=await loadImage(bytes);assert.equal(img.width,1600);assert.equal(img.height,900)}});
 await test('Mask export preserves the full canvas and paints only the selected area white',async()=>{const blob=await exportVisual(initialDesign(),'png',{x:20,y:30,width:40,height:20});const img=await loadImage(Buffer.from(await blob.arrayBuffer()));const canvas=createCanvas(img.width,img.height),ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);assert.deepEqual([...ctx.getImageData(500,350,1,1).data],[255,255,255,255]);assert.deepEqual([...ctx.getImageData(50,50,1,1).data],[0,0,0,255])});
 await test('Edited title and position affect the exported image and the production prompt',async()=>{const first=initialDesign(),changed={...first,title:'Updated weekly report',image:{...first.image,x:20},text:{...first.text,color:'#e44920',size:80}};const a=Buffer.from(await (await exportVisual(first,'png')).arrayBuffer());const b=Buffer.from(await (await exportVisual(changed,'png')).arrayBuffer());assert(!a.equals(b));assert.match(visualPrompt(defaultBrief,changed),/Updated weekly report/)});
 console.log(`${checks} visual renderer/export checks passed.`);
}finally{globalThis.Image=originalImage;globalThis.document=originalDocument;}
