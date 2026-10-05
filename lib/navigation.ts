import {Compass,Route,BookOpen,Library,Workflow,SlidersHorizontal,Code2,Layers,Factory,Database,Sparkles,Lightbulb,MessagesSquare,BookA,GraduationCap,BriefcaseBusiness,Boxes} from 'lucide-react';

export type View='home'|'resources'|'guides'|'roadmap'|'industry'|'learn'|'agents'|'models'|'coding'|'products'|'community'|'projects'|'ontology'|'tools'|'glossary'|'work'|'business'|'library';
export type NavItem={id:View;label:string;href:string;icon:typeof Compass;hint?:string};
export const navigationGroups:{id:string;label:string;description:string;href:string;view:View;icon:typeof Compass;items:NavItem[]}[]=[
 {id:'start',view:'home',href:'/',label:'学习启航',description:'先找到自己的学习起点',icon:GraduationCap,items:[
  {id:'home',label:'学习总览',href:'/',icon:Compass},
  {id:'roadmap',label:'12 周学习路线',href:'/roadmap',icon:Route},
  {id:'glossary',label:'AI 概念与术语',href:'/glossary',icon:BookA},
 ]},
 {id:'work',view:'work',href:'/work',label:'基础办公与提效',description:'从每天的工作开始用 AI',icon:BriefcaseBusiness,items:[
  {id:'tools',label:'AI 办公工具体验',href:'/tools',icon:Sparkles},
  {id:'coding',label:'AI 编程实训',href:'/coding',icon:Code2},
  {id:'learn',label:'互动课堂',href:'/learn',icon:Lightbulb},
 ]},
 {id:'business',view:'business',href:'/business',label:'供应链 AI 实战',description:'模型 → 编排 → 业务应用',icon:Boxes,items:[
  {id:'models',label:'模型实验室',href:'/models',icon:SlidersHorizontal},
  {id:'agents',label:'智能体工坊',href:'/agents',icon:Workflow},
  {id:'industry',label:'云应用 × 供应链',href:'/industry',icon:Factory},
  {id:'products',label:'供应链产品体验',href:'/products',icon:Layers},
  {id:'ontology',label:'供应链 · 3D 实验',href:'/ontology',icon:Database},
 ]},
 {id:'resources',view:'library',href:'/library',label:'知识库与资源',description:'查方法、看案例、交流作品',icon:Library,items:[
  {id:'guides',label:'实战指南',href:'/guides',icon:BookOpen},
  {id:'resources',label:'精选资料库',href:'/resources',icon:Library,hint:'60'},
  {id:'projects',label:'行业研究与产品专栏',href:'/projects',icon:Layers},
  {id:'community',label:'交流与作品',href:'/community',icon:MessagesSquare},
 ]},
];
export const navigationItems:NavItem[]=[...navigationGroups.flatMap(group=>group.items),...navigationGroups.filter(group=>group.view!=='home').map(group=>({id:group.view,href:group.href,label:group.label,icon:group.icon}))];
export const groupForView=(view:View)=>navigationGroups.find(group=>group.view===view||group.items.some(item=>item.id===view))!;
