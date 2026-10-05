"use client";
import {useEffect,useRef,useState} from 'react';
import {ReactFlow,Background,Controls,MiniMap,Handle,Position,MarkerType,applyNodeChanges,applyEdgeChanges,type Node,type NodeProps,type Edge,type ReactFlowInstance,type Connection,useNodesState,useEdgesState} from '@xyflow/react';
import {nodeIcons} from './agent-workshop-icons';
import {nodeCatalog,type NodeConfig,type NodeKind,type WorkshopGraph,type TraceStep} from '@/lib/agent-workshop';
import {Button} from './ui/button';

type CanvasData=NodeConfig&{state?:TraceStep['state']};
type CanvasNode=Node<CanvasData,'workshop'>;
function WorkshopCard({data,selected}:NodeProps<CanvasNode>){const Icon=nodeIcons[data.kind];const details=data.kind==='agent'||data.kind==='mcp'?`${data.system} · ${data.connected&&data.plugin?'只读工具':'未连接'}`:data.kind==='supervisor'?`${data.mode==='parallel'?'并行':'串行'} · 最大并发 ${data.mode==='parallel'?data.parallel:1}`:data.kind==='skill'?(data.skill==='delivery-check'?'履约检查 · 缓冲 '+data.buffer+' 天':'证据完整性检查'):data.kind==='condition'?`延误 > ${data.threshold} 天 / 来源缺失`:data.kind==='output'?(data.format==='brief'?'履约简报 + 来源':'结构化 JSON'):nodeCatalog[data.kind].group;
 return <div className="aw-node" data-kind={data.kind} data-selected={selected} data-state={data.state}>
  {data.kind!=='start'&&<Handle type="target" position={Position.Left} id="in"/>}
  <div className="aw-node-top"><span className="aw-node-icon"><Icon size={17}/></span><strong>{data.label}</strong></div><p>{details}</p>
  <div className="aw-node-bottom"><span>{data.kind==='agent'?'SUB-AGENT':data.kind==='mcp'?'MCP':nodeCatalog[data.kind].label}</span>{data.state&&<b>{({running:'执行中',success:'已完成',warning:'待核实',waiting:'等你复核',skipped:'未进入',error:'失败'})[data.state]}</b>}</div>
  {data.kind==='condition'?<><span className="aw-port-label normal">常规</span><Handle type="source" position={Position.Right} id="normal" style={{top:'40%'}}/><span className="aw-port-label review">复核</span><Handle type="source" position={Position.Right} id="review" style={{top:'78%'}}/></>:data.kind!=='output'&&<Handle type="source" position={Position.Right} id="out"/>}
 </div>
}
const nodeTypes={workshop:WorkshopCard};
export default function AgentWorkshopCanvas({graph,onChange,selected,onSelect,states,locked,focus}:{graph:WorkshopGraph;onChange:(value:WorkshopGraph,semantic?:boolean)=>void;selected:string;onSelect:(id:string)=>void;states:Record<string,TraceStep['state']>;locked:boolean;focus:{id:string;revision:number}}){
 const [instance,setInstance]=useState<ReactFlowInstance<CanvasNode>|null>(null);
 const [nodes,setNodes]=useNodesState<CanvasNode>(graph.nodes.map(n=>({...n,type:'workshop',selected:n.id===selected,data:{...n.data,state:states[n.id]}})));
 useEffect(()=>{setNodes(current=>graph.nodes.map(n=>({...current.find(old=>old.id===n.id),...n,type:'workshop',selected:n.id===selected,data:{...n.data,state:states[n.id]}})))},[graph.nodes,selected,states,setNodes]);
 const decorate=(e:WorkshopGraph['edges'][number])=>({...e,targetHandle:'in',type:'smoothstep',animated:states[e.target]==='running',markerEnd:{type:MarkerType.ArrowClosed,width:16,height:16},label:e.sourceHandle==='normal'?'常规':e.sourceHandle==='review'?'复核':undefined,style:{stroke:states[e.source]==='success'?'#8170d1':'#a0adbe',strokeWidth:1.7}});
 const [edges,setEdges]=useEdgesState<Edge>(graph.edges.map(decorate));
 useEffect(()=>{setEdges(current=>graph.edges.map(e=>({...current.find(old=>old.id===e.id),...decorate(e)})))},[graph.edges,states,setEdges]);
 const latestGraph=useRef(graph);latestGraph.current=graph;
 const emit=(next:WorkshopGraph,semantic=true)=>{latestGraph.current=next;onChange(next,semantic)};
 useEffect(()=>{if(!instance||!focus.id)return;const n=graph.nodes.find(n=>n.id===focus.id);if(n)instance.setCenter(n.position.x+108,n.position.y+58,{zoom:.94,duration:260})},[focus,instance]);
 const connect=(connection:Connection)=>{if(locked||!connection.source||!connection.target||connection.source===connection.target)return;const port=(connection.sourceHandle||'out') as 'out'|'normal'|'review';if(graph.edges.some(e=>e.source===connection.source&&e.target===connection.target&&e.sourceHandle===port))return;emit({...latestGraph.current,edges:[...latestGraph.current.edges,{id:'e-'+crypto.randomUUID(),source:connection.source,target:connection.target,sourceHandle:port}]})};
 return <div className="aw-canvas" aria-label="智能体工作流画布">
  <ReactFlow<CanvasNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setInstance} onNodeClick={(_,n)=>onSelect(n.id)} onNodesChange={changes=>{if(locked)return;const next=applyNodeChanges(changes,nodes);setNodes(next);if(changes.some(c=>c.type==='remove'||c.type==='position')){const semantic=changes.some(c=>c.type==='remove');emit({...latestGraph.current,nodes:next.map(n=>({id:n.id,position:n.position,data:latestGraph.current.nodes.find(old=>old.id===n.id)!.data})),edges:latestGraph.current.edges.filter(e=>next.some(n=>n.id===e.source)&&next.some(n=>n.id===e.target))},semantic)}}} onEdgesChange={changes=>{if(locked)return;const next=applyEdgeChanges(changes,edges);setEdges(next);const removed=new Set(changes.filter(c=>c.type==='remove').map(c=>c.id));if(removed.size)emit({...latestGraph.current,edges:latestGraph.current.edges.filter(e=>!removed.has(e.id))})}} onConnect={connect} nodesDraggable={!locked} nodesConnectable={!locked} edgesReconnectable={false} deleteKeyCode={locked?null:['Backspace','Delete']} defaultViewport={{x:25,y:30,zoom:.82}} minZoom={.25} maxZoom={1.6} zoomOnScroll={false} panOnScroll snapToGrid snapGrid={[10,10]} colorMode="system">
   <Background gap={20} size={1}/><Controls showInteractive={false}/><MiniMap pannable zoomable nodeColor={n=>n.data.kind==='agent'?'#8170d1':'#6897ad'}/>
  </ReactFlow>
  <div className="aw-canvas-hint"><span>拖动节点 · 从圆点连线</span><Button size="sm" variant="outline" onClick={()=>instance?.fitView({padding:.15,duration:250})}>查看全图</Button><Button size="sm" variant="outline" onClick={()=>instance?.setViewport({x:25,y:30,zoom:1},{duration:250})}>100%</Button></div>
 </div>
}
