"use client";

import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {AlignLeft,AlignCenter,AlignRight,Bold,Italic,Underline,List,ListOrdered,Move,Maximize2,Minimize2,RotateCcw,LockKeyhole,Unlock,Image as ImageIcon,Type,X,ZoomIn} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import {canvasFrames,canvasSize,constrainBox,moveBox,resizeBox,textStyle,fontFamilies,fontNames,type Corner} from '@/lib/ppt-canvas';
import {imageSourceLabel,type CanvasBox,type Slide,type SlideImage,type TextStyle} from '@/lib/ppt-workbench';

type SlideProps={slide:Slide;index:number;count:number;date:string;onChange?:(patch:Partial<Slide>)=>void;onSource?:(page:number)=>void;openRequest?:number};
type DraftFrame={key:string;box:CanvasBox};
const cornerNames:Record<Corner,string>={nw:'左上',ne:'右上',sw:'左下',se:'右下'};

function NumberField({value,label,min,max,step=1,onCommit}:{value:number;label:string;min:number;max:number;step?:number;onCommit:(n:number)=>void}){
 const [raw,setRaw]=useState(String(value));
 useEffect(()=>setRaw(String(value)),[value]);
 function commit(){if(raw.trim()===''||!Number.isFinite(Number(raw))){setRaw(String(value));return}const n=Math.min(max,Math.max(min,Number(raw)));setRaw(String(n));if(n!==value)onCommit(n)}
 return <input aria-label={label} type="number" min={min} max={max} step={step} value={raw} onChange={e=>setRaw(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/>;
}

function EditableText({value,label,style,onSelect,onChange}:{value:string;label:string;style:CSSProperties;onSelect:()=>void;onChange?:(value:string)=>void}){
 const ref=useRef<HTMLDivElement>(null),[overflow,setOverflow]=useState(false);
 useEffect(()=>{if(ref.current&&ref.current.innerText!==value)ref.current.textContent=value},[value]);
 useEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setOverflow(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[value,style.fontSize,style.fontFamily,style.fontWeight,style.lineHeight,style.paddingLeft]);
 return <><div ref={ref} className="ppt-object-text" style={style} role={onChange?'textbox':undefined} aria-label={label} aria-multiline={onChange?true:undefined} contentEditable={!!onChange} suppressContentEditableWarning spellCheck={false} tabIndex={onChange?0:undefined}
  onFocus={onSelect} onPointerDown={onSelect} onInput={e=>onChange?.(e.currentTarget.innerText)}
  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.blur()}}}
  onPaste={e=>{if(!onChange)return;e.preventDefault();const selection=window.getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!e.currentTarget.contains(range.commonAncestorContainer))return;range.deleteContents();const node=document.createTextNode(e.clipboardData.getData('text/plain'));range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);onChange(e.currentTarget.innerText)}}/>{overflow&&onChange&&<span className="ppt-text-overflow">文字超框 · 放大文本框或减小字号</span>}</>
}

