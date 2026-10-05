/** Shared, local table parsing. Cells are data, never evaluated as formulas. */
export type ParsedTable = {headers:string[];rows:string[][];format:string;warnings:string[]};
export type TableColumnKind = 'text'|'number'|'date'|'percent'|'status';
export const TABLE_LIMITS={rows:200,columns:20,characters:524288};
const quotes = new Set(['"','“','”','＂']);
const separatorNames:Record<string,string>={',':'CSV','，':'中文逗号 CSV','\t':'TSV / Excel 粘贴','|':'Markdown / 竖线表格',';':'分号 CSV'};
function inputText(text:string){
 return text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/^\n+|\n+$/g,'').replace(/^```(?:csv|tsv|markdown|md|text)?\s*\n/i,'').replace(/\n```\s*$/,'');
}
function delimiterFor(text:string){
 const line=text.split('\n')[0];
 // Tabs and table borders take precedence over commas inside descriptions.
 if(line.includes('\t'))return '\t';
 if(line.startsWith('|')||(/^\s*\|?\s*:?-{3,}/m.test(text)&&line.includes('|')))return '|';
 const candidates=[',','，','|',';'].filter(s=>line.includes(s)).map(separator=>{
  try{return {separator,fields:readDelimited(line,separator).rows[0]?.length||0}}catch{return {separator,fields:0}}
 }).sort((a,b)=>b.fields-a.fields);
 return candidates.find(c=>c.fields>1)?.separator||candidates[0]?.separator||null;
}
export function looksTabular(text:string){
 const clean=inputText(text),separator=delimiterFor(clean);if(!separator)return false;
 const lines=clean.split('\n').filter(s=>s.trim());
 if(quotes.has(clean[0])||separator==='\t'||separator==='|')return true;
 return lines.length>=2&&lines[0].split(separator).every(h=>h.length<=50&&!/[。；]/.test(h));
}

