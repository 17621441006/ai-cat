import {ArrowUpRight} from 'lucide-react';
import {groupForView,type View} from '@/lib/navigation';

const descriptions:Partial<Record<View,string>>={
 tools:'从写作、会议、表格、PPT 等日常任务开始，体验 AI 工具的用法。',
 coding:'在 ERP 工程里描述问题、修改代码，再检查业务规则与运行结果。',
 learn:'学习提示词、上下文、AI 项目管理和工作流，配合小实验验证理解。',
 models:'调整模型参数，观察候选回答、上下文与示例成本的变化。',
 agents:'搭建采购审单流程，连接检索、规则判断与人工审批节点。',
 industry:'从供应链业务问题出发，梳理数据、集成、试点与验收。',
 products:'进入供应链业务演示，体验审单、补货与经营问数。',
 ontology:'在 ERP、MES、TMS、WMS 三维场景中，比较不同业务决策。',
 guides:'按管理、产品与业务问题，阅读完整方法和交付示例。',
 resources:'查找课程、工具文档与官方资料，补齐当前任务需要的知识。',
 projects:'结合项目材料，了解产品能力、实践阶段与互动案例。',
 community:'记录研究问题、实验过程和学习成果，与成员交流。',
};
export default function SectionOverview({view}:{view:View}){
 const group=groupForView(view);
 return <section className="section-overview" aria-labelledby={'section-'+group.id}>
  <header><span className="section-overview-kicker"><group.icon size={18}/>{group.items.length} 个学习入口</span><h1 id={'section-'+group.id}>{group.label}</h1><p>{group.description}</p></header>
  <div className="section-overview-grid">{group.items.map((item,index)=><a href={item.href} className="section-overview-link" key={item.id}>
   <span className="section-overview-icon"><item.icon size={24}/></span><span className="section-overview-index">{String(index+1).padStart(2,'0')}</span>
   <h2>{item.label}</h2><p>{descriptions[item.id]}</p><span className="section-overview-action">进入学习<ArrowUpRight size={17}/></span>
  </a>)}</div>
 </section>;
}
