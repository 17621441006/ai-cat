import {getChatGPTUser} from '@/app/chatgpt-auth';
import {workshopDb} from '@/db/workshop';
import {assessWorkshop,graphSchema} from '@/lib/agent-workshop';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(){try{const user=await getChatGPTUser();if(!user)return Response.json({error:'登录后可查看学习记录。'},{status:401,headers});const row=await workshopDb().prepare('SELECT completed_at FROM workshop_progress WHERE user_id = ?').bind(user.userId).first<{completed_at:number}>();return Response.json({completedAt:row?.completed_at??null},{headers})}catch(error){console.error('Workshop progress unavailable',error);return Response.json({error:'学习记录暂时无法加载，请稍后重试。'},{status:503,headers})}}
export async function POST(request:Request){try{
 const user=await getChatGPTUser();if(!user)return Response.json({error:'请登录后保存通关记录。'},{status:401,headers});
 const origin=request.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(request.url).origin)return Response.json({error:'请求来源不匹配。'},{status:403,headers});
 if(Number(request.headers.get('content-length')||0)>100000)return Response.json({error:'流程文件过大。'},{status:413,headers});
 let body:Record<string,unknown>;try{const text=await request.text();if(text.length>100000)return Response.json({error:'流程文件过大。'},{status:413,headers});body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))return Response.json({error:'无法读取流程，请重试。'},{status:400,headers})}catch{return Response.json({error:'无法读取流程，请重试。'},{status:400,headers})}
 const parsed=graphSchema.safeParse(body.graph);if(!parsed.success)return Response.json({error:'流程格式不完整，请重新检查。'},{status:400,headers});
 const checks=assessWorkshop(parsed.data);if(checks.length!==4||!checks.every(c=>c.passed))return Response.json({error:'当前流程尚未通过全部通关检查。',checks},{status:422,headers});
 const quiz=body.quiz as Record<string,unknown>|undefined;if(quiz?.mcp!=='protocol'||quiz?.skill!=='procedure')return Response.json({error:'再想一想：MCP 负责连接协议，Skill 复用操作步骤。请修改概念题后重试。'},{status:422,headers});
 const completedAt=Date.now();await workshopDb().prepare('INSERT INTO workshop_progress (user_id, completed_at, graph_json, revision) VALUES (?, ?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET completed_at = excluded.completed_at, graph_json = excluded.graph_json, revision = excluded.revision').bind(user.userId,completedAt,JSON.stringify(parsed.data)).run();return Response.json({completedAt,checks},{headers});
}catch(error){console.error('Workshop progress saving failed',error);return Response.json({error:'学习记录还没保存成功。请保留当前页面，稍后再点“通关并保存”。'},{status:503,headers})}}
