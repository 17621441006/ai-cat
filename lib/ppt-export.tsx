"use client";

import {createRoot} from 'react-dom/client';
import {ExportSlideSurface} from '@/components/ppt-visual-editor';
import {imageSourceLabel,type Slide} from './ppt-workbench';
import type PptxGenJS from 'pptxgenjs';

type ExportRequest={slides:Slide[];date:string;audience:string;format:'pptx'|'pdf';reviewed:boolean;onProgress:(value:number,message:string)=>void};
const pxToIn=(px:number)=>px/96;
const pxToPt=(px:number)=>px*.75;
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));

async function waitForImages(node:HTMLElement){
 await Promise.all(Array.from(node.querySelectorAll('img')).map(async img=>{
  try{await img.decode();if(!img.naturalWidth)throw new Error('empty image')}
  catch{throw new Error(`配图「${img.alt||'未命名图片'}」无法读取，未导出缺图文件。请重新选择这张图片后重试。`)}
 }));
}

async function prepareSlide(slide:Slide,index:number,count:number,date:string){
 const host=document.createElement('div');host.className='office-studio';host.setAttribute('aria-hidden','true');host.inert=true;
 Object.assign(host.style,{position:'fixed',left:'-100000px',top:'0',width:'1360px',pointerEvents:'none',zIndex:'-1'});document.body.appendChild(host);
 const root=createRoot(host);let timeout:ReturnType<typeof setTimeout>|undefined;
 const dispose=()=>{root.unmount();host.remove();if(timeout)clearTimeout(timeout)};
 try{const board=await new Promise<HTMLElement>((resolve,reject)=>{timeout=setTimeout(()=>reject(new Error(`第 ${index+1} 页排版准备超时，请重试。`)),15000);root.render(<ExportSlideSurface slide={slide} index={index} count={count} date={date} onReady={resolve}/>)});clearTimeout(timeout);await waitForImages(board);await document.fonts.ready;await nextFrame();return {board,dispose}}
 catch(error){dispose();throw error}
}

function colorHex(css:string){const values=css.match(/[\d.]+/g);return values?.length&&values.length>=3?values.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join(''):'203f6b'}
function boxRelativeTo(el:Element,board:HTMLElement){const r=el.getBoundingClientRect(),b=board.getBoundingClientRect();return {x:pxToIn(r.left-b.left),y:pxToIn(r.top-b.top),w:pxToIn(r.width),h:pxToIn(r.height)}}