function readDelimited(text:string,separator:string):{rows:string[][];smart:boolean}{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false,smart=false,line=1;
 const pushCell=()=>{row.push(cell);cell='';closed=false};
 const pushRow=()=>{pushCell();if(row.some(c=>c.trim()))rows.push(row);row=[];if(rows.length>TABLE_LIMITS.rows+2)throw new Error(`最多载入 ${TABLE_LIMITS.rows} 行数据，请拆分后练习；没有截断或替换任何数据。`)};
 const boundary=(index:number)=>{let j=index+1;while(text[j]===' '||text[j]==='\u00a0')j++;return j===text.length||text[j]===separator||text[j]==='\n'};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='\n')line++;
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){cell+='"';i++;continue;}
   if(quotes.has(c)&&boundary(i)){quoted=false;closed=true;if(c!=='"')smart=true;continue;}
   cell+=c;continue;
  }
  if(c===separator){pushCell();continue;}
  if(c==='\n'){pushRow();continue;}
  if(closed){if(/\s/.test(c))continue;throw new Error(`第 ${line} 行的引号后缺少分隔符，请检查该单元格。`);}
  if(quotes.has(c)&&!cell.trim()){quoted=true;cell='';if(c!=='"')smart=true;continue;}
  cell+=c;
 }
 if(quoted)throw new Error(`第 ${line} 行附近有未闭合引号。包含换行或逗号的单元格需要用一对双引号包住。`);
 pushRow();return {rows,smart};
}
export function parseTableText(text:string):ParsedTable{
 if(text.length>TABLE_LIMITS.characters)throw new Error('内容超过 512 KB，请拆分后练习。');
 if(text.includes('\u0000')||text.includes('\uFFFD'))throw new Error('文本编码无法识别，请导出为 UTF-8 CSV，或直接从 Excel / WPS 复制单元格。');
 const clean=inputText(text);if(!clean.trim())throw new Error('请先粘贴表头和至少一行数据。');
 const separator=delimiterFor(clean);if(!separator)throw new Error('没有识别到表格分隔符。请粘贴 CSV、Excel / WPS 单元格或 Markdown 表格，第一行为表头。');
 let records:string[][],smart=false;
 if(separator==='|'){
  records=clean.split('\n').filter(l=>l.trim()).map(line=>line.trim().replace(/^\|/,'').replace(/(?<!\\)\|$/,'').split(/(?<!\\)\|/).map(c=>c.trim().replace(/\\\|/g,'|').replace(/<br\s*\/?\s*>/gi,'\n')));
  if(records[1]?.every(c=>/^:?-{2,}:?$/.test(c)))records.splice(1,1);
 }else{const result=readDelimited(clean,separator);records=result.rows;smart=result.smart;}
 if(records.length<2)throw new Error('需要一行表头和至少一行数据。');
 const headers=records[0].map(s=>s.trim()),rows=records.slice(1);
 if(headers.length<2||headers.length>TABLE_LIMITS.columns)throw new Error(`请提供 2–${TABLE_LIMITS.columns} 列数据，第一行为表头。`);
 if(headers.some(h=>!h))throw new Error('表头中有空白列，请为每一列命名。');
 if(new Set(headers).size!==headers.length)throw new Error('存在重复表头，请给同名字段添加区别，例如“计划日期”和“实际日期”。');
 if(rows.length>TABLE_LIMITS.rows)throw new Error(`最多载入 ${TABLE_LIMITS.rows} 行数据，请拆分后练习；没有截断数据。`);
 const invalid=rows.findIndex(r=>r.length!==headers.length);
 if(invalid>=0)throw new Error(`第 ${invalid+1} 条数据有 ${rows[invalid].length} 列，表头有 ${headers.length} 列。包含逗号或换行的单元格须用双引号包住，空值也要保留分隔符。`);
 return {headers,rows,format:separatorNames[separator],warnings:smart?['已识别中文 / 智能双引号作为字段边界；单元格中的原文保留。']:[]};
}
export function tableNumber(text:string):number|null{
 const s=text.trim().replace(/^[¥￥$€]\s*/,'').replace(/[％%]$/,'');
 if(!/^[+-]?(?:\d+|\d{1,3}(?:[,，]\d{3})+)(?:\.\d+)?$/.test(s))return null;
 const n=Number(s.replace(/[,，]/g,''));return Number.isFinite(n)?n:null;
}
export function inferColumnKind(label:string,values:string[]):TableColumnKind{
 const nonempty=values.map(v=>v.trim()).filter(Boolean);
 if(/序号|编号|编码|号码|订单号|邮编|电话|^id$|^code$/i.test(label)||nonempty.some(v=>/^0\d+$/.test(v)))return 'text';
 if(/状态|阶段/.test(label))return 'status';
 if(/完成率|百分比|占比|进度/.test(label)&&nonempty.every(v=>tableNumber(v)!==null)||nonempty.length>0&&nonempty.every(v=>/^[\d.]+[%％]$/.test(v)))return 'percent';
 if(/日期|开始|截止|结束|到期/.test(label)||nonempty.length>0&&nonempty.every(v=>/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v)))return 'date';
 if(nonempty.length>0&&nonempty.every(v=>tableNumber(v)!==null))return 'number';
 return 'text';
}
export function tableCsv(headers:string[],rows:string[][],spreadsheetSafe=false){
 return [headers,...rows].map(row=>row.map(cell=>{
  // Formula-like content is escaped only on spreadsheet export; imported text is preserved.
  const value=spreadsheetSafe&&/^\s*[=+@-]/.test(cell)&&tableNumber(cell)===null?"'"+cell:cell;
  return '"'+value.replaceAll('"','""')+'"';
 }).join(',')).join('\r\n');
}
export function cleanTableRows(rows:string[][],trim:boolean,deduplicate:boolean){
 const seen=new Set<string>();let changed=0,removed=0;
 const result=rows.flatMap(row=>{const next=row.map(v=>{const clean=trim?v.trim():v;if(clean!==v)changed++;return clean});const key=JSON.stringify(next);if(deduplicate&&seen.has(key)){removed++;return []}seen.add(key);return [next]});
 return {rows:result,changed,removed};
}
export function aggregateTable(rows:string[][],group:number,metric:number|null,operation:'count'|'sum'|'average'){
 const groups=new Map<string,{value:number;count:number}>();let excluded=0;
 for(const row of rows){const label=row[group]?.trim()||'（未填写）';const value=operation==='count'?1:metric===null?null:tableNumber(row[metric]||'');if(value===null){excluded++;continue}const prior=groups.get(label)||{value:0,count:0};groups.set(label,{value:prior.value+value,count:prior.count+1})}
 return {rows:[...groups].map(([name,g])=>({name,value:operation==='average'?g.value/g.count:g.value,records:g.count})),excluded};
}
export const projectPracticeText=tableCsv(['序号','项目名称','项目状态','项目概况','需要协调事项'],[
 ['1','海外 SCM 系统实施','进度正常','1、已完成系统上线。\n2、完成首次月结，继续运行支持。','暂无'],
 ['2','工厂 MES 升级','验收中','1、已完成测试。\n2、计划组织业务验收。','请业务负责人确认验收时间'],
 ['3','区域 TMS 调度试点','待协调','已完成路线配置；接口权限仍待确认。','协调接口权限'],
 ['4','仓储 WMS 优化','进度正常','完成库位映射，正在验证出入库流程。','暂无'],
 ['5','供应链数据治理','进度正常','供应商编码表已完成复核。','确认下一批数据范围'],
 ['6','智能工厂专项改造','验收中','测试基本完成；生产环境切换计划评审中。','确认切换窗口'],
]);
export const numericPracticeText=tableCsv(['仓库','物料','库存数量','单位'],[['上海仓','热轧卷','120','吨'],['上海仓','冷轧卷','80','吨'],['南京仓','热轧卷','95','吨'],['南京仓','冷轧卷','60','吨']]);
