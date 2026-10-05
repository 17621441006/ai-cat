import type {KnowledgeHit} from './site-search';
export const desktopApps=[
 {id:'minecraft',title:'Minecraft.py',aliases:['minecraft','python','方块'],text:'左边是可旋转的 Minecraft 方块世界，右边是真实 Python 编辑器。修改代码后点运行代码，或 Ctrl+Enter，代码通过 mcpi API 改变世界。内置上海中心大厦与太和殿演示；可以停止运行、重置代码。不是一句自然语言自动生成建筑。'},
 {id:'home',title:'3D 房屋设计',aliases:['房屋','庭间','暮色','绛木','装修'],text:'庭间原项目的前八套方案：暮色私邸、绛木雅居、石庭隐居、藏品公馆、云岚铜影、琥珀曲光、墨棕夜叙、橡影 EDITION。每套有八个空间。顶部选方案，底部选房间；主卧、次卧、厨房采用原项目最新 v37 调整图。完整设计工作台可从窗口入口打开。'},
 {id:'photos',title:'AI Q版相册',aliases:['相册','照片','全家福','家人'],text:'收录用户提供的三张 Q 版家庭合影：碧水边的合影、山水间的夕阳、牵手的日子。左右翻页或点击缩略图，可以保存当前图片。'},
 {id:'stickers',title:'脏脏包表情',aliases:['表情','贴纸'],text:'有原设计表情合集和四种角色形象。表情包括风中优雅、趴窝睡觉、鄙视、玩手机、谢谢、点赞、我先躺了、哈哈没事、暗中吃瓜、没听见、桌下躲起、坏笑、紧张冒汗、疑惑、快来喂我与吐舌。'},
 {id:'music',title:'月光唱片机',aliases:['音乐','唱片','随身听','歌','周杰伦','再回首'],text:'十首经典：晴天、稻香、江南、一千年以后、吻别、一路上有你、心墙、听海、我最亲爱的、再回首。点击歌曲并使用 Apple Music 官方播放器播放。未登录通常为30秒试听，完整播放取决于账号订阅与地区。最小化唱片机变成随身听，可展开恢复；音频不会自动播放。'},
 {id:'terminal',title:'终端',aliases:['终端','命令行'],text:'这是网页桌面的控制台，输入 help 查看命令。支持 ls、open、close、minimize、restore、desktop、sort name/type、arrange、rename、move、properties、date、whoami、clear。只控制本站桌面，不执行系统命令。rm 或 delete 只会提示“禁止删除猫咪星球资产”。'},
 {id:'ai',title:'AI 研习所',aliases:['ai-cat','研习所','AI学习'],text:'原 AI-cat 学习网站，保留 AI 课程、术语、办公工具与各实验区。猫助手保留云端免费模型、本地 Qwen3、站内检索，支持连续问答、Markdown表格、图表、停止和新对话。'},
 {id:'usaco',title:'USACO Lab',aliases:['usaco','竞赛','算法'],text:'打开原 USACO 铜组升银组学习项目，沿用原项目登录和学习记录。'},
 {id:'works',title:'作品集',aliases:['作品集','全部作品'],text:'按编程与学习、设计、记忆分类浏览作品。'},
 {id:'guide',title:'使用说明.txt',aliases:['使用说明','操作说明'],text:'点击图标打开应用，拖动标题栏移动窗口，最小化后从任务栏找回；拖动桌面图标更换位置。右键桌面或应用可打开、排序、整理、改名、查看属性和移动位置。名字与位置只保存在当前浏览器；删除按钮永远不会删除作品，提示“禁止删除猫咪星球资产”。'},
 {id:'about',title:'我是谁.txt',aliases:['我是谁','作者'],text:'Dirty Bag 用 AI 做网站、游戏和学习工具，设计未来的家，也留下家人的照片。脏脏包是橘色长毛猫伙伴。'},
];
export const desktopIntro='你同时是“脏脏包的电脑”的猫助手。这是 Dirty Bag 的网页作品集桌面，不是访客的真实电脑。桌面操作只影响本站；不能删除作品或操作访客系统。下列资料描述真实现有功能：\n'+desktopApps.map(a=>a.title+'：'+a.text).join('\n');
export function desktopHits(question:string):KnowledgeHit[]{const q=question.toLowerCase();const found=desktopApps.filter(a=>a.aliases.some(alias=>q.includes(alias.toLowerCase())));if(!found.length&&/桌面|电脑|右键|删除|重命名|整理|最小化|移动图标/.test(q))found.push(desktopApps.find(a=>a.id==='guide')!);return found.slice(0,3).map(a=>({id:'desktop-'+a.id,title:a.title,href:'desktop:'+a.id,text:a.text,kind:'电脑桌面'}))}
export function desktopNavigation(question:string){
 const q=question.trim();if(/[？?]|不要|不想|先别|之前|之后|是否|为什么|会不会|会.*吗|解释|如果|假如/.test(q))return null;
 const match=q.match(/^(?:请|帮我|请帮我|我想|带我|麻烦)?\s*(?:打开|进入|去|看看)\s*(.+?)(?:吧|一下|！|!|。)?$/i);if(!match)return null;
 const target=match[1].replace(/^(?:一下|这个|那个)/,'').trim().toLowerCase();const app=desktopApps.find(a=>[a.id,a.title,...a.aliases].some(alias=>alias.toLowerCase()===target));
 return app?{id:'desktop-'+app.id,title:app.title,href:'desktop:'+app.id,text:app.text,kind:'电脑桌面'}:null;
}
export function desktopAnswer(question:string){
 if(/(?:桌面|电脑|作品集).*(?:有哪些|有什么|介绍|能做)|(?:有哪些|有什么).*(?:作品|应用)/.test(question)){return {text:'这台电脑收着这些作品：\n\n'+desktopApps.filter(a=>!['guide','about','works'].includes(a.id)).map(a=>'• **'+a.title+'**：'+a.text.split('。')[0]+'。').join('\n\n'),hits:desktopHits('全部作品')}}
 const desktopIntent=/桌面|这台电脑|这个电脑|右键|图标|重命名|最小化|猫咪星球|终端命令|随身听|唱片机/.test(question);
 if(!desktopIntent)return null;
 const hits=desktopHits(question);return hits.length?{text:hits.map(h=>'**'+h.title+'**\n\n'+h.text).join('\n\n'),hits}:null;
}
