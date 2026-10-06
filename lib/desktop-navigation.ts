import {desktopApps} from './desktop-knowledge';
import {resolveEntries,type SearchEntry} from './desktop-fuzzy-search';
import type {AssistantDestination} from './assistant-navigation';
export type {SearchEntry} from './desktop-fuzzy-search';
export const fallbackDesktopEntries:SearchEntry[]=desktopApps.map(a=>({id:a.id,title:a.title,description:a.text,aliases:a.aliases}));
export function desktopDestination(id:string,entries:SearchEntry[]):AssistantDestination|undefined{if(!id.startsWith('desktop-'))return;const app=entries.find(a=>'desktop-'+a.id===id);return app?{...app,id,href:'desktop:'+app.id}:undefined}
export function resolveDesktopNavigation(question:string,entries:SearchEntry[],pending:string[]=[]){const result=resolveEntries(question,entries.map(e=>({...e,id:'desktop-'+e.id})),pending);if(!result)return null;if(result.kind==='open')return {...result,destination:desktopDestination(result.destination.id,entries)!};if(result.kind==='choose')return {...result,options:result.options.map(e=>desktopDestination(e.id,entries)!)};return result}
