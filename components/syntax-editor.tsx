"use client";
import {useRef} from 'react';

// A bounded TypeScript lexer: comments and strings are consumed before identifiers.
const syntax=/(\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|[{}()[\].,;:+*/=<>!?&|%-])/g;
const keywords=new Set('export default function const let var return if else throw new try catch finally async await import from as for of in while switch case break continue class extends interface type implements private public protected static readonly this super null undefined true false'.split(' '));
const types=new Set('string number boolean void unknown any never Record Array Promise Error Set Map Date Number String Object'.split(' '));
export function SyntaxCode({code}:{code:string}){let end=0;const pieces:React.ReactNode[]=[];for(const m of code.matchAll(syntax)){const at=m.index!;if(at>end)pieces.push(code.slice(end,at));const t=m[0];const kind=t.startsWith('//')||t.startsWith('/*')?'comment':/^["'`]/.test(t)?'string':/^\d/.test(t)?'number':keywords.has(t)?'keyword':types.has(t)?'type':/^[A-Za-z_$]/.test(t)&&/^\s*\(/.test(code.slice(at+t.length))?'function':/^[{}()[\].,;:+*/=<>!?&|%-]$/.test(t)?'punctuation':'';pieces.push(<span className={kind?'syntax-'+kind:undefined} key={at}>{t}</span>);end=at+t.length}pieces.push(code.slice(end));return <>{pieces}</>}
export function SyntaxEditor({code,onChange}:{code:string,onChange:(value:string)=>void}){
 const input=useRef<HTMLTextAreaElement>(null);
 return <div className="syntax-scroll"><div className="syntax-grid"><pre className="syntax-gutter" aria-hidden="true">{code.split('\n').map((_,i)=>i+1).join('\n')}</pre><div className="syntax-input-wrap"><pre className="syntax-painted" aria-hidden="true"><code><SyntaxCode code={code}/>{'\n'}</code></pre><textarea ref={input} aria-label="ERP 示例代码编辑器" spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" value={code} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();const a=e.currentTarget.selectionStart,b=e.currentTarget.selectionEnd;onChange(code.slice(0,a)+'  '+code.slice(b));requestAnimationFrame(()=>input.current?.setSelectionRange(a+2,a+2))}}}/></div></div></div>
}
