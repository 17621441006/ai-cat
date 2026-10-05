// Run with Node 24: node scripts/check-writing-visuals.mjs
// Tests the exact transformation and export code without a browser or an AI service.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const root=resolve(import.meta.dirname,'..');
const asModule=(path,replacements={})=>{
 let source=readFileSync(resolve(root,path),'utf8');
 for(const [from,to] of Object.entries(replacements))source=source.replaceAll(`'${from}'`,JSON.stringify(to));
 return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
};
const tableUrl=pathToFileURL(resolve(root,'lib/tabular-data.ts')).href;
const visualUrl=asModule('lib/writing-visuals.ts',{'./tabular-data':tableUrl});
const {extractWritingVisual,recommendChart,chartSvg,visualDataIssues,dateNumber,visualMarkdown}=await import(visualUrl);
const {writingScenarios,createWritingDocument,blockIssues,documentMarkdown}=await import(asModule('lib/writing-workbench.ts',{'./writing-visuals':visualUrl}));
const settings={format:'weekly',audience:'leader',tone:'formal',length:'standard'};
const documentFor=s=>createWritingDocument(s.name,s.sources,s.sources.filter(x=>x.state==='current').map(x=>x.id),settings);
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS',name)}
const procurement=documentFor(writingScenarios[0]),weekly=documentFor(writingScenarios[2]);
const count=extractWritingVisual(procurement.blocks[0].body,'试点进展','chart');
test('原文 20 条总样例与 3 条异常保持独立，不生成虚构的其余 17 条',()=>{assert.deepEqual(count.rows.map(r=>r[1]),['20','3']);assert.equal(recommendChart(count).kind,'bar');assert(!JSON.stringify(count.rows).includes('17'));});
const action=extractWritingVisual(procurement.blocks[2].body,'行动安排','chart');
test('单个截止日期仅生成里程碑，未标注日期的事项不补零',()=>{assert.equal(recommendChart(action).validRows,3);assert.equal(recommendChart(action).excluded,2);assert(action.rows.every(r=>r[2]===''));assert(action.rows.some(r=>r[1]==='李工'));});
test('非明确时间区间的两个日期不误判为任务工期',()=>{const v=extractWritingVisual('李工在 2026-09-22 讨论，王工在 2026-09-25 验证。','多事件','chart');assert(v.rows.every(r=>!r[2]&&!r[3]));});
test('真实日期校验：闰年允许，越界日期拒绝',()=>{assert(dateNumber('2024-02-29')!==null);assert.equal(dateNumber('2026-02-29'),null);assert.equal(dateNumber('2026-13-01'),null);});
const task=extractWritingVisual(weekly.blocks[0].body,weekly.blocks[0].heading,'chart');
test('任务进度表自动选甘特图，保留空白进度',()=>{assert.equal(recommendChart(task).kind,'gantt');assert.equal(task.rows.length,5);assert.equal(task.rows[4][5],'');assert.equal(recommendChart({...task,chart:'progress'}).excluded,1);assert.deepEqual(blockIssues({...weekly.blocks[0],visual:task}),[]);});
test('异常百分比和反向日期使图表暂停生成',()=>{const v=structuredClone(task);v.rows[0][5]='150%';v.rows[1][3]='2026-09-30';assert.equal(visualDataIssues(v).length,2);assert.equal(chartSvg(v),null);});
test('文本里的百分比和时间序列可适配图表',()=>{const p=extractWritingVisual('工具组进度 60%，编程组进度 75%，智能体组进度 45%。','三组进度','chart');assert.equal(recommendChart(p).kind,'progress');const s=extractWritingVisual('第1周收集12份，第2周收集18份，第3周收集15份。','每周反馈','chart');assert.equal(recommendChart(s).kind,'line');assert.equal(s.rows[2][1],'15');});
test('不同单位的数值不能共用坐标轴',()=>{const v=extractWritingVisual('指标 | 数量 | 单位\n库存 | 20 | 吨\n工时 | 3 | 小时','混合口径','chart');assert.equal(recommendChart(v).kind,null);});
test('手动修改会改变图形与导出数据，正文改动会触发同步提示',()=>{const v=structuredClone(task);v.rows[0][5]='82%';v.chart='progress';assert(chartSvg(v).svg.includes('82%'));assert(visualMarkdown(v).includes('82%'));assert(blockIssues({...weekly.blocks[0],body:weekly.blocks[0].body+'\n新的说明',visual:v}).some(s=>s.includes('正文已修改')));});
const matrix=extractWritingVisual(weekly.blocks[2].body,weekly.blocks[2].heading,'chart');
test('工具状态矩阵按小组和状态交叉呈现，保留全部 7 项',()=>{const svg=chartSvg(matrix).svg;assert.equal(recommendChart(matrix).kind,'status');assert.equal((svg.match(/data-row=/g)||[]).length,7);assert(svg.includes('AI 业务智能体'));assert(svg.includes('已完成 / 验证'));});
const trend=extractWritingVisual(weekly.blocks[3].body,weekly.blocks[3].heading,'chart');
test('周期与反馈数量自动选折线，缺失数值不补为零',()=>{assert.equal(recommendChart(trend).kind,'line');const v=structuredClone(trend);v.rows[1][1]='';assert.equal(recommendChart(v).validRows,3);assert.equal(recommendChart(v).excluded,1);});
test('用户输入正确转义，不能注入 SVG 元素',()=>{const v=structuredClone(task);v.title='<script>alert(1)</script>';v.rows[0][0]='<image onload="alert(1)"/>';const svg=chartSvg(v).svg;assert(!svg.includes('<script>'));assert(!svg.includes('<image '));assert(svg.includes('&lt;script&gt;'));});
test('Markdown 包含最新表格和原始统计口径',()=>{weekly.blocks[0].visual=structuredClone(task);weekly.blocks[0].visual.rows[0][0]='修改后的任务名称';const md=documentMarkdown(weekly,false);assert(md.includes('修改后的任务名称'));assert(md.includes('| 任务 | 小组 |'));assert(md.includes('整理前原文'));assert(md.includes('教学演练'));});

