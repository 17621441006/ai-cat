"use client";

import {useMemo,useEffect,useRef,useState} from 'react';
import {ReactFlow,Background,Controls,Handle,Position,MarkerType,BaseEdge,EdgeLabelRenderer,getSmoothStepPath,type Node,type NodeProps,type EdgeProps,type ReactFlowInstance} from '@xyflow/react';
import {Building2,FileText,Package,Warehouse,ClipboardCheck,Receipt,Factory,ShoppingCart,Truck,ShieldCheck} from 'lucide-react';
import {spatialNodes,spatialEdges,delayScenario} from '@/lib/spatial-data';
import {graphPositions,relatedNodeIds,type RelationScope} from '@/lib/spatial-layout';

const icons:Record<string,typeof Package>={supplier:Building2,po:FileText,material:Package,stock:Warehouse,receipt:ClipboardCheck,invoice:Receipt,line:Factory,order:ShoppingCart,logistics:Truck,rule:ShieldCheck};
type ObjectData={id:string;name:string;type:string;active:boolean;muted:boolean;risk:boolean;onSelect:(id:string)=>void};
function ObjectNode({data}:NodeProps<Node<ObjectData>>){const Icon=icons[data.id];return <button className={`relationship-node ${data.active?'is-selected':''} ${data.muted?'is-muted':''} ${data.risk?'has-risk':''}`} onClick={()=>data.onSelect(data.id)} aria-pressed={data.active} aria-label={`查看${data.name}`}>
  <Handle type="target" position={Position.Left}/><Handle type="source" position={Position.Right}/>
  <span className="relationship-node-kind"><Icon size={19}/>{data.type}{data.risk&&<span>受影响</span>}</span>
  <strong>{data.name}</strong>
</button>}
const nodeTypes={object:ObjectNode};
function RelationshipEdge(props:EdgeProps){const[path,x,y]=getSmoothStepPath({...props,borderRadius:14});return <><BaseEdge id={props.id} path={path} style={props.style} markerEnd={props.markerEnd}/>{props.label&&<EdgeLabelRenderer><div className="relationship-edge-label" style={{transform:`translate(-50%, -50%) translate(${x}px, ${y}px)`,color:props.style?.stroke}}>{props.label}</div></EdgeLabelRenderer>}</>}
const edgeTypes={relationship:RelationshipEdge};

export default function SpatialRelationshipMap({selected,onSelect,scope,delay,expedite}:{selected:string;onSelect:(id:string)=>void;scope:RelationScope;delay:number;expedite:boolean}){
  const related=useMemo(()=>relatedNodeIds(selected),[selected]);
  const risk=delayScenario(delay,expedite).netShortage>0;
  const root=useRef<HTMLDivElement>(null);const[flow,setFlow]=useState<ReactFlowInstance|null>(null);
  const focusedPositions=useMemo(()=>{const left=spatialEdges.filter(e=>e[1]===selected).map(e=>e[0]);const right=spatialEdges.filter(e=>e[0]===selected).map(e=>e[1]);const center=Math.max(left.length,right.length,1)*66;const positions:Record<string,{x:number;y:number}>={[selected]:{x:280,y:center}};left.forEach((id,i)=>{positions[id]={x:10,y:center+(i-(left.length-1)/2)*150}});right.forEach((id,i)=>{positions[id]={x:550,y:center+(i-(right.length-1)/2)*150}});return positions;},[selected]);
  useEffect(()=>{if(!flow||!root.current)return;let frame=0;const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>flow.fitView({padding:.15,minZoom:.65,maxZoom:1.05}));};fit();const observer=new ResizeObserver(fit);observer.observe(root.current);return()=>{cancelAnimationFrame(frame);observer.disconnect();};},[flow,selected,scope]);
  const nodes=useMemo(()=>spatialNodes.filter(n=>scope==='all'||related.has(n.id)).map(n=>({id:n.id,type:'object',position:scope==='related'?focusedPositions[n.id]:graphPositions[n.id],draggable:false,focusable:false,data:{...n,active:n.id===selected,muted:scope==='related'&&!related.has(n.id),risk:risk&&['po','material','stock','line','order','logistics'].includes(n.id),onSelect}})),[selected,scope,related,risk,onSelect,focusedPositions]);
  const edges=useMemo(()=>spatialEdges.filter(([a,b])=>scope==='all'||a===selected||b===selected).map(([source,target,label])=>{const active=source===selected||target===selected;const visible=scope==='all'||active;const color=active?'#6855cf':'#70889a';return {id:`${source}-${target}`,source,target,type:'relationship',label:visible?label:undefined,style:{stroke:color,strokeWidth:active?3:2,opacity:visible?1:.13},markerEnd:{type:MarkerType.ArrowClosed,color,width:17,height:17},labelStyle:{fill:active?'#4d3aaa':'#355166',fontSize:16,fontWeight:600},labelBgStyle:{fill:'#fff',fillOpacity:.98},labelBgPadding:[7,5] as [number,number],labelBgBorderRadius:5,zIndex:active?2:0,interactionWidth:20};}),[selected,scope]);
  return <div ref={root} className="relationship-map" aria-label="供应链平面关系图">
    <div className="relationship-lanes" aria-hidden="true">{scope==='related'?<><span>流向当前对象</span><span>当前对象</span><span>从当前对象流出</span></>:<><span>供应与采购</span><span>物料与库存</span><span>生产与履约</span></>}</div>
    <ReactFlow onInit={setFlow} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{padding:.15,minZoom:.65,maxZoom:1.05}} minZoom={.45} maxZoom={1.7} nodesConnectable={false} nodesDraggable={false} edgesFocusable={false} deleteKeyCode={null} panOnScroll={false} zoomOnScroll={false} zoomOnPinch aria-label="可缩放的供应链关系画布">
      <Background color="#b8c8d6" gap={24} size={1}/><Controls showInteractive={false}/>
    </ReactFlow>
    <div className="relationship-mobile-list"><strong>{scope==='related'?'与当前对象直接相关':'全部业务对象'}</strong>{nodes.map(n=><button key={n.id} className={n.id===selected?'active':''} onClick={()=>onSelect(n.id)}><span>{n.id===selected?'当前对象':spatialEdges.find(e=>e[0]===n.id&&e[1]===selected)?.[2]||spatialEdges.find(e=>e[1]===n.id&&e[0]===selected)?.[2]||n.data.type}</span><strong>{n.data.name}</strong></button>)}</div>
    <div className="relationship-key"><span><i/>当前对象的关联</span><span>沿箭头查看关系 · 拖动画布 · ＋／− 缩放</span></div>
  </div>
}
