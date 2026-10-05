export type Layout='cover'|'architecture'|'columns'|'process'|'evidence'|'roadmap'|'closing';
export const layoutNames:Record<Layout,string>={cover:'封面',architecture:'分层架构',columns:'三栏要点',process:'业务流程',evidence:'案例与证据',roadmap:'实施路线',closing:'行动与决策'};
export type ImagePlacement='auto'|'right'|'left'|'bottom';
export type SlideImage={id:string;src:string;caption:string;origin:'material'|'upload'|'simulated'|'provided';page?:number;fit:'contain'|'cover';width?:number;height?:number};
export type CanvasBox={x:number;y:number;w:number;h:number};
export type TextStyle={fontFamily:'sans'|'arial'|'serif'|'mono';fontSize:number;color:string;bold:boolean;italic:boolean;underline:boolean;align:'left'|'center'|'right';list:'none'|'bullet'|'number';lineHeight:number};
export type Slide={id:string;title:string;message:string;points:string[];notes:string;pages:number[];layout:Layout;status:'材料概述'|'功能介绍'|'案例介绍'|'规划与建议';reviewed:boolean;brand:boolean;citations:boolean;images?:SlideImage[];imagePlacement?:ImagePlacement;textStyles?:Record<string,Partial<TextStyle>>;elementFrames?:Record<string,CanvasBox>};
export const maxSlides=24;
export const maxImages=4;
let editorSequence=0;
export function editorId(prefix:string){return `${prefix}-${Date.now().toString(36)}-${++editorSequence}`}
export const placementNames:Record<ImagePlacement,string>={auto:'自动图文排版',right:'左文右图',left:'左图右文',bottom:'上文下图'};
export const materialImages:SlideImage[]=[
 {id:'figure-11',src:'/images/scm-source/details/figure-11.webp',caption:'供应链 AI 业务架构',page:11,origin:'material',fit:'contain'},
 {id:'figure-22',src:'/images/scm-source/details/figure-22.webp',caption:'智能体平台建设目标与思路',page:22,origin:'material',fit:'contain'},
 {id:'figure-16',src:'/images/scm-source/details/figure-16.webp',caption:'票据识别高保真界面',page:16,origin:'material',fit:'contain'},
 {id:'figure-15',src:'/images/scm-source/details/figure-15.webp',caption:'发票识别与校验流程',page:15,origin:'material',fit:'contain'},
 {id:'figure-18',src:'/images/scm-source/details/figure-18.webp',caption:'共享服务问数与写作场景',page:18,origin:'material',fit:'contain'},
 {id:'figure-20',src:'/images/scm-source/details/figure-20.webp',caption:'文档写作助手功能架构',page:20,origin:'material',fit:'contain'},
 {id:'figure-7',src:'/images/scm-source/details/figure-7.webp',caption:'MCP 工具调用界面',page:7,origin:'material',fit:'contain'},
 {id:'figure-3',src:'/images/scm-source/details/figure-3.webp',caption:'iPlat 4J 分布式应用架构',page:3,origin:'material',fit:'contain'},
 {id:'figure-12',src:'/images/scm-source/details/figure-12.webp',caption:'供应链 AI 项目实施阶段',page:12,origin:'material',fit:'contain'},
 {id:'figure-24',src:'/images/scm-source/details/figure-24.webp',caption:'智能体超级入口建设思路',page:24,origin:'material',fit:'contain'},
];
export const providedImages:SlideImage[]=[
 {id:'provided-overview',src:'/images/scm-source/provided/overview.png',caption:'供应链事业部 AI 产品介绍 · 宝信软件',origin:'provided',fit:'contain',width:1434,height:807},
 {id:'provided-coding',src:'/images/scm-source/provided/coding.png',caption:'AI 辅助编程界面（用户指定示意图）',origin:'provided',fit:'contain',width:618,height:498},
 {id:'provided-invoice',src:'/images/scm-source/provided/invoice.png',caption:'发票导入、识别、校对与数据回填',origin:'provided',fit:'contain',width:2018,height:1001},
];
export function imageSourceLabel(im:SlideImage){return im.origin==='provided'?'用户指定配图':im.origin==='upload'?'本地上传':`${im.origin==='simulated'?'AI 模拟选图':'材料截图'}${im.page?' · 原文 P'+im.page:im.id.startsWith('provided-')?' · 用户指定配图':''}`}
export function copySlide(s:Slide,id=s.id):Slide{return {...s,id,points:[...s.points],pages:[...s.pages],images:(s.images||[]).map(im=>({...im})),textStyles:s.textStyles?Object.fromEntries(Object.entries(s.textStyles).map(([k,v])=>[k,{...v}])):undefined,elementFrames:s.elementFrames?Object.fromEntries(Object.entries(s.elementFrames).map(([k,v])=>[k,{...v}])):undefined,reviewed:false}}
export function newSlide(id:string):Slide{return {id,title:'新增页面',message:'用一句话说明本页的主要信息',points:['关键要点｜补充你的业务内容'],notes:'请补充材料依据、讲解提示与待确认事项。',pages:[],layout:'columns',status:'规划与建议',reviewed:false,brand:true,citations:true,images:[],imagePlacement:'auto'}}
export function effectivePlacement(slide:Slide):Exclude<ImagePlacement,'auto'>{
 if(slide.imagePlacement&&slide.imagePlacement!=='auto')return slide.imagePlacement;
 const count=slide.images?.length||0,textLength=slide.points.join('').length;
 return count===2&&textLength<115?'bottom':'right';
}
export function recommendImages(slide:Slide,count:number,direction='auto',prompt=''):SlideImage[]{
 const detect=(words:string)=>/票|识别|校验/.test(words)?'invoice':/编程|MCP|代码|iPlat/i.test(words)?'coding':/封面|总览|企业级应用|产品介绍/.test(words)?'overview':/问数|写作|文档/.test(words)?'knowledge':/架构/.test(words)?'architecture':/平台|入口/.test(words)?'platform':/实施|试点|验收|交付/.test(words)?'delivery':undefined;
 const category=direction==='auto'?(detect(prompt)||detect(slide.title)||detect(slide.message+' '+slide.points.join(' '))||'architecture'):direction;
 const priority:Record<string,(number|string)[]>={overview:['provided-overview',11,22,24],invoice:['provided-invoice',16,15,11],coding:['provided-coding',7,3,11],delivery:[12,11,22,24],knowledge:[18,20,24,11],platform:[22,24,11,20],architecture:[11,22,3,24]};
 const order=priority[category]||priority.architecture;
 return order.slice(0,Math.min(maxImages,Math.max(1,count))).map(p=>({...([...providedImages,...materialImages].find(im=>typeof p==='number'?im.page===p:im.id===p)!),origin:'simulated'}));
}
export const sourceSections=[
 {title:'原始封面与目录',pages:[1,2],note:'封面写 2025 年 7 月，文件名含 20260204；汇报日期另行确认。'},
 {title:'iPlat 4J 与 AI 辅助编程',pages:[3,4,5,6,7,8,9],note:'框架、智能会话、MCP、代码生成与开发者工具。'},
 {title:'供应链场景与实施方法',pages:[10,11,12,13],note:'应用场景、架构、实施阶段与研发角色。'},
 {title:'公文、发票与问数案例',pages:[14,15,16,18,19,20,21],note:'案例中的截图和功能描述，不自动构成量化成效证据。'},
 {title:'产品平台与超级入口规划',pages:[17,22,23,24,25],note:'规划、目标和能力介绍要与实际上线状态分开表述。'},
 {title:'结束页与附录',pages:[26,27,28,29,30,31,32,33],note:'MVP 清单见 P29，正式生产状态仍需核对。'},
];
export const baseSlides:Slide[]=[
 {id:'overview',title:'供应链 AI 企业级应用与推进规划',message:'面向云应用与供应链业务的产品能力、应用案例与推进方法',points:['iPlat 4J 与 AI 辅助编程','业务智能体与共享服务案例','企业级平台与试点推进'],notes:'开场先说明：内容依据用户提供的 33 页材料重组。文件名日期与原封面日期不一致，当前汇报日期另行确认。',pages:[1,2],layout:'cover',status:'材料概述',reviewed:false,brand:true,citations:true},
 {id:'architecture',title:'供应链 AI 产品架构',message:'把业务入口、智能体能力与数据工具连接起来',points:['业务入口｜PC、移动端与业务系统场景','能力层｜智能体编排、知识检索与模型服务','支撑层｜数据、权限、安全与运行管理'],notes:'将复杂架构分为三层讲解。这里是根据原图进行的教学简化，不等于已实现全部模块。可回到 P11、P17 和 P22 核对。',pages:[11,17,22],layout:'architecture',status:'规划与建议',reviewed:false,brand:true,citations:true},
 {id:'coding',title:'AI 辅助编程的核心能力',message:'从问答与代码生成，延伸到工具调用和工程辅助',points:['智能会话｜通用及 iPlat4J 专项问答','代码生成｜实体、SQL 映射与业务页面','工具协同｜MCP、提示词和开发者工具箱'],notes:'以研发工作流介绍功能，不编造代码质量或效率提升比例。智能问答与智能体模式的权限和操作能力不同，详见 P6。',pages:[5,6,7,8,9],layout:'columns',status:'功能介绍',reviewed:false,brand:true,citations:true},
 {id:'invoice',title:'发票识别与校验案例',message:'识别之后还需要校对，再通过接口回填',points:['导入与分类｜选择公司及票据类型','识别与校对｜提取字段，比较系统记录','业务回填｜接口对接，保留人工确认'],notes:'P15 描述基于 Dify、DeepSeek 的识别校验能力；P16 展示高保真界面。材料没有提供准确率、节省工时或 ROI 数据。人工确认是本演练的交付建议，不冒充原文实测。',pages:[10,15,16],layout:'process',status:'案例介绍',reviewed:false,brand:true,citations:true},
 {id:'knowledge',title:'智能问数与文档写作场景',message:'让数据查询与文档知识进入日常业务工作',points:['智能问数｜PC 入口与相关智能体场景','文档知识｜收集、结构化、检索与引用','写作助手｜选择模板，生成后继续编辑'],notes:'P18–21 是共享服务案例介绍。区分架构说明、界面示例和实际成效。会议纪要等生成结果仍需业务人员核对。',pages:[18,19,20,21],layout:'evidence',status:'案例介绍',reviewed:false,brand:true,citations:true},
 {id:'platform',title:'企业智能体平台建设规划',message:'统一入口、编排、管理和运营需要共同设计',points:['超级入口｜对话、主动推送与专项应用','智能体管理｜租户、资产、授权与审计','智能体运营｜监控、诊断与评估优化'],notes:'P22 标题是“建设目标与思路”，P24 介绍建设思路。不要将规划能力改写为“集团全面上线”。上线范围和验收情况需补充实际证据。',pages:[22,23,24,25],layout:'columns',status:'规划与建议',reviewed:false,brand:true,citations:true},
 {id:'delivery',title:'实施阶段与角色分工',message:'场景、数据、开发验证和运营要形成连续交付',points:['需求与设计｜调研痛点，明确场景和接口','准备与验证｜整理数据，配置开发并测试','上线与运营｜试运行、知识转移与持续支持'],notes:'依据 P12 的实施阶段与 P13 的人力角色进行重组。实际工期、人数和责任人尚未给出，保留待确认，不自动生成承诺。',pages:[12,13],layout:'roadmap',status:'规划与建议',reviewed:false,brand:true,citations:true},
 {id:'next',title:'下一步试点与验收建议',message:'选择一条可验证的业务流程，先形成验收证据',points:['试点范围｜确认业务场景、样本与数据权限','验收口径｜共同定义字段质量、复核时间与失败处理','待确认事项｜负责人、预算、时间和推广条件'],notes:'本页是基于材料形成的教学建议，不是原 PDF 已批准的计划。P29 的 MVP 清单可作为候选输入，但不自动等同于生产上线清单。',pages:[12,29],layout:'closing',status:'规划与建议',reviewed:false,brand:true,citations:true},
];
const defaultImageIds:Record<string,string[]>={overview:['provided-overview'],architecture:['figure-11'],coding:['provided-coding'],invoice:['provided-invoice'],knowledge:['figure-18','figure-20'],platform:['figure-22'],delivery:['figure-12'],next:['figure-12']};
for (const slide of baseSlides) {
 slide.images=defaultImageIds[slide.id].map(id=>({...([...providedImages,...materialImages].find(im=>im.id===id)!)}));
 slide.imagePlacement='auto';
}
export type Guards={template:boolean;facts:boolean;status:boolean;concise:boolean;sources:boolean};
export const guardLabels:Record<keyof Guards,string>={template:'锁定模板与版式',facts:'数字必须有来源',status:'区分案例与规划',concise:'限制每页信息密度',sources:'保留来源页与备注'};
export const strictGuards:Guards={template:true,facts:true,status:true,concise:true,sources:true};
export const looseGuards:Guards={template:false,facts:false,status:false,concise:false,sources:false};
export function buildPrompt(slides:Slide[],guards:Guards,audience:string,date:string){return `角色：你是宝信软件供应链业务汇报编辑。\n任务：仅依据所提供的 33 页 PDF，为${audience}制作 ${slides.length} 页演示。汇报日期：${date||'待确认'}。\n\n【模板约束】\n${guards.template?'必须使用我提供的 PPTX/POTX 母版与既有版式。禁止重建 Logo、替换主题色与字体、移动页眉页脚或页码。逐页使用指定版式，只填写标题、正文、图表和备注占位符。如果工具不支持导入母版，请停止宣称“严格套版”，只返回结构化逐页内容，供我填入母版。':'按商务风格自由设计。'}\n本演练的蓝白样式来自原 PDF 的视觉参考，不是经企业确认的正式母版。\n\n【内容与证据】\n${guards.facts?'所有数字必须对应原文页码；缺失的准确率、收益、人数、预算与工期写“待补充”，不得编造。':'突出价值与成果。'}\n${guards.status?'保留“功能介绍、案例、规划、建议”的性质，不把建设目标写成已上线结果。注意文件名日期与 P1 日期不同。':'用简洁有力的结论描述能力。'}\n${guards.concise?'每页一个主要信息；标题不超过 26 个中文字符；正文最多 3 点，每点不超过 38 字。溢出内容进入讲者备注，不缩小到难以阅读。':'尽量覆盖材料细节。'}\n${guards.sources?'每页备注写来源页、待核对项与讲解提示；图表保留编辑能力，不编造可视化数据。':'生成页面即可。'}\n\n【逐页内容合同：不可随意增删或改变顺序】\n${slides.map((s,i)=>`第 ${i+1} 页｜${layoutNames[s.layout]}｜${s.title}\n主要信息：${s.message}\n要点：${s.points.join('；')}\n性质：${s.status}；来源：${s.pages.map(p=>'P'+p).join('、')}\n配图：${(s.images||[]).map(im=>`${im.caption}（${imageSourceLabel(im)}）`).join('；')||'无'}；排版：${placementNames[s.imagePlacement||'auto']}\n备注：${s.notes}`).join('\n\n')}\n\n【交付】\n配图只使用提供的材料截图或用户图片，保留来源；根据图片数量与文字长度布局，截图采用完整显示，不裁掉关键字段。AI 配图模拟选择的素材不应写成原创生成图。先输出逐页提纲供确认，再生成。交付可编辑内容、逐页备注与问题清单；导出后检查字体替换、母版、裁切、图表数据和 PDF 显示效果。`}
export function simulateGenerate(plan:Slide[],guards:Guards){return plan.map(s=>{
 const slide={...copySlide(s),brand:guards.template,citations:guards.sources};
 if(!guards.facts&&slide.id==='invoice')slide.points[2]='审单准确率达到 99%，效率提升 80%';
 if(!guards.status&&slide.id==='platform'){slide.title='集团智能体平台已经全面上线';slide.status='案例介绍'}
 if(!guards.concise&&slide.id==='architecture')slide.points=[...slide.points,'智能体平台同时涵盖从数据治理、工具服务、模型服务到场景集成的多个层面，需要结合实际业务逐步验证各项能力，而不宜把所有结构和功能都堆放在同一页汇报中。','补充说明：这里为了演示常见的信息过载问题，故意保留这段冗长文字；正式汇报应拆页或移入讲者备注。'];
 return slide;
})}
export type SlideIssue={code:'brand'|'facts'|'status'|'density'|'source'|'blank';label:string;advice:string};
export function issuesFor(s:Slide):SlideIssue[]{const issues:SlideIssue[]=[];
 if(!s.brand)issues.push({code:'brand',label:'模板发生偏离',advice:'恢复参考主题，并将内容放回指定版式。实际办公工具中还需检查母版对象。'});
 if(/99\s*%|80\s*%|准确率达到|节省\s*\d|ROI\s*[:：]?\s*\d/i.test(s.points.join(' ')+s.message))issues.push({code:'facts',label:'量化成效缺少来源',advice:'原 PDF 未给出这些成效数字，改为实际功能或“成效待验证”。'});
 if(/全面上线|全集团上线/.test(s.title+s.message+s.points.join(' ')))issues.push({code:'status',label:'把规划写成已上线',advice:'对照 P22–25，保留“建设规划/目标与思路”，上线范围待核对。'});
 if(s.title.length>26||s.points.length>3||s.points.some(p=>p.length>38))issues.push({code:'density',label:'信息密度超出模板预算',advice:'缩短标题，正文保留 3 个要点；细节移入讲者备注。'});
 if(!s.citations||!s.pages.length)issues.push({code:'source',label:'缺少来源提示',advice:'恢复来源页并保留讲者备注，让审核人能回查原文。'});
 if(!s.title.trim()||!s.message.trim()||!s.points.some(p=>p.trim()))issues.push({code:'blank',label:'页面内容不完整',advice:'补齐标题、主要信息和至少一个正文要点。'});
 return issues;
}
export function repairSlide(slide:Slide,code:SlideIssue['code'],plan:Slide[]){const s={...slide,points:[...slide.points],reviewed:false},base=plan.find(p=>p.id===s.id)||baseSlides.find(p=>p.id===s.id)||newSlide(s.id);
 if(code==='brand')s.brand=true;
 if(code==='facts'){s.points=[...base.points];s.message=base.message}
 if(code==='status'){s.title=base.title;s.message=base.message;s.status=base.status;s.points=[...base.points]}
 if(code==='density'){s.notes+='\n移入备注的原正文：'+s.points.join('；');s.title=base.title.slice(0,26);s.points=base.points.slice(0,3).map(p=>p.slice(0,38))}
 if(code==='source'){s.citations=true;s.pages=[...base.pages]}
 if(code==='blank'){s.title=base.title;s.message=base.message;s.points=[...base.points]}
 return s;
}
