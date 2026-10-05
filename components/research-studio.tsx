"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Check,ChevronRight,Download,FileSearch,FileText,FolderOpen,Loader2,Plus,Search,Sparkles,Trash2,Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Checkbox} from '@/components/ui/checkbox';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {CopyText,downloadText} from './experience-shared';
import {evidenceKindNames,researchCases,researchMarkdown,researchPrompt,researchSourceSchema,safeResearchUrl,searchResearchSources,sourceKindNames,supportedClaims,type EvidenceKind,type ResearchClaim,type ResearchSource} from '@/lib/research-workbench';

const steps=[{title:'明确问题',hint:'先确定要做的决定'},{title:'设计搜索',hint:'把问题拆成检索任务'},{title:'收集资料',hint:'选择与补充证据'},{title:'核对结论',hint:'逐条回到原句'},{title:'交付简报',hint:'带上引用与资料缺口'}];
const emptySource={title:'',date:'',url:'',text:''};
type DraftSource=typeof emptySource;
const tips=['把“帮我搜一下”变成一个能回答、能验证的问题。','先查官方或原始资料，再用独立材料交叉核对。不同网站转载同一内容不算多份独立证据。','发布日期、事件发生时间、样本范围要分开看。这里的搜索只在当前材料中进行。','有引文还不够：打开原句，检查它是否真的支持整条结论。','交付的是有边界的判断。保留“目前不知道什么”，方便下一轮补证。'];

