import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {handleAssistantPost} from '@/lib/assistant-cloud';
import {groundedMessages,localGlossaryAnswer,retrievalAnswer,searchKnowledge} from '@/lib/site-search';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
export async function GET(){
 const user=await getChatGPTUser();
 if(!user)return Response.json({configured:false,error:'请登录后使用云端问答。'},{status:401,headers:noStore});
 return Response.json({configured:Boolean(env.OPENROUTER_API_KEY)},{headers:noStore});
}
export async function POST(request:Request){
 return handleAssistantPost(request,{
  getUser:getChatGPTUser,
  getKey:()=>env.OPENROUTER_API_KEY,
  prepare(question,previous,history){const glossary=localGlossaryAnswer(question),hits=glossary?.hits||searchKnowledge(question,previous);return {hits,messages:groundedMessages(question,hits,previous,history),localText:glossary?.text,fallbackText:retrievalAnswer(question,hits)}},
 });
}
