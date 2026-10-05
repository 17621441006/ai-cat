import type {KnowledgeHit} from './site-search';

export type ConversationTurn={role:'user'|'assistant';content:string};
type PreparedAnswer={hits:KnowledgeHit[];messages:{role:'system'|'user'|'assistant';content:string}[];localText?:string;fallbackText:string};
type Dependencies={allowStreaming?:boolean;getUser:()=>Promise<{userId:string}|null>;getKey:()=>string|undefined;prepare:(question:string,previous:string,history:ConversationTurn[])=>PreparedAnswer;fetcher?:typeof fetch};
const responseHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const requests=new Map<string,{started:number;count:number;busy:boolean}>();
// Reviewed against the provider catalogue on 2026-09-21. Never route to a
// classifier, specialist medical model, or an unspecified/paid fallback.
export const freeChatModels=['qwen/qwen3.8-27b:free','google/gemma-4-26b-a4b-it:free','dots-studio/dots-3-note-preview:free'] as const;
class RequestError extends Error{readonly status:number;constructor(message:string,status:number){super(message);this.status=status}}
function json(value:unknown,status=200){return Response.json(value,{status,headers:responseHeaders})}
function publicError(error:unknown){return error instanceof RequestError?error.message:error instanceof Error&&error.name==='AbortError'?'云端响应超时或已停止，请稍后重试。':'云端连接暂时不可用，请稍后重试。'}
export function safeAnswer(content:string,key=''){
 let text=content.replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/gi,'').replace(/<[^>]*$/,'').replace(/https?:\/\/[^\s)]+/g,'〔请使用下方已核对入口〕');
 if(key){text=text.replaceAll(key,'〔密钥已隐藏〕');for(let n=Math.min(key.length-1,text.length);n>=6;n--){if(text.endsWith(key.slice(0,n))){text=text.slice(0,-n);break}}}
 return text.trim().slice(0,12000);
}
function modelLabel(model:unknown){
 if(typeof model!=='string')return '精选免费对话模型';
 if(!freeChatModels.some(allowed=>allowed.replace(/:free$/,'')===model.replace(/:free$/,'')))throw new RequestError('返回的模型不在对话模型列表内，请重试。',502);
 return model;
}
function checkAnswer(text:string){
 if(/^\s*(?:user\s+safety|assistant\s+safety|safety\s+classification)\s*:/i.test(text))throw new RequestError('模型返回了分类结果，未生成正常回答，请重试。',502);
}

async function readInput(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new RequestError('请使用 JSON 提交问题。',415);
 if(Number(request.headers.get('content-length'))>32768)throw new RequestError('对话过长，请开启新对话后重试。',413);
 const reader=request.body?.getReader();if(!reader)throw new RequestError('请输入问题。',400);
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new RequestError('对话过长，请开启新对话后重试。',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 let input:unknown;try{input=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new RequestError('问题格式不正确，请重新发送。',400)}
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RequestError('请输入有效问题。',400);
 const {question,previous='',history=[],stream=false}=input as Record<string,unknown>;
 if(typeof question!=='string'||!question.trim()||question.length>600||typeof previous!=='string'||previous.length>600)throw new RequestError('问题需为 1–600 字。',400);
 if(!Array.isArray(history)||history.length>6)throw new RequestError('对话记录格式不正确。',400);
 const turns:ConversationTurn[]=[];
 for(const turn of history){
  if(!turn||typeof turn!=='object'||!['user','assistant'].includes(turn.role)||typeof turn.content!=='string'||turn.content.length>1800)throw new RequestError('对话记录格式不正确。',400);
  turns.push({role:turn.role,content:turn.content});
 }
 return {question:question.trim(),previous:previous.trim().slice(0,200),history:turns,stream:stream===true};
}

async function* providerEvents(body:ReadableStream<Uint8Array>){
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
 try{while(true){const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});if(buffer.length>100000)throw new RequestError('模型数据异常，请重试。',502);
  let boundary:number;while((boundary=buffer.search(/\r?\n\r?\n/))>=0){const packet=buffer.slice(0,boundary),ending=buffer.slice(boundary).match(/^\r?\n\r?\n/)![0];buffer=buffer.slice(boundary+ending.length);const data=packet.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(data)yield data}
  if(done)break;
 }}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}

