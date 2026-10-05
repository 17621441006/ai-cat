"use client";
import {desktopAnswer,desktopHits,desktopIntro,desktopNavigation} from '@/lib/desktop-knowledge';
import CatAssistantLauncher from './cat-assistant-launcher';
import {warmCatPortraits} from '@/lib/cat-assets';
import {CatChatIcon,CatChatBubble,CatChatPerch,type CatBubbleStyle} from './cat-chat-decoration';
import AssistantMarkdown from './assistant-markdown';
import AssistantPanel from './assistant-panel';
import AssistantProgress,{advanceTrace,finishTrace,type AssistantTrace} from './assistant-progress';
import {consumeAssistantStream,cleanLocalAnswer,type AssistantStage} from '@/lib/assistant-stream';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Send,Sparkles,ArrowUpRight,BookOpen,Settings2,RotateCcw,ChevronDown,Download,Monitor,Cloud,Search,ShieldCheck,Check,X} from 'lucide-react';
import {Sheet,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Progress} from '@/components/ui/progress';
import {groundedMessages,knowledgeCount,localGlossaryAnswer,retrievalAnswer,searchKnowledge,type KnowledgeHit} from '@/lib/site-search';
import type {WebWorkerMLCEngine} from '@mlc-ai/web-llm';
import {assistantDestination,resolveAssistantNavigation,type AssistantDestination} from '@/lib/assistant-navigation';

