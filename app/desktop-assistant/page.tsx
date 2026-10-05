'use client';
import {useEffect} from 'react';
import KnowledgeAssistant from '@/components/knowledge-assistant';
import {desktopApps} from '@/lib/desktop-knowledge';
import './embed.css';
const portfolio='https://dirtybag-time-apartment.jackchen911006.chatgpt.site';
export default function DesktopAssistant(){
 useEffect(()=>{document.documentElement.classList.add('desktop-assistant-embed','dark');window.parent.postMessage({type:'dirtybag-assistant-ready'},portfolio);return()=>document.documentElement.classList.remove('desktop-assistant-embed')},[]);
 function navigate(href:string){if(href.startsWith('desktop:')){const id=href.slice(8);if(!desktopApps.some(a=>a.id===id))return false;window.parent.postMessage({type:'dirtybag-open-app',id},portfolio);return true}if(!/^\/(?:$|(?:learn|ontology|projects|products|tools|coding|agents|models|resources|guides|roadmap|community|glossary|industry|work|business|library)(?:[?#]|$))/.test(href))return false;window.parent.postMessage({type:'dirtybag-open-learning',href},portfolio);return true}
 return <KnowledgeAssistant onNavigate={navigate} desktop initialOpen hideLauncher apiEndpoint="/api/desktop-assistant" onClose={()=>window.parent.postMessage({type:'dirtybag-assistant-close'},portfolio)}/>;
}