function addNativeText(target:PptxGenJS.Slide,el:HTMLElement,board:HTMLElement,name:string){
 if(!el.innerText.trim())return;const css=getComputedStyle(el),bounds=boxRelativeTo(el,board),fontPx=parseFloat(css.fontSize);
 target.addText(el.innerText,{...bounds,objectName:name,fontFace:css.fontFamily.split(',')[0].trim().replace(/["']/g,''),fontSize:pxToPt(fontPx),color:colorHex(css.color),bold:Number(css.fontWeight)>=600,italic:css.fontStyle==='italic',underline:css.textDecorationLine.includes('underline')?{style:'sng'}:undefined,align:css.textAlign==='center'?'center':css.textAlign==='right'?'right':'left',valign:'top',breakLine:false,margin:[pxToPt(parseFloat(css.paddingTop)||0),pxToPt(parseFloat(css.paddingRight)||0),pxToPt(parseFloat(css.paddingBottom)||0),pxToPt(parseFloat(css.paddingLeft)||0)],lineSpacing:pxToPt(parseFloat(css.lineHeight)||fontPx*1.5),paraSpaceAfter:0,paraSpaceBefore:0,fit:'none',lang:'zh-CN',isTextBox:true});
}

function imagePng(img:HTMLImageElement,cache:Map<string,string>){
 const existing=cache.get(img.src);if(existing)return existing;
 const canvas=document.createElement('canvas'),scale=Math.min(1,3200/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器无法处理图片，请换一个浏览器重试。');ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/png');canvas.width=1;canvas.height=1;cache.set(img.src,data);return data;
}

function addNativeImage(target:PptxGenJS.Slide,img:HTMLImageElement,board:HTMLElement,name:string,cache:Map<string,string>){
 const bounds=boxRelativeTo(img,board),css=getComputedStyle(img),data=imagePng(img,cache);
 target.addImage({data,objectName:name,altText:img.alt,x:bounds.x,y:bounds.y,w:pxToIn(img.naturalWidth),h:pxToIn(img.naturalHeight),sizing:{type:css.objectFit==='cover'?'cover':'contain',w:bounds.w,h:bounds.h}});
}

async function nativePresentation(request:ExportRequest):Promise<Blob>{
 const {default:Pptx}=await import('pptxgenjs');const pptx=new Pptx();
 pptx.defineLayout({name:'SCM_CANVAS',width:1280/96,height:720/96});pptx.layout='SCM_CANVAS';pptx.author='AI 进阶研习所';pptx.company='供应链 AI 学习工作台';pptx.subject=`${request.audience} · ${request.reviewed?'已审练习稿':'待审稿'}`;pptx.title=request.slides[0]?.title||'供应链 AI 汇报';pptx.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei'};
 const imageCache=new Map<string,string>();
 for(let i=0;i<request.slides.length;i++){
  request.onProgress(Math.round(i/request.slides.length*88),`正在导出第 ${i+1} / ${request.slides.length} 页的文字与配图…`);
  const model=request.slides[i],{board,dispose}=await prepareSlide(model,i,request.slides.length,request.date);
  try{const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
   if(!model.brand){const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d')!;const gradient=ctx.createLinearGradient(0,0,1280,720);gradient.addColorStop(0,'#52516c');gradient.addColorStop(1,'#746177');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);slide.addImage({data:canvas.toDataURL('image/png'),x:0,y:0,w:1280/96,h:720/96,objectName:'页面背景'});canvas.width=1;canvas.height=1}
   const status=board.querySelector<HTMLElement>('.ppt-artboard-masthead>span');if(status)addNativeText(slide,status,board,'页面性质');
   const logo=board.querySelector<HTMLImageElement>('.ppt-artboard-masthead>img');if(logo)addNativeImage(slide,logo,board,'宝信软件标识',imageCache);
   board.querySelectorAll<HTMLElement>('.ppt-artboard-masthead>span:not(:first-child)').forEach(el=>addNativeText(slide,el,board,'模板标识'));
   const footer=board.querySelector<HTMLElement>('.ppt-artboard-footer')!;const f=boxRelativeTo(footer,board);slide.addShape(pptx.ShapeType.line,{x:f.x,y:f.y,w:f.w,h:0,line:{color:'D7E2EF',width:.75},objectName:'页脚分隔线'});
   footer.querySelectorAll<HTMLElement>('span').forEach((el,j)=>addNativeText(slide,el,board,j===0?'来源说明':'日期与页码'));
   board.querySelectorAll<HTMLElement>('.ppt-text-object').forEach(el=>{const key=el.dataset.objectId||'文本';const text=el.querySelector<HTMLElement>('.ppt-object-text');if(text)addNativeText(slide,text,board,key);const marker=el.querySelector<HTMLElement>('.ppt-list-marker');if(marker)addNativeText(slide,marker,board,key+'-项目符号')});
   board.querySelectorAll<HTMLElement>('.ppt-image-object').forEach(el=>{const key=el.dataset.objectId||'配图',img=el.querySelector<HTMLImageElement>('img')!;const rect=boxRelativeTo(img,board);slide.addShape(pptx.ShapeType.rect,{...rect,fill:{color:'FFFFFF'},line:{color:'D9E2EE',width:.75},objectName:key+'-边框'});addNativeImage(slide,img,board,key,imageCache);el.querySelectorAll<HTMLElement>('figcaption>span,figcaption>small,figcaption>button').forEach((caption,j)=>addNativeText(slide,caption,board,key+`-说明-${j+1}`))});
   slide.addNotes(`${model.notes}\n\n来源：${model.pages.map(p=>'P'+p).join('、')||'待补充'}\n配图：${(model.images||[]).map(im=>im.caption+'（'+imageSourceLabel(im)+'）').join('；')}\n本页确认：${model.reviewed?'已确认':'待确认'}\n模板：PDF 视觉参考练习版式`);
  }finally{dispose()}
 }
 request.onProgress(94,'正在打包可编辑 PPTX…');const data=await pptx.write({outputType:'blob',compression:true});if(!(data instanceof Blob))throw new Error('PPTX 生成结果异常，请重试。');return data;
}

async function visualPdf(request:ExportRequest):Promise<Blob>{
 const [{PDFDocument},{toCanvas}]=await Promise.all([import('pdf-lib'),import('html-to-image')]);const pdf=await PDFDocument.create();pdf.setTitle(request.slides[0]?.title||'供应链 AI 汇报');pdf.setAuthor('AI 进阶研习所');pdf.setSubject(`${request.audience} · ${request.reviewed?'已审练习稿':'待审稿'}`);
 for(let i=0;i<request.slides.length;i++){
  request.onProgress(Math.round(i/request.slides.length*90),`正在生成第 ${i+1} / ${request.slides.length} 页 PDF…`);const {board,dispose}=await prepareSlide(request.slides[i],i,request.slides.length,request.date);
  try{const canvas=await toCanvas(board,{width:1280,height:720,pixelRatio:2,skipFonts:true,backgroundColor:'#ffffff',style:{transform:'none',boxShadow:'none'},fetchRequestInit:{credentials:'same-origin'}});const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error(`第 ${i+1} 页无法生成预览，请重试。`)),'image/png'));const png=await pdf.embedPng(await blob.arrayBuffer());pdf.addPage([960,540]).drawImage(png,{x:0,y:0,width:960,height:540});canvas.width=1;canvas.height=1;
  }finally{dispose()}
 }
 request.onProgress(96,'正在打包 PDF…');const bytes=await pdf.save();return new Blob([new Uint8Array(bytes)],{type:'application/pdf'});
}

export async function exportPresentation(request:ExportRequest){
 if(!request.slides.length)throw new Error('请先生成至少一页演示内容。');
 const filename=`供应链AI汇报-${request.reviewed?'已审稿':'待审稿'}-${request.date||new Date().toISOString().slice(0,10)}.${request.format}`;
 const blob=request.format==='pptx'?await nativePresentation(request):await visualPdf(request);return {blob,filename};
}
