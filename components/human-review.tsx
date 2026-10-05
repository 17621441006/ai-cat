"use client";
import {useEffect,useRef,useState} from 'react';
import {CheckCheck,AlertCircle} from 'lucide-react';
import {Checkbox} from '@/components/ui/checkbox';

// Every export handler asks again; an earlier approval never authorizes edited content.
export function useReviewFeedback(ready:boolean,reveal?:()=>void){
 const ref=useRef<HTMLDivElement>(null),[attempt,setAttempt]=useState(0);
 function request(){if(ready)return true;reveal?.();setAttempt(n=>n+1);return false;}
 useEffect(()=>{if(!attempt||ready)return;const frame=requestAnimationFrame(()=>{
  const root=ref.current;if(!root)return;
  const missing=root.querySelector<HTMLElement>('[data-review-missing="true"]');
  const trigger=root.querySelector<HTMLElement>('[data-review-trigger]')||root;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)trigger.animate?.([{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}],{duration:460});
  const target=missing||trigger;
  (target.querySelector<HTMLElement>('button,input,[tabindex]')||target).focus({preventScroll:true});
  target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});
 });return()=>cancelAnimationFrame(frame)},[attempt,ready]);
 return{ref,request,attempt,className:attempt&&!ready?'review-required':'',blocked:attempt>0&&!ready};
}

export function useHumanReview(signature:string,items:readonly string[],eligible=true){
 const [state,setState]=useState({signature,checked:items.map(()=>false)});
 const checked=state.signature===signature?state.checked:items.map(()=>false);
 useEffect(()=>{setState(s=>s.signature===signature?s:{signature,checked:items.map(()=>false)})},[signature]);
 const ready=eligible&&checked.length===items.length&&checked.every(Boolean);
 const feedback=useReviewFeedback(ready);
 function setChecked(index:number,value:boolean){setState({signature,checked:items.map((_,i)=>i===index?value:!!checked[i])})}
 return{...feedback,ready,checked,setChecked,items};
}
export function ReviewChecklist({review,title='人工复核后，带走成果',note}:{review:ReturnType<typeof useHumanReview>;title?:string;note?:string}){
 return <div ref={review.ref} className={`human-review ${review.className}`}>
  <button type="button" className={`human-review-heading ${review.ready?'done':''}`} data-review-trigger onClick={()=>review.request()}><CheckCheck size={22}/><strong>{review.ready?'本次内容已复核':title}</strong><span>{review.checked.filter(Boolean).length} / {review.items.length} 项</span></button>
  {review.items.map((item,i)=><label className="human-review-item" data-review-missing={!review.checked[i]} key={item}><Checkbox aria-label={item} checked={!!review.checked[i]} onCheckedChange={v=>review.setChecked(i,v===true)}/><span>{item}</span>{review.blocked&&!review.checked[i]&&<small>待复核</small>}</label>)}
  <ReviewWarning show={review.blocked} text={note}/>
  <p className="human-review-help">逐项核对后才能导出。内容或统计口径变化后，需要重新复核。</p>
 </div>;
}
export function ReviewWarning({show,text}:{show:boolean;text?:string}){return show?<p className="review-export-warning" role="alert"><AlertCircle size={17}/><span>{text||'导出尚未开始，请完成高亮的人工复核项。'}</span></p>:null}
