"use client";

import {useEffect,useRef,useState} from 'react';
import {Download,FileText,Presentation,LoaderCircle,CheckCircle2,ArrowLeft,AlertTriangle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import type {Slide} from '@/lib/ppt-workbench';

export default function PptExportPanel({slides,date,audience,ready,onEdit,beforeExport}:{slides:Slide[];date:string;audience:string;ready:boolean;onEdit:()=>void;beforeExport:()=>boolean}){
 const [format,setFormat]=useState<'pptx'|'pdf'|null>(null),[progress,setProgress]=useState(0),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [file,setFile]=useState<{url:string;name:string;kind:'pptx'|'pdf'}|null>(null),fileUrl=useRef('');
 useEffect(()=>()=>{if(fileUrl.current)URL.revokeObjectURL(fileUrl.current)},[]);
 useEffect(()=>{if(fileUrl.current){URL.revokeObjectURL(fileUrl.current);fileUrl.current='';setFile(null);setStatus('')}},[slides,date,audience,ready]);
 async function download(kind:'pptx'|'pdf'){
  if(format||!beforeExport())return;setFormat(kind);setProgress(0);setError('');setStatus('正在准备最终编辑内容…');
  try{const {exportPresentation}=await import('@/lib/ppt-export');const snapshot=structuredClone(slides);const result=await exportPresentation({slides:snapshot,date,audience,format:kind,reviewed:ready,onProgress:(n,message)=>{setProgress(n);setStatus(message)}});
   if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);
   const url=URL.createObjectURL(result.blob);fileUrl.current=url;setFile({url,name:result.filename,kind});
   const a=document.createElement('a');a.href=url;a.download=result.filename;document.body.appendChild(a);a.click();a.remove();setProgress(100);setStatus(`已生成 ${result.filename}，共 ${snapshot.length} 页。`);
  }catch(e){setError(e instanceof Error?e.message:'文件生成失败，请重试。');setStatus('')}finally{setFormat(null)}
 }
 return <section className="ppt-export-panel" aria-label="导出最终演示文件" aria-busy={!!format}>
  <div className="ppt-export-heading"><div><span className="ppt-export-eyebrow">EXPORT / 保存你的成果</span><h4>将最后修改的版本带走</h4><p>{slides.length} 页 · {ready?'已完成本次练习审核':'请先完成全部页面及交付检查'}</p></div><Button className="ppt-action-edit" variant="outline" onClick={onEdit} disabled={!!format}><ArrowLeft size={16}/>返回继续修改</Button></div>
  <div className="ppt-export-options"><article className="ppt-export-option pptx"><span className="ppt-export-icon"><Presentation size={27}/></span><div><h5>可编辑演示文稿</h5><p>文字、图片和位置保留为独立对象，讲者备注一并导出。</p><small>适合在 WPS / PowerPoint 中继续修改</small></div><Button className="ppt-action-pptx" onClick={()=>void download('pptx')} disabled={!!format}>{format==='pptx'?<LoaderCircle className="ppt-spin" size={16}/>:<Download size={16}/>}导出 PPTX</Button></article>
  <article className="ppt-export-option pdf"><span className="ppt-export-icon"><FileText size={27}/></span><div><h5>固定排版预览稿</h5><p>按当前画布逐页生成高清图像 PDF，保留中文和图文排版。</p><small>适合预览、打印和分发；文字不可选择</small></div><Button className="ppt-action-pdf" onClick={()=>void download('pdf')} disabled={!!format}>{format==='pdf'?<LoaderCircle className="ppt-spin" size={16}/>:<Download size={16}/>}导出 PDF</Button></article></div>
  {format&&<div className="ppt-export-progress"><Progress value={progress}/><span>{Math.round(progress)}%</span></div>}
  {status&&<div className="ppt-export-status" role="status">{format?<LoaderCircle className="ppt-spin" size={16}/>:<CheckCircle2 size={16}/>}<span>{status}</span></div>}
  {file&&!format&&ready&&<p className="ppt-export-download">下载未开始？<a href={file.url} download={file.name} onClick={e=>{if(!beforeExport())e.preventDefault()}}>点击保存 {file.kind.toUpperCase()} 文件<Download size={14}/></a></p>}
  {error&&<div className="ppt-export-error" role="alert"><AlertTriangle size={17}/><span>{error}</span></div>}
  <p className="office-caption">导出当前全部页面，包含手动修改、上传配图和拖拽位置。PPTX 使用参考版式；打开后请检查本机字体替换及换行。</p>
 </section>;
}
