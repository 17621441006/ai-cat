import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
await mkdir(new URL('../work/',import.meta.url),{recursive:true});
await build({stdin:{contents:`export {default as AssistantMarkdown} from './components/assistant-markdown';export {consumeAssistantStream} from './lib/assistant-stream';export {searchKnowledge,groundedMessages} from './lib/site-search';export {parseAssistantChart,chartFromTable,chartDataNotice} from './lib/assistant-charts';export {normalizeAssistantChartBlocks} from './lib/assistant-chart-markdown';export {handleAssistantPost} from './lib/assistant-cloud';export {assistantDestinations,resolveAssistantNavigation} from './lib/assistant-navigation';export {resolveChartPresentation,requestedChartKind} from './lib/chart-presentation';export {makeEChartsOption} from './lib/echarts-options';export {researchCases,searchResearchSources,supportedClaims,parseResearchAnswer,researchMarkdown,safeResearchUrl} from './lib/research-workbench';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external',outfile:'work/assistant-replies-test.mjs',logLevel:'silent'});
const {assistantDestinations,resolveAssistantNavigation,AssistantMarkdown,consumeAssistantStream,searchKnowledge,groundedMessages,parseAssistantChart,chartFromTable,chartDataNotice,normalizeAssistantChartBlocks,handleAssistantPost,resolveChartPresentation,requestedChartKind,makeEChartsOption,researchCases,searchResearchSources,supportedClaims,parseResearchAnswer,researchMarkdown,safeResearchUrl}=await import('../work/assistant-replies-test.mjs');

test('model Markdown becomes a table, including a table with empty lines between rows',()=>{
 const text='工具对比：\n\n| 工具 | 用途 |\n\n| :--- | :--- |\n\n| **WPS** | 表格整理 |\n\n| 飞书 | 协作 |';
 const html=renderToStaticMarkup(createElement(AssistantMarkdown,{text}));
 assert.match(html,/<table/);assert.match(html,/<thead/);assert.match(html,/<tbody/);assert.equal((html.match(/<td\b/g)||[]).length,4);assert.match(html,/<strong>WPS<\/strong>/);
});

test('reply rendering does not execute HTML or load generated remote images',()=>{
 const html=renderToStaticMarkup(createElement(AssistantMarkdown,{text:'<script>alert(1)</script>\n\n![image](https://untrusted.example/image.png)\n\n[click](javascript:alert(1))\n\n```js\nconst x = 1;\n```'}));
 assert.doesNotMatch(html,/<script|<img|href="javascript:/);assert.match(html,/<pre>/);assert.match(html,/const x = 1;/);
});

test('beginner and tool overview questions retrieve the relevant starting point',()=>{
 assert.equal(searchKnowledge('我想从零开始学习 AI，你觉得我先从哪个板块开始？')[0].id,'learning-start');
 assert.equal(searchKnowledge('AI 工具有哪些，表格形式输出给我')[0].id,'tools-overview');
 const history=[{role:'user',content:'列举三种 AI 工具'},{role:'assistant',content:'写作、表格、会议'}];
 const prompt=groundedMessages('整理成表格',[],'列举三种 AI 工具',history);
 assert.deepEqual(prompt.slice(1,3),history);assert.match(prompt[0].content,/Markdown 表格/);assert.match(prompt.at(-1).content,/当前问题：整理成表格/);
});

test('client handles UTF-8 chunk boundaries and refuses an incomplete event stream',async()=>{
 const events=[{type:'stage',stage:'waiting',message:'等待回答'},{type:'text',text:'你好'},{type:'done',text:'你好',hits:[],engine:'测试'}];
 function stream(items){const bytes=new TextEncoder().encode(items.map(item=>'data: '+JSON.stringify(item)+'\n\n').join(''));return new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.slice(i,i+3));c.close()}})}
 const received=[];await consumeAssistantStream(stream(events),e=>received.push(e));assert.deepEqual(received,events);
 await assert.rejects(()=>consumeAssistantStream(stream(events.slice(0,2)),()=>{}),/传输中断/);
});

test('charts accept finite aligned data, preserve gaps and reject misleading or executable inputs',()=>{
 const chart={type:'line',title:'周度完成量',labels:['第一周','第二周','第三周'],series:[{name:'完成',values:[5,null,9]}]};
 assert.deepEqual(parseAssistantChart(JSON.stringify(chart)),chart);
 for(const change of [{labels:['重复','重复','第三周']},{series:[{name:'完成',values:[1,2]}]},{type:'pie'},{series:[{name:'完成',values:[1,'3',5]}]},{series:[{name:'完成',values:[1e99,3,5]}]},{formatter:'alert(1)'},{labels:Array(61).fill('x')},{type:'script'}])assert.equal(parseAssistantChart(JSON.stringify({...chart,...change})),null);
 assert.equal(parseAssistantChart('{"type":"bar"'),null);
 const validPie={...chart,type:'pie',series:[{name:'完成',values:[0,3,5]}]};
 assert.ok(parseAssistantChart(JSON.stringify(validPie)));
 assert.equal(parseAssistantChart(JSON.stringify({...validPie,series:[{name:'完成',values:[0,0,0]}]})),null);
 assert.equal(parseAssistantChart(JSON.stringify({...validPie,series:[{name:'完成',values:[1,-1,2]}]})),null);
});

test('numeric tables offer charts without interpreting prose, ranges or mixed units as numbers',()=>{
 const node=(headers,rows)=>({children:[{children:[{tagName:'tr',children:headers.map(value=>({tagName:'th',value}))}]},{children:rows.map(row=>({tagName:'tr',children:row.map(value=>({tagName:'td',value}))}))}]});
 const valid=chartFromTable(node(['月份','完成数'],[['一月','1,200'],['二月','0'],['三月','—']]));
 assert.deepEqual(valid.series[0].values,[1200,0,null]);
 assert.equal(chartFromTable(node(['工具','说明'],[['A','文字'],['B','说明']])),null);
 assert.equal(chartFromTable(node(['月份','完成数'],[['一月','2–3'],['二月','4']])),null);
 assert.equal(chartFromTable(node(['月份','收入（元）','数量（件）'],[['一月','2','3'],['二月','4','5']])),null);
});

test('plain step titles gain emphasis while code and tables retain their contents',()=>{
 const html=renderToStaticMarkup(createElement(AssistantMarkdown,{text:'第一步，先建立基础认知。重点理解术语。\n\n```txt\n第二步，进入互动课堂。\n```'}));
 assert.match(html,/<strong>第一步，先建立基础认知<\/strong>/);
 assert.match(html,/<code class="language-txt">第二步，进入互动课堂。/);
 const emphasis=renderToStaticMarkup(createElement(AssistantMarkdown,{text:'> **建议：**先完成一个练习。\n\n`**建议：**`'}));
 assert.match(emphasis,/<strong>建议<\/strong>：先完成一个练习。/);
 assert.match(emphasis,/<code>\*\*建议：\*\*<\/code>/);
 const incomplete='```chart\n{"type":"bar"';
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:incomplete,streaming:true})),/正在整理图表数据/);
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:incomplete})),/暂时无法绘制/);
 assert.match(groundedMessages('画图',[],'')[0].content,/没有可靠数字则询问用户提供数据/);
});