function Artboard({slide,index,count,date,onChange,onSource,selected,onSelect,zoom,locked,fitHeight=false}:{selected:string;onSelect:(key:string)=>void;zoom:string;locked:boolean;fitHeight?:boolean}&SlideProps){
 const viewport=useRef<HTMLDivElement>(null),board=useRef<HTMLDivElement>(null),[width,setWidth]=useState(800),[height,setHeight]=useState(600),[drag,setDrag]=useState<DraftFrame|null>(null);
 const gesture=useRef<{key:string;box:CanvasBox;startX:number;startY:number;canvasWidth:number;canvasHeight:number;corner?:Corner;target:HTMLElement;pointerId:number;latest:CanvasBox}|null>(null);
 useEffect(()=>{const el=viewport.current;if(!el)return;const resize=new ResizeObserver(entries=>{setWidth(Math.max(240,entries[0].contentRect.width));setHeight(Math.max(120,entries[0].contentRect.height))});resize.observe(el);return()=>resize.disconnect()},[]);
 const scale=zoom==='fit'?Math.min(1.65,width/canvasSize.width,fitHeight?height/canvasSize.height:Infinity):Number(zoom)/100;
 const frames=canvasFrames(slide),images=slide.images||[];
 const frame=(key:string)=>drag?.key===key?drag.box:frames[key];
 const cssBox=(key:string):CSSProperties=>{const b=frame(key);return {left:`${b.x}%`,top:`${b.y}%`,width:`${b.w}%`,height:`${b.h}%`}};
 function commit(key:string,box:CanvasBox){onChange?.({elementFrames:{...slide.elementFrames,[key]:box}})}
 function start(e:ReactPointerEvent<HTMLElement>,key:string,corner?:Corner){
  if(!onChange||e.button!==0)return;e.preventDefault();e.stopPropagation();onSelect(key);const rect=board.current!.getBoundingClientRect();
  e.currentTarget.setPointerCapture(e.pointerId);gesture.current={key,box:frames[key],startX:e.clientX,startY:e.clientY,canvasWidth:rect.width,canvasHeight:rect.height,corner,target:e.currentTarget,pointerId:e.pointerId,latest:frames[key]};setDrag({key,box:frames[key]});
 }
 function move(e:ReactPointerEvent<HTMLElement>){const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;const dx=(e.clientX-g.startX)/g.canvasWidth*100,dy=(e.clientY-g.startY)/g.canvasHeight*100;g.latest=g.corner?resizeBox(g.box,g.corner,dx,dy,locked):moveBox(g.box,dx,dy);setDrag({key:g.key,box:g.latest})}
 function end(e:ReactPointerEvent<HTMLElement>,cancel=false){const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;gesture.current=null;if(g.target.hasPointerCapture(e.pointerId))g.target.releasePointerCapture(e.pointerId);setDrag(null);if(!cancel&&(g.latest.x!==g.box.x||g.latest.y!==g.box.y||g.latest.w!==g.box.w||g.latest.h!==g.box.h))commit(g.key,g.latest)}
 const pointerHandlers={onPointerMove:move,onPointerUp:(e:ReactPointerEvent<HTMLElement>)=>end(e),onPointerCancel:(e:ReactPointerEvent<HTMLElement>)=>end(e,true)};
 function keyboard(e:React.KeyboardEvent,key:string){const delta=e.shiftKey?1:.2;const offsets:Record<string,[number,number]>={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};if(offsets[e.key]){e.preventDefault();commit(key,moveBox(frames[key],...offsets[e.key]))}}
 function handles(key:string){return onChange&&selected===key?<><button className="ppt-object-move" aria-label={`移动${labelFor(key)}`} title="拖动移动；方向键微调，Shift 加速" onPointerDown={e=>start(e,key)} onKeyDown={e=>keyboard(e,key)} {...pointerHandlers}><Move size={17}/></button>{(['nw','ne','sw','se'] as Corner[]).map(c=><button key={c} className={`ppt-resize-handle ${c}`} aria-label={`${labelFor(key)}${cornerNames[c]}缩放手柄`} title={`拖动${cornerNames[c]}角调整大小`} onPointerDown={e=>start(e,key,c)} {...pointerHandlers}/>)}</>:null}
 function labelFor(key:string){return key==='title'?'页面标题':key==='message'?'主要信息':key.startsWith('point-')?`要点 ${Number(key.slice(6))+1}`:`配图 ${images.findIndex(im=>`image-${im.id}`===key)+1}`}
 function textObject(key:string,value:string,update:(v:string)=>Partial<Slide>,i=0){const s=textStyle(slide,key),marker=s.list==='bullet'?'•':s.list==='number'?`${String(i+1).padStart(2,'0')}.`:'';return <div key={key} data-object-id={key} className={`ppt-canvas-object ppt-text-object ${selected===key&&onChange?'selected':''} ${onChange?'editable':''}`} style={cssBox(key)} onPointerDown={()=>onSelect(key)}>
   {marker&&<span className="ppt-list-marker" style={{color:s.color,fontSize:s.fontSize*4/3,fontFamily:fontFamilies[s.fontFamily],lineHeight:s.lineHeight}}>{marker}</span>}
   <EditableText value={value} label={`画布${labelFor(key)}`} onSelect={()=>onSelect(key)} onChange={onChange?v=>onChange(update(v)):undefined} style={{fontFamily:fontFamilies[s.fontFamily],fontSize:s.fontSize*4/3,color:s.color,fontWeight:s.bold?700:400,fontStyle:s.italic?'italic':'normal',textDecoration:s.underline?'underline':'none',textAlign:s.align,lineHeight:s.lineHeight,paddingLeft:marker?(s.fontSize*4/3*1.8):0}}/>
   {handles(key)}
  </div>}
 return <div className="ppt-artboard-scroll" ref={viewport} aria-label="幻灯片编辑画布">
  <div className="ppt-artboard-size" style={{width:1280*scale,height:720*scale}}><div ref={board} className={`ppt-artboard ${slide.brand?'':'free-theme'}`} style={{transform:`scale(${scale})`}}>
   <div className="ppt-artboard-masthead"><span>{slide.status}</span>{slide.brand?<img src="/images/scm-source/baosight-logo.png" alt="宝信软件"/>:<span>AI GENERATED</span>}</div>
   {textObject('title',slide.title,v=>({title:v}))}
   {textObject('message',slide.message,v=>({message:v}))}
   {slide.points.map((p,i)=>textObject(`point-${i}`,p.replace('｜','\n'),v=>({points:slide.points.map((old,j)=>i===j?v.replace('\n','｜'):old)}),i))}
   {images.map((im,i)=>{const key=`image-${im.id}`;return <figure key={key} data-object-id={key} className={`ppt-canvas-object ppt-image-object ${selected===key&&onChange?'selected':''} ${onChange?'editable':''}`} style={cssBox(key)} tabIndex={onChange?0:undefined} aria-label={`画布配图 ${i+1}：${im.caption}`} onFocus={()=>onSelect(key)} onPointerDown={e=>start(e,key)} onKeyDown={e=>keyboard(e,key)} {...pointerHandlers}>
    <img src={im.src} alt={im.caption} draggable={false} style={{objectFit:im.fit}}/>
    <figcaption><span>{im.caption}</span>{im.page?<button onPointerDown={e=>e.stopPropagation()} onClick={()=>onSource?.(im.page!)}>P{im.page}</button>:<small>{imageSourceLabel(im)}</small>}</figcaption>{handles(key)}
   </figure>})}
   <div className="ppt-artboard-footer"><span>{slide.citations?`依据原材料 ${slide.pages.map(p=>'P'+p).join(' / ')||'来源待补充'}`:'未附来源页'} · 练习稿</span><span>{date||'日期待确认'}　{index+1} / {count}</span></div>
  </div></div>
 </div>
}