export async function handleAssistantPost(request:Request,deps:Dependencies):Promise<Response>{
 let release:(()=>void)|undefined,streamOwnsRelease=false;
 try{
  const user=await deps.getUser();if(!user)throw new RequestError('请登录后使用云端问答。',401);
  const origin=request.headers.get('origin');
  if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))throw new RequestError('请求来源不匹配。',403);
  const input=await readInput(request);if(deps.allowStreaming===false)input.stream=false;const context=deps.prepare(input.question,input.previous,input.history);
  if(context.localText)return json({text:context.localText,hits:context.hits,engine:'本地术语解释 · 站内词典'});
  const apiKey=deps.getKey()?.trim();if(!apiKey)throw new RequestError('网站尚未配置云端连接，请先使用站内检索。',503);
  const now=Date.now();for(const [id,entry] of requests)if(!entry.busy&&now-entry.started>=60_000)requests.delete(id);
  let limit=requests.get(user.userId);
  if(limit?.busy)throw new RequestError('上一条回答还在整理，请稍后再问。',429);
  if(!limit||now-limit.started>=60_000){limit={started:now,count:0,busy:false};requests.set(user.userId,limit)}
  if(limit.count>=6)throw new RequestError('提问有些频繁，请稍等一分钟。',429);
  limit.count++;limit.busy=true;let released=false;release=()=>{if(!released){released=true;limit!.busy=false}};
  const abort=new AbortController(),cancel=()=>abort.abort();let incomingSignal:AbortSignal|undefined;
  try{incomingSignal=request.signal}catch{}
  incomingSignal?.addEventListener('abort',cancel,{once:true});if(incomingSignal?.aborted)cancel();
  const timeout=setTimeout(cancel,60_000);
  const clean=()=>{clearTimeout(timeout);incomingSignal?.removeEventListener('abort',cancel);release?.()};
  async function connect(stream:boolean){
   const response=await (deps.fetcher||fetch)('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},signal:abort.signal,
    body:JSON.stringify({models:freeChatModels,messages:context.messages,stream,temperature:.35,max_tokens:1600,reasoning:{enabled:false,exclude:true},provider:{max_price:{prompt:0,completion:0}}}),
   });
   if(!response.ok)throw new RequestError(response.status===401?'云端密钥无效或已撤销，请更新网站密钥。':response.status===429?'免费模型当前限流，请稍后重试。':'免费对话模型暂时不可用，请稍后重试。',response.status===429?429:502);
   return response;
  }
  if(!input.stream){try{
   const response=await connect(false),data=await response.json() as {choices?:{message?:{content?:unknown};finish_reason?:string}[];model?:unknown};
   const content=data.choices?.[0]?.message?.content;
   if(typeof content!=='string')throw new RequestError('模型没有返回可用文本，请再试一次。',502);
   const model=modelLabel(data.model),text=safeAnswer(content,apiKey);checkAnswer(text);
   if(!text)throw new RequestError('模型没有返回可用文本，请再试一次。',502);
   return json({text,hits:context.hits,engine:`云端 · ${model}`,truncated:data.choices?.[0]?.finish_reason==='length'});
  }finally{clean()}}
  streamOwnsRelease=true;let closed=false;
  const stream=new ReadableStream<Uint8Array>({
   async start(controller){
    const encoder=new TextEncoder();
    const send=(value:unknown)=>{if(!closed)controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'))};
    try{
     send({type:'stage',stage:'context',message:context.hits.length?`已找到 ${context.hits.length} 条相关站内资料`:'当前问题按通用对话处理',sources:context.hits.map(hit=>({title:hit.title,href:hit.href}))});
     send({type:'stage',stage:'connecting',message:'正在连接免费对话模型'});
     const response=await connect(true);
     send({type:'stage',stage:'waiting',message:'已连接，等待模型开始回答'});
     let raw='',last='',model='精选免费对话模型',started=false,finished=false,finishReason='';
     if(response.headers.get('content-type')?.includes('text/event-stream')&&response.body){
      for await(const data of providerEvents(response.body)){
       if(data==='[DONE]'){finished=true;break}
       let chunk:{error?:unknown;model?:unknown;choices?:{delta?:{content?:unknown};finish_reason?:string}[]};
       try{chunk=JSON.parse(data)}catch{throw new RequestError('模型返回了无法识别的数据，请重试。',502)}
       if(chunk.error)throw new RequestError('模型连接中断，请稍后重试。',502);
       if(chunk.model)model=modelLabel(chunk.model);
       const choice=chunk.choices?.[0];if(choice?.finish_reason){finishReason=choice.finish_reason;if(finishReason==='error')throw new RequestError('模型连接中断，请重试。',502);finished=true}
       if(typeof choice?.delta?.content==='string')raw+=choice.delta.content;
       if(raw.length>16000)throw new RequestError('回答过长，请缩小问题范围。',502);
       const text=safeAnswer(raw,apiKey);checkAnswer(text);
       if(text&&text!==last){if(!started){started=true;send({type:'stage',stage:'answering',message:'正在生成回答',model})}last=text;send({type:'text',text})}
      }
     }else{
      const data=await response.json() as {choices?:{message?:{content?:string};finish_reason?:string}[];model?:unknown};model=modelLabel(data.model);raw=data.choices?.[0]?.message?.content||'';finishReason=data.choices?.[0]?.finish_reason||'';finished=true;
     }
     const text=safeAnswer(raw,apiKey);checkAnswer(text);
     if(!text||!finished)throw new RequestError(text?'回答传输中断，请重试。':'模型没有返回可用文本，请再试一次。',502);
     send({type:'stage',stage:'formatting',message:'回答已收到，正在整理段落与表格'});
     send({type:'done',text,hits:context.hits,engine:`云端 · ${model}`,truncated:finishReason==='length'});
    }catch(error){send({type:'error',message:publicError(error)})}
    finally{clean();if(!closed){closed=true;controller.close()}}
   },
   cancel(){closed=true;cancel();clean()},
  });
  return new Response(stream,{headers:{...responseHeaders,'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no'}});
 }catch(error){return json({error:publicError(error)},error instanceof RequestError?error.status:502)}
 finally{if(!streamOwnsRelease)release?.()}
}
