import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {handleAssistantPost} from '@/lib/assistant-cloud';
import {groundedMessages,localGlossaryAnswer,retrievalAnswer,searchKnowledge} from '@/lib/site-search';
import {desktopAnswer,desktopHits,desktopIntro} from '@/lib/desktop-knowledge';
export {GET} from '../assistant/route';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleAssistantPost(request,{getUser:getChatGPTUser,getKey:()=>env.OPENROUTER_API_KEY,prepare(question,previous,history){const local=desktopAnswer(question)||localGlossaryAnswer(question),hits=local?.hits||[...desktopHits(question),...searchKnowledge(question,previous)].slice(0,4),messages=groundedMessages(question,hits,previous,history);messages[0].content+='\n'+desktopIntro;return {hits,messages,localText:local?.text,fallbackText:retrievalAnswer(question,hits)}}})}