function EditorToolbar({slide,onChange,selected,onSelect,locked,setLocked,zoom,setZoom,expanded,setExpanded}:{slide:Slide;onChange:(patch:Partial<Slide>)=>void;selected:string;onSelect:(key:string)=>void;locked:boolean;setLocked:(v:boolean)=>void;zoom:string;setZoom:(v:string)=>void;expanded:boolean;setExpanded:(v:boolean)=>void}){
 const images=slide.images||[],image=images.find(im=>`image-${im.id}`===selected),isText=!image,style=textStyle(slide,selected),box=canvasFrames(slide)[selected];
 const options=[['title','页面标题'],['message','主要信息'],...slide.points.map((_,i)=>[`point-${i}`,`正文要点 ${i+1}`]),...images.map((im,i)=>[`image-${im.id}`,`配图 ${i+1}`])];
 function format(patch:Partial<TextStyle>){onChange({textStyles:{...slide.textStyles,[selected]:{...slide.textStyles?.[selected],...patch}}})}
 function geometry(k:keyof CanvasBox,v:string){if(!box||v==='')return;const n=Number(v);if(Number.isFinite(n))onChange({elementFrames:{...slide.elementFrames,[selected]:constrainBox({...box,[k]:n})}})}
 function tool(label:string,icon:React.ReactNode,active:boolean,action:()=>void){return <button type="button" className="ppt-ribbon-button" aria-label={label} title={label} aria-pressed={active} onClick={action}>{icon}</button>}
 return <div className="ppt-ribbon" aria-label="PPT 编辑工具栏">
  <div className="ppt-ribbon-heading"><span><span className="ppt-ribbon-dot"/>{image?'图片工具':'文字工具'} <small>选择对象后编辑</small></span><div className="ppt-ribbon-view"><label>缩放<select aria-label="画布缩放" value={zoom} onChange={e=>setZoom(e.target.value)}>{[['fit','适合窗口'],['75','75%'],['100','100%'],['125','125%'],['150','150%']].map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></label><button onClick={()=>setExpanded(!expanded)}>{expanded?<Minimize2 size={15}/>:<Maximize2 size={15}/>} {expanded?'完成编辑':'放大编辑'}</button></div></div>
  <div className="ppt-ribbon-row"><label className="ppt-object-picker">{image?<ImageIcon size={16}/>:<Type size={16}/>}<select aria-label="当前编辑对象" value={selected} onChange={e=>onSelect(e.target.value)}>{options.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
   {isText?<><div className="ppt-ribbon-group"><select aria-label="字体" value={style.fontFamily} onChange={e=>format({fontFamily:e.target.value as TextStyle['fontFamily']})}>{Object.entries(fontNames).map(([v,n])=><option value={v} key={v}>{n}</option>)}</select><label className="ppt-font-size"><NumberField label="字号" min={8} max={72} value={style.fontSize} onCommit={n=>format({fontSize:n})}/><span>pt</span></label></div>
   <div className="ppt-ribbon-group">{tool('加粗',<Bold size={17}/>,style.bold,()=>format({bold:!style.bold}))}{tool('斜体',<Italic size={17}/>,style.italic,()=>format({italic:!style.italic}))}{tool('下划线',<Underline size={17}/>,style.underline,()=>format({underline:!style.underline}))}<label className="ppt-color-tool" title="文字颜色"><span style={{borderBottomColor:style.color}}>A</span><input type="color" aria-label="文字颜色" value={style.color} onChange={e=>format({color:e.target.value})}/></label>{['#203f6b','#1e293b','#cf3b3b','#167c65'].map(c=><button key={c} className="ppt-color-swatch" style={{background:c}} aria-label={`文字颜色 ${c}`} title={`设为 ${c}`} onClick={()=>format({color:c})}/>)}</div>
   <div className="ppt-ribbon-group">{tool('左对齐',<AlignLeft size={17}/>,style.align==='left',()=>format({align:'left'}))}{tool('居中对齐',<AlignCenter size={17}/>,style.align==='center',()=>format({align:'center'}))}{tool('右对齐',<AlignRight size={17}/>,style.align==='right',()=>format({align:'right'}))}{tool('项目符号',<List size={17}/>,style.list==='bullet',()=>format({list:style.list==='bullet'?'none':'bullet'}))}{tool('编号列表',<ListOrdered size={17}/>,style.list==='number',()=>format({list:style.list==='number'?'none':'number'}))}<select aria-label="行距" value={style.lineHeight} onChange={e=>format({lineHeight:Number(e.target.value)})}>{[1,1.25,1.55,1.8,2].map(n=><option key={n} value={n}>{n} 倍行距</option>)}</select></div></>:<div className="ppt-ribbon-group"><select aria-label="图片显示方式" value={image.fit} onChange={e=>onChange({images:images.map(im=>im.id===image.id?{...im,fit:e.target.value as SlideImage['fit']}:im)})}><option value="contain">完整显示</option><option value="cover">填满裁切</option></select><span className="ppt-ribbon-tip">拖动图片移动 · 拖动四角缩放</span></div>}
  </div>
  <div className="ppt-ribbon-row ppt-ribbon-geometry"><span>位置 / 大小</span>{box&&(['x','y','w','h'] as const).map(k=><label key={k}><span>{{x:'X',y:'Y',w:'宽',h:'高'}[k]}</span><NumberField key={`${selected}-${k}`} label={`对象${{x:'水平位置',y:'垂直位置',w:'宽度',h:'高度'}[k]}`} step={0.5} min={k==='w'?4:k==='h'?3:0} max={100} value={box[k]} onCommit={n=>geometry(k,String(n))}/><small>%</small></label>)}<button className="ppt-lock-toggle" aria-pressed={locked} onClick={()=>setLocked(!locked)} title="拖动角点时保持框的宽高比">{locked?<LockKeyhole size={14}/>:<Unlock size={14}/>}等比缩放</button><button className="ppt-ribbon-reset" onClick={()=>{const frames={...slide.elementFrames},styles={...slide.textStyles};delete frames[selected];delete styles[selected];onChange({elementFrames:frames,textStyles:styles})}}><RotateCcw size={14}/>重置所选对象</button><button className="ppt-ribbon-reset" onClick={()=>onChange({elementFrames:{}})}><RotateCcw size={14}/>恢复自动排版</button></div>
 </div>
}

export function SlideCanvas(props:SlideProps){
 const [selected,setSelected]=useState('title'),[zoom,setZoom]=useState('fit'),[expanded,setExpanded]=useState(false),[locked,setLocked]=useState(true);
 const frames=canvasFrames(props.slide),active=frames[selected]?selected:'title';
 const lastOpenRequest=useRef(props.openRequest||0);
 useEffect(()=>{if(props.openRequest&&props.openRequest!==lastOpenRequest.current){setZoom('fit');setExpanded(true)}lastOpenRequest.current=props.openRequest||0},[props.openRequest]);
 function editor(full:boolean){return <div className={`ppt-visual-editor ${full?'expanded':''}`}>
  {props.onChange?<EditorToolbar slide={props.slide} onChange={props.onChange} selected={active} onSelect={setSelected} locked={locked} setLocked={setLocked} zoom={zoom} setZoom={setZoom} expanded={full} setExpanded={v=>{setZoom('fit');setExpanded(v)}}/>:<div className="ppt-readonly-label">初始生成快照 · 只读<button onClick={()=>setExpanded(!full)}><Maximize2 size={15}/>{full?'关闭大图':'放大查看'}</button></div>}
  <Artboard {...props} onSource={page=>{setExpanded(false);props.onSource?.(page)}} selected={active} onSelect={setSelected} zoom={zoom} locked={locked} fitHeight={full}/>
  <div className="ppt-editor-status"><span>{props.onChange?'文字按文本框设置格式 · 拖动十字手柄移动文字 · 方向键微调位置':'原始快照保留生成时的内容与样式'}</span><span>16:9 · {Object.keys(props.slide.elementFrames||{}).length?'手动布局':'自动布局'}</span></div>
 </div>}
 return <>{!expanded?editor(false):<button className="ppt-focus-placeholder" onClick={()=>setExpanded(true)}><Maximize2 size={20}/>正在大画布中编辑</button>}<Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="ppt-focus-dialog" showCloseButton={false}><div className="ppt-focus-title"><div><DialogTitle>幻灯片编辑 · 第 {props.index+1} / {props.count} 页</DialogTitle><DialogDescription>修改会同步回当前草稿。点击文字编辑，选中图片后拖动或拉动四角。</DialogDescription></div><button aria-label="关闭大画布" onClick={()=>{setExpanded(false);setZoom('fit')}}><X size={21}/></button></div>{expanded&&editor(true)}</DialogContent></Dialog></>
}

/** The same slide renderer, at its natural size and without editing chrome. */
export function ExportSlideSurface({onReady,...props}:SlideProps&{onReady:(el:HTMLElement)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const id=requestAnimationFrame(()=>{const el=ref.current?.querySelector<HTMLElement>('.ppt-artboard');if(el)onReady(el)});return()=>cancelAnimationFrame(id)},[onReady]);
 return <div ref={ref} className="ppt-export-surface"><Artboard {...props} selected="" onSelect={()=>{}} zoom="100" locked={true}/></div>;
}

export function ImagePreview({image,index}:{image:SlideImage;index:number}){
 const [open,setOpen]=useState(false),[actual,setActual]=useState(false);
 return <><button className="ppt-image-preview-large" aria-label={`放大查看配图 ${index+1}`} onClick={()=>{setActual(false);setOpen(true)}}><img src={image.src} alt={image.caption}/><span><ZoomIn size={16}/>放大查看</span></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="ppt-image-lightbox" showCloseButton={false}><div className="ppt-focus-title"><div><DialogTitle>{image.caption||`配图 ${index+1}`}</DialogTitle><DialogDescription>{imageSourceLabel(image)} · 原图预览</DialogDescription></div><button onClick={()=>setActual(!actual)}>{actual?'适合窗口':'原始尺寸'}</button><button aria-label="关闭图片预览" onClick={()=>setOpen(false)}><X size={20}/></button></div><div className={`ppt-image-lightbox-body ${actual?'actual-size':''}`}><img src={image.src} alt={image.caption}/></div></DialogContent></Dialog></>
}
