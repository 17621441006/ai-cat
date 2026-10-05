type MarkdownNode={type:string;value?:string;children?:MarkdownNode[]};
/** Emphasize a leading step title in older/plain-text answers, never code or data. */
export function remarkAssistantEmphasis(){
 return (tree:MarkdownNode)=>{
  function visit(node:MarkdownNode){
   if(node.type==='paragraph'&&node.children?.[0]?.type==='text'){
    const first=node.children[0],text=first.value||'';
    const match=text.match(/^(第[一二三四五六七八九十\d]{1,3}步[，、：:]\s*[^。！？；;\n]{2,26})(?=[。！？；;\n]|$)/)||text.match(/^((?:结论|建议|要注意|在供应链场景中)[：:])/);
    if(match)node.children.splice(0,1,{type:'strong',children:[{type:'text',value:match[1]}]},{type:'text',value:text.slice(match[1].length)});
   }
   if(!['code','inlineCode','table'].includes(node.type))node.children?.forEach(visit);
  }
  visit(tree);
 };
}
