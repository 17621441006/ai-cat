"use client";
import {lazy,Suspense,useState,type ReactNode} from 'react';
import {BarChart3,Maximize2,Table2} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {Table} from '@/components/ui/table';
import {chartFromTable,tableRows,tableText as content,type TableNode} from '@/lib/assistant-charts';

const AssistantChart=lazy(()=>import('./assistant-chart'));
function tableMetrics(node?:TableNode){
 const rows=tableRows(node);
 const columns=Math.max(1,...rows.map(row=>row.children?.filter(cell=>cell.tagName==='th'||cell.tagName==='td').length??0));
 const widths=Array.from({length:columns},(_,index)=>{
  const longest=Math.max(1,...rows.map(row=>{
   const cell=row.children?.filter(cell=>cell.tagName==='th'||cell.tagName==='td')[index];
   return cell?Array.from(content(cell)).reduce((size,char)=>size+(/[\u0000-\u00ff]/.test(char)?.55:1),0):0;
  }));
  return Math.min(272,Math.max(88,Math.ceil(Math.sqrt(longest)*24+20)));
 });
 return {columns,rows:Math.max(0,rows.length-1),widths,width:widths.reduce((total,value)=>total+value,0)};
}
export default function AssistantTable({children,node,question=''}:{children:ReactNode;node?:TableNode;question?:string}){
 const [expanded,setExpanded]=useState(false),[showChart,setShowChart]=useState(false);
 const metrics=tableMetrics(node);
 const chart=chartFromTable(node);
 function table(){return <Table aria-label="AI 回答表格" style={{minWidth:`${metrics.width}px`}}><colgroup>{metrics.widths.map((width,index)=><col key={index} style={{width:`${width}px`}}/>)}</colgroup>{children}</Table>}
 return <Dialog open={expanded} onOpenChange={setExpanded}>
  <div className="assistant-table-card" data-table-width={metrics.width}>
   <div className="assistant-table-toolbar"><span><Table2 size={14}/>{metrics.rows} 行 · {metrics.columns} 列</span><div className="assistant-table-tools">{chart&&<button type="button" className="assistant-table-expand" aria-expanded={showChart} onClick={()=>setShowChart(value=>!value)}><BarChart3 size={14}/>{showChart?'收起图表':'生成图表'}</button>}<DialogTrigger asChild><button type="button" className="assistant-table-expand"><Maximize2 size={14}/>放大查看</button></DialogTrigger></div></div>
   <div className="assistant-table-viewport" role="region" aria-label="回答表格，可横向滚动" tabIndex={0}>{table()}</div>
  </div>
  {showChart&&chart&&<Suspense fallback={<div className="assistant-chart-pending" role="status">正在载入图表…</div>}><AssistantChart spec={chart} question={question}/></Suspense>}
  <DialogContent className="assistant-table-dialog">
   <DialogHeader><DialogTitle><Table2 size={18}/>表格详情</DialogTitle><DialogDescription>{metrics.rows} 行 · {metrics.columns} 列</DialogDescription></DialogHeader>
   <div className="assistant-markdown assistant-table-viewport" role="region" aria-label="完整表格，可上下和左右滚动" tabIndex={0}>{table()}</div>
  </DialogContent>
 </Dialog>;
}
