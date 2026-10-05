"use client";

import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Maximize2,ImagePlus,LoaderCircle,Sparkles,Trash2,Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {effectivePlacement,materialImages,providedImages,imageSourceLabel,maxImages,placementNames,editorId,recommendImages,type ImagePlacement,type Slide,type SlideImage} from '@/lib/ppt-workbench';

export {SlideCanvas} from './ppt-visual-editor';
import {ImagePreview} from './ppt-visual-editor';

async function readLocalImage(file:File):Promise<SlideImage>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size===0||file.size>8*1024*1024)throw new Error(`${file.name}：请选择 8 MB 以内的 PNG、JPG 或 WebP 图片。`);
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('读取图片失败，请重新选择。'));reader.readAsDataURL(file)});
 const bitmap=await new Promise<HTMLImageElement>((resolve,reject)=>{const im=new window.Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`${file.name} 不是可解码的图片。`));im.src=data});
 if(bitmap.width*bitmap.height>24000000)throw new Error(`${file.name} 像素过大，请先缩小到 2400 万像素以内。`);
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d');if(!context)throw new Error('浏览器无法读取图片，请换一张图片。');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
 return {id:editorId('upload'),src:canvas.toDataURL('image/webp',.86),caption:file.name.replace(/\.[^.]+$/,''),origin:'upload',fit:'contain',width:canvas.width,height:canvas.height};
}

export function SourcePageInput({pages,onChange}:{pages:number[];onChange:(pages:number[])=>void}){
 const [text,setText]=useState(pages.join(', ')),[error,setError]=useState('');const key=pages.join(',');
 useEffect(()=>{setText(pages.join(', '));setError('')},[key]);
 function commit(){const parts=text.split(/[,，、\s]+/).filter(Boolean);if(parts.some(p=>!/^\d+$/.test(p)||Number(p)<1||Number(p)>33)){setError('请输入 1–33 的页码，用逗号分隔。');return}setError('');const values=[...new Set(parts.map(Number))];if(values.join(',')!==key)onChange(values)}
 return <label className="office-field">来源页码（如 11, 17, 22）<Input aria-label="本页来源页码" value={text} onChange={e=>setText(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){commit();e.currentTarget.blur()}}}/>{error&&<span className="office-error" role="alert">{error}</span>}</label>;
}

