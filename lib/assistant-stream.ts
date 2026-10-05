import type {KnowledgeHit} from './site-search';

export type AssistantStage='context'|'connecting'|'waiting'|'answering'|'formatting';
export type AssistantEvent=
 |{type:'stage';stage:AssistantStage;message:string;sources?:{title:string;href:string}[];model?:string}
 |{type:'text';text:string}
 |{type:'done';text:string;hits:KnowledgeHit[];engine:string;truncated?:boolean}
 |{type:'error';message:string};

/** Read our server's public-answer events; never surface provider reasoning fields. */
export async function consumeAssistantStream(body:ReadableStream<Uint8Array>,onEvent:(event:AssistantEvent)=>void){
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='',complete=false;
 try{
  while(true){
   const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
   if(buffer.length>100000)throw new Error('回答数据过大，请缩小问题范围。');
   let match:RegExpExecArray|null;
   while((match=/\r?\n\r?\n/.exec(buffer))){
    const packet=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);
    const data=packet.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data)continue;
    const event=JSON.parse(data) as AssistantEvent;
    if(event.type==='error')throw new Error(event.message);
    if(event.type==='done')complete=true;
    if(['stage','text','done'].includes(event.type))onEvent(event);
   }
   if(done||complete)break;
  }
  if(!complete)throw new Error('回答传输中断，已保留收到的内容。');
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}

export function cleanLocalAnswer(text:string){
 return text.replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/gi,'').replace(/<[^>]*$/,'').replace(/https?:\/\/[^\s)]+/g,'〔请使用下方已核对入口〕').trim();
}

/** Repair extra empty lines inside pipe tables, without altering code blocks. */
export function normalizeAssistantMarkdown(text:string){
 const lines=text.split('\n'),result:string[]=[];let fence='';
 for(let i=0;i<lines.length;i++){
  let line=lines[i];const marker=line.trim().match(/^(`{3,}|~{3,})/);
  if(marker){if(!fence)fence=marker[1][0];else if(marker[1][0]===fence)fence=''}
  // A colon inside a closing bold delimiter can break CommonMark beside CJK.
  // Move only that punctuation out; fenced source and chart JSON stay untouched.
  if(!fence&&!marker)line=line.replace(/^(\s*(?:>\s*)?)\*\*([^*\n]{1,40})([：:])\*\*(?=\S)/,'$1**$2**$3');
  if(!fence&&!line.trim()&&/^\s*\|.*\|\s*$/.test(result.at(-1)||'')){
   let next=i+1;while(next<lines.length&&!lines[next].trim())next++;
   if(/^\s*\|.*\|\s*$/.test(lines[next]||'')){i=next-1;continue}
  }
  result.push(line);
 }
 return result.join('\n');
}