// Verbatim provider output from the user's failed chart screenshot, including
// its noncanonical flat values and missing Markdown fence. Not factual data.
const screenshotReply='{"type":"pie","title":"PPT工具市场占有率（估算）","labels":["Kimi PPT","Gamma","WPS AI PPT","其他工具"],"values":[45,30,15,10],"unit":"%","note":"示例数据，非真实统计。基于当前AI PPT工具用户活跃度与市场曝光度估算，仅供参考。"}';

test('explicit chart intent wins; automatic selection separates composition, time and independent rates',()=>{
 const base={type:'bar',title:'数量',labels:['甲','乙','丙'],series:[{name:'数量',values:[20,30,50]}]};
 assert.equal(resolveChartPresentation(base,'请用饼图展示').kind,'pie');
 assert.equal(resolveChartPresentation({...base,type:'pie'},'请用柱状图展示').kind,'bar');
 assert.equal(requestedChartKind('不要用折线图，改成饼图'),'pie');
 assert.equal(requestedChartKind('用柱状图，不要饼图'),'bar');
 assert.equal(resolveChartPresentation(base).kind,'bar');
 assert.equal(resolveChartPresentation(base,'比较这几类费用在总预算中的占比').kind,'pie');
 assert.equal(resolveChartPresentation({...base,title:'预算构成占比',unit:'%'}).kind,'pie');
 assert.equal(resolveChartPresentation({...base,type:'pie',title:'每月转化率',labels:['一月','二月','三月'],unit:'%'}).kind,'line');
 assert.equal(resolveChartPresentation({...base,type:'pie',title:'三家工厂的合格率',series:[{name:'准确率',values:[90,80,95]}],unit:'%'}).kind,'bar');
 const missing={...base,series:[{name:'数量',values:[2,null,5]}]};
 assert.equal(resolveChartPresentation(missing,'用饼图').kind,'bar');
 assert.match(resolveChartPresentation(missing,'用饼图').warning,/缺失值/);
 assert.equal(resolveChartPresentation({...base,labels:['一月','三月','二月']}).kind,'bar');
});