export function SlideImageControls({slide,onChange,onNotice,onEditCanvas}:{slide:Slide;onChange:(patch:Partial<Slide>)=>void;onNotice:(text:string)=>void;onEditCanvas:()=>void}){
 const file=useRef<HTMLInputElement>(null),alive=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[count,setCount]=useState(String(Math.max(1,slide.images?.length||0))),[direction,setDirection]=useState('auto'),[prompt,setPrompt]=useState(`为「${slide.title}」选择能说明核心内容的配图。保留与本页主题相关的关键业务细节，完整显示素材。`);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current)}},[]);
 const images=slide.images||[];
 function changeImage(id:string,patch:Partial<SlideImage>){onChange({images:images.map(im=>im.id===id?{...im,...patch}:im)})}
 function moveImage(i:number,offset:number){const next=images.map(im=>({...im}));[next[i],next[i+offset]]=[next[i+offset],next[i]];onChange({images:next,elementFrames:{}})}
 async function upload(files:FileList|null){if(!files?.length)return;const selected=Array.from(files);setError('');if(selected.length+images.length>maxImages){setError(`每页最多 ${maxImages} 张配图；当前还可以添加 ${maxImages-images.length} 张。`);return}setBusy(true);try{const added:SlideImage[]=[];for(const f of selected)added.push(await readLocalImage(f));if(alive.current){onChange({images:[...images,...added],elementFrames:{}});onNotice(`已加入 ${added.length} 张本地配图。画布已按图片数量与本页文字重新排版。`)}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'图片读取失败。')}finally{if(alive.current)setBusy(false)}}
 function simulate(){setError('');setBusy(true);timer.current=setTimeout(()=>{if(!alive.current)return;const next=recommendImages(slide,Number(count),direction,prompt);onChange({images:next,imagePlacement:'auto',elementFrames:{}});setBusy(false);onNotice(`已模拟匹配 ${next.length} 张材料配图并自动排版。素材取自原材料或你的指定配图，不是大模型新生成的图片。`)},500)}
 return <section className="office-panel ppt-image-controls" aria-label="当前页配图配置">
  <div className="office-section-heading"><ImagePlus size={19}/><h4>为当前页配图</h4><span className="ppt-image-counter">{images.length} / {maxImages} 张</span></div>
  <p className="office-caption">图片与修改保留在本次练习中，刷新后重置。上传图片会在浏览器中缩小；逐页 JSON 可保留图片数据。</p>
  <div className="ppt-image-entry">
   <div className="ppt-local-upload"><input type="file" hidden multiple accept="image/png,image/jpeg,image/webp" aria-label="上传当前页配图" ref={file} onChange={e=>{void upload(e.target.files);e.target.value=''}}/>
    <Upload size={25}/><strong>放入真实业务素材</strong><p>支持多选图片，每张不超过 8 MB</p><Button variant="outline" disabled={busy||images.length>=maxImages} onClick={()=>file.current?.click()}><Upload size={15}/>上传配图</Button>
   </div>
   <div className="ppt-ai-picture"><h5><Sparkles size={16}/>AI 配图 <span>模拟</span></h5>
    <Textarea aria-label="AI 配图要求" rows={2} value={prompt} onChange={e=>setPrompt(e.target.value)}/>
    <div className="office-toolbar"><label className="office-field">配图数量<Select value={count} onValueChange={setCount} disabled={busy}><SelectTrigger aria-label="AI 配图数量"><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4].map(n=><SelectItem value={String(n)} key={n}>{n} 张</SelectItem>)}</SelectContent></Select></label><label className="office-field">内容方向<Select value={direction} onValueChange={setDirection} disabled={busy}><SelectTrigger aria-label="AI 配图方向"><SelectValue/></SelectTrigger><SelectContent>{Object.entries({auto:'依据本页内容',architecture:'业务架构',invoice:'发票与审单',coding:'AI 辅助编程',knowledge:'问数与写作',platform:'智能体平台',delivery:'实施与交付'}).map(([v,n])=><SelectItem value={v} key={v}>{n}</SelectItem>)}</SelectContent></Select></label></div>
    <Button disabled={busy} onClick={simulate}>{busy?<LoaderCircle className="ppt-spin" size={15}/>:<Sparkles size={15}/>}生成并替换配图（模拟）</Button><p className="office-caption">根据标题、正文和要求匹配原材料与指定配图，不调用外部模型。</p>
   </div>
  </div>
  {error&&<p className="office-error" role="alert">{error}</p>}
  <div className="ppt-layout-heading"><div><h4>图文排版与配图预览</h4><p className="office-caption">点图片可放大查看；在大画布中拖动、缩放，直接确认图文位置。</p></div><Button variant="outline" onClick={onEditCanvas}><Maximize2 size={16}/>在大画布中编辑布局</Button></div><label className="office-field">图文排版<Select value={slide.imagePlacement||'auto'} onValueChange={v=>onChange({imagePlacement:v as ImagePlacement,elementFrames:{}})}><SelectTrigger aria-label="当前页图文排版"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(placementNames).map(([v,n])=><SelectItem value={v} key={v}>{n}</SelectItem>)}</SelectContent></Select></label>
  {!!images.length&&<p className="ppt-layout-explanation">当前：{placementNames[effectivePlacement(slide)]} · {images.length===1?'单图聚焦':images.length===2?'双图对照':`${images.length} 图组合`}。切换排版会重置手动位置，保留文字格式。可在大画布中继续微调。</p>}
  <div className="ppt-image-list">{images.map((im,i)=><div className="ppt-image-item" key={im.id}><ImagePreview image={im} index={i}/><div><label>配图 {i+1} 说明<Input aria-label={`配图 ${i+1} 说明`} value={im.caption} onChange={e=>changeImage(im.id,{caption:e.target.value})}/></label><small>{imageSourceLabel(im)}</small><div className="ppt-image-actions"><Button variant="ghost" size="icon" aria-label={`配图 ${i+1} 前移`} disabled={busy||i===0} onClick={()=>moveImage(i,-1)}><ArrowLeft size={14}/></Button><Button variant="ghost" size="icon" aria-label={`配图 ${i+1} 后移`} disabled={busy||i===images.length-1} onClick={()=>moveImage(i,1)}><ArrowRight size={14}/></Button><Button variant="outline" size="sm" disabled={busy} onClick={()=>changeImage(im.id,{fit:im.fit==='contain'?'cover':'contain'})}>{im.fit==='contain'?'完整显示':'填满裁切'}</Button><Button variant="ghost" size="icon" aria-label={`删除配图 ${i+1}`} disabled={busy} onClick={()=>onChange({images:images.filter(x=>x.id!==im.id),elementFrames:{}})}><Trash2 size={14}/></Button></div></div></div>)}</div>
  <details className="office-details"><summary>从图库添加 · 3 张指定配图与 10 张原文截图</summary><div className="ppt-material-gallery">{[...providedImages,...materialImages].map(im=><button key={im.id} disabled={busy||images.length>=maxImages||images.some(x=>x.id===im.id)} onClick={()=>{onChange({images:[...images,{...im}],elementFrames:{}});onNotice(`已加入「${im.caption}」· ${imageSourceLabel(im)}。`)}}><img src={im.src} alt={im.caption}/><span>{im.caption}</span><small><BookOpen size={12}/>{im.page?`P${im.page}`:'用户指定'} · {images.some(x=>x.id===im.id)?'已加入':'加入本页'}</small></button>)}</div></details>
 </section>;
}
