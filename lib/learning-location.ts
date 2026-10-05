"use client";
import {useEffect,useRef} from 'react';

export const learningLocationEvent='learning-workspace-location';
export const learningUrlEvent='learning-workspace-url';

/** A lesson's own controls update its address without opening another page. */
export function replaceLearningUrl(href:string){
 window.history.replaceState(window.history.state,'',href);
 window.dispatchEvent(new Event(learningUrlEvent));
}

/** Deep links also work when the destination page is already kept in a tab. */
export function useLearningLocation(path:string,read:(params:URLSearchParams)=>void){
 const callback=useRef(read);callback.current=read;
 useEffect(()=>{
  const update=()=>{if(window.location.pathname.replace(/\/$/,'')===(path==='/'?'':path))callback.current(new URLSearchParams(window.location.search))};
  update();window.addEventListener(learningLocationEvent,update);
  return()=>window.removeEventListener(learningLocationEvent,update);
 },[path]);
}
