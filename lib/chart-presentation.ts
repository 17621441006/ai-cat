import {canUsePie,canUseRadar,type AssistantChartSpec} from './assistant-charts';

export type ChartKind=AssistantChartSpec['type'];
export const chartKindNames:Record<ChartKind,string>={pie:'饼图',line:'折线图',bar:'柱状图',radar:'雷达图'};

/** Only positive requests count. The last explicit choice wins after a correction. */
export function requestedChartKind(question=''):ChartKind|undefined{
 const mentions=[...question.matchAll(/雷达(?:图)?|蛛网图|radar(?:\s*chart)?|spider\s*chart|饼(?:状)?图|环(?:形|状)图|pie\s*chart|donut(?:\s*chart)?|折线(?:图)?|线形图|line\s*chart|柱状(?:图)?|条形(?:图)?|bar\s*chart/gi)];
 let choice:ChartKind|undefined;
 for(const mention of mentions){
  const before=question.slice(Math.max(0,mention.index!-14),mention.index);
  if(/(?:不要|不用|别|不画|不需要|不适合|不是|不能|而非|without|not|no)\s*(?:使用|显示|展示|画|绘制|用|再|这个|这种)?\s*$/i.test(before))continue;
  choice=/雷达|蛛网|radar|spider/i.test(mention[0])?'radar':/饼|环|pie|donut/i.test(mention[0])?'pie':/折|线|line/i.test(mention[0])?'line':'bar';
 }
 return choice;
}

function timeKey(label:string):number|null{
 const text=label.trim(),cn:Record<string,number>={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12};
 let m=text.match(/^(\d{4})(?:[-/.年](\d{1,2})(?:[-/.月](\d{1,2})日?)?月?)?年?$/);
 if(m)return +m[1]*10000+(+(m[2]||0))*100+(+(m[3]||0));
 m=text.match(/^(?:第)?(\d+|[一二三四五六七八九十]{1,3})(?:月|周|天|季度)$/);
 if(m)return Number(m[1])||cn[m[1]]||null;
 m=text.match(/^(?:(\d{4})[-年 ]?)?(?:Q|季度)([1-4])$/i);
 if(m)return +(m[1]||0)*4+(+m[2]);
 m=text.match(/^(\d{1,2}):(\d{2})$/);if(m)return +m[1]*60+(+m[2]);
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const index=months.indexOf(text.toLowerCase().slice(0,3));return index>=0?index:null;
}
export function hasOrderedTimeLabels(labels:string[]){
 const keys=labels.map(timeKey);return keys.length>1&&keys.every((key,i)=>key!==null&&(!i||keys[i-1]!==null&&key>keys[i-1]!));
}

/** Shared by assistant replies, numeric tables and future visualization workspaces. */
export function resolveChartPresentation(spec:AssistantChartSpec,question=''):{kind:ChartKind;reason:string;warning?:string}{
 const requested=requestedChartKind(question);
 if(requested){
  if(requested==='pie'&&!canUsePie(spec))return {kind:'bar',reason:'数量对比',warning:'这组数据含多项指标、缺失值或负值，无法完整表达为饼图。已保留原始数值，用柱状图展示。'};
  if(requested==='radar'&&!canUseRadar(spec))return {kind:'bar',reason:'保留原始数据',warning:'雷达图需要 3–12 个完整的非负维度。这组数据暂不满足，先用柱状图保留原始数值。'};
  return {kind:requested,reason:'按你的要求'};
 }
 if(spec.type==='radar'&&canUseRadar(spec))return {kind:'radar',reason:'多维度比较'};
 const subject=spec.title+' '+spec.series.map(s=>s.name).join(' ')+' '+question;
 // A time axis takes priority over rates: monthly conversion rates are not slices of a whole.
 if(hasOrderedTimeLabels(spec.labels))return {kind:'line',reason:'按时间变化'};
 if(/准确率|合格率|通过率|转化率|增长率|达成率|利率/.test(spec.title+' '+spec.series.map(s=>s.name).join(' ')))return {kind:'bar',reason:'独立指标对比'};
 if(/占比|份额|构成|组成|分布比例|share|composition/i.test(subject)&&canUsePie(spec))return {kind:'pie',reason:'同一整体的构成'};
 if(spec.type==='pie'&&canUsePie(spec)&&!/准确率|通过率|转化率|增长率|达成率|利率/.test(subject))return {kind:'pie',reason:'同一整体的构成'};
 if(/趋势|随.*变化|trend/i.test(subject)&&spec.type==='line')return {kind:'line',reason:'变化趋势'};
 return {kind:'bar',reason:'类别数量对比'};
}
