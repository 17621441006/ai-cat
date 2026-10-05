import {z} from 'zod';

const label=z.string().trim().min(1).max(80);
const value=z.number().finite().min(-1e15).max(1e15).nullable();
export const assistantChartKinds=['line','bar','pie','radar'] as const;
const axisMaximum=z.number().finite().positive().max(1e15);
export const assistantChartSchema=z.object({
 type:z.enum(assistantChartKinds),
 title:z.string().trim().min(1).max(100),
 labels:z.array(label).min(1).max(60),
 series:z.array(z.object({name:label,values:z.array(value).min(1).max(60)}).strict()).min(1).max(5),
 unit:z.string().max(16).optional(),
 note:z.string().max(240).optional(),
 max:z.union([axisMaximum,z.array(axisMaximum).min(3).max(12)]).optional(),
}).strict().superRefine((chart,ctx)=>{
 if(chart.series.some(series=>series.values.length!==chart.labels.length))ctx.addIssue({code:'custom',message:'数据与标签数量不一致'});
 if(chart.series.some(series=>!series.values.some(number=>number!==null)))ctx.addIssue({code:'custom',message:'缺少有效数值'});
 if(new Set(chart.labels).size!==chart.labels.length||new Set(chart.series.map(series=>series.name)).size!==chart.series.length)ctx.addIssue({code:'custom',message:'标签或指标名称重复'});
 if(chart.type==='pie'&&!canUsePie(chart))ctx.addIssue({code:'custom',message:'饼图需要一组非负且完整的数据'});
 if(chart.type==='radar'&&!canUseRadar(chart))ctx.addIssue({code:'custom',message:'雷达图需要 3–12 个维度，每组数据须完整、非负，且不超过量表上限'});
 if(chart.type!=='radar'&&chart.max!==undefined)ctx.addIssue({code:'custom',message:'量表上限仅用于雷达图'});
});
export type AssistantChartSpec=z.infer<typeof assistantChartSchema>;
export function canUsePie(chart:{series:{values:(number|null)[]}[]}){
 return chart.series.length===1&&chart.series[0].values.every(value=>value!==null&&value>=0)&&chart.series[0].values.some(value=>value!==null&&value>0);
}
export function canUseRadar(chart:{labels:string[];series:{values:(number|null)[]}[];max?:number|number[]}){
 return chart.labels.length>=3&&chart.labels.length<=12&&(!Array.isArray(chart.max)||chart.max.length===chart.labels.length)&&chart.series.every(s=>s.values.length===chart.labels.length&&s.values.every((v,i)=>v!==null&&v>=0&&(chart.max===undefined||v<=(Array.isArray(chart.max)?chart.max[i]:chart.max))));
}

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const onlyKeys=(value:Record<string,unknown>,keys:string[])=>Object.keys(value).every(key=>keys.includes(key));
/** Normalize data-only aliases used by chat models. Never accept arbitrary ECharts options. */
function normalizeChartInput(raw:unknown):unknown{
 if(!record(raw))return raw;
 const input={...raw};
 if(input.type==='radar'){
  if(input.maxValue!==undefined&&input.max===undefined){input.max=input.maxValue;delete input.maxValue}
  const indicator=input.indicators??input.indicator??(record(input.radar)?input.radar.indicator:undefined);
  if(indicator!==undefined){
   if(input.radar!==undefined&&(!record(input.radar)||!onlyKeys(input.radar,['indicator'])))return null;
   const parsed=z.array(z.object({name:label,max:axisMaximum.optional()}).strict()).min(3).max(12).safeParse(indicator);
   if(!parsed.success)return null;
   const labels=parsed.data.map(axis=>axis.name);
   if(input.labels!==undefined&&JSON.stringify(input.labels)!==JSON.stringify(labels))return null;
   input.labels=labels;
   const maxima=parsed.data.map(axis=>axis.max);
   if(maxima.some(v=>v!==undefined)){
    if(maxima.some(v=>v===undefined)||input.max!==undefined)return null;
    input.max=maxima;
   }
   delete input.indicator;delete input.indicators;delete input.radar;
  }
 }
 const defaultName=input.unit==='%'?'占比':input.title;
 if(!('series' in input)){
  const values=input.values??input.data;
  if(Array.isArray(values)){
   // A flat array, or radar data rows shaped as {name, value: [...]}.
   input.series=values.every(v=>!record(v))?[{name:defaultName,values}]:values;
   if(input.values!==undefined)delete input.values;else delete input.data;
  }
 }
 if(Array.isArray(input.series)){
  const series:unknown[]=[];
  for(const item of input.series){
   if(!record(item))return null;
   if(input.type==='radar'&&item.type==='radar'&&Array.isArray(item.data)&&item.data.every(record)){
    if(!onlyKeys(item,['type','name','data']))return null;
    for(const row of item.data){
     if(!onlyKeys(row,['name','value']))return null;
     series.push({name:row.name??item.name??defaultName,values:row.value});
    }
   }else{
    const normalized={...item};
    const alias='data' in item?'data':'value' in item?'value':null;
    if(alias&&!('values' in item)){normalized.values=item[alias];delete normalized[alias]}
    series.push(normalized);
   }
  }
  input.series=series;
 }
 return input;
}
export function parseAssistantChart(source:string):AssistantChartSpec|null{
 if(source.length>18000)return null;
 try{
  const input=normalizeChartInput(JSON.parse(source));
  const parsed=assistantChartSchema.safeParse(input);return parsed.success?parsed.data:null;
 }catch{return null}
}

