export type VisualStyle='photo'|'3d'|'watercolor';
export type VisualRatio='16:9'|'4:3'|'1:1'|'3:4';
export type VisualLayout='split'|'center'|'poster';
export type VisualBrief={purpose:string;audience:string;subject:string;scene:string;light:string;constraints:string;style:VisualStyle;referenceRole:string};
export type VisualDesign={title:string;subtitle:string;src:string;sourceLabel:string;ratio:VisualRatio;layout:VisualLayout;background:'paper'|'midnight'|'ice';image:{x:number;y:number;width:number};text:{x:number;y:number;width:number;size:number;color:string};showText:boolean};
export type VisualMask={x:number;y:number;width:number;height:number};
export const ratios:VisualRatio[]=['16:9','4:3','1:1','3:4'];
export const styleInfo={
 photo:{label:'供应链摄影合成',detail:'用户提供的集装箱港口与物流网络素材',src:'/images/supply-chain-management.jpg'},
 '3d':{label:'工业 3D',detail:'体块、材质与空间关系',src:'/images/factory-preset-3d.webp'},
 watercolor:{label:'建筑水彩',detail:'柔和笔触与培训氛围',src:'/images/factory-preset-watercolor.webp'}
};
export const visualCases=[
 {id:'cover',label:'项目汇报封面',purpose:'供应链 AI 项目汇报封面',title:'让供应链，\n看见新的可能。',subtitle:'云应用 × 供应链 · AI 应用探索',audience:'事业部管理层与业务负责人',ratio:'16:9' as VisualRatio,layout:'split' as VisualLayout,style:'photo' as VisualStyle},
 {id:'training',label:'内部培训插图',purpose:'供应链 AI 入门课程插图',title:'从工厂到港口，\n理解一条供应链。',subtitle:'制造 · 仓储 · 运输 / 场景学习',audience:'新同事与项目团队',ratio:'4:3' as VisualRatio,layout:'center' as VisualLayout,style:'watercolor' as VisualStyle},
 {id:'poster',label:'活动宣传海报',purpose:'供应链 AI 共创工作坊海报',title:'供应链 AI\n共创工作坊',subtitle:'从一个业务问题，开始一次动手实践',audience:'业务骨干与软件研发人员',ratio:'3:4' as VisualRatio,layout:'poster' as VisualLayout,style:'photo' as VisualStyle}
];
export const defaultBrief:VisualBrief={purpose:visualCases[0].purpose,audience:visualCases[0].audience,subject:'集装箱港口、货运卡车与物流信息终端',scene:'港口运输与全球物流网络相联系，以摄影合成方式呈现供应链协作',light:'暖色夕阳与集装箱的深红色，物流网络使用清晰的蓝白点缀',constraints:'保留标题留白；图像中不生成文字、Logo、业务数字或数据图表',style:'photo',referenceRole:'style'};
export const layoutLabels:Record<VisualLayout,string>={split:'左文右图',center:'上文下图',poster:'海报构图'};
export function layoutDesign(layout:VisualLayout,ratio:VisualRatio):Pick<VisualDesign,'layout'|'ratio'|'image'|'text'>{
 const tall=ratio==='3:4';
 if(layout==='split')return{layout,ratio,image:{x:43,y:tall?39:24,width:54},text:{x:7,y:tall?12:27,width:tall?82:34,size:64,color:'#172f57'}};
 if(layout==='center'){const width=ratio==='16:9'?54:ratio==='4:3'?74:82;return{layout,ratio,image:{x:(100-width)/2,y:35,width},text:{x:7,y:10,width:86,size:58,color:'#172f57'}};}
 return{layout,ratio,image:{x:-5,y:tall?41:38,width:110},text:{x:7,y:10,width:85,size:tall?78:60,color:'#172f57'}};
}
export function initialDesign(index=0):VisualDesign{const c=visualCases[index];return{...layoutDesign(c.layout,c.ratio),title:c.title,subtitle:c.subtitle,src:styleInfo[c.style].src,sourceLabel:c.style==='photo'?'用户提供 · 供应链摄影合成素材':`内置 ${styleInfo[c.style].label} 概念样张`,background:'paper',showText:true,text:{...layoutDesign(c.layout,c.ratio).text,color:'#172f57'}};}
export function visualPrompt(b:VisualBrief,d:VisualDesign){return `用途：${b.purpose}。面向${b.audience}。\n主体：${b.subject}。\n场景：${b.scene}。\n风格：${b.style==='photo'?'港口物流摄影合成，保留真实材质与运输场景':b.style==='3d'?'等距视角的工业 3D 微缩场景，材质清晰':'建筑水彩手绘，保留纸张质感与柔和边缘'}。\n构图：${layoutLabels[d.layout]}，${d.layout==='split'?'主体偏右，左侧预留约三分之一标题空间':d.layout==='center'?'上方预留文字区，主体置于下方':'竖向叙事，上方标题，下方场景'}；画幅 ${d.ratio}。\n光色：${b.light}。\n约束：${b.constraints}。\n参考图用途：${b.referenceRole==='style'?'参考色彩、材质和表现风格，不要求复刻全部物体':'参考主体位置、比例与留白，不要求复制原有风格'}。\n文字在后期以独立文字层添加：${d.title.replace(/\n/g,' ')}。`;}
export const visualLessons=[
 {title:'先定义一张图的任务',body:'汇报封面要给结论让位，培训插图要让关系容易理解，海报要在小屏上读得清。先确定使用场合与画幅，再考虑风格。',try:'试一试：切换三种任务，观察画幅与文字区如何改变。',source:'Canva · 从生成到设计',url:'https://www.canva.com/ai-image-generator/'},
 {title:'把视觉意图拆成可检查的描述',body:'主体、场景、风格、构图、光色和约束一起构成制作说明。准确的对象与数量，比堆叠“高级、震撼、超清”更容易检查。',try:'试一试：把“科技感工厂”改成具体对象与空间关系。描述要素齐全不等于图像一定合格。',source:'CAIE · Prompt 与多模态参考',url:'https://www.caieglobal.com/studylevel1.html'},
 {title:'区分参考风格与参考构图',body:'风格参考传达色彩、纹理与视觉气质；构图参考传达主体位置、大小和留白。不要把“参考”理解成精确复制。',try:'试一试：在同一画幅选择摄影合成、3D 或水彩，再选择左文右图或上文下图。',source:'Midjourney · Style Reference',url:'https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference'},
 {title:'固定目标，只比较一个变量',body:'先比较布局，再比较风格；每次记录修改内容与选择理由。真实生成工具会有随机差异，本站用固定素材演练比较方法。',try:'试一试：为标题挑出留白最多的方向，不只看哪张图最热闹。',source:'Adobe Firefly · 生成与迭代',url:'https://www.adobe.com/products/firefly/features/text-to-image.html'},
 {title:'局部问题，局部修正',body:'构图用移动和缩放调整；标题作为文字层单独排版。要增加或移除画面内物体，应圈定区域并说明需要保留的部分，再到支持局部编辑的工具执行。',try:'试一试：拖动图片避开标题；或框选一个区域，生成带“保留项”的修改指令。',source:'Adobe Firefly · 图像编辑',url:'https://www.adobe.com/products/firefly/features/ai-photo-editor.html'},
 {title:'交付的是可使用的视觉',body:'检查主体、可读性和实际尺寸。中文标题放在独立文字层里校对，概念图与真实项目证据分开使用，同时保留提示词和制作记录。',try:'试一试：下载 PNG 后放进真实汇报文档，按实际显示大小检查一次。',source:'Canva · 生成后继续排版',url:'https://www.canva.com/ai-image-generator/'}
];
export function dimensions(ratio:VisualRatio){const[a,b]=ratio.split(':').map(Number);return{width:1600,height:Math.round(1600*b/a)};}
const imageCache=new Map<string,Promise<HTMLImageElement>>();
export function loadVisualImage(src:string){src=src.replace(/^\/images\/(factory-preset-(?:3d|watercolor))\.png$/,'/images/$1.webp');let p=imageCache.get(src);if(!p){p=new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{imageCache.delete(src);reject(new Error('图片未能载入，请重新选择样张或上传图片。'))};img.src=src;});imageCache.set(src,p);if(imageCache.size>8)imageCache.delete(imageCache.keys().next().value!)}return p;}
export function wrappedLines(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const lines:string[]=[];for(const paragraph of text.split('\n')){let line='';for(const ch of Array.from(paragraph)){if(line&&ctx.measureText(line+ch).width>maxWidth){lines.push(line);line=ch}else line+=ch}lines.push(line)}return lines;}
export function drawVisual(canvas:HTMLCanvasElement,img:HTMLImageElement,d:VisualDesign){
 const{width:w,height:h}=dimensions(d.ratio);canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器无法使用图片画布。');
 const colors={paper:['#f3f5ff','#ffffff'],midnight:['#10233f','#274d79'],ice:['#e2f4f1','#f9fffc']}[d.background];const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const ix=d.image.x/100*w,iy=d.image.y/100*h,iw=d.image.width/100*w,ih=iw*img.naturalHeight/img.naturalWidth;ctx.drawImage(img,ix,iy,iw,ih);
 ctx.fillStyle=d.background==='midnight'?'#b7d3f8':'#557bb6';ctx.font='500 21px Arial, sans-serif';ctx.fillText('AI PRACTICE  /  SUPPLY CHAIN',.07*w,.062*h);
 let textHeight=0;if(d.showText){const x=d.text.x/100*w,y=d.text.y/100*h,maxW=d.text.width/100*w;ctx.textBaseline='top';ctx.fillStyle=d.text.color;ctx.font=`600 ${d.text.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;const titleLines=wrappedLines(ctx,d.title,maxW);titleLines.forEach((line,i)=>ctx.fillText(line,x,y+i*d.text.size*1.32));const titleH=titleLines.length*d.text.size*1.32;ctx.font='400 27px "PingFang SC", "Microsoft YaHei", sans-serif';ctx.globalAlpha=.75;const sub=wrappedLines(ctx,d.subtitle,maxW);sub.forEach((line,i)=>ctx.fillText(line,x,y+titleH+22+i*42));textHeight=titleH+22+sub.length*42;ctx.globalAlpha=1;}
 ctx.textBaseline='alphabetic';ctx.font='400 18px Arial, sans-serif';ctx.fillStyle=d.background==='midnight'?'#aac4e5':'#6c829f';ctx.fillText('SCM  /  CONCEPT STUDY',.07*w,.953*h);
 return{image:{x:ix/w*100,y:iy/h*100,width:iw/w*100,height:ih/h*100},text:{x:d.text.x,y:d.text.y,width:d.text.width,height:textHeight/h*100}};
}
export function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
export async function exportVisual(d:VisualDesign,format:'png'|'jpeg',mask?:VisualMask){const canvas=document.createElement('canvas');const img=await loadVisualImage(d.src);drawVisual(canvas,img,d);if(mask){const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(mask.x/100*canvas.width,mask.y/100*canvas.height,mask.width/100*canvas.width,mask.height/100*canvas.height)}const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,`image/${format}`,.94));if(!blob)throw new Error('导出失败，请重试。');return blob;}
export function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value));}
