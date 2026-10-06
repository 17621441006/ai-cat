'use client';
import {useEffect,useState} from 'react';
import KnowledgeAssistant from '@/components/knowledge-assistant';
import {fallbackDesktopEntries,type SearchEntry} from '@/lib/desktop-navigation';
import './embed.css';
const portfolio='https://dirtybag-time-apartment.jackchen911006.chatgpt.site';
export default function DesktopAssistant(){
 const [entries,setEntries]=useState<SearchEntry[]>(fallbackDesktopEntries);
 useEffect(()=>{document.documentElement.classList.add('desktop-assistant-embed','dark');
 const receive=(e:MessageEvent)=>{if(e.origin!==portfolio||e.source!==window.parent||e.data?.type!=='dirtybag-desktop-catalog'||!Array.isArray(e.data.entries))return;const safe=e.data.entries.slice(0,250).filter((a:SearchEntry)=>a&&typeof a.id==='string'&&/^[a-z0-9-]{1,90}$/.test(a.id)&&typeof a.title==='string'&&typeof a.description==='string'&&Array.isArray(a.aliases)).map((a:SearchEntry)=>({id:a.id,title:a.title.slice(0,100),description:a.description.slice(0,1000),aliases:a.aliases.filter(x=>typeof x==='string').slice(0,25).map(x=>x.slice(0,100))}));if(safe.length)setEntries(safe)};
 window.addEventListener('message',receive);window.parent.postMessage({type:'dirtybag-assistant-ready'},portfolio);return()=>{window.removeEventListener('message',receive);document.documentElement.classList.remove('desktop-assistant-embed')}
 },[]);
 function navigate(href:string){if(href.startsWith('desktop:')){const id=href.slice(8);if(!entries.some(a=>a.id===id))return false;window.parent.postMessage({type:'dirtybag-open-app',id},portfolio);return true}if(!/^\/(?:$|(?:learn|ontology|projects|products|tools|coding|agents|models|resources|guides|roadmap|community|glossary|industry|work|business|library)(?:[?#]|$))/.test(href))return false;window.parent.postMessage({type:'dirtybag-open-learning',href},portfolio);return true}
 return <KnowledgeAssistant desktopEntries={entries} onNavigate={navigate} desktop initialOpen hideLauncher apiEndpoint="/api/desktop-assistant" onClose={()=>window.parent.postMessage({type:'dirtybag-assistant-close'},portfolio)}/>;
}
