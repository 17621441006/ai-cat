import type {EChartsCoreOption} from 'echarts/core';
import type {AssistantChartSpec} from './assistant-charts';
import type {ChartKind} from './chart-presentation';

export const chartColors=['#7661ce','#2c9b94','#d98a36','#527dc5','#cf6b86','#84973f','#8e739d','#657c92'];
export function chartNumber(value:number){return value.toLocaleString('zh-CN',{maximumFractionDigits:4})}
const tick=(value:number)=>Math.abs(value)>=1e8?`${chartNumber(value/1e8)}亿`:Math.abs(value)>=1e4?`${chartNumber(value/1e4)}万`:chartNumber(value);
/** All options are application-owned. Model data never supplies executable formatters or HTML. */
export function makeEChartsOption(spec:AssistantChartSpec,kind:ChartKind,hidden:number[],dark=false,reducedMotion=false,width=640,height=320):EChartsCoreOption{
 const ink=dark?'#d9e0ec':'#354153',muted=dark?'#9caac0':'#69788a',line=dark?'#384457':'#e3e8f0';
 const unit=spec.unit||'',total=spec.series[0].values.reduce<number>((sum,n)=>sum+(n??0),0);
 const common={color:chartColors,animation:!reducedMotion,animationDuration:380,backgroundColor:'transparent',textStyle:{fontFamily:'system-ui, sans-serif',color:ink},aria:{enabled:true,decal:{show:false}},tooltip:{trigger:kind==='pie'?'item':'axis',renderMode:'richText',confine:true,backgroundColor:dark?'#172235':'#fff',borderColor:line,textStyle:{color:ink,fontSize:13},extraCssText:''}};
 if(kind==='radar'){
  const observedMax=Math.max(1,...spec.series.flatMap(s=>s.values.map(v=>v??0)));
  const maxima=spec.labels.map((_,i)=>Array.isArray(spec.max)?spec.max[i]:spec.max??observedMax);
  const narrow=width<440;
  return {...common,tooltip:{...common.tooltip,trigger:'item',triggerOn:'mousemove|click',formatter:(p:{name:string;value:number[]})=>`${p.name}\n${spec.labels.map((label,i)=>`${label}：${chartNumber(p.value[i])}${unit}`).join('\n')}`},
   radar:{indicator:spec.labels.map((name,i)=>({name,min:0,max:maxima[i]})),radius:Math.max(40,Math.min(height/2-36,width/2-(narrow?68:100))),center:['50%','50%'],splitNumber:4,axisNameGap:narrow?8:12,axisName:{color:ink,fontSize:narrow?11:12,formatter:(name:string)=>{const chars=Array.from(name),limit=narrow?4:7;return chars.length>limit?chars.slice(0,limit).join('')+'\n'+chars.slice(limit,limit*2).join('')+(chars.length>limit*2?'…':''):name}},axisLine:{lineStyle:{color:line}},splitLine:{lineStyle:{color:line}},splitArea:{areaStyle:{color:dark?['#ffffff03','#ffffff09']:['#7661ce04','#7661ce0b']}}},
   series:spec.series.map((s,i)=>({type:'radar',name:s.name,symbolSize:6,lineStyle:{width:2.5,color:chartColors[i]},itemStyle:{color:chartColors[i]},areaStyle:{color:chartColors[i],opacity:.12},emphasis:{lineStyle:{width:3.5},areaStyle:{opacity:.23}},data:hidden.includes(i)?[]:[{name:s.name,value:s.values}]}))};
 }
 if(kind==='pie')return {...common,tooltip:{...common.tooltip,formatter:(p:{name:string;value:number})=>`${p.name}\n${chartNumber(p.value)}${unit}${unit==='%'&&Math.abs(total-100)<1e-8?'':`  ·  ${chartNumber(p.value/total*100)}%`}`},series:[{type:'pie',selectedMode:'single',radius:['43%','74%'],center:['50%','48%'],minAngle:0,avoidLabelOverlap:true,label:{show:false},emphasis:{scaleSize:7,label:{show:false}},itemStyle:{borderColor:dark?'#142034':'#fff',borderWidth:3,borderRadius:4},data:spec.labels.map((name,i)=>({name,value:spec.series[0].values[i]}))}]};
 const zoom=spec.labels.length>12;
 return {...common,grid:{top:22,left:14,right:20,bottom:zoom?70:28,outerBoundsMode:'same',outerBoundsContain:'axisLabel'},xAxis:{type:'category',data:spec.labels,boundaryGap:kind==='bar',axisTick:{show:false},axisLine:{lineStyle:{color:line}},axisLabel:{color:muted,hideOverlap:true,margin:14,formatter:(value:string)=>value.length>9?value.slice(0,9)+'…':value}},yAxis:{type:'value',axisLabel:{color:muted,formatter:tick},splitLine:{lineStyle:{color:line,type:'dashed'}}},dataZoom:zoom?[{type:'slider',bottom:4,height:20,startValue:0,endValue:11,brushSelect:false,borderColor:line,textStyle:{color:muted}},{type:'inside',zoomOnMouseWheel:false,moveOnMouseMove:true}]:[],tooltip:{...common.tooltip,valueFormatter:(value:number|null)=>value===null?'缺失':chartNumber(value)+unit},series:spec.series.map((s,i)=>({name:s.name,type:kind,data:hidden.includes(i)?[]:s.values,itemStyle:{color:chartColors[i],...(kind==='bar'?{borderRadius:[4,4,0,0]}:{})},...(kind==='bar'?{barMaxWidth:48}:{connectNulls:false,smooth:false,symbolSize:7,lineStyle:{width:2.5},showSymbol:spec.labels.length<25}),emphasis:{focus:'series'}}))};
}
