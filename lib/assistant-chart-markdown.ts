import {parseAssistantChart,assistantChartKinds} from './assistant-charts';

function chartIntent(source:string){
 try{
  const value=JSON.parse(source);
  return value&&typeof value==='object'&&!Array.isArray(value)&&assistantChartKinds.includes(value.type)&&('labels' in value||'series' in value||'values' in value);
 }catch{
  return /"type"\s*:\s*"(?:bar|line|pie|radar)"/.test(source)&&/"(?:title|labels|series|values)"\s*:/.test(source);
 }
}

/** Read one JSON object, respecting braces and escaped quotes inside strings. */
function objectEnd(text:string,start:number){
 let depth=0,quoted=false,escaped=false;
 for(let i=start;i<text.length;i++){
  const char=text[i];
  if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;continue}
  if(char==='"')quoted=true;
  else if(char==='{')depth++;
  else if(char==='}'&&--depth===0)return i+1;
 }
 return -1;
}

function wrapBareCharts(text:string){
 let output='',copied=0;
 for(let i=0;i<text.length;i++){
  // Inline code is intentional source, not a visualization request.
  if(text[i]==='`'){
   const marker=text.slice(i).match(/^`+/)![0],end=text.indexOf(marker,i+marker.length);
   if(end>=0){i=end+marker.length-1;continue}
  }
  if(text[i]!=='{')continue;
  const end=objectEnd(text,i),source=text.slice(i,end<0?undefined:end);
  if(parseAssistantChart(source)||chartIntent(source)){
   output+=text.slice(copied,i)+'\n\n```chart\n'+source;
   if(end<0)return output; // Markdown's open fence becomes the streaming state.
   output+='\n```\n\n';copied=end;
  }
  if(end<0)break;
  i=end-1; // Do not promote an object nested inside unrelated JSON.
 }
 return output+text.slice(copied);
}

/** Repair presentation envelopes without changing numbers or executing model code.
 * Run for both saved and streaming replies. Preserve prose and intentional code.
 */
export function normalizeAssistantChartBlocks(text:string){
 const lines=text.split('\n'),output:string[]=[];let plain:string[]=[];
 const flush=()=>{if(plain.length){output.push(wrapBareCharts(plain.join('\n')));plain=[]}};
 for(let i=0;i<lines.length;i++){
  const opening=lines[i].match(/^ {0,3}(`{3,}|~{3,})([^\n]*)$/);
  if(!opening){plain.push(lines[i]);continue}
  flush();
  const marker=opening[1],language=opening[2].trim().toLowerCase();
  let end=i+1;
  const closing=new RegExp('^ {0,3}'+marker[0]+'{'+marker.length+',}\\s*$');
  while(end<lines.length&&!closing.test(lines[end]))end++;
  const source=lines.slice(i+1,end).join('\n');
  const eligible=['','json','application/json','chart','echarts'].includes(language);
  if(eligible&&(language==='chart'||parseAssistantChart(source)||chartIntent(source))){
   output.push('```chart',source,...(end<lines.length?['```']:[]));
  }else output.push(...lines.slice(i,Math.min(end+1,lines.length)));
  i=end;
 }
 flush();return output.join('\n');
}
