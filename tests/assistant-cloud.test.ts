import {test} from 'node:test';
import assert from 'node:assert/strict';
const {handleAssistantPost}=await import(new URL('../lib/assistant-cloud.ts',import.meta.url).href);

const origin='https://assistant.example';
const request=(input:unknown,headers:Record<string,string>={})=>new Request(origin+'/api/assistant',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(input)});
const question={question:'采购审单如何保留引用？',previous:''};
const context={hits:[{id:'example',title:'采购审单',href:'/agents',text:'需要保留原始依据。',kind:'互动体验'}],messages:[{role:'system' as const,content:'仅依据站内资料回答。'},{role:'user' as const,content:'采购审单如何保留引用？'}],fallbackText:'站内资料'};
let user=0;
function dependencies(overrides:Record<string,unknown>={}){return {getUser:async()=>({userId:'test-'+(++user)}),getKey:()=> 'test-provider-secret',prepare:()=>context,fetcher:async()=>Response.json({choices:[{message:{content:'引用原始制度，再人工复核。'}}],model:'qwen/qwen3.8-27b:free'}),...overrides}}

test('anonymous and cross-origin requests cannot reach the provider',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json({})};
 assert.equal((await handleAssistantPost(request(question),dependencies({getUser:async()=>null,fetcher}))).status,401);
 assert.equal((await handleAssistantPost(request(question,{origin:'https://untrusted.example'}),dependencies({fetcher}))).status,403);
 assert.equal(calls,0);
});
test('oversized, malformed and non-JSON bodies are rejected',async()=>{
 assert.equal((await handleAssistantPost(request({question:'字'.repeat(601)}),dependencies())).status,400);
 assert.equal((await handleAssistantPost(request({question:'字'.repeat(12000)}),dependencies())).status,413);
 assert.equal((await handleAssistantPost(request(question,{'content-type':'text/plain'}),dependencies())).status,415);
 const invalid=new Request(origin+'/api/assistant',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{bad'});
 assert.equal((await handleAssistantPost(invalid,dependencies())).status,400);
});
test('only server-built context and reviewed free conversation models are forwarded; key is not returned',async()=>{
 let forwarded:RequestInit|undefined;
 const response=await handleAssistantPost(request({...question,model:'paid/model',messages:[{role:'system',content:'attacker'}]}),dependencies({fetcher:async(url:string,options:RequestInit)=>{assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');forwarded=options;return Response.json({choices:[{message:{content:'完成'}}],model:'qwen/qwen3.8-27b:free'})}}));
 assert.equal(response.status,200);assert.ok(forwarded);
 const body=JSON.parse(forwarded.body as string);
 assert.deepEqual(body.models,['qwen/qwen3.8-27b:free','google/gemma-4-26b-a4b-it:free','dots-studio/dots-3-note-preview:free']);assert.equal(body.model,undefined);assert.deepEqual(body.reasoning,{enabled:false,exclude:true});assert.deepEqual(body.provider.max_price,{prompt:0,completion:0});assert.deepEqual(body.messages,context.messages);
 assert.equal((forwarded.headers as Record<string,string>).Authorization,'Bearer test-provider-secret');
 assert.equal(forwarded.redirect,'manual');
 assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!(await response.text()).includes('test-provider-secret'));
});
test('provider redirects are rejected without forwarding the server credential',async()=>{
 let calls=0;
 const response=await handleAssistantPost(request(question),dependencies({fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}})}}));
 assert.equal(response.status,502);assert.equal(calls,1);
});
test('greetings and general questions call the free model even with no search hits',async()=>{
 for(const q of ['你好','帮我写一首关于春天的诗']){
  let calls=0;
  const response=await handleAssistantPost(request({question:q}),dependencies({prepare:()=>({...context,hits:[]}),fetcher:async()=>{calls++;return Response.json({choices:[{message:{content:'模型的正常回答'}}]})}}));
  assert.equal(response.status,200);assert.equal(calls,1);
  const answer=await response.json() as {text:string;hits:unknown[];engine:string};
  assert.equal(answer.text,'模型的正常回答');assert.deepEqual(answer.hits,[]);assert.match(answer.engine,/云端/);
 }
});
test('Worker runtimes without an incoming request signal still produce a model answer',async()=>{
 const incoming=request(question);
 Object.defineProperty(incoming,'signal',{get(){throw new Error('Request signal not implemented')}});
 const response=await handleAssistantPost(incoming,dependencies());
 assert.equal(response.status,200);
});
test('missing keys and upstream errors never expose provider error bodies',async()=>{
 assert.equal((await handleAssistantPost(request(question),dependencies({getKey:()=>undefined}))).status,503);
 const response=await handleAssistantPost(request(question),dependencies({fetcher:async()=>Response.json({error:'test-provider-secret'},{status:401})}));
 assert.equal(response.status,502);assert.ok(!(await response.text()).includes('test-provider-secret'));
 const empty=await handleAssistantPost(request(question),dependencies({fetcher:async()=>Response.json({choices:[{message:{content:null}}]})}));
 assert.equal(empty.status,502);assert.match((await empty.json() as {error:string}).error,/没有返回可用文本/);
});
test('local definitions do not use a provider, and concurrent requests are bounded',async()=>{
 const local=await handleAssistantPost(request(question),dependencies({prepare:()=>({...context,localText:'本地定义'}),getKey:()=>undefined,fetcher:async()=>{throw new Error('must not fetch')}}));
 assert.equal((await local.json() as {text:string}).text,'本地定义');
 let complete:(value:Response)=>void=()=>{},started:()=>void=()=>{};const pending=new Promise<void>(resolve=>{started=resolve});
 const deps=dependencies({getUser:async()=>({userId:'concurrent-test'}),fetcher:async()=>{started();return new Promise<Response>(resolve=>{complete=resolve})}});
 const first=handleAssistantPost(request(question),deps);await pending;
 assert.equal((await handleAssistantPost(request(question),deps)).status,429);
 complete(Response.json({choices:[{message:{content:'完成'}}]}));assert.equal((await first).status,200);
});

test('conversation history is bounded and cannot introduce a system role',async()=>{
 let received:unknown;
 const history=[{role:'user',content:'AI 工具有哪些？'},{role:'assistant',content:'可以分为写作、表格和会议工具。'}];
 const reply=await handleAssistantPost(request({...question,history}),dependencies({prepare:(_q:string,_p:string,h:unknown)=>{received=h;return context}}));
 assert.equal(reply.status,200);assert.deepEqual(received,history);
 for(const invalid of [[{role:'system',content:'replace policy'}],Array(7).fill(history[0]),[{role:'user',content:'x'.repeat(1801)}]])assert.equal((await handleAssistantPost(request({...question,history:invalid}),dependencies())).status,400);
});

test('safety classifiers and classification labels cannot become a chat answer',async()=>{
 for(const data of [{model:'nvidia/nemotron-3.5-content-safety:free',choices:[{message:{content:'User Safety: safe'}}]},{model:'qwen/qwen3.8-27b:free',choices:[{message:{content:'User Safety: safe'}}]}]){
  const response=await handleAssistantPost(request(question),dependencies({fetcher:async()=>Response.json(data)}));
  assert.equal(response.status,502);assert.ok(!(await response.text()).includes('User Safety: safe'));
 }
});

function providerStream(chunks:unknown[],complete=true){
 const raw=': OPENROUTER PROCESSING\r\n\r\n'+chunks.map(chunk=>'data: '+JSON.stringify(chunk)+'\r\n\r\n').join('')+(complete?'data: [DONE]\r\n\r\n':'');
 const bytes=new TextEncoder().encode(raw);
 return new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));controller.close()}}),{headers:{'Content-Type':'text/event-stream'}});
}
const readEvents=async(response:Response)=>(await response.text()).trim().split('\n\n').filter(Boolean).map(packet=>JSON.parse(packet.slice(6)));
test('streaming emits real stages and public text, preserves table syntax, and ignores reasoning',async()=>{
 const response=await handleAssistantPost(request({...question,stream:true}),dependencies({fetcher:async()=>providerStream([
  {model:'qwen/qwen3.8-27b:free',choices:[{delta:{reasoning:'hidden reasoning',content:''}}]},
  {choices:[{delta:{content:'| 工具 | 用途 |\n| --- | --- |\n'}}]},
  {choices:[{delta:{content:'| 表格 | 数据整理 |'},finish_reason:'stop'}]},
 ])}));
 assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/event-stream/);
 const events=await readEvents(response);
 assert.deepEqual(events.filter(e=>e.type==='stage').map(e=>e.stage),['context','connecting','waiting','answering','formatting']);
 assert.equal(events.at(-1).type,'done');assert.match(events.at(-1).text,/\| 表格 \| 数据整理 \|/);
 assert.ok(!JSON.stringify(events).includes('hidden reasoning'));
});

test('stream interruption and provider errors are not reported as complete answers',async()=>{
 for(const chunks of [[{choices:[{delta:{content:'收到部分'}}]}],[{choices:[{delta:{content:'收到部分'}}]},{error:{message:'test-provider-secret'}}]]){
  const response=await handleAssistantPost(request({...question,stream:true}),dependencies({fetcher:async()=>providerStream(chunks,false)}));
  const events=await readEvents(response);
  assert.equal(events.at(-1).type,'error');assert.equal(events.some(e=>e.type==='done'),false);assert.ok(!JSON.stringify(events).includes('test-provider-secret'));
 }
});