test('ECharts adapter keeps exact data, null gaps and only one chosen chart kind',()=>{
 const spec={type:'pie',title:'例子',labels:['<script>x</script>','乙'],series:[{name:'数量',values:[2,3]}],unit:'个'};
 const option=makeEChartsOption(spec,'pie',[]);
 assert.equal(option.series.length,1);assert.equal(option.series[0].type,'pie');
 assert.deepEqual(option.series[0].data,[{name:'<script>x</script>',value:2},{name:'乙',value:3}]);
 assert.equal(option.tooltip.renderMode,'richText');
 const gap=makeEChartsOption({...spec,series:[{name:'数量',values:[2,null]}]},'line',[]);
 assert.deepEqual(gap.series[0].data,[2,null]);assert.equal(gap.series[0].connectNulls,false);
});

test('research search, source removal and exports preserve a traceable evidence boundary',()=>{
 const c=researchCases[0],selected=c.sources.slice(0,3);
 assert.deepEqual(searchResearchSources(c.sources,'预算').map(s=>s.id),['S3']);
 assert.equal(searchResearchSources(c.sources,'不存在的关键词').length,0);
 assert.equal(searchResearchSources(c.sources,'','unverified')[0].id,'S4');
 assert.equal(supportedClaims(c.claims,selected).length,3);
 assert.deepEqual(supportedClaims(c.claims,selected.slice(0,1)).map(c=>c.id),['C1']);
 const report=researchMarkdown(c.question,c.scope,c.claims,selected.slice(0,1),c.gaps);
 assert.match(report,/\[S1\]/);assert.doesNotMatch(report,/\[S2\]|12 ÷ 200/);
 assert.match(report,/待人工核对/);assert.equal(safeResearchUrl('javascript:alert(1)'),undefined);
});

test('AI research output rejects fabricated references and unsupported quotes',()=>{
 const sources=researchCases[0].sources;
 const answer={claims:[{text:'尚未到完整观察周期。',kind:'inference',refs:[{sourceId:'S1',quote:'目前只完成第 2 周。'}]}],gaps:['第 3、4 周资料']};
 assert.ok(parseResearchAnswer(JSON.stringify(answer),sources));
 for(const refs of [[{sourceId:'S99',quote:'目前只完成第 2 周。'}],[{sourceId:'S1',quote:'观察周期已经结束。'}],[]])assert.equal(parseResearchAnswer(JSON.stringify({...answer,claims:[{...answer.claims[0],refs}]}),sources),null);
 assert.equal(parseResearchAnswer(JSON.stringify({claims:[{text:'已经节约 90%。',kind:'fact',refs:[{sourceId:'S4',quote:'用了 AI 后'}]}],gaps:[]}),sources),null);
 assert.equal(parseResearchAnswer('{"claims":',sources),null);
});

