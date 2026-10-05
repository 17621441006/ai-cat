// Exercises real parser + writing transformations, not preset output snapshots.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..');
const tableUrl=pathToFileURL(resolve(root,'lib/tabular-data.ts')).href;
const {parseTableText,looksTabular,inferColumnKind,tableCsv,tableNumber,cleanTableRows,aggregateTable,projectPracticeText,numericPracticeText}=await import(tableUrl);
function moduleUrl(file){return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(resolve(root,file),'utf8').replaceAll("'./tabular-data'",JSON.stringify(tableUrl)),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}
const {extractWritingVisual,recommendChart,chartSvg}=await import(moduleUrl('lib/writing-visuals.ts'));
const {seedRows,csvText,parseCsv,cleanRows,defaultRules}=await import(moduleUrl('lib/sheet-workbench.ts'));
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name)}
test('用户项目周报：6 行5列，原表头、多行概况不变',()=>{const t=parseTableText(projectPracticeText);assert.equal(t.rows.length,6);assert.deepEqual(t.headers,['序号','项目名称','项目状态','项目概况','需要协调事项']);assert(t.rows[0][3].includes('\n2、'));assert.equal(t.rows[5][1],'智能工厂专项改造')});
test('中文弯引号与中文逗号分隔，不改变说明里的标点',()=>{const text='“序号”，“项目名称”，“项目概况”\n“1”，“MES”，“1、测试完成；\n2、等待验收。”';const t=parseTableText(text);assert.deepEqual(t.rows,[['1','MES','1、测试完成；\n2、等待验收。']]);assert.equal(t.warnings.length,1)});
test('用户粘贴的全右弯引号可识别',()=>{const t=parseTableText('”序号”,”项目名称”,”概况”\n”1”,”SCM”,”上线完成\n继续支持”');assert.equal(t.rows[0][2],'上线完成\n继续支持')});
test('引号内逗号、转义引号、空值和 CRLF 往返保真',()=>{const rows=[['001','¥3,500','第一行\n第二行','他说"完成"','']];const t=parseTableText('\uFEFF'+tableCsv(['编号','单价','描述','原句','备注'],rows));assert.deepEqual(t.rows,rows)});
test('WPS / Excel 制表符粘贴，带引号的跨行单元格',()=>{const t=parseTableText('项目\t说明\t数量\nMES\t"测试\n验收"\t12\nTMS\t调度\t0');assert.deepEqual(t.rows[0],['MES','测试\n验收','12']);assert.equal(t.rows[1][2],'0')});
test('末尾空单元格与文本首尾空格不在导入时消失',()=>{assert.deepEqual(parseTableText('项目\t说明\nMES\t').rows,[['MES','']]);assert.deepEqual(parseTableText('项目,说明\n A ,   ').rows,[[' A ','   ']])});
test('Markdown 对齐行和转义竖线，不把对齐行当数据',()=>{const t=parseTableText('| 事项 | 内容 |\n| :--- | ---: |\n| A | 设计\\|开发<br>测试 |');assert.equal(t.rows.length,1);assert.equal(t.rows[0][1],'设计|开发\n测试')});
test('错误格式明确拒绝，不偷偷补列、截断或返回原始样例',()=>{for(const s of ['','项目,状态\nA','项目,状态\n"A,完成','项目,项目\nA,B',',状态\nA,B',tableCsv(['a','b'],Array.from({length:201},()=>['x','y']))])assert.throws(()=>parseTableText(s));});
test('文字周报不被误判为 CSV',()=>{assert.equal(looksTabular('团队已完成字段映射，并用 20 条合成订单完成首轮规则测试；其中 3 条异常样例已转交业务人员复核。'),false)});
test('写作区遇到缺列的 CSV 也报错，不能降级成逐句整理',()=>{assert.throws(()=>extractWritingVisual('项目名称,项目状态\nMES','错误格式','table'),/第 1 条数据/)});
test('新表头与内容在写作区直接生效，序号不作为指标',()=>{const v=extractWritingVisual(projectPracticeText,'学生周报','chart');assert.equal(v.columns[0].kind,'text');assert.equal(recommendChart(v).kind,'status');assert.equal(v.rows.length,6);assert(chartSvg(v).svg.includes('海外 SCM 系统实施'));const changed=extractWritingVisual(projectPracticeText.replace('海外 SCM 系统实施','自定义 ERP 项目'),'学生周报','table');assert.equal(changed.rows[0][1],'自定义 ERP 项目')});
test('没有数值、日期、状态的文本数据仅生成表格',()=>{const v=extractWritingVisual('编号,项目名称,概况\n001,MES,等待验收\n002,TMS,调度测试','普通文本','chart');assert.equal(recommendChart(v).kind,null)});
test('编号保留前导零；业务数值和有效千分位才参与计算',()=>{assert.equal(inferColumnKind('编号',['001','002']),'text');assert.equal(tableNumber('1,200.50'),1200.5);assert.equal(tableNumber('1,2'),null);assert.equal(tableNumber(''),null);assert.equal(tableNumber('-12'),-12)});
test('文字类别计数、库存求和、平均值跟随新内容，空值不补零',()=>{const t=parseTableText(projectPracticeText);const counts=aggregateTable(t.rows,2,null,'count');assert.deepEqual(counts.rows.map(r=>[r.name,r.value]),[['进度正常',3],['验收中',2],['待协调',1]]);const n=parseTableText(numericPracticeText);assert.equal(aggregateTable(n.rows,0,2,'sum').rows[0].value,200);n.rows[0][2]='';const avg=aggregateTable(n.rows,0,2,'average');assert.equal(avg.rows[0].value,80);assert.equal(avg.excluded,1)});
test('通用清洗只去完全重复，不合并同名不同状态',()=>{const rows=[[' A ','完成'],['A','完成'],['A','验收中']];const result=cleanTableRows(rows,true,true);assert.equal(result.changed,1);assert.equal(result.removed,1);assert.deepEqual(result.rows,[['A','完成'],['A','验收中']]);assert.equal(rows[0][0],' A ')});
test('导出转义公式形式内容但保留负数，输入始终当文本',()=>{const t=parseTableText(tableCsv(['事项','数值'],[['=1+2','-5']],true));assert.equal(t.rows[0][0],"'=1+2");assert.equal(t.rows[0][1],'-5')});
test('采购示例仍走原业务规则，新CSV值确实替换',()=>{assert.deepEqual(parseCsv(csvText(seedRows)),seedRows);const changed=seedRows.map(r=>[...r]);changed[0][5]='99';assert.equal(parseCsv(csvText(changed))[0][5],'99');assert.equal(cleanRows(seedRows,defaultRules).filter(r=>r.duplicate).length,1)});
console.log(`${passed} custom table checks passed.`);
