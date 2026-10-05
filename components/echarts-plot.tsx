"use client";
import {useEffect,useRef} from 'react';
import {init,use,type EChartsType} from 'echarts/core';
import {BarChart,LineChart,PieChart,RadarChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,DataZoomComponent,AriaComponent,RadarComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import {makeEChartsOption} from '@/lib/echarts-options';
import type {AssistantChartSpec} from '@/lib/assistant-charts';
import type {ChartKind} from '@/lib/chart-presentation';

use([BarChart,LineChart,PieChart,RadarChart,RadarComponent,GridComponent,TooltipComponent,DataZoomComponent,AriaComponent,SVGRenderer]);
export default function EChartsPlot({spec,kind,hidden}:{spec:AssistantChartSpec;kind:ChartKind;hidden:number[]}){
 const host=useRef<HTMLDivElement>(null),chart=useRef<EChartsType|null>(null);
 const latest=useRef({spec,kind,hidden});latest.current={spec,kind,hidden};
 const signature=JSON.stringify({spec,kind,hidden});
 useEffect(()=>{
  if(!host.current)return;
  const instance=init(host.current,undefined,{renderer:'svg'});chart.current=instance;
  const draw=()=>{const {spec,kind,hidden}=latest.current;instance.resize();instance.setOption(makeEChartsOption(spec,kind,hidden,document.documentElement.classList.contains('dark'),matchMedia('(prefers-reduced-motion: reduce)').matches,host.current?.clientWidth,host.current?.clientHeight),{notMerge:true})};
  draw();
  const resize=new ResizeObserver(draw);resize.observe(host.current);
  const theme=new MutationObserver(draw);theme.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  return ()=>{resize.disconnect();theme.disconnect();instance.dispose();chart.current=null};
 },[]);
 useEffect(()=>{
  const {spec,kind,hidden}=latest.current;
  chart.current?.setOption(makeEChartsOption(spec,kind,hidden,document.documentElement.classList.contains('dark'),matchMedia('(prefers-reduced-motion: reduce)').matches,host.current?.clientWidth,host.current?.clientHeight),{notMerge:true});
 },[signature]);
 return <div ref={host} className="assistant-echarts-canvas" data-chart-kind={kind} role="img" aria-label={spec.title+'，可使用下方数据按钮查看完整数值'}/>;
}