export default function ResearchStudio(){
 const [caseId,setCaseId]=useState('pilot'),[step,setStep]=useState(0),[question,setQuestion]=useState(researchCases[0].question),[scope,setScope]=useState(researchCases[0].scope);
 const [sources,setSources]=useState<ResearchSource[]>(researchCases[0].sources),[selected,setSelected]=useState(['S1','S2','S3']);
 const [queries,setQueries]=useState(researchCases[0].queries.join('\n')),[claims,setClaims]=useState<ResearchClaim[]>(researchCases[0].claims),[gaps,setGaps]=useState(researchCases[0].gaps.join('\n'));
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[reading,setReading]=useState<{source:ResearchSource;quote?:string}|null>(null),[adding,setAdding]=useState(false),[draft,setDraft]=useState<DraftSource>(emptySource),[error,setError]=useState(''),[fileError,setFileError]=useState('');
 const [busy,setBusy]=useState(false),[elapsed,setElapsed]=useState(0),[engine,setEngine]=useState('教学参考草稿 · 可编辑'),[quiz,setQuiz]=useState(''),[downloaded,setDownloaded]=useState(false);
 const panel=useRef<HTMLElement>(null),controller=useRef<AbortController|null>(null);
 const active=useMemo(()=>sources.filter(s=>selected.includes(s.id)),[sources,selected]);
 const supported=useMemo(()=>supportedClaims(claims,active),[claims,active]);
 const visible=searchResearchSources(sources,search,filter),gapList=gaps.split('\n').map(s=>s.trim()).filter(Boolean);
 const output=researchMarkdown(question,scope,supported,active,gapList),prompt=researchPrompt(question,scope);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{if(!busy)return;const start=Date.now();const id=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return ()=>clearInterval(id)},[busy]);
 function go(index:number){setStep(index);setError('');requestAnimationFrame(()=>panel.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}))}
 function chooseCase(id:string){
  const item=researchCases.find(c=>c.id===id);setCaseId(id);setStep(0);setQuestion(item?.question||'');setScope(item?.scope||'限定资料范围、时间、比较维度与交付形式。');setSources(item?.sources||[]);setSelected(item?.sources.filter(s=>s.kind!=='unverified').map(s=>s.id)||[]);setQueries(item?.queries.join('\n')||'');setClaims(item?.claims||[]);setGaps(item?.gaps.join('\n')||'');setEngine(item?'教学参考草稿 · 可编辑':'手动草稿');setSearch('');setFilter('all');setError('');setQuiz('');setDownloaded(false);
 }
 function updateClaim(id:string,update:Partial<ResearchClaim>){setClaims(list=>list.map(c=>c.id===id?{...c,...update,...('reviewed' in update?{}:{reviewed:false})}:c));setDownloaded(false)}
 function addSource(){
  const next=Math.max(0,...sources.map(s=>+s.id.slice(1)))+1;
  const result=researchSourceSchema.safeParse({id:`S${next}`,title:draft.title,kind:'personal',date:draft.date||'日期待补',text:draft.text,url:draft.url.trim()||undefined});
  if(!result.success||draft.url&&!safeResearchUrl(draft.url)){setFileError('请填写资料标题与 1–1200 字正文；链接需为完整的 http 或 https 地址。');return}
  setSources(list=>[...list,result.data]);setSelected(list=>list.length<6?[...list,result.data.id]:list);setDraft(emptySource);setAdding(false);setFileError('');setSearch('');setFilter('all');
 }
 async function importText(file?:File){if(!file)return;setFileError('');if(!/\.(txt|md)$/i.test(file.name)||file.size>100000){setFileError('请使用小于 100 KB 的 TXT 或 Markdown 文件。');return}try{const text=await file.text();if(text.length>1200){setFileError('文件超过 1200 字，请挑选与问题相关的原文片段粘贴。');return}if(text.includes('\ufffd')){setFileError('文字编码无法识别，请保存为 UTF-8 后重试。');return}setDraft(d=>({...d,title:d.title||file.name.replace(/\.(txt|md)$/i,''),text}))}catch{setFileError('文件未能读取，请直接粘贴正文。')}}
 async function organize(){
  if(!active.length||!question.trim())return;
  const abort=new AbortController();controller.current=abort;setBusy(true);setElapsed(0);setError('');
  try{
   const response=await fetch('/api/research-brief',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({question,previous:scope,history:active.map(s=>({role:'user',content:JSON.stringify({...s,url:undefined})})),stream:false})});
   const data=await response.json() as {claims:ResearchClaim[];gaps:string[];engine:string;error?:string};if(!response.ok)throw new Error(data.error||'暂时无法整理，请稍后重试。');
   if(abort.signal.aborted)return;setClaims(data.claims);setGaps(data.gaps.join('\n'));setEngine(data.engine+' · 待人工核对');setDownloaded(false);
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'连接失败，请稍后重试。')}
  finally{if(controller.current===abort){setBusy(false);controller.current=null}}
 }
 function citation(ref:{sourceId:string;quote:string},index:number){const source=active.find(s=>s.id===ref.sourceId);return source?<button className="research-citation" key={ref.sourceId+index} onClick={()=>setReading({source,quote:ref.quote})}><BookOpen size={13}/>{ref.sourceId} · 查看原句</button>:null}
 function readText(){if(!reading)return null;const {text}=reading.source,quote=reading.quote;const start=quote?text.indexOf(quote):-1;return start>=0&&quote?<>{text.slice(0,start)}<mark>{quote}</mark>{text.slice(start+quote.length)}</>:text}
 const canNext=step===0?!!question.trim():step===2?active.length>0:true;
 return <div className="research-studio">
  <div className="research-workspace-intro"><div><span className="research-kicker"><FileSearch size={16}/>SEARCH → EVIDENCE</span><h3>让答案，有据可查。</h3><p>完成一次研究：提出问题、找到依据，再带走一份可追溯的简报。</p></div><div className="research-deliverable"><FileText size={25}/><span>本次产出<strong>结论 + 引文 + 待补清单</strong></span></div></div>
  <div className="research-case-picker"><span>选择一条练习路线</span><Select value={caseId} onValueChange={chooseCase} disabled={busy}><SelectTrigger aria-label="研究练习路线"><SelectValue/></SelectTrigger><SelectContent>{researchCases.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}<SelectItem value="custom">用我自己的问题和资料</SelectItem></SelectContent></Select><small>{researchCases.find(c=>c.id===caseId)?.description||'资料只在本页使用；点击 AI 整理时才会提交所选正文。'}</small></div>
  <nav className="research-stepper" aria-label="研究步骤">{steps.map((item,index)=><button key={item.title} disabled={busy} aria-current={step===index?'step':undefined} onClick={()=>go(index)}><span>0{index+1}</span><div><strong>{item.title}</strong><small>{item.hint}</small></div>{index<4&&<ChevronRight size={16}/>}</button>)}</nav>
  <div className="research-desk"><section className="research-stage" ref={panel} aria-label={`第 ${step+1} 步：${steps[step].title}`}>
   <div className="research-stage-heading"><span>STEP 0{step+1}</span><h4>{['先问清楚，再开始找','把研究问题拆成几次搜索','把资料变成你的证据库','AI 起草，你来核对依据','一份能继续推进工作的简报'][step]}</h4><p>{tips[step]}</p></div>
   <fieldset disabled={busy} className="research-fields">
    {step===0&&<>
     <label className="research-field">这次研究要回答什么？<Textarea maxLength={500} rows={3} value={question} onChange={e=>{setQuestion(e.target.value);setClaims([]);setEngine('问题已修改，请重新整理')}} placeholder="例如：在现有资料范围内，供应商 A 是否满足本次采购要求？"/></label>
     <label className="research-field">范围与判断口径<Textarea maxLength={180} rows={3} value={scope} onChange={e=>{setScope(e.target.value);setClaims([]);setEngine('范围已修改，请重新整理')}} placeholder="写清时间、对象、资料范围和比较维度"/></label>
     <div className="research-method-row"><div><strong>明确对象</strong><p>研究谁、哪件事？</p></div><div><strong>限定范围</strong><p>哪个时期、哪些材料？</p></div><div><strong>说明用途</strong><p>结论将支持什么决定？</p></div></div>
     <details className="research-teaching-note"><summary>宽泛提问怎么改得更好？</summary><p>“AI 工具哪个好？” → “团队需要中文网络调研与原文引用。请根据官方说明比较候选工具的检索范围、引用方式和使用条件，缺少统一测试的效果不排名。”</p></details>
    </>}
    {step===1&&<>
     <label className="research-field">检索任务清单 <small>每行一个，可直接编辑</small><Textarea value={queries} maxLength={1800} rows={5} onChange={e=>setQueries(e.target.value)} placeholder="对象 + 核心问题 + 时间范围 + 来源要求"/></label>
     <div className="research-query-actions"><Button variant="outline" disabled={!question.trim()} onClick={()=>setQueries([`${question} 官方 原始资料`,`${question} 样本 方法 时间范围`,`${question} 限制 反例 待确认`].join('\n'))}>根据当前问题生成检索词</Button><CopyText text={queries} label="复制检索词"/></div>
     <div className="research-search-routes"><article><Search size={21}/><h5>还没有资料</h5><p>复制检索词，在外部工具联网搜索。打开引用原文，摘取支持结论的段落，再回来添加来源。</p><div><a href="https://metaso.cn/" target="_blank" rel="noopener noreferrer">秘塔搜索 <ArrowUpRight size={14}/></a><a href="https://www.perplexity.ai/" target="_blank" rel="noopener noreferrer">Perplexity <ArrowUpRight size={14}/></a></div></article><article><FolderOpen size={21}/><h5>手头已有资料</h5><p>把相关段落加入下一步的资料库，围绕材料提问。较长资料也可以到专门的资料问答工具中研究。</p><a href="https://notebook.google/" target="_blank" rel="noopener noreferrer">NotebookLM 官方入口 <ArrowUpRight size={14}/></a></article></div>
     <details className="research-teaching-note"><summary>复制一份完整的研究提示词</summary><pre>{prompt}</pre><CopyText text={prompt} label="复制研究提示词"/></details>
    </>}
    {step===2&&<>
     <div className="research-source-toolbar"><div className="research-source-search"><Search size={17}/><Input aria-label="在当前资料中搜索" value={search} onChange={e=>setSearch(e.target.value)} placeholder="在当前资料中搜索关键词"/></div><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="来源类型"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">全部类型</SelectItem>{Object.entries(sourceKindNames).map(([value,name])=><SelectItem value={value} key={value}>{name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={()=>{setAdding(true);setFileError('')}} disabled={sources.length>=12}><Plus size={16}/>添加资料</Button></div>
     <div className="research-source-summary"><span>当前材料 {sources.length} 份 · 匹配 {visible.length} 份</span><span>已选 {active.length} / 6 份</span></div>
     <div className="research-source-list">{visible.map(source=><article key={source.id} className="research-source-card" data-selected={selected.includes(source.id)}><Checkbox checked={selected.includes(source.id)} disabled={!selected.includes(source.id)&&active.length>=6} onCheckedChange={value=>{setSelected(list=>value?[...list,source.id]:list.filter(id=>id!==source.id));setClaims(list=>list.map(c=>({...c,reviewed:false})));setDownloaded(false)}} aria-label={'选用资料 '+source.id+' '+source.title}/><div><div className="research-source-meta"><b>{source.id}</b><span data-kind={source.kind}>{sourceKindNames[source.kind]}</span><small>{source.date}</small></div><h5>{source.title}</h5><p>{source.text}</p><div className="research-source-links"><button type="button" onClick={()=>setReading({source})}>阅读完整摘录 <BookOpen size={14}/></button>{safeResearchUrl(source.url)&&<a href={safeResearchUrl(source.url)} target="_blank" rel="noopener noreferrer">原始页面 <ArrowUpRight size={14}/></a>}{source.kind==='personal'&&<button aria-label={'删除资料 '+source.id} onClick={()=>{setSources(list=>list.filter(s=>s.id!==source.id));setSelected(list=>list.filter(id=>id!==source.id))}}><Trash2 size={14}/>移除</button>}</div></div></article>)}</div>
     {!visible.length&&<div className="research-empty"><FileSearch size={28}/><h5>{sources.length?'没有匹配的资料':'先加入一份资料'}</h5><p>{sources.length?'试试更短的关键词，或切换来源类型。':'粘贴相关原文，或导入 TXT / Markdown 摘录。'}</p>{sources.length?<Button variant="outline" onClick={()=>{setSearch('');setFilter('all')}}>清除筛选</Button>:<Button onClick={()=>setAdding(true)}>添加第一份资料</Button>}</div>}
     <p className="research-caption">这里检索的是当前资料集，不执行实时联网搜索。每份保留最多 1200 字相关原文，最多加入 12 份、选用 6 份。</p>
    </>}
    {step===3&&<>
     <div className="research-ai-action"><div><Sparkles size={20}/><span><strong>按所选资料生成结论草稿</strong><small>提交 {active.length} 份正文给网站已配置的免费模型；返回后逐条检查引用。</small></span></div><Button disabled={!active.length||!question.trim()} onClick={organize}><Sparkles size={15}/>AI 整理</Button></div>
     <p className="research-caption">{engine}。引用原句会检查是否存在于材料中，结论是否恰当仍由你判断。</p>
     {active.some(s=>s.kind==='unverified')&&<p className="research-warning">已选资料中包含待核验内容。它只能作为待查线索，不能直接写成已证实的事实。</p>}
     {claims.length>supported.length&&<p className="research-warning">{claims.length-supported.length} 条草稿缺少当前选中的依据，已暂时移出结果。可回到上一步补选资料。</p>}
     <div className="research-claims">{supported.map((c,i)=><article key={c.id} className="research-claim" data-reviewed={c.reviewed}><div className="research-claim-top"><span>结论 {String(i+1).padStart(2,'0')}</span><Select value={c.kind} onValueChange={value=>updateClaim(c.id,{kind:value as EvidenceKind})}><SelectTrigger aria-label={'结论 '+(i+1)+' 的性质'}><SelectValue/></SelectTrigger><SelectContent>{Object.entries(evidenceKindNames).map(([value,name])=><SelectItem value={value} key={value}>{name}</SelectItem>)}</SelectContent></Select><button aria-label={'删除结论 '+(i+1)} onClick={()=>setClaims(list=>list.filter(item=>item.id!==c.id))}><Trash2 size={15}/></button></div><Textarea aria-label={'编辑结论 '+(i+1)} value={c.text} maxLength={500} rows={3} onChange={e=>updateClaim(c.id,{text:e.target.value})}/><div className="research-claim-bottom"><div>{c.refs.map(citation)}</div><label><Checkbox checked={c.reviewed} onCheckedChange={value=>updateClaim(c.id,{reviewed:!!value})}/>已核对原文与结论</label></div></article>)}</div>
     {!supported.length&&<div className="research-empty"><BookOpen size={26}/><p>选好资料后，可请 AI 起草，或从原文提取一条待核对的结论。</p></div>}
     {!!active.length&&<div className="research-manual-add"><Select onValueChange={id=>{const source=active.find(s=>s.id===id)!;setClaims(list=>[...list,{id:crypto.randomUUID(),text:source.text.slice(0,300),kind:source.kind==='unverified'?'gap':'fact',refs:[{sourceId:source.id,quote:source.text.slice(0,300)}],reviewed:false}])}} value=""><SelectTrigger aria-label="从来源添加结论"><SelectValue placeholder="从来源提取一条，手动编辑…"/></SelectTrigger><SelectContent>{active.map(s=><SelectItem key={s.id} value={s.id}>{s.id} · {s.title}</SelectItem>)}</SelectContent></Select></div>}
     <label className="research-field">还需要补充哪些材料？<Textarea maxLength={1800} value={gaps} rows={4} onChange={e=>setGaps(e.target.value)} placeholder="每行一项，写清缺少的资料或需要验证的问题"/></label>
     {caseId==='pilot'&&<details className="research-teaching-note"><summary>练一练：12 / 200 = 6%，可以得出什么？</summary><RadioGroup value={quiz} onValueChange={setQuiz} aria-label="样本口径练习">{[['accuracy','模型准确率是 94%'],['sample','这批单据有 6% 需要人工修正'],['speed','处理速度提高了 94%']].map(([value,label])=><label key={value}><RadioGroupItem value={value}/>{label}</label>)}</RadioGroup>{quiz&&<p role="status">{quiz==='sample'?'判断正确。这里的分母是单据张数，只说明这一批的人工修正比例。':'这个结论超出了材料。没有字段级错误标注、抽样方法或耗时对照，不能推出模型准确率或效率提升。'}</p>}</details>}
    </>}
    {step===4&&<>
     <div className="research-export-toolbar"><CopyText text={output} label="复制简报"/><Button onClick={()=>{downloadText('research-brief.md',output,'text/markdown;charset=utf-8');setDownloaded(true)}} disabled={!question.trim()||!active.length}><Download size={16}/>下载 Markdown</Button></div>{downloaded&&<p role="status" className="research-caption">已生成下载文件，包含原始摘录、来源链接与核对状态。</p>}
     <article className="research-report"><div className="research-report-label"><FileText size={16}/>RESEARCH BRIEF<span>{supported.filter(c=>c.reviewed).length} / {supported.length} 条已核对</span></div><h4>{question||'请先填写研究问题'}</h4><p className="research-report-scope">{scope}</p><h5>结论与依据</h5>{supported.length?supported.map(c=><div className="research-report-claim" key={c.id}><span className="research-report-kind">{evidenceKindNames[c.kind]} · {c.reviewed?'已人工核对':'待人工核对'}</span><p>{c.text}</p><div>{c.refs.map(citation)}</div></div>):<p>暂无可追溯结论。请回到前面选择资料、整理草稿。</p>}<h5>待补信息与下一步</h5>{gapList.length?<ul>{gapList.map((g,i)=><li key={i}>{g}</li>)}</ul>:<p>尚未填写，请再检查材料中是否存在缺口。</p>}<h5>本次使用的资料</h5><div className="research-report-sources">{active.map(s=><button key={s.id} onClick={()=>setReading({source:s})}><span>{s.id}</span><div>{s.title}<small>{sourceKindNames[s.kind]} · {s.date}</small></div><BookOpen size={16}/></button>)}</div></article>
    </>}
   </fieldset>
   {busy&&<div className="research-busy" role="status"><Loader2 className="animate-spin" size={18}/><span>已提交 {active.length} 份资料，等待 AI 整理与引用检查… {elapsed} 秒</span><Button variant="ghost" onClick={()=>{controller.current?.abort();setBusy(false)}}>停止</Button></div>}
   {error&&<p role="alert" className="research-error">{error}</p>}
   <footer className="research-stage-footer"><Button variant="ghost" disabled={step===0||busy} onClick={()=>go(step-1)}><ArrowLeft size={16}/>上一步</Button><span>{step+1} / 5</span>{step<4?<Button disabled={!canNext||busy} onClick={()=>go(step+1)}>下一步：{steps[step+1].title}<ArrowRight size={16}/></Button>:<Button variant="outline" onClick={()=>go(2)}>继续补充资料 <Plus size={16}/></Button>}</footer>
  </section><aside className="research-brief-rail"><span className="research-kicker">本次研究</span><h4>{question||'等待一个好问题'}</h4><div className="research-brief-numbers"><div><strong>{active.length.toString().padStart(2,'0')}</strong><span>选用资料</span></div><div><strong>{supported.length.toString().padStart(2,'0')}</strong><span>可追溯草稿</span></div></div><div className="research-evidence-chain"><span>问题</span><i/><span>原始材料</span><i/><span>有依据的判断</span></div><p>一句话结论，可以沿着引用回到原文。</p><div className="research-rail-status"><Check size={16}/><span>交付时保留人工核对状态</span></div><p className="research-rail-note">先完成参考案例，再换成自己的研究问题。教学样例不代表真实企业数据。</p></aside></div>
  <Dialog open={!!reading} onOpenChange={value=>{if(!value)setReading(null)}}><DialogContent className="research-source-dialog"><DialogHeader><DialogTitle>{reading?.source.id} · {reading?.source.title}</DialogTitle><DialogDescription>{reading&&sourceKindNames[reading.source.kind]} · {reading?.source.date}</DialogDescription></DialogHeader><p className="research-reading">{readText()}</p>{safeResearchUrl(reading?.source.url)&&<a className="research-original-link" href={safeResearchUrl(reading?.source.url)} target="_blank" rel="noopener noreferrer">打开原始页面核对 <ArrowUpRight size={16}/></a>}<p className="research-caption">高亮部分为当前结论引用的连续原句。检查它的前后文、时间和适用范围。</p></DialogContent></Dialog>
  <Dialog open={adding} onOpenChange={setAdding}><DialogContent className="research-source-dialog"><DialogHeader><DialogTitle>加入一份资料</DialogTitle><DialogDescription>粘贴相关摘录；链接只用于记录来源，不会自动抓取网页。</DialogDescription></DialogHeader><label className="research-field">资料标题<Input maxLength={100} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label><div className="research-form-pair"><label className="research-field">日期 / 版本<Input maxLength={40} value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))} placeholder="例如 2026-09 / v2"/></label><label className="research-field">原始链接（可选）<Input type="url" maxLength={500} value={draft.url} onChange={e=>setDraft(d=>({...d,url:e.target.value}))} placeholder="https://…"/></label></div><label className="research-field">相关原文 <small>{draft.text.length} / 1200 字</small><Textarea maxLength={1200} value={draft.text} rows={6} onChange={e=>setDraft(d=>({...d,text:e.target.value}))}/></label><div className="research-import"><label><Upload size={16}/>从 TXT / Markdown 导入<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={e=>{void importText(e.target.files?.[0]);e.target.value=''}}/></label><Button onClick={addSource} disabled={sources.length>=12}><Plus size={16}/>加入资料库</Button></div>{fileError&&<p role="alert" className="research-error">{fileError}</p>}</DialogContent></Dialog>
 </div>;
}
