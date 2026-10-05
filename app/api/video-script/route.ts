import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {handleAssistantPost} from '@/lib/assistant-cloud';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleAssistantPost(request,{
 getUser:getChatGPTUser,getKey:()=>env.OPENROUTER_API_KEY,
 prepare(question){return {hits:[],fallbackText:'',messages:[{role:'system',content:'你是中文短视频编导。依据用户给出的目的、观众和镜头描述改写短视频旁白。你没有看过视频，不得声称分析或识别了画面。不得虚构产品功能、性能数字或客户案例。遵守用户要求的 JSON 结构，不输出 Markdown 代码围栏。每个镜头旁白不超过其秒数乘以3个汉字。镜头数与输入一致，title 最多16个字，narration 最多60个字。只返回 shots 数组。'},{role:'user',content:question}]}}
 })}