export function chartFailureMessage(source:string){
 try{
  const raw=JSON.parse(source);
  if(record(raw)&&typeof raw.type==='string'&&!assistantChartKinds.includes(raw.type as typeof assistantChartKinds[number]))return '这种图形暂未支持。目前可以绘制雷达图、饼图、折线图和柱状图。';
  if(record(raw)&&raw.type==='radar')return '雷达图还缺少可用的数据：请提供 3–12 个维度及对应数值；如有评分满分，也请注明。已有数值会保留，不会自动补成 0。';
  return '暂时无法绘制：请核对每个标签是否都有对应的数值。原始内容已保留，补齐数据后即可继续。';
 }catch{return '图表数据尚未完整返回，暂时无法绘制。可以让小脏接着输出完整的图表数据，无需改变你的提问方式。'}
}

export function chartDataNotice(chart:Pick<AssistantChartSpec,'title'|'note'>){
 return /示例|模拟|估算|假设|演示|synthetic|sample|hypothetic|illustrativ|estimat/i.test(chart.title+' '+(chart.note||''))?'示例 / 估算数据，非真实统计':null;
}

export type TableNode={tagName?:string;value?:string;children?:TableNode[]};
export function tableText(node:TableNode):string{return node.value??node.children?.map(tableText).join('')??''}
export function tableRows(node?:TableNode){return node?.children?.flatMap(section=>section.children?.filter(child=>child.tagName==='tr')??[])??[]}
function numericCell(text:string){
 const raw=text.trim().replace(/％/g,'%');
 if(!raw||raw==='—'||raw==='–')return {value:null,unit:''};
 if(!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*%?$/.test(raw))return null;
 const value=Number(raw.replace(/[,\s%]/g,''));
 return Number.isFinite(value)?{value,unit:raw.endsWith('%')?'%':''}:null;
}
/** Only genuinely numeric tables can opt into charts; no invented values. */
export function chartFromTable(node?:TableNode):AssistantChartSpec|null{
 const rows=tableRows(node).map(row=>row.children?.filter(cell=>cell.tagName==='td'||cell.tagName==='th').map(tableText)??[]);
 const [headers,...body]=rows;
 if(!headers||headers.length<2||headers.length>6||body.length<2||body.length>60||body.some(row=>row.length!==headers.length))return null;
 const candidates=headers.slice(1).map((name,index)=>{
  const cells=body.map(row=>numericCell(row[index+1]));
  if(cells.some(cell=>cell===null)||!cells.some(cell=>cell?.value!==null))return null;
  const units=new Set(cells.filter(cell=>cell?.value!==null).map(cell=>cell!.unit));
  if(units.size>1)return null;
  return {name,values:cells.map(cell=>cell!.value),unit:[...units][0]||name.match(/[（(]([^()（）]{1,8})[)）]$/)?.[1]||''};
 }).filter((series):series is NonNullable<typeof series>=>!!series);
 if(!candidates.length||new Set(candidates.map(series=>series.unit)).size>1)return null;
 const result=assistantChartSchema.safeParse({type:'bar',title:candidates.length===1?candidates[0].name:'数据对比',labels:body.map(row=>row[0]),series:candidates.map(({name,values})=>({name,values})),unit:candidates[0].unit,note:'根据上方表格绘制；数值与原表一致。'});
 return result.success?result.data:null;
}

