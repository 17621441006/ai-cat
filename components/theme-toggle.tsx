"use client";
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
export default function ThemeToggle(){
 const [dark,setDark]=useState(false);
 useEffect(()=>setDark(document.documentElement.classList.contains('dark')),[]);
 function toggle(){const next=!dark;setDark(next);document.documentElement.classList.toggle('dark',next);document.documentElement.style.colorScheme=next?'dark':'light';try{localStorage.setItem('ai-practice-theme',next?'dark':'light')}catch{}}
 return <button className="theme-toggle" onClick={toggle} aria-label={dark?'切换到日间皮肤':'切换到深色皮肤'} title={dark?'切换到日间皮肤':'切换到深色皮肤'}>{dark?<Sun size={18}/>:<Moon size={18}/>}<span>{dark?'日间':'夜航'}</span></button>;
}
