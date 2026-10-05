export type SpatialNode={id:string;name:string;type:string;color:string;position:[number,number,number];properties:[string,string][];evidence:string};
export const spatialNodes:SpatialNode[]=[
{id:'supplier',name:'华东合金供应商',type:'供应商',color:'#66c7cf',position:[-12, 1, -3],properties:[['supplier_id','SUP-01'],['供应等级','A 级（合成）'],['关键原料','合金卷材 M-01']],evidence:'供应商主数据 SUP-01 · 演示版本 1'},
{id:'po',name:'采购单 PO-1001',type:'采购单',color:'#6a9edf',position:[-6, 1, -3],properties:[['采购数量','120 吨'],['原承诺到货','第 2 天'],['采购单状态','已确认']],evidence:'采购订单 PO-1001 · 承诺到货字段'},
{id:'material',name:'合金卷材 M-01',type:'物料',color:'#a5ce8b',position:[0, 1, -3],properties:[['material_id','M-01'],['生产耗用','20 吨 / 天'],['单位','吨']],evidence:'物料主数据 + 生产 BOM · 合成示例'},
{id:'stock',name:'原料仓库 WH-01',type:'库存',color:'#a5ce8b',position:[0, 1, 4],properties:[['可用库存','60 吨'],['库存覆盖','3 天'],['快照','实验开始时刻']],evidence:'库存快照 WH-01/M-01 · 60 吨'},
{id:'receipt',name:'收货单 GR-01',type:'单据',color:'#7cb3e8',position:[-6, 1, 4],properties:[['关联采购单','PO-1001'],['收货数量','到货前为 0'],['回写状态','仅展示模拟状态']],evidence:'预期收货对象 · 到货事件生成收货数量'},
{id:'invoice',name:'发票 INV-01',type:'单据',color:'#a195df',position:[-6, 1, -9],properties:[['开票数量','120 吨'],['单价','4,200 元 / 吨'],['支付状态','未执行']],evidence:'合成发票 INV-01 · 账实核验需要关联收货'},
{id:'line',name:'精加工产线 L-01',type:'生产',color:'#efaa6f',position:[6, 1, -3],properties:[['日耗用量','20 吨'],['补货响应','到货即恢复'],['模型假设','忽略其他瓶颈']],evidence:'简化生产计划 · 演示规则 R-01'},
{id:'order',name:'客户订单 SO-8001',type:'订单',color:'#ee857c',position:[12, 1, -3],properties:[['计划完成','第 8 天'],['延误公式','缺料天数顺延'],['客户','客户 A（合成）']],evidence:'订单计划 SO-8001 · 计划完工日'},
{id:'logistics',name:'出货物流 DO-01',type:'物流',color:'#71c8c2',position:[12, 1, 4],properties:[['运输时长','2 天'],['计划送达','第 10 天'],['约束','生产完成后发运']],evidence:'出库及运输计划 DO-01'},
{id:'rule',name:'短缺与审批规则',type:'规则',color:'#bcabed',position:[6, 1, -9],properties:[['缓冲计算','60 ÷ 20 = 3 天'],['采购审批','演示预算上限 50,000 元'],['前置条件','可用供应商、预算、经理审批']],evidence:'教学规则 RULE-01 · 不等同实际采购制度'}
];
export const spatialEdges=[
['supplier','po','供货'],['po','material','采购物料'],['material','stock','储存于'],['po','receipt','对应收货'],['receipt','stock','入库'],['po','invoice','关联开票'],['material','line','生产耗用'],['stock','line','供料'],['line','order','履约'],['order','logistics','发运'],['rule','line','约束'],['rule','po','审批约束']
] as const;
export function delayScenario(delay:number,expedite=false){const arrival=2+delay;const stockDays=60/20;const shortage=Math.max(0,arrival-stockDays);const recovered=expedite?Math.min(2,shortage):0;return {arrival,stockDays,shortage,netShortage:shortage-recovered,completion:8+shortage-recovered,delivery:10+shortage-recovered,extraCost:expedite&&shortage>0?18000:0};}
