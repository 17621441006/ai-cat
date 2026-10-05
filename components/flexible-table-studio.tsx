"use client";
import {useHumanReview,ReviewChecklist} from './human-review';
import {useMemo,useRef,useState} from 'react';
import {ArrowRight,Check,Download,FileSpreadsheet,Plus,Sparkles,Upload,Undo2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {WritingVisualEditor,WritingVisualPreview} from './writing-visual-editor';
import {downloadText} from './experience-shared';
import {extractWritingVisual,type WritingVisual} from '@/lib/writing-visuals';
import {aggregateTable,cleanTableRows,inferColumnKind,numericPracticeText,parseTableText,projectPracticeText,tableCsv} from '@/lib/tabular-data';

export default function FlexibleTableStudio({initialText=''}:{initialText?:string}){
 const [source,setSource]=useState(initialText),[loadedSource,setLoadedSource]=useState(initialText);
 const [visual,setVisual]=useState<WritingVisual|null>(()=>initialText?extractWritingVisual(initialText,'我的练习表格','table'):null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[trim,setTrim]=useState(true),[dedup,setDedup]=useState(false),[beforeClean,setBeforeClean]=useState<WritingVisual|null>(null);
 const [revision,setRevision]=useState(0),[reading,setReading]=useState(false);
 const fileRef=useRef<HTMLInputElement>(null),readId=useRef(0);
 const dirty=source!==loadedSource;
 const [analysisRevision,setAnalysisRevision]=useState(0);
 const review=useHumanReview(JSON.stringify([source,visual,revision,analysisRevision]),['表头、行数与每列内容已对照原始记录','空值、重复行及人工修改已逐项检查','统计字段、单位和图表口径已核对'],!!visual&&!dirty&&!error);
 function load(text=source){
  try{
   const parsed=parseTableText(text);
   const next:WritingVisual={title:'我的练习表格',view:'table',chart:'auto',sourceText:text,edited:false,columns:parsed.headers.map((label,i)=>({label,kind:inferColumnKind(label,parsed.rows.map(r=>r[i]))})),rows:parsed.rows,note:`实际解析 ${parsed.format}，保留原始表头、单元格换行与空值。${parsed.warnings.join(' ')}`};
   setVisual(next);setSource(text);setLoadedSource(text);setError('');setBeforeClean(null);setRevision(v=>v+1);setNotice(`已从你的内容载入 ${parsed.rows.length} 行、${parsed.headers.length} 列。可以直接修改单元格，或切换图表。`);
  }catch(e){setError(e instanceof Error?e.message:'无法读取，请检查文本格式。');setNotice('');}
 }
 async function upload(file?:File){
  if(!file)return;
  if(!/\.(csv|tsv|txt|md)$/i.test(file.name)){setError('请选择 CSV、TSV、TXT 或 Markdown 文件。Excel / WPS 请先复制单元格，或另存为 UTF-8 CSV。');return}
  if(file.size>512*1024){setError('文件需小于 512 KB，请拆分后练习。');return}
  const id=++readId.current;setReading(true);setError('');
  try{const text=await file.text();if(id!==readId.current)return;setSource(text);setNotice(`已读取 ${file.name}，请点击“按我的内容生成表格”。`)}catch{setError('文件读取失败，可以直接粘贴内容。')}finally{if(id===readId.current)setReading(false)}
 }
 function clean(){
  if(!visual)return;const result=cleanTableRows(visual.rows,trim,dedup);setBeforeClean(structuredClone(visual));setVisual({...visual,rows:result.rows,edited:true});setNotice(`已清除 ${result.changed} 处首尾空白，去除 ${result.removed} 行完全相同的记录。没有补填空值或合并相似项目。`);
 }
 return <div className="writing-studio flexible-table-studio">
  <header className="flex-table-heading"><span className="flex-table-icon"><FileSpreadsheet size={25}/></span><div><small>BRING YOUR OWN DATA</small><h3>换一份内容，再练一次</h3><p>项目周报、库存台账、培训记录……表头由你决定。</p></div></header>
  <div className="flex-table-journey"><span><b>01</b>粘贴或上传</span><ArrowRight size={14}/><span><b>02</b>核对与编辑</span><ArrowRight size={14}/><span><b>03</b>统计与图表</span><ArrowRight size={14}/><span><b>04</b>导出作业</span></div>
  <section className="flex-import-panel">
   <div className="flex-import-heading"><h4>放入你的原始内容</h4><span>CSV · Excel / WPS 粘贴 · Markdown</span></div>
   <p>第一行是表头，下面是记录。支持多行说明、引号内的逗号和空值；最多 200 行、20 列。也可以先下载样例，替换成自己的数据。</p>
   <div className="flex-table-actions"><Button variant="outline" size="sm" disabled={reading} onClick={()=>{setSource(projectPracticeText);setError('');setNotice('项目周报样例已放入输入框，请载入后练习。')}}>填入项目周报样例</Button><Button variant="outline" size="sm" disabled={reading} onClick={()=>{setSource(numericPracticeText);setError('');setNotice('库存样例已放入输入框，请载入后练习。')}}>填入库存统计样例</Button><Button variant="ghost" size="sm" onClick={()=>downloadText('项目周报-练习样例.csv','\uFEFF'+projectPracticeText,'text/csv;charset=utf-8')}><Download size={14}/>下载练习样例</Button></div>
   <label className="flex-source-label" htmlFor="student-table-source">原始表格内容</label>
   <Textarea id="student-table-source" aria-label="自带数据原始内容" value={source} rows={9} disabled={reading} onChange={e=>{setSource(e.target.value);setError('');setNotice('')}} placeholder={'序号,项目名称,项目状态,项目概况,需要协调事项\n1,MES 升级,验收中,已完成测试,确认验收时间'}/>
   <div className="flex-table-actions"><Button className="flex-table-primary" disabled={reading||!source.trim()} onClick={()=>load()}><Sparkles size={16}/>按我的内容生成表格</Button><input hidden type="file" ref={fileRef} accept=".csv,.tsv,.txt,.md" onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/><Button variant="outline" disabled={reading} onClick={()=>fileRef.current?.click()}><Upload size={16}/>{reading?'读取文件中…':'上传表格文本'}</Button></div>
   <small>实际在浏览器中解析，不调用大模型、不上传文件。本次编辑仅在当前页面保留，完成后请导出。</small>
   {error&&<div className="flex-table-error" role="alert"><strong>尚未载入这份内容</strong><p>{error}</p></div>}
  </section>
  {dirty&&visual&&<div className="flex-table-pending" role="status">输入内容已更换。点击“按我的内容生成表格”后，下方才会使用新数据；上一次的结果已暂时收起。</div>}
  {notice&&<div className="flex-table-success" role="status"><Check size={16}/>{notice}</div>}
  {visual&&!dirty&&!error&&<>
   <section className="flex-cleaning"><div><h4>只做你选中的清洗</h4><p>完全重复行可移除；名称相似、状态不同的记录始终保留。</p></div><label><input type="checkbox" checked={trim} onChange={e=>setTrim(e.target.checked)}/>清除首尾空格</label><label><input type="checkbox" checked={dedup} onChange={e=>setDedup(e.target.checked)}/>整行完全一致时去重</label><Button variant="outline" size="sm" disabled={!trim&&!dedup} onClick={clean}>应用清洗</Button>{beforeClean&&<Button variant="ghost" size="sm" onClick={()=>{setVisual(beforeClean);setBeforeClean(null);setNotice('已恢复清洗前的数据。')}}><Undo2 size={14}/>恢复清洗前</Button>}</section>
   <WritingVisualEditor beforeExport={review.request} standalone key={revision} visual={visual} body={loadedSource} heading="我的练习表格" onChange={v=>{setVisual(v);setNotice('');setBeforeClean(null)}} onRemove={()=>{setVisual(null);setNotice('已移除结果，输入内容仍保留。')}}/>
   <TableAggregation key={`aggregate-${revision}`} visual={visual} beforeExport={review.request} onAnalysisChange={()=>setAnalysisRevision(n=>n+1)}/><ReviewChecklist review={review}/>
  </>}
  {!visual&&!error&&<div className="flex-table-empty"><Plus size={27}/><strong>用自己的内容完成一次练习</strong><p>替换项目名称和描述，再点击生成。内容里没有完成率，就不会凭空生成进度百分比。</p></div>}
 </div>;
}

function TableAggregation({visual,beforeExport,onAnalysisChange}:{visual:WritingVisual;beforeExport:()=>boolean;onAnalysisChange:()=>void}){
 const defaultGroup=visual.columns.findIndex(c=>c.kind==='status');
 const [group,setGroup]=useState(String(defaultGroup>=0?defaultGroup:0)),[metric,setMetric]=useState('count'),[operation,setOperation]=useState<'sum'|'average'>('sum');
 const groupIndex=Math.min(Number(group),visual.columns.length-1),metricIndex=metric==='count'?null:Number(metric);
 const numericColumns=visual.columns.map((c,i)=>({c,i})).filter(({c})=>c.kind==='number'||c.kind==='percent');
 const validMetric=metricIndex===null||numericColumns.some(({i})=>i===metricIndex);
 const unitIndex=visual.columns.findIndex(c=>/单位|币种/.test(c.label));
 const units=unitIndex<0?[]:[...new Set(visual.rows.map(r=>r[unitIndex].trim()).filter(Boolean))];
 const incompatible=metricIndex!==null&&units.length>1;
 const result=useMemo(()=>aggregateTable(visual.rows,groupIndex,metricIndex,metricIndex===null?'count':operation),[visual.rows,groupIndex,metricIndex,operation]);
 const label=metricIndex===null?'记录数':`${visual.columns[metricIndex]?.label||'数值'}${operation==='sum'?'合计':'平均值'}`;
 const summary:WritingVisual={title:`按${visual.columns[groupIndex].label}统计 · ${label}`,columns:[{label:visual.columns[groupIndex].label,kind:'text'},{label,kind:'number'}],rows:result.rows.map(r=>[r.name,String(Math.round(r.value*10000)/10000)]),view:'chart',chart:'bar',edited:false,sourceText:'',note:'基于当前编辑后的表格统计。'};
 return <section className="flex-aggregation"><div className="flex-import-heading"><h4>把当前表格变成统计图</h4><span>编辑单元格，结果同步更新</span></div><p>文字类字段可以按类别计数；数值类字段可以求和或求平均。序号和编号不作为默认统计指标。</p><div className="flex-aggregate-fields"><label>按哪一列分组<select aria-label="统计分组字段" value={String(groupIndex)} onChange={e=>{setGroup(e.target.value);onAnalysisChange()}}>{visual.columns.map((c,i)=><option key={i} value={i}>{c.label}</option>)}</select></label><label>统计什么<select aria-label="统计数值字段" value={metric} onChange={e=>{setMetric(e.target.value);onAnalysisChange()}}><option value="count">记录数（不需要数值列）</option>{numericColumns.map(({c,i})=><option key={i} value={i}>{c.label}</option>)}</select></label>{metricIndex!==null&&<label>统计方式<select aria-label="统计方式" value={operation} onChange={e=>{setOperation(e.target.value as 'sum'|'average');onAnalysisChange()}}><option value="sum">求和</option><option value="average">平均值</option></select></label>}</div>
  {incompatible||!validMetric?<div className="flex-table-pending">{incompatible?'检测到不同单位或币种，请先统一口径，或改为统计记录数。':'所选数值字段已变为其他类型，请重新选择统计字段。'}</div>:<><WritingVisualPreview visual={summary}/><p className="flex-aggregate-note">依据当前 {visual.rows.length} 行记录，{result.excluded} 行因数值空缺或无效未参与统计。{metricIndex!==null&&visual.columns[metricIndex]?.kind==='percent'?'百分比通常应求平均；有不同分母时请在真实工具中按分母加权。':''}</p><Button variant="outline" size="sm" onClick={()=>beforeExport()&&downloadText('我的练习-统计结果.csv','\uFEFF'+tableCsv(summary.columns.map(c=>c.label),summary.rows,true),'text/csv;charset=utf-8')}><Download size={14}/>下载统计结果 CSV</Button></>}
 </section>;
}