type Mode='search'|'local'|'cloud';
type NavigationChoice={status:'choose'|'opened'|'cancelled';ids:string[]};
type Message={id:string;role:'user'|'assistant';text:string;hits?:KnowledgeHit[];engine?:string;trace?:AssistantTrace;truncated?:boolean;navigation?:NavigationChoice};
const starters=['RAG 是什么？','MCP 是什么？','我想从零开始学习 AI','AI 工具有哪些？用表格对比'];
const bubbleOptions:{value:CatBubbleStyle;label:string}[]=[{value:'sideeye',label:'脏脏包 · 犀利侧目'},{value:'reference',label:'参考同款猫'},{value:'persian',label:'脏脏包 · 原版'},{value:'cheeky',label:'旧版贱萌'},{value:'classic',label:'经典长猫'}];
const validHref=(href:string)=>/^\/(?:$|(?:learn|ontology|projects|products|tools|coding|agents|models|resources|guides|roadmap|community|glossary|industry|work|business|library)(?:[?#]|$))/.test(href);
export function AssistantHome(){const[q,setQ]=useState('');const launch=(question:string)=>window.dispatchEvent(new CustomEvent('open-knowledge-assistant',{detail:question}));return <section className="assistant-home"><div className="assistant-home-title"><CatChatIcon/><div><h2>问问AI小脏</h2><p>说出你想学什么，我来找资料、找案例、找入口。</p></div><span className="assistant-home-tag">站内知识问答</span></div><form onSubmit={e=>{e.preventDefault();launch(q);setQ('')}}><Input aria-label="向研习助手提问" value={q} maxLength={600} onChange={e=>setQ(e.target.value)} placeholder="例如：我想体验会议视频转写，应该去哪里？"/><Button type="submit"><Sparkles size={17}/>开始对话</Button></form><div className="assistant-quick-prompts">{starters.slice(0,3).map(s=><button onClick={()=>launch(s)} key={s}>{s}<ArrowUpRight size={13}/></button>)}</div></section>}

export default function KnowledgeAssistant({onNavigate,desktop=false,initialOpen=false,hideLauncher=false,apiEndpoint='/api/assistant',onClose}:{onNavigate:(href:string)=>boolean;desktop?:boolean;initialOpen?:boolean;hideLauncher?:boolean;apiEndpoint?:string;onClose?:()=>void}){
 useEffect(warmCatPortraits,[]);
 const[open,setOpen]=useState(initialOpen),[q,setQ]=useState(''),[messages,setMessages]=useState<Message[]>([]);
 const[mode,setMode]=useState<Mode>(desktop?'cloud':'local'),[settings,setSettings]=useState(false),[busy,setBusy]=useState(false);
 const[loading,setLoading]=useState(false),[progress,setProgress]=useState(0),[progressText,setProgressText]=useState(''),[ready,setReady]=useState(false);
 const[error,setError]=useState(''),[cloudStatus,setCloudStatus]=useState<'checking'|'ready'|'missing'|'error'>('checking');
 const[bubbleStyle,setBubbleStyle]=useState<CatBubbleStyle>('sideeye');
 const[expandedHeader,setExpandedHeader]=useState(false);
 const[navigationNotice,setNavigationNotice]=useState('');
 useEffect(()=>{if(!navigationNotice)return;const timer=setTimeout(()=>setNavigationNotice(''),6500);return()=>clearTimeout(timer)},[navigationNotice]);
 useEffect(()=>{try{setExpandedHeader(localStorage.getItem('ai-practice-chat-header')==='expanded')}catch{}},[]);
 function toggleHeader(){setExpandedHeader(value=>{try{localStorage.setItem('ai-practice-chat-header',value?'compact':'expanded')}catch{}return !value})}
 const engine=useRef<WebWorkerMLCEngine|null>(null),worker=useRef<Worker|null>(null),controller=useRef<AbortController|null>(null);
 const requestId=useRef(0),loadId=useRef(0),previous=useRef(''),restored=useRef(false),activeAnswer=useRef<string|null>(null);
 const chat=useRef<HTMLDivElement|null>(null),latestQuestion=useRef<HTMLElement|null>(null),resizeObserver=useRef<ResizeObserver|null>(null);
 // Reserve one viewport for the latest turn, so its question can stay at the top
 // even before the first answer token arrives. Streaming never changes scrollTop.
 const bindChat=useCallback((node:HTMLDivElement|null)=>{
  resizeObserver.current?.disconnect();chat.current=node;
  if(node){const resize=()=>{const style=getComputedStyle(node);node.style.setProperty('--chat-turn-min-height',Math.max(0,node.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom))+'px')};resize();resizeObserver.current=new ResizeObserver(resize);resizeObserver.current.observe(node)}
 },[]);
 const bindQuestion=useCallback((node:HTMLElement|null)=>{
  latestQuestion.current=node;
  if(node)requestAnimationFrame(()=>{const scroller=chat.current;if(scroller&&latestQuestion.current===node)scroller.scrollTop+=node.getBoundingClientRect().top-scroller.getBoundingClientRect().top-16});
 },[]);
 useEffect(()=>{
  try{
   const saved=JSON.parse(sessionStorage.getItem((desktop?'dirtybag-desktop-chat':'ai-practice-chat'))||'[]');
   if(Array.isArray(saved)){
    const safe:Message[]=saved.slice(-12).filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.trim()).map((m,i)=>({id:'restored-'+i,role:m.role,text:m.role==='assistant'?m.text.replaceAll('放到供应链工作里：','在供应链场景中：'):m.text,engine:typeof m.engine==='string'?m.engine:undefined,truncated:m.truncated===true,hits:Array.isArray(m.hits)?m.hits.filter((h:KnowledgeHit)=>typeof h.href==='string'&&(validHref(h.href)||(desktop&&/^desktop:[a-z]+$/.test(h.href)))):undefined,trace:m.trace&&Array.isArray(m.trace.steps)?(m.trace.status==='running'?finishTrace(m.trace,'stopped'):m.trace):undefined}));
    // Restore choices by registry ID, never by an untrusted saved URL; restoration does not navigate.
    safe.forEach((message,i)=>{const original=saved.slice(-12).filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.trim())[i]?.navigation;if(original&&['choose','opened','cancelled'].includes(original.status)&&Array.isArray(original.ids)){const ids=original.ids.filter((id:unknown)=>typeof id==='string'&&assistantDestination(id)).slice(0,8);if(ids.length)message.navigation={status:original.status,ids}}});
    setMessages(safe);previous.current=safe.filter(m=>m.role==='user').at(-1)?.text||'';
   }
  }catch{}
  restored.current=true;
  return()=>{requestId.current++;loadId.current++;controller.current?.abort();resizeObserver.current?.disconnect();engine.current?.unload().catch(()=>{});worker.current?.terminate()};
 },[]);
 useEffect(()=>{if(restored.current&&!busy)try{sessionStorage.setItem((desktop?'dirtybag-desktop-chat':'ai-practice-chat'),JSON.stringify(messages.slice(-12)))}catch{}},[messages,busy]);
 useEffect(()=>{function launch(e:Event){setOpen(true);const value=(e as CustomEvent<string>).detail||'';if(value)setQ(value)}window.addEventListener('open-knowledge-assistant',launch);return()=>window.removeEventListener('open-knowledge-assistant',launch)},[]);
 useEffect(()=>{try{const saved=localStorage.getItem((desktop?'dirtybag-desktop-mode':'ai-practice-assistant-mode-v2'));if(saved==='search'||saved==='cloud'||saved==='local')setMode(saved);const bubble=localStorage.getItem('ai-practice-chat-bubble-v3');if(bubbleOptions.some(option=>option.value===bubble))setBubbleStyle(bubble as CatBubbleStyle)}catch{}},[]);
 useEffect(()=>{
  if(!open)return;const abort=new AbortController();setCloudStatus('checking');
  fetch(apiEndpoint,{signal:abort.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json() as {configured?:boolean};setCloudStatus(data.configured?'ready':'missing')}).catch(()=>{if(!abort.signal.aborted)setCloudStatus('error')});
  return()=>abort.abort();
 },[open]);
 function chooseMode(value:string){if(busy)return;const choice=value as Mode;setMode(choice);setError('');try{localStorage.setItem((desktop?'dirtybag-desktop-mode':'ai-practice-assistant-mode-v2'),choice)}catch{}}
 function chooseBubble(value:string){if(!bubbleOptions.some(option=>option.value===value))return;setBubbleStyle(value as CatBubbleStyle);try{localStorage.setItem('ai-practice-chat-bubble-v3',value)}catch{}}
 async function loadModel(){const id=++loadId.current;setError('');setLoading(true);setProgress(0);setProgressText('检查本机图形能力…');try{const gpu=(navigator as unknown as {gpu?:{requestAdapter:()=>Promise<{features:Set<string>}|null>}}).gpu;if(!gpu)throw new Error('当前浏览器未启用 WebGPU。请用支持 WebGPU 的 Chrome / Edge，或选择站内检索、云端免费模型。');const adapter=await gpu.requestAdapter();if(!adapter)throw new Error('当前设备未提供可用的 WebGPU 显卡。可以继续使用站内检索或云端免费模型。');const model=adapter.features.has('shader-f16')?'Qwen3-0.6B-q4f16_1-MLC':'Qwen3-0.6B-q4f32_1-MLC';const webllm=await import('@mlc-ai/web-llm');if(id!==loadId.current)return;const w=new Worker(new URL('../lib/llm.worker.ts',import.meta.url),{type:'module'});worker.current=w;const e=await webllm.CreateWebWorkerMLCEngine(w,model,{initProgressCallback:p=>{if(id!==loadId.current)return;setProgress(Math.round(p.progress*100));setProgressText(p.text.includes('Loading')?'正在下载并准备模型…':p.text)}},{context_window_size:4096});if(id!==loadId.current){await e.unload();w.terminate();return}engine.current=e;setReady(true);setProgressText('本机 Qwen3 已就绪');setProgress(100)}catch(e){if(id===loadId.current){setError(e instanceof Error?e.message:'模型加载失败，请检查设备和网络后重试。');worker.current?.terminate();worker.current=null}}finally{if(id===loadId.current)setLoading(false)}}
 function cancelLoad(){loadId.current++;worker.current?.terminate();worker.current=null;engine.current=null;setLoading(false);setProgress(0);setProgressText('已取消下载');setReady(false)}

 function openDestination(destination:AssistantDestination,answerId:string){
  // All callers supply entries from our local registry, never model-generated actions.
  const known=assistantDestination(destination.id);if(!known)return;
  if(!onNavigate(known.href)){setError('这个页面暂时未能打开，请重试。');return}
  setMessages(items=>items.map(m=>m.id===answerId?{...m,text:`已打开 **${known.title}**。`,navigation:{status:'opened',ids:[known.id]}}:m));
  if(!desktop)setOpen(false);setNavigationNotice(`已打开 ${known.title}`);
 }

 async function ask(value=q){
  const question=value.trim();if(!question||busy||activeAnswer.current)return;
  const target=desktop?desktopNavigation(question):null;
  if(target){setQ('');setMessages(items=>[...items,{id:'desktop-q-'+Date.now(),role:'user',text:question},{id:'desktop-a-'+Date.now(),role:'assistant',text:`正在打开 **${target.title}**。`,engine:'桌面导航'}]);onNavigate(target.href);return}
  const last=messages.at(-1),pending=last?.navigation?.status==='choose'?last.navigation.ids:[];
  const navigation=resolveAssistantNavigation(question,pending);
  if(navigation){
   const answerId='navigate-'+Date.now();
   const text=navigation.kind==='open'?`正在打开 **${navigation.destination.title}**…`:navigation.kind==='choose'?'找到几个相关入口，你想打开哪一个？点击确认，或回复“第一个”“第二个”。':navigation.kind==='cancel'?'已取消，继续聊就好。':'暂时没有匹配到这个站内页面。可以说“打开智能体工坊”“打开提示词工程”或“打开视频剪辑”。';
   const choice:NavigationChoice|undefined=navigation.kind==='choose'?{status:'choose',ids:navigation.options.map(item=>item.id)}:undefined;
   setQ('');setError('');setSettings(false);previous.current=question;
   setMessages(items=>[...items.map(m=>m.navigation?.status==='choose'?{...m,navigation:{...m.navigation,status:'cancelled' as const}}:m),{id:answerId+'-question',role:'user',text:question},{id:answerId,role:'assistant',text,engine:'站内页面导航',navigation:choice}]);
   if(navigation.kind==='open')openDestination(navigation.destination,answerId);
   return;
  }
  const termReply=(desktop?desktopAnswer(question):null)||localGlossaryAnswer(question);
  if(!termReply&&mode==='local'&&!ready){setSettings(true);setError('首次使用本机模式，请先点击“下载并启用本机模型”；也可以切换到云端免费模型。');return}
  const id=++requestId.current,answerId='answer-'+Date.now()+'-'+id;
  const history=messages.filter(m=>m.text.trim()&&(m.role==='user'||!m.trace||m.trace.status==='complete')).slice(-6).map(m=>({role:m.role,content:m.text.slice(0,1800)}));
  const previousQuestion=previous.current;previous.current=question;activeAnswer.current=answerId;
  let hits=termReply?.hits||(desktop?[...desktopHits(question),...searchKnowledge(question,previousQuestion)].slice(0,4):searchKnowledge(question,previousQuestion)),text='',used=termReply?(termReply.hits.some(h=>h.id.startsWith('desktop-'))?'桌面使用指南 · 本地资料':'本地术语解释 · 站内词典'):mode==='search'?'站内检索 · 非模型生成':mode==='local'?'本机 Qwen3 · 模型生成':'云端 · 免费对话模型';
  let trace:AssistantTrace={status:'running',startedAt:Date.now(),steps:[]};
  let truncated=false;const showTrace=!termReply&&mode!=='search';
  const update=(patch:Partial<Message>)=>{if(id===requestId.current)setMessages(items=>items.map(m=>m.id===answerId?{...m,...patch,trace:showTrace?(patch.trace||m.trace):undefined}:m))};
  const stage=(stage:AssistantStage,message:string,sources?:AssistantTrace['sources'])=>{trace=advanceTrace(trace,stage,message,sources);update({trace})};
  setQ('');setError('');setSettings(false);setBusy(true);
  setMessages(items=>[...items,{id:answerId+'-question',role:'user',text:question},{id:answerId,role:'assistant',text:'',engine:used,trace:showTrace?trace:undefined}]);
  stage('context',termReply?'已找到本地术语解释':hits.length?`已找到 ${hits.length} 条相关站内资料`:'当前问题按通用对话处理',hits.map(h=>({title:h.title,href:h.href})));
  try{
   if(termReply||mode==='search'){
    text=termReply?.text||retrievalAnswer(question,hits);
   }else if(mode==='local'){
    stage('waiting','等待本机模型开始回答');
    const context=groundedMessages(question,hits.slice(0,2).map(h=>({...h,text:h.text.slice(0,230)})),previousQuestion,history.slice(-4).map(turn=>({...turn,content:turn.content.slice(0,200)})));
    if(desktop)context[0].content+='\n'+desktopIntro;
    const stream=await engine.current!.chat.completions.create({messages:context,stream:true,temperature:.25,max_tokens:900,extra_body:{enable_thinking:false}});
    let raw='',started=false;
    for await(const chunk of stream){
     if(id!==requestId.current)return;
     raw+=chunk.choices[0]?.delta?.content||'';
     text=cleanLocalAnswer(raw);
     if(text){if(!started){started=true;stage('answering','本机模型正在生成回答')}update({text})}
     if(chunk.choices[0]?.finish_reason==='length')truncated=true;
    }
   }else{
    stage('connecting','正在连接免费对话模型');
    const abort=new AbortController();controller.current=abort;
    const timer=setTimeout(()=>abort.abort(),70_000);
    try{
     const response=await fetch(apiEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,previous:previousQuestion,history,stream:true}),signal:abort.signal});
     if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error||'云端模型暂时无法回答。')}
     if(response.headers.get('content-type')?.includes('text/event-stream')&&response.body){
      await consumeAssistantStream(response.body,event=>{
       if(id!==requestId.current)return;
       if(event.type==='stage'){
        // Context was already found locally; replace that record without adding
        // a duplicate step when the server confirms it.
        if(event.stage==='context'){trace={...trace,sources:event.sources,steps:trace.steps.map(step=>step.stage==='context'?{...step,message:event.message}:step)};update({trace})}
        else stage(event.stage,event.message);
        if(event.model){used='云端 · '+event.model;update({engine:used})}
       }else if(event.type==='text'){text=event.text;update({text})}
       else if(event.type==='done'){text=event.text;hits=event.hits;used=event.engine;truncated=event.truncated===true}
      });
     }else{
      const data=await response.json() as {text:string;hits:KnowledgeHit[];engine:string;truncated?:boolean};
      text=data.text;hits=data.hits||hits;used=data.engine||used;truncated=data.truncated===true;
     }
    }finally{clearTimeout(timer);if(controller.current===abort)controller.current=null}
   }
   if(id!==requestId.current)return;
   if(!text?.trim())throw new Error('模型没有返回可用文本，请再试一次。');
   stage('formatting','已整理回答、重点与图表');
   trace=finishTrace(trace,'complete');
   update({text,hits,engine:used,trace,truncated});
  }catch(e){
   if(id!==requestId.current)return;
   const reason=e instanceof Error&&e.name==='AbortError'?'模型响应超时，请稍后重试。':e instanceof Error?e.message:'模型连接失败，请稍后重试。';
   setError(reason);
   trace=finishTrace(trace,'error');
   if(!text){text=hits.length?retrievalAnswer(question,hits):'这次连接没有完成，暂时没能生成回答。可以重试，或在对话设置中切换模式。';used=hits.length?'站内检索回退 · 非模型生成':'连接未完成 · 未生成回答'}
   else used+=' · 回答未完成';
   update({text,hits,engine:used,trace});
  }finally{if(id===requestId.current){activeAnswer.current=null;setBusy(false)}}
 }
 function stop(){
  const answerId=activeAnswer.current;requestId.current++;activeAnswer.current=null;controller.current?.abort();controller.current=null;engine.current?.interruptGenerate();
  setMessages(items=>items.map(m=>m.id===answerId?{...m,text:m.text||'已停止本次回答。',trace:m.trace?finishTrace(m.trace,'stopped'):undefined}:m));setBusy(false);setError('');
 }
 const groups=messages.reduce<Message[][]>((turns,message)=>{if(message.role==='user'||!turns.length)turns.push([message]);else turns.at(-1)!.push(message);return turns},[]);
 const lastQuestionId=messages.filter(m=>m.role==='user').at(-1)?.id;
 return <>{!hideLauncher&&<CatAssistantLauncher open={open} onOpen={()=>setOpen(true)}/>}{navigationNotice&&!open&&<div className="assistant-navigation-toast" role="status"><Check size={17}/><span>{navigationNotice}</span><button onClick={()=>{setOpen(true);setNavigationNotice('')}}>继续对话</button><button aria-label="关闭导航提示" onClick={()=>setNavigationNotice('')}><X size={15}/></button></div>}<Sheet open={open} onOpenChange={value=>{if(desktop&&!value){onClose?.();return}setOpen(value)}}>
  <AssistantPanel>
   <SheetHeader className="assistant-reading-header" data-expanded={expandedHeader}><div className="assistant-panel-title"><CatChatIcon/><div><SheetTitle>{desktop?'脏脏包 · 猫助手':'AI小脏 · 研习助手'}</SheetTitle><SheetDescription className={expandedHeader?'':'sr-only'}>术语解释 · 站内知识 · 页面导航</SheetDescription></div></div><CatChatPerch mood={busy?'thinking':q.trim()?'curious':messages.at(-1)?.role==='assistant'?'happy':'listening'}/></SheetHeader>
   <div className="assistant-mode-bar assistant-reading-tools"><span><span className="assistant-mode-dot"/>{mode==='search'?'站内检索':mode==='local'?(ready?'本机 Qwen3 已就绪':'本机模型待加载'):'云端免费模型'}</span><div><button onClick={toggleHeader} aria-expanded={expandedHeader} title={expandedHeader?'收起顶部，增加阅读空间':'展开头像与介绍'}>{expandedHeader?'精简顶部':'展开头像'}<ChevronDown size={14} className={expandedHeader?'is-expanded':''}/></button><button onClick={()=>setSettings(v=>!v)} aria-expanded={settings} aria-controls="assistant-settings"><Settings2 size={15}/>设置<ChevronDown size={14}/></button></div></div>
   {settings&&<div className="assistant-settings" id="assistant-settings">
    <Tabs value={mode} onValueChange={chooseMode}><TabsList><TabsTrigger value="search" disabled={busy}><Search size={14}/>站内检索</TabsTrigger><TabsTrigger value="local" disabled={busy}><Monitor size={14}/>本机模型</TabsTrigger><TabsTrigger value="cloud" disabled={busy}><Cloud size={14}/>云端免费</TabsTrigger></TabsList></Tabs>
    {mode==='search'?<p>即时查找本站 {knowledgeCount} 条课程、指南、产品与工具记录。常见术语直接给出定义和工作示例，其余问题按站内资料检索；无需模型或密钥。</p>:mode==='local'?<>
     <p><strong>Qwen3 0.6B / WebLLM</strong> · 无 API 费用、无需密钥。首次需下载模型文件，约需 1.4–2 GB 显存；适合短问答，复杂问题以资料为准。问题和片段在本机推理。</p>
     {loading&&<><Progress value={progress}/><small>{progress}% · {progressText}</small></>}
     <div className="assistant-setting-actions"><Button size="sm" disabled={loading||ready} onClick={loadModel}><Download size={14}/>{ready?'模型已就绪':loading?'正在准备':'下载并启用本机模型'}</Button>{loading&&<Button size="sm" variant="outline" onClick={cancelLoad}>取消</Button>}<a href="https://webllm.mlc.ai/docs/user/basic_usage.html" target="_blank" rel="noopener noreferrer">运行条件 ↗</a></div>
    </>:<>
     <p>使用精选免费对话模型回答日常问题，并结合最近几轮对话理解追问。术语释义仍优先在本地回答。</p>
     <div className={`assistant-cloud-status${cloudStatus==='ready'?' is-ready':''}`} role="status"><ShieldCheck size={17}/><span>{cloudStatus==='ready'?'云端连接已保存 · 无需重复粘贴':cloudStatus==='checking'?'正在检查云端连接…':cloudStatus==='missing'?'网站尚未配置云端连接':'暂时无法检查连接，请登录后重试'}</span></div>
     <small>支持重点标注、表格，以及雷达图、折线图、柱状图和饼图。提供数据并说明想看的图形，即可轻触或悬停查看数据和放大；免费模型繁忙时可以停止或稍后重试。</small>
     <div className="assistant-setting-actions"><a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">管理 OpenRouter 密钥 ↗</a></div>
    </>}
    <div className="assistant-bubble-settings"><span>气泡样式</span><Tabs value={bubbleStyle} onValueChange={chooseBubble}><TabsList aria-label="气泡样式">{bubbleOptions.map(option=><TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>)}</TabsList></Tabs></div>
   </div>}
   <div className="knowledge-chat" ref={bindChat}>
    {!messages.length&&<div className="knowledge-welcome"><h3>{desktop?'喵，这台电脑我很熟。':'想解决哪一个工作问题？'}</h3><p>{desktop?'问 AI，也问桌面。可以让我打开作品，或者聊聊你想学的知识。':'输入 RAG、MCP、Agent 等术语，我会直接解释。也可以说“打开智能体工坊”，直接前往学习页面。'}</p>{(desktop?['这个桌面有哪些作品？','打开 Minecraft','怎么用右键整理桌面？','RAG 是什么？']:starters).map(s=><button onClick={()=>ask(s)} key={s}>{s}<ArrowUpRight size={16}/></button>)}</div>}
    {groups.map(turn=><section className="knowledge-turn" key={turn[0].id}>{turn.map(m=><article className={`knowledge-message ${m.role}`} key={m.id} ref={m.id===lastQuestionId?bindQuestion:undefined}>
     {m.role==='user'?<><span className="cat-question-author">你</span><CatChatBubble variant={bubbleStyle}><p>{m.text}</p></CatChatBubble></>:<>
      {m.trace&&<AssistantProgress trace={m.trace} onStop={m.trace.status==='running'?stop:undefined}/>}
      <div className="assistant-reply-author"><div><strong>AI小脏</strong><small>{m.engine||'研习助手'}</small></div></div>
      {m.text&&<AssistantMarkdown text={m.text} question={turn[0].role==='user'?turn[0].text:''} streaming={busy&&m.id===activeAnswer.current}/>}
      {m.navigation&&m.navigation.status!=='cancelled'&&<div className="assistant-navigation-options" aria-label="页面导航选项">{m.navigation.ids.map((id,index)=>{const destination=assistantDestination(id);if(!destination)return null;return <button key={id} disabled={busy} onClick={()=>openDestination(destination,m.id)}><span className="assistant-navigation-number">{m.navigation?.status==='opened'?<Check size={16}/>:index+1}</span><span><strong>{destination.title}</strong><small>{destination.description}</small></span><span className="assistant-navigation-confirm">{m.navigation?.status==='opened'?'再次打开':'确认打开'}<ArrowUpRight size={15}/></span></button>})}{m.navigation.status==='choose'&&<button className="assistant-navigation-cancel" disabled={busy} onClick={()=>setMessages(items=>items.map(item=>item.id===m.id?{...item,text:'已取消本次页面选择。',navigation:undefined}:item))}>暂不跳转</button>}</div>}
      {m.truncated&&<p className="assistant-answer-note">本次回答已到长度上限，可以发送“继续”接着看。</p>}
     </>}
     {m.hits?.length?<div className="knowledge-citations"><span><BookOpen size={15}/>站内依据与入口<small>{m.hits.length} 条相关资料</small></span>{m.hits.map(h=><a href={h.href} key={h.id} onClick={event=>{if(desktop){event.preventDefault();onNavigate(h.href)}else setOpen(false)}}><span><small>{h.kind}</small><strong>{h.title}</strong></span><ArrowUpRight size={17}/></a>)}</div>:null}
    </article>)}</section>)}
   </div>
   {error&&<p role="status" className="assistant-error">{error}</p>}
   <form className="knowledge-compose" onSubmit={e=>{e.preventDefault();ask()}}>
    <Textarea aria-label="研习助手问题" maxLength={600} rows={2} placeholder="问一个问题，或告诉我你想去哪里…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();ask()}}}/>
    <div className="knowledge-compose-actions"><button type="button" disabled={busy} onClick={()=>{setMessages([]);previous.current='';setError('')}}><RotateCcw size={14}/>新对话</button><small>{mode==='search'?'本站内容 · 点击入口前往':mode==='local'?'本机推理 · 问题留在设备':'云端问答 · 站内资料辅助'}</small><Button type="submit" disabled={busy||!q.trim()} size="sm"><Send size={15}/>发送</Button></div>
   </form>
  </AssistantPanel>
 </Sheet></>;
}