// Optional offline artifact QA: convert the exact chart SVG with PyMuPDF, embed in Word,
// and verify editable table XML / media / captions. This does not substitute browser QA.
if(process.env.WRITING_QA_DIR){
 const output=resolve(process.env.WRITING_QA_DIR);mkdirSync(output,{recursive:true});
 weekly.blocks.forEach(b=>b.visual=extractWritingVisual(b.body,b.heading,'chart'));
 weekly.blocks[0].visual.rows[0][0]='手动修改后：工具选型';
 const python=process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python';
 let imageIndex=0;
 async function render(v){const chart=chartSvg(v);const prefix=resolve(output,`chart-${imageIndex++}`);writeFileSync(prefix+'.svg',chart.svg);execFileSync(python,['-c',"import fitz,sys; d=fitz.open(sys.argv[1]); d[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(sys.argv[2])",prefix+'.svg',prefix+'.png']);return {...chart,bytes:new Uint8Array(readFileSync(prefix+'.png'))};}
 const {createWritingDocx}=await import(asModule('lib/writing-export.ts',{'./writing-visuals':visualUrl,docx:import.meta.resolve('docx')}));
 const blob=await createWritingDocx(weekly,false,render);const file=resolve(output,'weekly-visuals-qa.docx');writeFileSync(file,Buffer.from(await blob.arrayBuffer()));
 const result=execFileSync(python,['-c',"import zipfile,sys; from lxml import etree; z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml'); r=etree.fromstring(x); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}; assert len(r.findall('.//w:tbl',ns))==4; assert len(r.findall('.//a:blip',ns))==4; assert '手动修改后：工具选型' in x.decode(); assert len([n for n in z.namelist() if n.startswith('word/media/') and n.endswith('.png')])==4; print('PASS Word: 4 editable tables, 4 chart PNGs, latest edits, citations')",file],{encoding:'utf8'});console.log(result.trim());checks++;
 writeFileSync(resolve(output,'weekly-visuals-qa.md'),documentMarkdown(weekly,false));
}
console.log(`${checks} writing visualization checks passed.`);
