export type VideoAsset={id:string;name:string;src:string;poster?:string;duration:number;origin:string;sourceStart:number;hasAudio:boolean;local?:boolean};
export type VideoClip={id:string;assetId:string;poster?:string;in:number;out:number;title:string;narration:string};
export type Caption={id:string;start:number;end:number;text:string};
export type SoundTrack={id:string;name:string;src:string;duration:number;start:number;volume:number};
export type VideoProject={id:string;name:string;goal:string;audience:string;clips:VideoClip[];captions:Caption[];captionPosition:'top'|'bottom';showCaptions:boolean;title:string;titleEnd:number;originalVolume:number;sounds:SoundTrack[]};
export const videoAssets:VideoAsset[]=[
 {id:'service',name:'智服宝 · 产品操作实录',src:'/media/video-lab/service.mp4',poster:'/media/video-lab/service.jpg',duration:74.9,origin:'宝信智服宝产品介绍视频-20260903.mp4',sourceStart:0,hasAudio:true},
 {id:'warehouse-arrive',name:'入库 · 人与输送线',src:'/media/video-lab/warehouse-arrive.mp4',poster:'/media/video-lab/warehouse-arrive.jpg',duration:10,origin:'videoplayback (4).mp4',sourceStart:64,hasAudio:false},
 {id:'warehouse-robot',name:'搬运 · 移动货架',src:'/media/video-lab/warehouse-robot.mp4',poster:'/media/video-lab/warehouse-robot.jpg',duration:10,origin:'videoplayback (4).mp4',sourceStart:270,hasAudio:false},
 {id:'warehouse-pick',name:'拣选 · 周转箱流转',src:'/media/video-lab/warehouse-pick.mp4',poster:'/media/video-lab/warehouse-pick.jpg',duration:10,origin:'videoplayback (4).mp4',sourceStart:376,hasAudio:false},
 {id:'warehouse-pack',name:'包装 · 订单出库',src:'/media/video-lab/warehouse-pack.mp4',poster:'/media/video-lab/warehouse-pack.jpg',duration:10,origin:'videoplayback (4).mp4',sourceStart:437,hasAudio:false},
];
export const videoSteps=['任务与素材','脚本与补镜','剪开与拼接','字幕与校对','配音与混音','检查与导出'];
export const videoLessons=[
 {title:'先确定观众看完要记住什么',body:'产品介绍用“问题 → 操作过程 → 结果”组织；场景宣传用“建立场景 → 关键动作 → 收束”组织。先剪 20–30 秒，讲清一个重点。',try:'先播放一遍，再给每个片段写出它在故事中的作用。'},
 {title:'旁白先说人话，一个镜头只承担一件事',body:'先用已有画面写脚本，再找缺口。AI 适合补氛围、过渡或概念镜头；真实产品界面优先用录屏，避免生成错误文字和操作。',try:'写清主体、动作、场景、运镜、时长、衔接和不能改变的细节；生成后逐段检查。'},
 {title:'先剪内容，再考虑包装',body:'设置入点和出点去掉等待；在播放头处分割；删除无用片段后，后面的镜头自动衔接。先用直接切换建立节奏。',try:'选中一个片段，移动播放头到片段内部，点击“剪开”。拖动镜头可换顺序，也可用前移、后移。'},
 {title:'校对不仅是改错别字',body:'检查产品名、专业术语、数字、断句与出现时机。原片已压入画面的字幕无法在这里擦除；新增字幕是独立轨道。',try:'在剪映识别语音后导出 SRT，再在这里导入和校对；也可先按分镜文案建立字幕草稿。'},
 {title:'声音服务于内容',body:'配音要跟得上画面，音乐要让得开人声。已有口播时不要再叠一层解说；换配音时先关闭原声。',try:'复制旁白到剪映“文本朗读”，导出音频后添加到这里的配音轨，再调起点和音量。'},
 {title:'完整看一遍，再交付',body:'检查开头能否看懂、切点是否自然、字幕有无错字和遮挡、声音是否清楚、结尾是否完整。正式交付按发布渠道导出，并保留素材和工程。',try:'本站导出当前剪辑的视频和独立 SRT；剪辑清单记录素材及入出点，方便继续精修。'},
];
export function uid(){return Math.random().toString(36).slice(2,10)}
export function duration(clips:VideoClip[]){return clips.reduce((s,c)=>s+Math.max(0,c.out-c.in),0)}
export function clipStart(clips:VideoClip[],index:number){return duration(clips.slice(0,index))}
export function locateClip(clips:VideoClip[],time:number){let start=0;for(let i=0;i<clips.length;i++){const end=start+clips[i].out-clips[i].in;if(time<end-.001||i===clips.length-1)return {clip:clips[i],index:i,start,offset:Math.max(0,Math.min(time-start,clips[i].out-clips[i].in))};start=end}return null}
export function timecode(t:number,precise=false){const n=Math.max(0,t);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}${precise?'.'+String(Math.floor(n*10)%10):''}`}
export function initialVideoProject(id='product'):VideoProject{
 const product=id==='product';
 const clips:VideoClip[]=product?[
  {id:'p1',assetId:'service',poster:'/media/video-lab/service-shot-1.jpg',in:8,out:15,title:'提出服务请求',narration:'通过热线，发起一次服务咨询。'},
  {id:'p2',assetId:'service',poster:'/media/video-lab/service-shot-2.jpg',in:26,out:34,title:'通话转成文字',narration:'接通电话后，通话内容实时转成文字。'},
  {id:'p3',assetId:'service',poster:'/media/video-lab/service-shot-3.jpg',in:50,out:56,title:'找到机器人入口',narration:'也可以从业务页面进入智能机器人。'},
  {id:'p4',assetId:'service',poster:'/media/video-lab/service-shot-4.jpg',in:60,out:69,title:'输入问题，查看回答',narration:'输入具体问题，查看系统返回的回答。'},
 ]:[
  {id:'w1',assetId:'warehouse-arrive',in:1,out:7,title:'建立入库场景',narration:'从入库开始，看一件商品如何流转。'},
  {id:'w2',assetId:'warehouse-robot',in:1,out:7,title:'货架移动',narration:'移动货架，把存储和作业工位连接起来。'},
  {id:'w3',assetId:'warehouse-pick',in:1,out:7,title:'拣选与流转',narration:'拣选之后，周转箱继续向下一站流转。'},
  {id:'w4',assetId:'warehouse-pack',in:1,out:7,title:'包装收束',narration:'打包完成，为订单出库做好准备。'},
 ];
 return {id,name:product?'智服宝 · 30 秒产品介绍':'仓储现场 · 24 秒场景短片',goal:product?'讲清服务咨询的两种入口与处理过程':'用入库、搬运、拣选、包装讲清仓储作业流程',audience:product?'第一次了解产品的业务同事':'了解供应链业务的新同事',clips,captions:[],showCaptions:true,captionPosition:'top',title:product?'智服宝 · 从问题到回答':'走进仓储作业现场',titleEnd:3,originalVolume:product?.8:0,sounds:[]};
}
export function captionsFromClips(clips:VideoClip[]):Caption[]{let start=0;return clips.flatMap(c=>{const end=start+c.out-c.in;const caption={id:uid(),start,end,text:c.narration};start=end;return caption.text.trim()?[caption]:[]})}
const srtTime=(t:number)=>{const ms=Math.round(Math.max(0,t)*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`};
export function toSrt(captions:Caption[],total=Infinity){return captions.filter(c=>c.text.trim()&&c.start<total&&c.end>c.start).map((c,i)=>`${i+1}\n${srtTime(c.start)} --> ${srtTime(Math.min(c.end,total))}\n${c.text.trim()}`).join('\n\n')+'\n'}
export function parseSrt(text:string):Caption[]{const blocks=text.replace(/^\uFEFF/,'').replace(/\r/g,'').trim().split(/\n\s*\n/);const result:Caption[]=[];const stamp=(h:string,m:string,s:string,ms:string)=>+h*3600 + +m*60 + +s + +ms.padEnd(3,'0')/1000;for(const block of blocks){const lines=block.split('\n');const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;const m=lines[i].match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})/);if(!m)continue;const start=stamp(m[1],m[2],m[3],m[4]),end=stamp(m[5],m[6],m[7],m[8]),text=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').trim();if(Number.isFinite(start)&&end>start&&text)result.push({id:uid(),start,end,text:text.slice(0,500)})}if(!result.length)throw new Error('没有读到有效字幕，请选择包含时间码的 SRT 文件。');if(result.length>300)throw new Error('请先裁出本次短片的字幕（最多 300 条）。');return result.sort((a,b)=>a.start-b.start)}
export function moveClip(clips:VideoClip[],from:number,to:number){const next=[...clips];if(from<0||to<0||from>=next.length||to>=next.length)return next;next.splice(to,0,next.splice(from,1)[0]);return next}
export function splitClip(clips:VideoClip[],time:number){const found=locateClip(clips,time);if(!found||found.offset<.25||found.clip.out-found.clip.in-found.offset<.25)return null;const c=found.clip,cut=c.in+found.offset;return [...clips.slice(0,found.index),{...c,out:cut},{...c,id:uid(),in:cut,title:c.title+' · 后半段'},...clips.slice(found.index+1)]}
export function saveVideoFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
export function videoPrompt(project:VideoProject){return `为${project.audience}制作短视频，目的：${project.goal}。现有镜头：${project.clips.map(c=>`${c.title}（${(c.out-c.in).toFixed(1)}秒）`).join('；')}。只改写旁白，不编造画面中未确认的产品功能或成效。输出 JSON：{"shots":[{"title":"镜头名","narration":"匹配时长的简短中文旁白"}]}，shots 数量与现有镜头相同。`}