test('the registered ECharts modules render actual SVG for all four supported kinds',async()=>{
 const {init,use}=await import('echarts/core');
 const {BarChart,LineChart,PieChart,RadarChart}=await import('echarts/charts');
 const {GridComponent,TooltipComponent,DataZoomComponent,AriaComponent,RadarComponent}=await import('echarts/components');
 const {SVGRenderer}=await import('echarts/renderers');
 use([BarChart,LineChart,PieChart,RadarChart,RadarComponent,GridComponent,TooltipComponent,DataZoomComponent,AriaComponent,SVGRenderer]);
 const spec={type:'bar',title:'示例',labels:['甲','乙','丙'],series:[{name:'数量',values:[2,5,8]}]};
 for(const kind of ['bar','line','pie','radar']){
  const chart=init(null,undefined,{renderer:'svg',ssr:true,width:640,height:320});
  try{chart.setOption(makeEChartsOption(spec,kind,[],false,true));const svg=chart.renderToSVGString();assert.match(svg,/<svg/);assert.match(svg,/<path/);assert.doesNotMatch(svg,/NaN|undefined/)}finally{chart.dispose()}
 }
});

test('the exact failed reply becomes a chart, whether bare or in a JSON fence',()=>{
 const parsed=parseAssistantChart(screenshotReply);
 assert.deepEqual(parsed.series,[{name:'占比',values:[45,30,15,10]}]);
 assert.equal(parsed.type,'pie');assert.equal(chartDataNotice(parsed),'示例 / 估算数据，非真实统计');
 for(const reply of [screenshotReply,'```json\n'+screenshotReply+'\n```','```\n'+screenshotReply+'\n```','下面是示例图：\n\n'+screenshotReply+'\n\n这些数字不代表真实份额。']){
  const normalized=normalizeAssistantChartBlocks(reply);
  assert.match(normalized,/```chart\n/);assert.ok(normalized.includes(screenshotReply));
  const html=renderToStaticMarkup(createElement(AssistantMarkdown,{text:reply}));
  assert.match(html,/正在载入图表|交互图表/);
  assert.doesNotMatch(html,/&quot;values&quot;|&quot;labels&quot;/);
 }
 const incomplete=screenshotReply.slice(0,-8);
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:incomplete,streaming:true})),/正在整理图表数据/);
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:incomplete})),/暂时无法绘制/);
});

test('normalization preserves intentional source and prose, including braces inside JSON strings',()=>{
 for(const source of ['```js\n'+screenshotReply+'\n```','`'+screenshotReply+'`','{"customer":{"labels":["一月"],"values":[1]}}','```json\n{"name":"example"}\n```'])assert.equal(normalizeAssistantChartBlocks(source),source);
 const withBraces=JSON.stringify({...JSON.parse(screenshotReply),note:'说明含 {花括号} 和 "引号"。'});
 const mixed='前言\n\n'+withBraces+'\n\n中间\n\n'+screenshotReply+'\n\n结尾';
 assert.equal((normalizeAssistantChartBlocks(mixed).match(/```chart/g)||[]).length,2);
 assert.ok(normalizeAssistantChartBlocks(mixed).includes(withBraces));
 const unsafe=JSON.stringify({...JSON.parse(screenshotReply),formatter:'alert(1)'});
 assert.equal(parseAssistantChart(unsafe),null);
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:unsafe})),/暂时无法绘制/);
 assert.match(groundedMessages('市场占有率大概是多少？',[],'')[0].content,/不能根据用户活跃度/);
});

