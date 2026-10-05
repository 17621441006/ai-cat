/** Deterministic teaching models. Synthetic inputs; never dispatch to a live system. */
export type OperationKind='mes'|'tms'|'wms';
export type Point=[number,number];
export type MesInput={demand:number;downtime:number;strategy:'wait'|'reroute'};
export type TmsInput={demand:number;trucks:number;congestion:number;strategy:'direct'|'detour'};
export type WmsInput={orders:number;strategy:'single'|'wave';forward:boolean};
export const mesDefault:MesInput={demand:180,downtime:120,strategy:'wait'};
export const tmsDefault:TmsInput={demand:18,trucks:2,congestion:120,strategy:'direct'};
export const wmsDefault:WmsInput={orders:6,strategy:'single',forward:false};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function simulateMes(input:MesInput){
 const demand=clamp(input.demand,80,240),down=clamp(input.downtime,0,240)/60;
 const bQty=input.strategy==='reroute'?Math.min(60,demand*.4,Math.max(0,demand-50)):0,aQty=demand-bQty;
 const aWork=aQty/25,aFinish=aWork+(aWork>2?down:0),bStart=2.5,bFinish=bQty?bStart+bQty/15:0;
 const finish=Math.max(aFinish,bFinish)+.5;
 const productionAt=(hour:number)=>({a:Math.min(aQty,Math.max(0,hour-clamp(hour-2,0,down))*25),b:Math.min(bQty,Math.max(0,hour-bStart)*15)});
 const ready=productionAt(7.5),readyTons=Math.min(demand,ready.a+ready.b);
 return {demand,down,aQty,bQty,aFinish,bFinish,finish,late:Math.max(0,finish-8),readyTons,shortfall:demand-readyTons,cost:bQty?1200+bQty*12:0,productionAt};
}
export const tmsDirect:Point[]=[[-12,3],[-7,3],[0,3],[7,3],[12,3]];
export const tmsDetour:Point[]=[[-12,3],[-7,3],[-7,-6],[7,-6],[7,3],[12,3]];
export function simulateTms(input:TmsInput){
 const demand=clamp(input.demand,8,30),trucks=clamp(Math.round(input.trucks),1,3),congestion=clamp(input.congestion,0,180)/60;
 const distance=input.strategy==='direct'?180:240,travel=distance/60,delay=input.strategy==='direct'?congestion:0;
 const capacity=trucks*10,unallocated=Math.max(0,demand-capacity),feasible=unallocated===0,eta=.5+travel+delay+.25;
 return {demand,trucks,capacity,unallocated,feasible,distance,travel,delay,eta,late:Math.max(0,eta-5),cost:Math.round(trucks*(distance*3.2+160)),loadRate:demand/capacity*100,route:input.strategy==='direct'?tmsDirect:tmsDetour,
  positionAt(hour:number){if(!feasible)return 0;const t=Math.max(0,hour-.5);const waitAt=travel/2;return clamp((t-Math.min(delay,Math.max(0,t-waitAt)))/travel,0,1)},
  statusAt(hour:number){if(!feasible)return '运力不足 · 待补车';if(hour<.5)return '装车中';if(delay&&hour>=.5+travel/2&&hour<.5+travel/2+delay)return '主路拥堵 · 等待通行';if(hour>=eta)return '交付完成';if(hour>=eta-.25)return '客户卸货中';return input.strategy==='direct'?'主路运输中':'绕行运输中'}
 };
}
export const skuNames:Record<string,string>={A:'轴承套件',B:'密封组件',C:'传感器',D:'紧固件'};
export const warehouseDepot:Point=[0,7];
export function warehouseLocations(forward:boolean):Record<string,Point>{return forward?{A:[-6,5],B:[0,-1],C:[6,5],D:[-6,1]}:{A:[-6,-5],B:[0,-1],C:[6,-3],D:[-6,1]};}
const orders=['A','C','B','A','D','C'];
/** Travel only in an aisle or the front/back cross-aisle; never through storage racks. */
export function aislePath(a:Point,b:Point):Point[]{
 if(a[0]===b[0])return [a,b];
 const front=Math.abs(a[1]-7)+Math.abs(b[1]-7),back=Math.abs(a[1]+7)+Math.abs(b[1]+7),z=front<=back?7:-7;
 return [a,[a[0],z],[b[0],z],b];
}
export function pathLength(path:Point[]){return path.slice(1).reduce((total,p,i)=>total+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);}
export function pointOnPath(path:Point[],fraction:number):Point{
 if(!path.length)return [0,0];let remaining=pathLength(path)*clamp(fraction,0,1);
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d>0&&remaining<=d)return [a[0]+(b[0]-a[0])*remaining/d,a[1]+(b[1]-a[1])*remaining/d];remaining-=d}return path[path.length-1];
}
function permutations<T>(items:T[]):T[][]{if(items.length<2)return [items];return items.flatMap((x,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[x,...rest]));}
export function simulateWms(input:WmsInput){
 const count=clamp(Math.round(input.orders),2,6),items=orders.slice(0,count),locations=warehouseLocations(input.forward);
 const quantities=Object.fromEntries(Object.keys(skuNames).map(id=>[id,items.filter(x=>x===id).length]));
 const routeFor=(stops:string[])=>{let path:Point[]=[warehouseDepot];let at:Point=warehouseDepot;for(const id of stops){path=path.concat(aislePath(at,locations[id]).slice(1));at=locations[id];if(input.strategy==='single'){path=path.concat(aislePath(at,warehouseDepot).slice(1));at=warehouseDepot}}return path.concat(aislePath(at,warehouseDepot).slice(1))};
 const candidates=input.strategy==='single'?[items]:permutations([...new Set(items)]);
 const sequence=candidates.reduce((best,next)=>pathLength(routeFor(next))<pathLength(routeFor(best))?next:best,candidates[0]);
 const path=routeFor(sequence),meters=pathLength(path)*2;
 type Leg={start:number;end:number;path:Point[];label:string};const legs:Leg[]=[];let seconds=0,at:Point=warehouseDepot;
 for(const sku of sequence){const p=aislePath(at,locations[sku]),walk=pathLength(p)*2;legs.push({start:seconds,end:seconds+walk,path:p,label:`前往 ${sku} · ${skuNames[sku]}`});seconds+=walk;legs.push({start:seconds,end:seconds+20,path:[locations[sku]],label:`拣取 ${sku} · ${input.strategy==='wave'?quantities[sku]:1} 箱`});seconds+=20;at=locations[sku];if(input.strategy==='single'){const back=aislePath(at,warehouseDepot),time=pathLength(back)*2;legs.push({start:seconds,end:seconds+time,path:back,label:'返回集货台'});seconds+=time;at=warehouseDepot}}
 const back=aislePath(at,warehouseDepot),backTime=pathLength(back)*2;legs.push({start:seconds,end:seconds+backTime,path:back,label:'返回集货台'});seconds+=backTime;const pickingSeconds=seconds;legs.push({start:seconds,end:seconds+count*30,path:[warehouseDepot],label:'按订单复核与打包'});seconds+=count*30;
 return {count,items,quantities,locations,sequence,path,meters,visits:sequence.length,seconds,pickingSeconds,legs,
  stateAt(time:number){const leg=legs.find(l=>l.end>time)||legs[legs.length-1];return {position:pointOnPath(leg.path,(time-leg.start)/(leg.end-leg.start||1)),status:time>=seconds?'波次完成 · 等待出库':leg.label}}
 };
}
export const operationSources={
 mes:{title:'Siemens · Opcenter Execution',url:'https://www.siemens.com/en-us/products/opcenter/execution/',summary:'MES 连接生产计划与车间执行，记录生产过程、资源状态和质量信息。本案例聚焦异常反馈与工单改派；复杂排程通常还需要计划系统协同。'},
 tms:{title:'Oracle · Transportation Management',url:'https://www.oracle.com/scm/logistics/transportation-management/',summary:'TMS 将订单、运输资源、路线和执行里程碑关联起来。运输情景分析可以比较时效与成本；本例用两条抽象路线演示这种取舍。'},
 wms:{title:'SAP · What is a warehouse management system?',url:'https://www.sap.com/resources/what-is-a-warehouse-management-system-wms',summary:'WMS 管理入库、库存、拣选与发运，并可采用批量、分区或波次拣选减少行走。本例比较逐单往返与合并波次，保留逐单复核和打包。'}
};