// This contract is shared by cloud and browser models. No generated JavaScript,
// HTML, callbacks, colors or remote resources ever enter the chart renderer.
export const assistantPresentationPrompt=`表达与可读性：先给结论，再解释。多步骤回答用 **第一步：建立基础认知** 这样的短标题；每段只加粗1–2处关键词，不要整段加粗。重要结论可用一段简短的 Markdown 引用块。用户要表格时仍输出标准 Markdown 表格。
用户要雷达图、折线图、柱状图、饼图或交互图表，且已有明确数字时，按下面完整格式输出，包括 chart 围栏。values 必须在 series 数组内，禁止省略 series。只写 JSON 数据，不得输出 JavaScript、HTML 或绘图库代码：
\`\`\`chart
{"type":"bar","title":"销量对比","labels":["一月","二月","三月"],"series":[{"name":"销量","values":[12,18,15]}],"unit":"件","note":"用户提供的数据"}
\`\`\`
用户明确指定类型时优先遵循，只生成该类型的一张图，不额外生成其他类型。未指定时按数据含义选择：同一整体的占比用 pie，按时间排序的趋势用 line，类别数量比较用 bar。不同对象的准确率或增长率不构成同一整体，不得画成饼图。type 可为 line（趋势）、bar（对比）、pie（占比）、radar（多维能力或同量表比较）。雷达图也必须使用同样的 labels + series[].values 数据结构；需要 3–12 个维度，各维度须有非负数值且使用可比较的量表。用户明确提供满分时加 max，例如 10 分制用 "max":10；没有提供时不要猜测满分。站内资料只有能力描述而没有评分时，先询问用户的维度与评分，不得自行给工具打分。多对象对比可用多组 series；不要输出雷达图的文字画法来代替图表。示例仅演示结构，严禁照抄示例数值作答。labels 与各组 values 一一对应，数值必须是 JSON 数字；缺失值用 null，不当作0，不补造。最多24个类别、4个指标，尽量简洁。每张图的指标单位必须相同，单位不同拆图。pie 仅一组非负、非空数据且总和大于0，用于同一整体的构成占比，不能把无关指标凑成饼图。note 简述数字来源；演示数据必须明确写“示例数据，非真实统计”。没有可靠数字则询问用户提供数据，不编造比例、趋势或成效。图后用1–2句话概括观察，界面会提供悬停、图例筛选、原始数据和放大。
真实性优先于画图：你没有实时联网检索能力。用户询问真实市场占有率、用户规模等事实，而上下文未提供可核查统计时，明确说明缺少可靠数据，请用户提供统计来源或数字。不能根据用户活跃度、知名度、曝光度或主观印象编造市场份额；“大概是多少”不代表允许虚构。只有用户明确要求假设/模拟/示例时，才可以用示例数字画图，并在标题与 note 中标明；不能用“仅供参考”“估算”掩盖没有依据的数据。`;
