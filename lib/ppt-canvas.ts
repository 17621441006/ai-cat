import {effectivePlacement,type CanvasBox,type Slide,type TextStyle} from './ppt-workbench';

export const canvasSize={width:1280,height:720};
export const fontFamilies={sans:'"Microsoft YaHei", "PingFang SC", Arial, sans-serif',arial:'Arial, "Microsoft YaHei", sans-serif',serif:'SimSun, "Songti SC", serif',mono:'Consolas, "Microsoft YaHei", monospace'};
export const fontNames={sans:'微软雅黑 / 系统黑体',arial:'Arial',serif:'宋体 / 系统宋体',mono:'Consolas / 等宽'};
export const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const round=(n:number)=>Math.round(n*100)/100;
export function constrainBox(box:CanvasBox):CanvasBox{
 const w=clamp(box.w,4,100),h=clamp(box.h,3,100);
 return {x:round(clamp(box.x,0,100-w)),y:round(clamp(box.y,0,100-h)),w:round(w),h:round(h)};
}
export function moveBox(box:CanvasBox,dx:number,dy:number){return constrainBox({...box,x:box.x+dx,y:box.y+dy})}
export type Corner='nw'|'ne'|'sw'|'se';
export function resizeBox(box:CanvasBox,corner:Corner,dx:number,dy:number,locked:boolean):CanvasBox{
 const sx=corner.includes('e')?1:-1,sy=corner.includes('s')?1:-1;
 const ax=sx===1?box.x:box.x+box.w,ay=sy===1?box.y:box.y+box.h;
 const maxW=sx===1?100-ax:ax,maxH=sy===1?100-ay:ay;
 let w:number,h:number;
 if(locked){const change=Math.abs(dx/box.w)>Math.abs(dy/box.h)?sx*dx/box.w:sy*dy/box.h;const scale=clamp(1+change,Math.max(4/box.w,3/box.h),Math.min(maxW/box.w,maxH/box.h));w=box.w*scale;h=box.h*scale}
 else{w=clamp(box.w+sx*dx,4,maxW);h=clamp(box.h+sy*dy,3,maxH)}
 return constrainBox({x:sx===1?ax:ax-w,y:sy===1?ay:ay-h,w,h});
}
export function textStyle(slide:Slide,key:string):TextStyle{
 const title=key==='title',message=key==='message';
 return {fontFamily:'sans',fontSize:title?28:message?16:17,color:slide.brand?(title?'#203f6b':message?'#657e9d':'#315478'):'#ffffff',bold:title,italic:false,underline:false,align:'left',list:title||message?'none':'number',lineHeight:1.55,...slide.textStyles?.[key]};
}
export function defaultFrames(slide:Slide):Record<string,CanvasBox>{
 const frames:Record<string,CanvasBox>={title:{x:4,y:12,w:92,h:9},message:{x:4,y:23,w:92,h:8}};
 const images=slide.images||[],placement=effectivePlacement(slide),n=Math.max(1,slide.points.length);
 let tx=4,ty=37,tw=92,th=49,ix=46,iy=35,iw=50,ih=50;
 if(images.length){if(placement==='bottom'){th=19;ty=35;ix=4;iy=57;iw=92;ih=30}else{tw=38;if(placement==='left'){tx=58;ix=4}}}
 const columns=(images.length>0&&placement==='bottom')||(!images.length&&['columns','cover','evidence','process'].includes(slide.layout));
 slide.points.forEach((_,i)=>{frames[`point-${i}`]=columns?{x:tx+i*tw/n,y:ty,w:tw/n-2,h:th}:{x:tx,y:ty+i*th/n,w:tw,h:th/n-2}});
 const cols=images.length===1?1:placement==='bottom'?images.length:2,rows=Math.ceil(images.length/cols),gap=1.5;
 images.forEach((im,i)=>{frames[`image-${im.id}`]={x:ix+(i%cols)*(iw+gap)/cols,y:iy+Math.floor(i/cols)*(ih+gap)/rows,w:(iw-gap*(cols-1))/cols,h:(ih-gap*(rows-1))/rows}});
 return frames;
}
export function canvasFrames(slide:Slide){return {...defaultFrames(slide),...slide.elementFrames}}
