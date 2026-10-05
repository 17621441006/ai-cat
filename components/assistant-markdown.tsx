"use client";
import {createContext,lazy,Suspense,useContext} from 'react';
import Markdown,{type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import AssistantTable from './assistant-table';
import {normalizeAssistantMarkdown} from '@/lib/assistant-stream';
import {parseAssistantChart,chartFailureMessage} from '@/lib/assistant-charts';
import {remarkAssistantEmphasis} from '@/lib/assistant-emphasis';
import {normalizeAssistantChartBlocks} from '@/lib/assistant-chart-markdown';

const AssistantChart=lazy(()=>import('./assistant-chart'));
const StreamingContext=createContext(false);
const QuestionContext=createContext('');
const ReplyTable:NonNullable<Components['table']>=({children,node})=>{const question=useContext(QuestionContext);return <AssistantTable node={node} question={question}>{children}</AssistantTable>};
const ChartCodeBlock:NonNullable<Components['pre']>=({children,node})=>{
 const streaming=useContext(StreamingContext),question=useContext(QuestionContext);
 const code=node?.children[0];
 if(code?.type==='element'&&code.tagName==='code'&&Array.isArray(code.properties.className)&&code.properties.className.includes('language-chart')){
  const source=code.children.map(child=>child.type==='text'?child.value:'').join('');
  const spec=parseAssistantChart(source);
  if(spec)return <Suspense fallback={<div className="assistant-chart-pending" role="status">正在载入图表…</div>}><AssistantChart spec={spec} question={question}/></Suspense>;
  if(streaming)return <div className="assistant-chart-pending" role="status">正在整理图表数据…</div>;
  return <div className="assistant-chart-invalid"><p>{chartFailureMessage(source)}</p><details><summary>查看原始内容</summary><pre><code>{source}</code></pre></details></div>;
 }
 return <pre>{children}</pre>;
};

// Stable renderers keep an expanded table open while more answer tokens arrive.
const components:Components={
  table:ReplyTable,
  thead:({children})=><TableHeader>{children}</TableHeader>,
  tbody:({children})=><TableBody>{children}</TableBody>,
  tr:({children})=><TableRow>{children}</TableRow>,
  th:({children,style})=><TableHead style={style}>{children}</TableHead>,
  td:({children,style})=><TableCell style={style}>{children}</TableCell>,
  pre:ChartCodeBlock,
  // Navigation is provided separately from verified knowledge records.
  a:({children})=><span>{children}</span>,
  img:()=>null,
};
export default function AssistantMarkdown({text,streaming=false,question=''}:{text:string;streaming?:boolean;question?:string}){
 return <QuestionContext.Provider value={question}><StreamingContext.Provider value={streaming}><div className="assistant-markdown"><Markdown remarkPlugins={[remarkGfm,remarkAssistantEmphasis]} skipHtml components={components}>{normalizeAssistantMarkdown(normalizeAssistantChartBlocks(text))}</Markdown></div></StreamingContext.Provider></QuestionContext.Provider>;
}
