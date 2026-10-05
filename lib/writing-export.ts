import {Document,Packer,Paragraph,TextRun,HeadingLevel,Footer,AlignmentType,PageNumber,Table,TableRow,TableCell,WidthType,ImageRun,PageOrientation} from 'docx';
import type {WritingDocument} from './writing-workbench';
import {chartPng,chartSvg,chartNames,recommendChart,visualIssues,type WritingVisual} from './writing-visuals';

/** Generate actual, editable OpenXML Word content from the current editor state. */
export async function createWritingDocx(doc:WritingDocument,reviewed:boolean,renderChart:(v:WritingVisual)=>Promise<{bytes:Uint8Array;width:number;height:number}>=chartPng):Promise<Blob>{
 const landscape=doc.blocks.some(b=>b.visual&&b.visual.columns.length>5);
 const children:(Paragraph|Table)[]=[
  new Paragraph({text:doc.title,heading:HeadingLevel.TITLE,spacing:{after:240}}),
  new Paragraph({children:[new TextRun({text:`${reviewed?'已人工复核':'待审草稿'} · ${doc.audience}`,color:'52657D',size:20})],spacing:{after:100}}),
  new Paragraph({children:[new TextRun({text:'教学演练材料，不代表实际项目记录。',color:'6F7C8E',size:18})],spacing:{after:320}}),
 ];
 for(const block of doc.blocks){
  children.push(new Paragraph({text:block.heading,heading:HeadingLevel.HEADING_1,keepNext:true,spacing:{before:260,after:160}}));
  const narrative=block.visual?block.body.split('\n').filter(line=>!line.includes('|')&&!line.includes('\t')).join('\n'):block.body;
  for(const line of narrative.split('\n').filter(line=>line.trim())){
   const isBullet=/^\s*[•*\-]\s+/.test(line);
   children.push(new Paragraph({children:[new TextRun(line.replace(/^\s*[•*\-]\s+/,''))],...(isBullet?{bullet:{level:0}}:{}),spacing:{after:160,line:330}}));
  }
  if(block.visual){
   const v=block.visual,rec=recommendChart(v);
   children.push(new Paragraph({text:v.title,heading:HeadingLevel.HEADING_2,keepNext:true,spacing:{before:120,after:120}}));
   if(v.view==='chart'&&chartSvg(v)){
    const img=await renderChart(v),scale=Math.min((landscape?880:600)/img.width,700/img.height);
    children.push(new Paragraph({children:[new ImageRun({type:'png',data:img.bytes,transformation:{width:Math.round(img.width*scale),height:Math.round(img.height*scale)},altText:{title:v.title,description:rec.kind?chartNames[rec.kind]:'周报图表',name:v.title}})],spacing:{after:180}}));
   }
   children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
    new TableRow({tableHeader:true,children:v.columns.map(c=>new TableCell({shading:{fill:'EAF0FA'},margins:{top:100,bottom:100,left:100,right:100},children:[new Paragraph({children:[new TextRun({text:c.label,bold:true,color:'294568',size:20})],spacing:{after:0}})]}))}),
    ...v.rows.map((row,ri)=>new TableRow({children:v.columns.map((_,ci)=>new TableCell({shading:{fill:ri%2?'F7F9FC':'FFFFFF'},margins:{top:90,bottom:90,left:100,right:100},children:[new Paragraph({text:row[ci]||'待确认',spacing:{after:0,line:270}})]}))})),
   ]}));
   children.push(new Paragraph({children:[new TextRun({text:v.note+(v.edited?' 数据经手动调整，请核对原始记录。':''),color:'68798C',size:18})],spacing:{before:120,after:120}}));
   const warnings=visualIssues(v,block.body);
   if(warnings.length)children.push(new Paragraph({children:[new TextRun({text:'待核对：'+warnings.join('；'),color:'A24C54',size:18})],spacing:{after:120}}));
  }
  children.push(new Paragraph({children:[new TextRun({text:'来源：'+(block.refs.map(r=>`${r.sourceName} ${r.version} §${r.passage.id}${r.state==='old'?'（旧版）':''}`).join('；')||'待补充'),color:'586D86',size:18})],spacing:{before:80,after:100}}));
 }
 const refs=[...new Map(doc.blocks.flatMap(b=>b.refs).map(r=>[`${r.sourceId}-${r.version}-${r.passage.id}`,r])).values()];
 if(refs.length){
  children.push(new Paragraph({text:'附录 · 引用原句',heading:HeadingLevel.HEADING_1,pageBreakBefore:true,spacing:{after:240}}));
  for(const ref of refs){
   children.push(new Paragraph({text:`${ref.sourceName} ${ref.version} §${ref.passage.id}`,heading:HeadingLevel.HEADING_2,keepNext:true,spacing:{before:180,after:100}}));
   children.push(new Paragraph({text:ref.passage.text,spacing:{after:200,line:330}}));
  }
 }
 const file=new Document({creator:'AI 进阶研习所',title:doc.title,description:'写作与知识整理工作台导出，包含当前文稿与来源快照',styles:{default:{document:{run:{font:'Microsoft YaHei',size:22,color:'24354B'},paragraph:{spacing:{line:330,after:160}}},title:{run:{font:'Microsoft YaHei',size:36,bold:true,color:'224C7A'}},heading1:{run:{font:'Microsoft YaHei',size:28,bold:true,color:'224C7A'}},heading2:{run:{font:'Microsoft YaHei',size:22,bold:true,color:'435D79'}}}},sections:[{properties:{page:{size:{width:11906,height:16838,...(landscape?{orientation:PageOrientation.LANDSCAPE}:{})},margin:{top:1134,right:1134,bottom:1134,left:1134}}},children,footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'AI 进阶研习所 · ',color:'728195',size:18}),new TextRun({children:[PageNumber.CURRENT],color:'728195',size:18})]})]})}}]});
 return Packer.toBlob(file);
}

export async function exportWritingDocx(doc:WritingDocument,reviewed:boolean){
 const blob=await createWritingDocx(doc,reviewed);
 const filename=`${doc.title.replace(/[\\/:*?"<>|]/g,'-').slice(0,100)||'写作文稿'}-${reviewed?'已审':'待审'}.docx`;
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {filename,bytes:blob.size};
}