test('a real cloud-handler SSE response carrying the reported format reaches the chart renderer',async()=>{
 const pieces=[screenshotReply.slice(0,37),screenshotReply.slice(37,108),screenshotReply.slice(108)];
 const wire=pieces.map(content=>'data: '+JSON.stringify({model:'dots-studio/dots-3-note-preview:free',choices:[{delta:{content}}]})+'\n\n').join('')+'data: [DONE]\n\n';
 const response=await handleAssistantPost(new Request('https://site.test/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'展示饼图',stream:true})}),{
  getUser:async()=>({userId:'chart-regression'}),getKey:()=> 'test-only-key',prepare:()=>({hits:[],messages:[],fallbackText:''}),
  fetcher:async()=>new Response(wire,{headers:{'Content-Type':'text/event-stream'}}),
 });
 assert.equal(response.status,200);let completed='';const partial=[];
 await consumeAssistantStream(response.body,event=>{if(event.type==='text')partial.push(event.text);if(event.type==='done')completed=event.text});
 assert.equal(completed,screenshotReply);assert.equal(partial.length,3);
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:partial[1],streaming:true})),/正在整理图表数据/);
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:completed})),/正在载入图表|交互图表/);
});

const radarReply={type:'radar',title:'AI工具能力雷达图（示例数据）',labels:['会议转写','统计处理','图像创作','信息检索','文案编写'],series:[{name:'示例工具 A',values:[8,6,7,9,5]},{name:'示例工具 B',values:[5,9,6,7,8]}],max:10,unit:'分',note:'示例数据，非真实测评。'};
test('radar requests, raw JSON and common model data aliases all reach the same chart',()=>{
 const {series,...base}=radarReply;
 const variants=[radarReply,{...base,values:series[0].values},{...base,data:series[0].values},{...base,series:series.map(s=>({name:s.name,data:s.values}))},{...base,series:[{type:'radar',data:series.map(s=>({name:s.name,value:s.values}))}]}];
 for(const variant of variants){
  const raw=JSON.stringify(variant),parsed=parseAssistantChart(raw);assert.ok(parsed);
  assert.deepEqual(parsed.series[0].values,series[0].values);assert.equal(resolveChartPresentation(parsed,'用雷达图总结一下').kind,'radar');
  for(const text of [raw,'```json\n'+raw+'\n```','```echarts\n'+raw+'\n```']){
   const html=renderToStaticMarkup(createElement(AssistantMarkdown,{text,question:'用雷达图总结一下'}));
   assert.match(html,/正在载入图表|交互图表/);assert.doesNotMatch(html,/暂时无法绘制|&quot;labels&quot;/);
  }
 }
 const echartsData={type:'radar',title:base.title,radar:{indicator:base.labels.map(name=>({name,max:10}))},series:[{type:'radar',data:series.map(s=>({name:s.name,value:s.values}))}]};
 const normalized=parseAssistantChart(JSON.stringify(echartsData));assert.deepEqual(normalized.labels,base.labels);assert.deepEqual(normalized.max,[10,10,10,10,10]);assert.deepEqual(normalized.series,series);
 assert.equal(requestedChartKind('不要柱状图，改成雷达图'),'radar');assert.equal(requestedChartKind('不要雷达图，用折线图'),'line');
 assert.equal(resolveChartPresentation(radarReply).kind,'radar');
});

