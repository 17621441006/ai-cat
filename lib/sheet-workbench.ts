import {parseTableText} from './tabular-data';
export const columns = ['订单号','行号','供应商','地区','物料','数量','单价','币种','下单日期','承诺日期','状态','负责人'];
export type RawRow = string[];
export const seedRows: RawRow[] = [
 ['PO-26001','1',' 华东钢贸 ','华东','热轧卷','20','¥3,500','CNY','2026/07/02','2026/07/18','已完成','采购一组'],
 ['PO-26001','1',' 华东钢贸 ','华东','热轧卷','20','¥3,500','CNY','2026/07/02','2026/07/18','已完成','采购一组'],
 ['PO-26001','2','华东钢贸有限公司','华东','冷轧卷','10','4200','CNY','2026-07-02','2026-07-20','已完成','采购一组'],
 ['PO-26002','1','江南材料','华南','热轧卷','15','3,600','CNY','2026.07.10','2026.07.28','已完成','采购二组'],
 ['PO-26003','1','北方金属','华北','中厚板','12','4000','CNY','2026/07/16','2026/08/03','已完成','采购三组'],
 ['PO-26004','1','江南材料有限公司','华南','冷轧卷','8','4300','CNY','2026-07-22','2026-08-08','已完成','采购二组'],
 ['PO-26005','1','华东钢贸','华东','热轧卷','25','3,450','CNY','2026/08/05','2026/08/28','已完成','采购一组'],
 ['PO-26006','1','北方金属有限公司','华北','中厚板','18','¥3,950','CNY','2026-08-11','2026-09-10','跟进中','采购三组'],
 ['PO-26007','1','江南材料','华南','冷轧卷','16','4250','CNY','2026.08.18','2026.09.22','跟进中','采购二组'],
 ['PO-26008','1','华东钢贸','华东','中厚板','10','','CNY','2026-08-21','2026-09-18','待确认','采购一组'],
 ['PO-26009','1','北方金属','华北','热轧卷','14','3550','CNY','2026-08-26','2026-09-14','跟进中','采购三组'],
 ['PO-26010','1','江南材料','华南','中厚板','0','4100','CNY','2026-08-29','2026-09-26','待确认','采购二组'],
 ['PO-26011','1','华东钢贸','华东','冷轧卷','9','4150','CNY','2026-08-32','2026-09-25','待确认','采购一组'],
 ['PO-26012','1','北方金属','华北','热轧卷','11','3500','CNY','2026-09-03','2026-09-28','跟进中','采购三组'],
];
export const suppliers = [
 {name:'华东钢贸有限公司',aliases:['华东钢贸'],region:'华东',contact:'林经理',grade:'A',term:'月结 30 天'},
 {name:'江南材料有限公司',aliases:['江南材料'],region:'华南',contact:'周经理',grade:'B',term:'月结 45 天'},
 {name:'北方金属有限公司',aliases:['北方金属'],region:'华北',contact:'赵经理',grade:'A',term:'月结 30 天'},
];
export type Rules = {trim:boolean; supplier:boolean; number:boolean; date:boolean; dedup:boolean};
export const defaultRules:Rules={trim:true,supplier:true,number:true,date:true,dedup:true};
export const ruleLabels:Record<keyof Rules,string>={trim:'清除首尾空格',supplier:'按主数据合并供应商别名',number:'金额与数量转成数值',date:'统一日期为 YYYY-MM-DD',dedup:'按订单号 + 行号查重'};
export function csvText(rows:RawRow[]){return [columns,...rows].map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n')}
export function parseCsv(text:string):RawRow[]{
 const parsed=parseTableText(text);
 if(parsed.headers.join('|')!==columns.join('|'))throw new Error('当前表头适合“自带数据练习”，采购业务规则仅用于示例的 12 列字段。');
 return parsed.rows;
}
export function normalizedDate(s:string){const m=s.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);if(!m)return null;const [y,mo,d]=m.slice(1).map(Number);const date=new Date(Date.UTC(y,mo-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===mo-1&&date.getUTCDate()===d?`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null}
function numeric(s:string){if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null}
export type SheetRow={source:number;raw:RawRow;values:RawRow;changes:{field:string;before:string;after:string}[];issues:string[];duplicate:boolean;qty:number|null;price:number|null;amount:number|null;month:string;late:boolean};
export function cleanRows(raw:RawRow[],rules:Rules,asOf='2026-09-20'):SheetRow[]{
 const seen=new Map<string,RawRow>();const rows=raw.map((r,i)=>{
  let v=r.map(s=>rules.trim?s.trim():s);
  if(rules.supplier){const s=suppliers.find(s=>s.name===v[2]||s.aliases.includes(v[2]));if(s)v[2]=s.name}
  if(rules.number)for(const k of [5,6])v[k]=v[k].replace(/[¥￥,，\s]/g,'');
  if(rules.date)for(const k of [8,9])v[k]=normalizedDate(v[k])||v[k];
  const issues:string[]=[];const qty=numeric(v[5]),price=numeric(v[6]);const date=normalizedDate(v[8]),due=normalizedDate(v[9]);
  if(!v[0]||!v[1])issues.push('订单号或行号缺失');
  if(!suppliers.some(s=>s.name===v[2]))issues.push('供应商未匹配主数据');
  if(!['华东','华南','华北'].includes(v[3]))issues.push('地区不在字典中');
  if(!v[4])issues.push('物料缺失');
  if(qty===null||qty<=0)issues.push('数量须为正数');
  if(price===null||price<=0)issues.push(v[6]?'单价须为正数':'缺失单价');
  if(v[7]!=='CNY')issues.push('币种须为 CNY，其他币种待折算');
  if(!date||date!==v[8])issues.push('下单日期无效或格式未统一');
  if(!due||due!==v[9])issues.push('承诺日期无效或格式未统一');
  if(date&&due&&due<date)issues.push('承诺日期早于下单日期');
  if(!['已完成','跟进中','待确认'].includes(v[10]))issues.push('状态不在字典中');
  const key=v[0]+'|'+v[1],old=seen.get(key),same=old&&old.every((x,k)=>x===v[k]);let duplicate=false;
  if(old){if(same&&rules.dedup)duplicate=true;else issues.push(same?'存在重复订单行':'同一订单行内容冲突，需人工确认')}else seen.set(key,v);
  const amount=qty!==null&&price!==null?Math.round(qty*price*100)/100:null;
  return {source:i+2,raw:r,values:v,changes:v.flatMap((value,k)=>value!==r[k]?[{field:columns[k],before:r[k],after:value}]:[]),issues,duplicate,qty,price,amount,month:date?.slice(0,7)||'日期待核对',late:!!due&&due<asOf&&v[10]!=='已完成'};
 });
 const byKey=new Map<string,SheetRow[]>();for(const row of rows){const key=row.values[0]+'|'+row.values[1];byKey.set(key,[...(byKey.get(key)||[]),row])}
 for(const group of byKey.values())if(group.length>1&&group.some(r=>r.values.some((v,k)=>v!==group[0].values[k]))){for(const row of group){row.duplicate=false;if(!row.issues.includes('同一订单行内容冲突，需人工确认'))row.issues.push('同一订单行内容冲突，需人工确认')}}
 return rows;
}
export type Dimension='supplier'|'region'|'material'|'month';
export const dimensions:Record<Dimension,string>={supplier:'供应商',region:'地区',material:'物料',month:'月份'};
export function dimensionValue(row:SheetRow,key:Dimension){return key==='month'?row.month:row.values[{supplier:2,region:3,material:4}[key]]}
export type Metric='amount'|'qty'|'lines'|'orders'|'price';
export const metrics:Record<Metric,string>={amount:'采购金额',qty:'采购数量',lines:'订单行数',orders:'去重订单数',price:'加权单价'};
export function measure(rows:SheetRow[],metric:Metric){if(metric==='lines')return rows.length;if(metric==='orders')return new Set(rows.map(r=>r.values[0])).size;const amount=rows.reduce((a,r)=>a+(r.amount||0),0),qty=rows.reduce((a,r)=>a+(r.qty||0),0);return metric==='amount'?amount:metric==='qty'?qty:qty?amount/qty:0}
export function groupRows(rows:SheetRow[],dimension:Dimension,metric:Metric){return [...new Set(rows.map(r=>dimensionValue(r,dimension)))].sort().map(name=>{const subset=rows.filter(r=>dimensionValue(r,dimension)===name);return {name,value:measure(subset,metric),rows:subset}})}
export const formatAmount=(n:number)=>n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
