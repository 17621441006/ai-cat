/** Local, inspectable transformations for the writing demo. No inferred dates or percentages. */
import {inferColumnKind,looksTabular,parseTableText,tableNumber} from './tabular-data';
export type ColumnKind = 'text' | 'number' | 'date' | 'percent' | 'status';
export type VisualColumn = { label: string; kind: ColumnKind };
export type ChartKind = 'gantt' | 'progress' | 'bar' | 'line' | 'status';
export type WritingVisual = {
  title: string; columns: VisualColumn[]; rows: string[][];
  view: 'table' | 'chart'; chart: 'auto' | ChartKind;
  sourceText: string; note: string; edited: boolean;
};
export const chartNames: Record<ChartKind, string> = {
  gantt: '甘特 / 里程碑', progress: '进度条', bar: '数值对比', line: '趋势折线', status: '状态矩阵',
};
const unknown = '待确认';
const datePattern = /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g;
export function numeric(value: string): number | null {
  return tableNumber(value);
}
export function dateNumber(value: string): number | null {
  const m = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]), month = Number(m[2]), d = Number(m[3]);
  const t = Date.UTC(y, month - 1, d), date = new Date(t);
  return date.getUTCFullYear() === y && date.getUTCMonth() === month - 1 && date.getUTCDate() === d ? t : null;
}
function stateFrom(text: string) {
  if (/受阻|阻塞|延期/.test(text)) return '受阻';
  if (/待验证|待复核|待修正|待审批|未完成|尚未|仍需|待确认/.test(text)) return '待确认';
  if (/已完成|已验证|已通过|检查通过/.test(text)) return '已完成';
  if (/进行中|正在|联调中/.test(text)) return '进行中';
  if (/计划|拟于|待启动/.test(text)) return '计划中';
  return unknown;
}
export function extractWritingVisual(body: string, heading: string, view: WritingVisual['view']): WritingVisual {
  const base = { title: heading, view, chart: 'auto' as const, sourceText: body, edited: false };
  if (looksTabular(body)) {
    // Existing report tables can have a separate explanatory paragraph after a blank line.
    // CSV remains strict: blank lines may be inside a quoted multiline cell.
    const lines=body.replace(/\r\n?/g,'\n').trim().split('\n');
    const separator=!/^["“”＂]/.test(lines[0])&&lines[0].includes('|')?'|':null;
    const end=separator?lines.findIndex((line,i)=>i>0&&line.trim()&&!line.includes(separator)&&!lines[i-1].trim()):-1;
    const parsed=parseTableText(end>=0?lines.slice(0,end).join('\n'):body);
    return {...base,columns:parsed.headers.map((label,i)=>({label,kind:inferColumnKind(label,parsed.rows.map(r=>r[i]))})),rows:parsed.rows,note:`实际解析 ${parsed.format}：${parsed.rows.length} 行、${parsed.headers.length} 列。保留原始表头、单元格换行及空值。${parsed.warnings.join(' ')}${end>=0?'表格后的补充说明保留在整理前原文，不参与统计。':''}`};
  }
  const percentages=[...body.matchAll(/([^，。；;\n]{1,45}?)\s*(\d+(?:\.\d+)?)\s*[%％]/g)];
  if(percentages.length>=2)return {...base,columns:[{label:'事项',kind:'text'},{label:'进度',kind:'percent'}],rows:percentages.slice(0,30).map(m=>[m[1].replace(/(?:完成率|完成进度|进度|已完成|完成|达到|为|：|:)\s*$/g,'').trim(),m[2]+'%']),note:'保留原文中的百分比，未从任务数量推算。请核对这些百分比是否采用相同统计口径。'};
  const series=[...body.matchAll(/(第\s*\d+\s*周|\d{1,2}月)[^\d\n，,；;]{0,18}(\d+(?:\.\d+)?)\s*(份|条|人|万元|小时)/g)];
  if(series.length>=2)return {...base,columns:[{label:'周期',kind:'text'},{label:'数量',kind:'number'},{label:'单位',kind:'text'}],rows:series.slice(0,30).map(m=>[m[1],m[2],m[3]]),note:'从原文提取时间与数量，按出现顺序展示。请核对时间先后、单位以及是否为去重统计。'};
  // Natural-language quantities stay independent: a subset is never made into an invented remainder.
  const quantities = [...body.matchAll(/(\d+(?:\.\d+)?)\s*(条|份|个|人|万元|小时|吨)\s*([^，。；;\n]{2,32})/g)];
  if (quantities.length >= 2 && !(body.match(datePattern)?.length)) {
    return { ...base, columns: [{label:'指标',kind:'text'},{label:'数量',kind:'number'},{label:'单位',kind:'text'}], rows: quantities.slice(0,30).map(m => [m[3].replace(/的.*$|已.*$|仍.*$|完成.*$|进行.*$/, '').trim() || '原文指标',m[1],m[2]]), note: '逐项保留原文数量。总量与其中的子项可能重叠，不相加、不自动计算完成率；不同单位不能放在同一数值轴上。' };
  }
  const sentences = body.replace(/^[•*]\s*/gm,'').split(/[\n；;。]+/).map(s => s.trim()).filter(Boolean).slice(0,30);
  const hasDates = sentences.some(s => s.match(datePattern));
  const columns: VisualColumn[] = hasDates
    ? [{label:'事项',kind:'text'},{label:'责任人',kind:'text'},{label:'开始日期',kind:'date'},{label:'截止日期',kind:'date'},{label:'状态',kind:'status'}]
    : [{label:'事项 / 原文要点',kind:'text'},{label:'责任人',kind:'text'},{label:'状态',kind:'status'}];
  const rows = sentences.map(text => {
    const dates = text.match(datePattern) || [];
    const owner = text.match(/(?:负责人|顾问)([\u4e00-\u9fa5]{1,4}?)(?=计划|拟于|负责|将|在|需)/)?.[1] || (/项目经理/.test(text) ? '项目经理' : /财务负责人/.test(text) ? '财务负责人' : unknown);
    const state = stateFrom(text);
    // Single due dates become milestones, never fictional durations.
    const isRange=dates.length===2&&/(?:至|到|—|~|～)/.test(text.slice(text.indexOf(dates[0])+dates[0].length,text.lastIndexOf(dates[1])));
    return hasDates ? [text, owner, isRange ? dates[0]!.replaceAll('/','-') : '', (dates.length===1||isRange ? dates.at(-1)! : '').replaceAll('/','-'), state] : [text, owner, state];
  });
  return {...base, columns, rows, note: hasDates ? '日期来自当前段落；只有截止日期时显示为里程碑。空白日期保持待确认，不推算开始时间。请核对自动拆分后的责任人与事项。' : '逐句整理原文。没有明确提到的责任人和状态标为待确认；补充数据后，图表会重新匹配。'};
}

export function visualFields(v: WritingVisual) {
  const c = v.columns;
  const group = c.findIndex(x => /小组|团队|分组|类别/.test(x.label));
  const label = c.findIndex(x => /事项|任务|指标|工具|名称|工作项/.test(x.label));
  const dates = c.map((x,i)=>x.kind==='date'?i:-1).filter(i=>i>=0);
  const start = c.findIndex(x => x.kind==='date' && /开始|起始/.test(x.label));
  const end = c.findIndex(x => x.kind==='date' && /截止|结束|到期/.test(x.label));
  const time = c.findIndex(x => /周次|月份|时间|日期|周期/.test(x.label));
  return {label:label>=0?label:Math.max(0,c.findIndex(x=>x.kind==='text')),group,start,end:end>=0?end:(dates.at(-1)??-1),time,percent:c.findIndex(x=>x.kind==='percent'),number:c.findIndex(x=>x.kind==='number'),status:c.findIndex(x=>x.kind==='status'),unit:c.findIndex(x=>/单位/.test(x.label))};
}
const missing = (s: string) => !s.trim() || /^(待确认|待指定|未知|—|-)$/.test(s.trim());
export function visualDataIssues(v: WritingVisual): string[] {
  const issues: string[] = [];
  if (!v.title.trim()) issues.push('图表 / 表格标题为空');
  if (!v.rows.length) issues.push('表格没有数据行');
  if (v.columns.some(c=>!c.label.trim())) issues.push('表头为空');
  v.rows.forEach((row, ri) => {
    v.columns.forEach((col, ci) => {
      const cell = row[ci] || '';
      if (missing(cell)) return;
      if (col.kind==='date' && dateNumber(cell)===null) issues.push(`第 ${ri+1} 行「${col.label}」需要有效日期 YYYY-MM-DD`);
      if ((col.kind==='number'||col.kind==='percent') && numeric(cell)===null) issues.push(`第 ${ri+1} 行「${col.label}」需要数值`);
      if (col.kind==='percent' && numeric(cell)!==null && (numeric(cell)!<0 || numeric(cell)!>100)) issues.push(`第 ${ri+1} 行进度需在 0–100% 之间`);
    });
    const {start,end}=visualFields(v);
    if(start>=0&&end>=0&&dateNumber(row[start]||'')!==null&&dateNumber(row[end]||'')!==null&&dateNumber(row[start])!>dateNumber(row[end])!) issues.push(`第 ${ri+1} 行截止日期早于开始日期`);
  });
  return [...new Set(issues)];
}
export function recommendChart(v: WritingVisual): {kind:ChartKind|null;reason:string;available:ChartKind[];validRows:number;excluded:number} {
  const f=visualFields(v), available:ChartKind[]=[];
  const dated=v.rows.filter(r=>f.end>=0&&dateNumber(r[f.end]||'')!==null);
  const progress=v.rows.filter(r=>f.percent>=0&&numeric(r[f.percent]||'')!==null);
  const numbers=v.rows.filter(r=>f.number>=0&&numeric(r[f.number]||'')!==null);
  const units=f.unit<0?[]:[...new Set(numbers.map(r=>r[f.unit].trim()).filter(Boolean))];
  if(dated.length)available.push('gantt');
  if(progress.length)available.push('progress');
  if(numbers.length&&units.length<=1)available.push('bar');
  if(numbers.length>=2&&f.time>=0&&units.length<=1)available.push('line');
  if(f.status>=0&&v.rows.length)available.push('status');
  const auto=available.includes('gantt')?'gantt':available.includes('progress')?'progress':available.includes('line')?'line':available.includes('bar')?'bar':available.includes('status')?'status':null;
  const kind=v.chart==='auto'?auto:available.includes(v.chart)?v.chart:null;
  const reasons={gantt:f.start>=0?'识别到任务日期：区间画时间条，单个截止日画里程碑。':'识别到截止日期：用里程碑展示安排，不虚构任务工期。',progress:'识别到进度百分比：固定 0–100% 刻度，直接比较各项完成情况。',bar:'识别到分类和同单位数值：使用从零起的刻度对比，不将重叠指标相加。',line:'识别到时间序列与数值：按表格顺序连接各期，请保持时间先后顺序。',status:'识别到状态字段：按团队归组，用颜色和文字同时区分状态。'};
  const validRows=kind==='gantt'?dated.length:kind==='progress'?progress.length:kind==='bar'||kind==='line'?numbers.length:kind==='status'?v.rows.length:0;
  return {kind,reason:kind?reasons[kind]:units.length>1?'存在不同单位。请统一统计口径后再生成数值图表。':'暂时没有适配图表。请补充日期、进度、数量或状态字段，也可以先保留表格。',available,validRows,excluded:v.rows.length-validRows};
}
export function visualIssues(v:WritingVisual,body:string){
  const issues=visualDataIssues(v);
  if(v.sourceText!==body)issues.unshift('正文已修改，请重新整理或核对后同步图表数据');
  if(v.view==='chart'&&!recommendChart(v).kind)issues.push('当前数据无法绘制所选图表，请补充数据或切换表格');
  return issues;
}
export function visualMarkdown(v:WritingVisual){
  const escape=(s:string)=>s.replaceAll('|','\\|').replaceAll('\n',' ');
  const rec=recommendChart(v);
  return `### ${v.title}\n\n${v.view==='chart'?`图表：${rec.kind?chartNames[rec.kind]:'待补数据'}（Markdown 保留可编辑数据）\n\n`:''}| ${v.columns.map(c=>escape(c.label)).join(' | ')} |\n| ${v.columns.map(()=> '---').join(' | ')} |\n${v.rows.map(r=>'| '+r.map(escape).join(' | ')+' |').join('\n')}\n\n> ${v.note}${v.edited?' 数据经手动调整，请核对原始记录。':''}`;
}
const xml=(v:unknown)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const short=(s:string,n=19)=>s.length>n?s.slice(0,n-1)+'…':s;
const colors=['#5368d9','#159589','#3978bc','#ad6844','#9164bf'];
export function statusColor(s:string){return /受阻|延期|放弃|暂停/.test(s)?'#bc5462':/待验证|待复核|待确认/.test(s)?'#aa7119':/已完成|已验证|已研究|通过/.test(s)?'#13856f':/进行|正在/.test(s)?'#4869ca':'#77859a'}
function statusBucket(s:string){return /受阻|延期|放弃|暂停/.test(s)?'受阻 / 暂停':/待验证|待复核|待确认/.test(s)?'待确认 / 验证':/已完成|已验证|已研究|通过/.test(s)?'已完成 / 验证':/进行|正在/.test(s)?'进行中':'计划 / 其他'}
export function chartSvg(v:WritingVisual):{svg:string;width:number;height:number}|null{
  const rec=recommendChart(v);if(!rec.kind||visualDataIssues(v).length)return null;
  const f=visualFields(v),kind=rec.kind,W=820,left=230,right=766;
  const entries=v.rows.map((row,index)=>({row,index})).filter(({row:r})=>kind==='gantt'?dateNumber(r[f.end]||'')!==null:kind==='progress'?numeric(r[f.percent]||'')!==null:kind==='bar'||kind==='line'?numeric(r[f.number]||'')!==null:true);
  const groupNames=[...new Set(entries.map(e=>f.group>=0?e.row[f.group]:''))];
  const buckets=['已完成 / 验证','进行中','待确认 / 验证','计划 / 其他','受阻 / 暂停'].filter(s=>entries.some(e=>statusBucket(e.row[f.status]||unknown)===s));
  const groupHeights=groupNames.map(g=>Math.max(...buckets.map(b=>entries.filter(e=>(f.group>=0?e.row[f.group]:'')===g&&statusBucket(e.row[f.status]||unknown)===b).length),1)*43+24);
  const H=kind==='line'?370:kind==='status'?Math.max(265,groupHeights.reduce((a,b)=>a+b,0)+153):Math.max(265,entries.length*53+143);
  const parts:string[]=[];
  const text=(x:number,y:number,s:string,size=14,fill='#53647b',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${xml(s)}</text>`;
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${xml(v.title+' · '+chartNames[kind])}" font-family="Microsoft YaHei, PingFang SC, sans-serif"><rect width="${W}" height="${H}" rx="14" fill="#ffffff"/>`);
  parts.push(text(28,37,short(v.title,38),20,'#243a59','font-weight="700"'),text(28,61,`${chartNames[kind]} · ${entries.length} 项${rec.excluded?` · ${rec.excluded} 项待补数据`:''}${(kind==='bar'||kind==='line')&&f.unit>=0?' · 单位：'+entries[0]?.row[f.unit]:''}`,12));
  const colorFor=(r:string[],i:number)=>colors[(f.group>=0?groupNames.indexOf(r[f.group]):i)%colors.length];
  const titleFor=(r:string[])=>v.columns.map((c,i)=>c.label+'：'+(r[i]||unknown)).join('；');
  const label=(r:string[],y:number,i:number)=>{
    parts.push(text(28,y,short(r[f.label]||`事项 ${i+1}`,14),14,'#283e5b','font-weight="600"'));
    if(f.group>=0&&f.group!==f.label)parts.push(text(28,y+18,r[f.group],11));
  };
  if(kind==='gantt'){
    const starts=entries.map(({row:r})=>f.start>=0?dateNumber(r[f.start]||''):null),ends=entries.map(({row:r})=>dateNumber(r[f.end])!);
    const earliest=Math.min(...ends,...starts.filter((n):n is number=>n!==null)),latest=Math.max(...ends),min=earliest===latest?earliest-86400000:earliest,max=earliest===latest?latest+86400000:latest,span=max-min,x=(n:number)=>left+(n-min)/span*(right-left),ticks=Math.min(4,Math.round(span/86400000));
    for(let tick=0;tick<=ticks;tick++){const n=min+span*tick/ticks,xx=x(n);parts.push(`<line x1="${xx}" y1="99" x2="${xx}" y2="${H-42}" stroke="#e3e9f2" stroke-dasharray="3 5"/>`,text(xx,90,new Date(n).toISOString().slice(5,10),11,'#687991','text-anchor="middle"'));}
    entries.forEach(({row:r,index},i)=>{const y=128+i*53,c=colorFor(r,i),end=ends[i],start=starts[i];parts.push(`<g data-row="${index}" tabindex="0"><title>${xml(titleFor(r))}</title>`);label(r,y,i);if(start!==null&&start<end){const width=Math.max(5,x(end)-x(start));parts.push(`<rect x="${x(start)}" y="${y-11}" width="${width}" height="21" rx="5" fill="${c}" opacity="0.2"/><rect x="${x(start)}" y="${y-11}" width="${width}" height="21" rx="5" fill="${c}"/>`);}else{const xx=x(end);parts.push(`<path d="M ${xx} ${y-12} l 10 10 l -10 10 l -10 -10 Z" fill="${c}"/>`);}parts.push('</g>');});
  }else if(kind==='progress'||kind==='bar'){
    const idx=kind==='progress'?f.percent:f.number,values=entries.map(({row:r})=>numeric(r[idx])!);
    const min=kind==='progress'?0:Math.min(0,...values),max=kind==='progress'?100:Math.max(0,...values),span=max-min||1,x=(n:number)=>left+(n-min)/span*(right-left-40);
    for(let i=0;i<=4;i++){const n=min+(max-min)*i/4,xx=x(n);parts.push(`<line x1="${xx}" y1="96" x2="${xx}" y2="${H-38}" stroke="#e6ebf4"/>`,text(xx,88,(Math.round(n*10)/10).toString()+(kind==='progress'?'%':''),11,'#687991','text-anchor="middle"'));}
    entries.forEach(({row:r,index},i)=>{const y=126+i*53,value=values[i],c=colorFor(r,i);parts.push(`<g data-row="${index}" tabindex="0"><title>${xml(titleFor(r))}</title>`);label(r,y,i);if(kind==='progress')parts.push(`<rect x="${left}" y="${y-13}" width="${right-left-40}" height="22" rx="5" fill="#edf1f8"/>`);parts.push(`<rect x="${Math.min(x(0),x(value))}" y="${y-13}" width="${Math.max(0,Math.abs(x(value)-x(0)))}" height="22" rx="5" fill="${c}"/>`,text(Math.min(right+15,x(value)+9),y+3,`${value}${kind==='progress'?'%':f.unit>=0?r[f.unit]:''}`,13,'#2a3f5c','font-weight="600"'),'</g>');});
  }else if(kind==='line'){
    const values=entries.map(({row:r})=>numeric(r[f.number])!),min=Math.min(0,...values),max=Math.max(0,...values),span=max-min||1,x=(i:number)=>83+i/Math.max(1,v.rows.length-1)*653,y=(n:number)=>280-(n-min)/span*168;
    for(let i=0;i<=4;i++){const n=min+(max-min)*i/4,yy=y(n);parts.push(`<line x1="83" y1="${yy}" x2="736" y2="${yy}" stroke="#e6ebf4"/>`,text(67,yy+4,(Math.round(n*10)/10).toString(),11,'#687991','text-anchor="end"'));}
    entries.forEach(({row:r,index},i)=>{if(i>0&&entries[i-1].index===index-1)parts.push(`<line x1="${x(index-1)}" y1="${y(values[i-1])}" x2="${x(index)}" y2="${y(values[i])}" stroke="#5368d9" stroke-width="3"/>`);parts.push(`<g data-row="${index}" tabindex="0"><title>${xml(titleFor(r))}</title><circle cx="${x(index)}" cy="${y(values[i])}" r="6" fill="#fff" stroke="#5368d9" stroke-width="3"/>`,text(x(index),y(values[i])-15,String(values[i]),13,'#3f50b7','text-anchor="middle"'),'</g>');});
    v.rows.forEach((r,i)=>{if(v.rows.length<=8||i%Math.ceil(v.rows.length/8)===0||i===v.rows.length-1)parts.push(text(x(i),309,short(r[f.time],10),12,'#53647b','text-anchor="middle"'));});
  }else{
    const startX=160,cellW=628/Math.max(1,buckets.length);let yi=114;
    buckets.forEach((bucket,bi)=>parts.push(text(startX+bi*cellW+cellW/2,93,bucket,12,statusColor(bucket),'text-anchor="middle" font-weight="600"')));
    groupNames.forEach((group,gi)=>{
      const height=groupHeights[gi];parts.push(`<rect x="28" y="${yi}" width="760" height="${height}" fill="${gi%2?'#ffffff':'#f4f7fb'}"/>`,text(40,yi+30,f.group>=0?short(group,8):'当前段落',13,'#283e5b','font-weight="600"'));
      buckets.forEach((bucket,bi)=>{const xx=startX+bi*cellW;parts.push(`<line x1="${xx}" y1="${yi}" x2="${xx}" y2="${yi+height}" stroke="#e6ebf4"/>`);entries.filter(e=>(f.group>=0?e.row[f.group]:'')===group&&statusBucket(e.row[f.status]||unknown)===bucket).forEach(({row:r,index},i)=>{const y=yi+13+i*43,c=statusColor(r[f.status]||unknown);parts.push(`<g data-row="${index}" tabindex="0"><title>${xml(titleFor(r))}</title><rect x="${xx+7}" y="${y}" width="${cellW-14}" height="32" rx="6" fill="${c}" opacity="0.1"/><circle cx="${xx+17}" cy="${y+16}" r="4" fill="${c}"/>`,text(xx+27,y+21,short(r[f.label],Math.max(5,Math.floor((cellW-45)/13))),12,'#283e5b'),'</g>');});});
      yi+=height;
    });
  }
  parts.push(text(28,H-17,'数据来自当前表格 · 缺失值不补零 · 请核对统计口径',11),' </svg>');
  return {svg:parts.join(''),width:W,height:H};
}

export async function chartPng(v:WritingVisual):Promise<{bytes:Uint8Array;width:number;height:number}>{
  const result=chartSvg(v);if(!result)throw new Error('请先补全并核对图表数据。');
  if(typeof document==='undefined')throw new Error('图表图片需要在浏览器中生成。');
  await document.fonts?.ready;
  const url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('图表图片生成失败，请重试。'));img.src=url;});
    const canvas=document.createElement('canvas');canvas.width=result.width*2;canvas.height=result.height*2;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('当前浏览器无法生成图表图片。');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片导出失败。')),'image/png'));
    return {bytes:new Uint8Array(await blob.arrayBuffer()),width:result.width,height:result.height};
  }finally{URL.revokeObjectURL(url);}
}