test('radar validates real values and scales; invalid data is never silently padded or rescaled',()=>{
 for(const change of [{labels:['A','B']},{max:5},{max:[10,10,10]},{series:[{name:'缺失',values:[8,null,5,2,6]}]},{series:[{name:'负数',values:[8,-1,5,2,6]}]},{formatter:'alert(1)'},{series:[{type:'radar',data:[{name:'x',value:[1,2,3,4,5],itemStyle:{color:'red'}}]}]}])assert.equal(parseAssistantChart(JSON.stringify({...radarReply,...change})),null);
 assert.equal(parseAssistantChart(JSON.stringify({...radarReply,series:[{name:'零值',values:[0,0,0,0,0]}]})).series[0].values[0],0);
 const option=makeEChartsOption(radarReply,'radar',[1],false,true,330);
 assert.deepEqual(option.radar.indicator.map(axis=>axis.max),[10,10,10,10,10]);
 assert.deepEqual(option.series[0].data[0].value,[8,6,7,9,5]);assert.deepEqual(option.series[1].data,[]);
 assert.equal(option.tooltip.renderMode,'richText');assert.match(option.tooltip.formatter({name:'A',value:[8,6,7,9,5]}),/会议转写：8分/);
 const noMax={...radarReply,max:undefined};assert.deepEqual(makeEChartsOption(noMax,'radar',[]).radar.indicator.map(axis=>axis.max),[9,9,9,9,9]);
 assert.match(groundedMessages('用雷达图总结一下',[],'')[0].content,/radar（多维能力/);
});

test('streamed radar JSON stays pending until complete and then renders as an actual radar chart',async()=>{
 const raw=JSON.stringify(radarReply),pieces=[raw.slice(0,60),raw.slice(60,130),raw.slice(130)];
 const wire=pieces.map(content=>'data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\n').join('')+'data: [DONE]\n\n';
 const response=await handleAssistantPost(new Request('https://site.test/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'用雷达图总结一下',stream:true})}),{getUser:async()=>({userId:'radar-regression'}),getKey:()=> 'test-only-key',prepare:()=>({hits:[],messages:[],fallbackText:''}),fetcher:async()=>new Response(wire,{headers:{'Content-Type':'text/event-stream'}})});
 const partial=[];let final='';await consumeAssistantStream(response.body,event=>{if(event.type==='text')partial.push(event.text);if(event.type==='done')final=event.text});
 assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:partial[1],streaming:true})),/正在整理图表数据/);
 assert.deepEqual(parseAssistantChart(final),radarReply);assert.match(renderToStaticMarkup(createElement(AssistantMarkdown,{text:final})),/正在载入图表|交互图表/);
});

test('explicit page requests resolve to registered destinations, while ambiguous requests require confirmation',()=>{
 for(const [question,href] of [['请直接打开智能体工坊','/agents'],['帮我打开提示词工程页面','/learn?lesson=prompt'],['带我去视频剪辑','/tools?category=video'],['打开搜索与研究','/tools?category=research'],['跳转到AI 编程实训','/coding'],['返回首页','/'],['打开MES实验','/ontology?case=mes']]){
  const result=resolveAssistantNavigation(question);assert.equal(result.kind,'open',question);assert.equal(result.destination.href,href,question);
 }
 const ambiguous=resolveAssistantNavigation('打开Dify');assert.equal(ambiguous.kind,'choose');assert.equal(ambiguous.options.length,2);
 const ids=ambiguous.options.map(option=>option.id);
 assert.equal(resolveAssistantNavigation('第二个',ids).destination.id,ids[1]);
 assert.equal(resolveAssistantNavigation('确认',ids).kind,'choose');assert.equal(resolveAssistantNavigation('第9个',ids).kind,'choose');assert.equal(resolveAssistantNavigation('取消',ids).kind,'cancel');
 assert.equal(resolveAssistantNavigation('Dify基础',ids).destination.href,'/learn?lesson=dify');
 assert.equal(resolveAssistantNavigation('打开PPT和视频').kind,'choose');
 for(const input of ['智能体工坊是什么？','如何打开智能体工坊？','不要打开智能体工坊','介绍一下“打开智能体工坊”是什么意思','如果打开智能体工坊会怎样？','用雷达图总结一下'])assert.equal(resolveAssistantNavigation(input),null,input);
 for(const input of ['打开不存在的功能','打开https://example.com/agents','打开//evil.example/agents','打开javascript:alert(1)'])assert.equal(resolveAssistantNavigation(input).kind,'missing',input);
 assert.equal(resolveAssistantNavigation('第一个',['not-a-page']),null);
 assert.equal(new Set(assistantDestinations.map(item=>item.id)).size,assistantDestinations.length);
});
