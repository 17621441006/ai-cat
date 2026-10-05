"use client";
import {useState} from 'react';
import {BarChart3,ChartLine,ChartPie,Radar,Maximize2,Table2} from 'lucide-react';
import EChartsPlot from './echarts-plot';
import {resolveChartPresentation} from '@/lib/chart-presentation';
import {chartColors as colors,chartNumber as number} from '@/lib/echarts-options';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {chartDataNotice,type AssistantChartSpec} from '@/lib/assistant-charts';

const chartTypes=[{value:'bar',label:'柱状图',Icon:BarChart3},{value:'line',label:'折线图',Icon:ChartLine},{value:'pie',label:'饼图',Icon:ChartPie},{value:'radar',label:'雷达图',Icon:Radar}] as const;

export default function AssistantChart({spec,question=''}:{spec:AssistantChartSpec;question?:string}){
 const [dataView,setDataView]=useState(false),[expanded,setExpanded]=useState(false),[hidden,setHidden]=useState<number[]>([]);
 const presentation=resolveChartPresentation(spec,question),type=presentation.kind;
 const {label,Icon}=chartTypes.find(item=>item.value===type)!;
 const total=spec.series[0].values.reduce<number>((sum,value)=>sum+(value??0),0);
 const unit=spec.unit||'';
 function toggleSeries(index:number){setHidden(current=>current.includes(index)?current.filter(item=>item!==index):current.length<spec.series.length-1?[...current,index]:current)}
 function controls(){return <div className="assistant-chart-controls">
  <span className="assistant-chart-selected-type"><Icon size={16}/><b>{label}</b><small>{presentation.reason}</small></span>
  <button type="button" className="assistant-chart-data-button" aria-pressed={dataView} onClick={()=>setDataView(value=>!value)}><Table2 size={15}/>{dataView?'返回图表':'数据'}</button>
 </div>}
 function dataTable(){return <div className="assistant-chart-data" role="region" tabIndex={0} aria-label={spec.title+'原始数据'}><Table><TableHeader><TableRow><TableHead>类别</TableHead>{spec.series.map(series=><TableHead key={series.name}>{series.name}{unit?`（${unit}）`:''}</TableHead>)}</TableRow></TableHeader><TableBody>{spec.labels.map((label,i)=><TableRow key={label}><TableCell>{label}</TableCell>{spec.series.map(series=><TableCell key={series.name}>{series.values[i]===null?'缺失':number(series.values[i]!)}</TableCell>)}</TableRow>)}</TableBody></Table></div>}
 function plot(){
  return <>
   <div className="assistant-chart-axis-note">{type==='pie'?'构成占比':type==='radar'?typeof spec.max==='number'?`量表：0–${number(spec.max)}${unit}`:spec.max?'各维度按所给上限展示':'按本次最大值缩放，非评分满分':unit?`单位：${unit}`:'数值对比'}<span>{type==='pie'?'悬停查看占比':type==='radar'?'轻触或悬停查看数值':spec.labels.length>12?'拖动下方滑块查看 · 悬停看数值':'悬停查看数值'}</span></div>
   <EChartsPlot spec={spec} kind={type} hidden={hidden}/>
   <div className="assistant-chart-legend" aria-label={type==='pie'?'分类图例':'点击指标显示或隐藏'}>
    {type==='pie'?spec.labels.map((label,i)=><span key={label}><i style={{background:colors[i%colors.length]}}/>{label}<small>{number(spec.series[0].values[i]!/total*100)}%</small></span>):spec.series.map((series,i)=><button type="button" key={series.name} aria-pressed={!hidden.includes(i)} onClick={()=>toggleSeries(i)} title="点击显示或隐藏指标"><i style={{background:colors[i]}}/>{series.name}</button>)}
   </div>
  </>;
 }
 function body(){return <>{chartDataNotice(spec)&&<p className="assistant-chart-data-notice">{chartDataNotice(spec)}</p>}{presentation.warning&&<p className="assistant-chart-data-notice">{presentation.warning}</p>}{controls()}{dataView?dataTable():plot()}<p className="assistant-chart-note">{spec.note||'依据本次回答中的数据绘制。'}{!dataView&&type!=='pie'&&spec.series.length>1?' 点击图例可筛选指标。':''}</p></>}
 return <Dialog open={expanded} onOpenChange={setExpanded}>
  <section className="assistant-chart-card" aria-label={spec.title+'交互图表'}>
   <header><div><span className="assistant-chart-eyebrow"><BarChart3 size={13}/>交互图表</span><h4>{spec.title}</h4></div><button type="button" onClick={()=>setExpanded(true)} className="assistant-chart-expand" aria-label={'放大图表：'+spec.title}><Maximize2 size={15}/><span>放大</span></button></header>
   {body()}
  </section>
  <DialogContent className="assistant-chart-dialog"><DialogHeader><DialogTitle>{spec.title}</DialogTitle><DialogDescription>{spec.labels.length} 个类别 · {spec.series.length} 个指标{unit?` · 单位：${unit}`:''}</DialogDescription></DialogHeader><div className="assistant-chart-expanded-body">{body()}</div></DialogContent>
 </Dialog>;
}
