import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('cloud model request options work in the deployed Worker runtime',async()=>{
 const source=stripTypeScriptTypes(readFileSync(new URL('../lib/assistant-cloud.ts',import.meta.url),'utf8'));
 const script=source+`\nexport default {async fetch(request){return handleAssistantPost(request,{
  getUser:async()=>({userId:'worker-test'}),getKey:()=> 'test-provider-secret',
  prepare:()=>({hits:[],messages:[{role:'user',content:'你好'}],fallbackText:'no hits'}),
  fetcher:async(url,init)=>{new Request(url,init);if(JSON.parse(init.body).stream){const payload={model:'qwen/qwen3.8-27b:free',choices:[{delta:{content:'你好，我是AI小脏。'},finish_reason:'stop'}]};return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: '+JSON.stringify(payload)+'\\n\\n'+'data: [DONE]\\n\\n'));c.close()}}),{headers:{'Content-Type':'text/event-stream'}})}return Response.json({choices:[{message:{content:'你好，我是AI小脏。'}}]})}
 })}};`;
 const worker=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat']});
 try{
  const response=await worker.dispatchFetch('https://example.test/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://example.test'},body:JSON.stringify({question:'你好'})});
  const answer=await response.json();assert.equal(response.status,200,JSON.stringify(answer));assert.equal(answer.text,'你好，我是AI小脏。');
  const streamed=await worker.dispatchFetch('https://example.test/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',origin:'https://example.test'},body:JSON.stringify({question:'你好',stream:true})});
  assert.equal(streamed.status,200);const events=(await streamed.text()).trim().split('\n\n').map(packet=>JSON.parse(packet.slice(6)));assert.equal(events.at(-1).type,'done');assert.equal(events.at(-1).text,'你好，我是AI小脏。');
 }finally{await worker.dispose()}
});
