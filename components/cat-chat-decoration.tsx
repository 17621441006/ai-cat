"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {catPortrait,prepareCatImage} from '@/lib/cat-assets';

export type CatBubbleStyle='sideeye'|'reference'|'persian'|'cheeky'|'classic';
export type CatChatMood='listening'|'curious'|'thinking'|'happy';
const moods:CatChatMood[]=['listening','curious','thinking','happy'];

export function CatChatIcon(){
 return <span className="assistant-cat-icon" aria-hidden="true"><span/></span>;
}

export function CatChatPerch({mood}:{mood:CatChatMood}){
 const [displayed,setDisplayed]=useState<CatChatMood>('listening');
 useEffect(()=>{let active=true;prepareCatImage(catPortrait(mood)).then(()=>{if(active)setDisplayed(mood)}).catch(()=>{});return()=>{active=false}},[mood]);
 return <span className="assistant-cat-perch" data-mood={mood} aria-hidden="true">
  {moods.map(pose=><img key={pose} src={catPortrait(pose)} width={248} height={222} alt="" decoding="async" className={pose===displayed?'is-visible':''}/>)}
 </span>;
}

export function CatChatBubble({children,variant='sideeye'}:{children:ReactNode;variant?:CatBubbleStyle}){
 // Intrinsic text width keeps short questions on one line, up to the panel edge.
 return <div className="cat-dialogue" data-bubble-style={variant}>{children}</div>;
}
