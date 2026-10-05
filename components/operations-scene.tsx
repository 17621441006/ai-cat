"use client";
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SpatialSoftwareRenderer} from '@/lib/spatial-software-renderer';
import {Minus,Move3D,Plus,RotateCcw} from 'lucide-react';
import {pointOnPath,simulateMes,simulateTms,simulateWms,tmsDirect,tmsDetour,type OperationKind,type MesInput,type TmsInput,type WmsInput,type Point} from '@/lib/operations-simulation';
type Props={kind:OperationKind;mes:MesInput;tms:TmsInput;wms:WmsInput;progress:number;selected:string;onSelect:(id:string)=>void};
export default function OperationsScene(props:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(props);live.current=props;
 const actions=useRef<{zoom:(factor:number)=>void;reset:()=>void}|null>(null);
 const[compat,setCompat]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{
  const root=host.current;if(!root)return;let renderer:THREE.WebGLRenderer|SpatialSoftwareRenderer;
  setReady(false);setError(false);
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});setCompat(false)}catch{renderer=new SpatialSoftwareRenderer();setCompat(true)}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor('#111e32');renderer.outputColorSpace=THREE.SRGBColorSpace;
  root.appendChild(renderer.domElement);renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label',`${props.kind.toUpperCase()} 可旋转、缩放和点选的三维业务场景`);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,140);scene.fog=new THREE.Fog('#111e32',50,90);
  const initial=new THREE.Vector3(props.kind==='tms'?24:23,props.kind==='wms'?28:24,props.kind==='wms'?30:29);camera.position.copy(initial);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.2,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=18;controls.maxDistance=62;controls.maxPolarAngle=Math.PI*.47;controls.update();
  actions.current={zoom:factor=>{const offset=camera.position.clone().sub(controls.target);offset.setLength(THREE.MathUtils.clamp(offset.length()*factor,18,62));camera.position.copy(controls.target).add(offset);controls.update()},reset:()=>{camera.position.copy(initial);controls.target.set(0,.2,0);controls.update()}};
  scene.add(new THREE.HemisphereLight('#d4e7ff','#415574',2.8));const sun=new THREE.DirectionalLight('#ffffff',2.5);sun.position.set(8,18,12);scene.add(sun);const rim=new THREE.DirectionalLight('#8d93ff',1.5);rim.position.set(-15,12,-9);scene.add(rim);
  const textures:THREE.Texture[]=[],targets:THREE.Object3D[]=[],highlight:{mesh:THREE.Mesh;id:string}[]=[];
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,id?:string,parent:THREE.Object3D=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.6,metalness:.12}));m.position.set(x,y+h/2,z);parent.add(m);if(id){m.userData.id=id;targets.push(m);highlight.push({mesh:m,id})}return m}
  function cylinder(x:number,y:number,z:number,r:number,h:number,color:string,parent:THREE.Object3D=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.4}));m.position.set(x,y+h/2,z);parent.add(m);return m}
  function label(text:string,x:number,y:number,z:number,color='#dcecff',w=5){const c=document.createElement('canvas');c.width=640;c.height=96;const ctx=c.getContext('2d')!;ctx.fillStyle='#101f36df';ctx.fillRect(0,0,c.width,c.height);ctx.font='500 43px system-ui, sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,48,600);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));sprite.position.set(x,y,z);sprite.scale.set(w,w*96/640,1);scene.add(sprite);return sprite}
  function line(points:Point[],color:string,y=.18){const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x,z])=>new THREE.Vector3(x,y,z))),new THREE.LineBasicMaterial({color}));scene.add(l);return l}
  function vehicle(color:string){const g=new THREE.Group();box(0,.45,0,1.8,.85,1,color,undefined,g);box(1.15,.3,0,.65,.8,1,'#d7e8f4',undefined,g);box(1.2,.83,.505,.45,.25,.015,'#283f5c',undefined,g);for(const x of [-.55,.9])for(const z of [-.57,.57]){const wheel=cylinder(x,0,z,.25,.18,'#16263a',g);wheel.rotation.x=Math.PI/2;wheel.position.y=.3}scene.add(g);return g}
  box(0,-.45,0,31,.4,22,'#273d59');const grid=new THREE.GridHelper(32,16,'#405875','#304960');grid.position.y=.005;scene.add(grid);
  const kind=props.kind;let machineA:THREE.Mesh|undefined,machineB:THREE.Mesh|undefined,lampA:THREE.Mesh|undefined,lampB:THREE.Mesh|undefined;
  const coils:THREE.Mesh[]=[],trucks:THREE.Group[]=[],skuMeshes:Record<string,THREE.Mesh>={},skuLabels:Record<string,THREE.Sprite>={};let routeLine:THREE.Line|undefined,directLine:THREE.Line|undefined,detourLine:THREE.Line|undefined,cart:THREE.Group|undefined;
  if(kind==='mes'){
   box(0,0,-9.5,28,3,.25,'#526c85');for(const x of [-14,0,14]){box(x,0,-9.5,.25,4,.4,'#7893ab');box(x,0,8.5,.25,4,.4,'#7893ab')}box(0,4,-9.5,28,.22,.3,'#9aadc3');
   box(-10,0,0,4,.3,13,'#354b67','order');for(const z of [-4,-1,2,5]){const c=cylinder(-10,.3,z,.8,1.4,'#a6bac9');c.rotation.z=Math.PI/2;c.position.y=1.1}label('待加工卷材 / 工单',-10,4.6,0,'#bfceea',5.8);
   for(const [i,z] of [-4,4].entries()){const id=i?'line-b':'line-a';box(0,0,z,10,.45,3,'#43657b',id);for(let x=-4;x<=4;x+=2){const r=cylinder(x,.65,z,.3,2.6,'#c1d3e0');r.rotation.x=Math.PI/2;r.position.y=.65}const machine=box(.3,.5,z,3,2.3,2.8,i?'#516887':'#467d9f',id);box(.3,2.8,z,3.4,.25,3.2,'#d0e2ec',id);box(.3,1,z+1.42,1.6,.75,.1,'#182f4a',id);const lamp=cylinder(1.3,3.05,z,.19,.4,'#67d5b5');if(i){machineB=machine;lampB=lamp}else{machineA=machine;lampA=lamp}label(i?'B 线 / 15 吨·小时':'A 线 / 25 吨·小时',0,4.6,z,i?'#b9b6fb':'#8bdded',6.1);const c=cylinder(-4,.85,z,.6,.9,'#d4e0e8');c.rotation.z=Math.PI/2;c.position.y=1.25;coils.push(c)}
   box(9,0,-4,4,1.7,4,'#4d9f9b','quality');box(9,1.7,-4,4.2,.2,4.2,'#a7d5d1','quality');label('质检 / 30 分钟',9,3.8,-4,'#96e4d3');box(9,0,4,4,.3,4,'#405778','finished');for(let x=8;x<=10;x+=2)for(const z of [3,5])box(x,.3,z,1.5,1.3,1.5,'#cf9f6e','finished');label('成品暂存',9,3.8,4,'#ebca9f',4.5);
   line([[-8,-4],[-5,-4]],'#7ba9c1');line([[-8,4],[-5,4]],'#7ba9c1');line([[5,-4],[7,-4]],'#71d1c0');line([[5,4],[6,4],[6,-4],[7,-4]],'#71d1c0');line([[11,-4],[12,-4],[12,4],[11,4]],'#71d1c0');
  }
  if(kind==='tms'){
   const roads:Point[][]=[tmsDirect,tmsDetour];for(const points of roads)for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];box((a[0]+b[0])/2,.03,(a[1]+b[1])/2,Math.max(Math.abs(b[0]-a[0]),1.7),.08,Math.max(Math.abs(b[1]-a[1]),1.7),'#526784');}
   for(let x=-11;x<=11;x+=2)box(x,.13,3,.75,.015,.06,'#c2d1e5');
   directLine=line(tmsDirect,'#73b9ed',.18);detourLine=line(tmsDetour,'#456783',.18);
   box(-12,0,-1.7,4,2.4,5,'#688bab','depot');box(-12,2.4,-1.7,4.3,.3,5.3,'#b4cadd','depot');for(const x of [-13,-11.5])box(x,.2,.85,1.1,1.5,.1,'#28415d','depot');label('配送中心 / 装车',-12,4.8,-2,'#b4d8f5',5.8);
   box(12,0,-1.7,4,3.2,5,'#539a90','customer');box(12,3.2,-1.7,4.3,.25,5.3,'#a4cfc7','customer');label('客户工厂 / 5 小时内',12,5.6,-2,'#a8e0cb',6.3);
   for(const x of [-3.5,3.5]){box(x,0,-2,2.8,2.4,2.8,'#536881');box(x,2.4,-2,2.8,1,1.6,'#657b97');for(const y of [.6,1.6])box(x,y,-.58,1.9,.4,.03,'#8dabc3')}
   box(0,.14,3,2,.6,.28,'#d7885e','junction');label('主路 / 拥堵点',0,3.1,4.7,'#f4bc94',5);label('备用线路 / 240 km',0,1.2,-7.7,'#a9b1ea',6.4);
   for(let i=0;i<3;i++){const truck=vehicle(['#937ada','#68b3da','#74b69e'][i]);truck.traverse(o=>{if(o instanceof THREE.Mesh){o.userData.id='fleet';targets.push(o);highlight.push({mesh:o,id:'fleet'})}});trucks.push(truck)}
  }
  if(kind==='wms'){
   box(0,0,-9,26,3,.22,'#52677e');for(const x of [-9,-3,3,9])for(const z of [-4,0,4]){box(x,0,z,2.5,.25,2.7,'#496783','inventory');for(const dx of [-1.15,1.15])box(x+dx,.2,z,.13,3,2.7,'#648bab','inventory');for(const y of [1.35,2.75]){box(x,y,z,2.5,.15,2.7,'#96b1c8','inventory');box(x,y+.15,z,1.8,.85,2.1,z===0?'#b39b78':'#718ea9','inventory')}}
   for(const x of [-6,0,6])line([[x,-7],[x,7]],'#4b6a88');line([[-10,7],[10,7]],'#4b6a88');line([[-10,-7],[10,-7]],'#4b6a88');
   box(0,0,9,6,.5,2,'#579b96','packing');for(const x of [-2,0,2])box(x,.5,9,1.3,.85,1.1,'#d5b383','packing');label('集货 / 逐单复核',0,3.1,9,'#a1dfd2',6.2);
   for(const id of ['A','B','C','D']){skuMeshes[id]=box(0,.2,0,.85,.85,.85,'#a69adb',id);skuLabels[id]=label(`SKU ${id}`,0,4.4,0,'#d9c9fc',2.7)}
   routeLine=line([[0,7],[0,7]],'#63ddc5',.22);cart=vehicle('#68cdb5');cart.scale.setScalar(.65);label('前 / 后横向通道连接货位',0,1,-9.5,'#b9c9df',8);
  }
  let start={x:0,y:0};const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY}},up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)return;const r=renderer.domElement.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=ray.intersectObjects(targets,false).find(h=>h.object.visible&&h.object.parent?.visible);if(hit)live.current.onSelect(hit.object.userData.id)};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);
  const resize=new ResizeObserver(()=>{const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()});resize.observe(root);
  let visible=true;const intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting});intersection.observe(root);
  let frame=0,last=0,signature='',disposed=false;let m=simulateMes(live.current.mes),t=simulateTms(live.current.tms),w=simulateWms(live.current.wms);
  function draw(now:number){if(disposed)return;frame=requestAnimationFrame(draw);if(!visible||document.hidden||now-last<(renderer instanceof SpatialSoftwareRenderer?85:33))return;last=now;const p=live.current,signatureNow=JSON.stringify([p.mes,p.tms,p.wms]);if(signatureNow!==signature){signature=signatureNow;m=simulateMes(p.mes);t=simulateTms(p.tms);w=simulateWms(p.wms);if(routeLine){routeLine.geometry.dispose();routeLine.geometry=new THREE.BufferGeometry().setFromPoints(w.path.map(([x,z])=>new THREE.Vector3(x,.23,z)))}for(const id of Object.keys(skuMeshes)){const [x,z]=w.locations[id];skuMeshes[id].position.set(x+1,.65,z);skuLabels[id].position.set(x+1,4.4,z);(skuMeshes[id].material as THREE.MeshStandardMaterial).color.set(w.quantities[id]?'#c2a5ed':'#586780')}}
   highlight.forEach(({mesh,id})=>{const mat=mesh.material as THREE.MeshStandardMaterial;mat.emissive.set(id===p.selected?'#526aa0':'#000000');mat.emissiveIntensity=id===p.selected?.7:0});
   if(kind==='mes'){const hour=p.progress/100*Math.max(8,m.finish),blocked=hour>=2&&hour<2+m.down&&m.aQty>50,output=m.productionAt(hour);(machineA!.material as THREE.MeshStandardMaterial).color.set(blocked?'#b8665e':'#467d9f');(lampA!.material as THREE.MeshStandardMaterial).color.set(blocked?'#ff9369':'#69d2b1');(machineB!.material as THREE.MeshStandardMaterial).color.set(m.bQty?'#786fb7':'#4b5e79');(lampB!.material as THREE.MeshStandardMaterial).color.set(m.bQty?'#ad9ded':'#52647d');coils[0].position.x=-4+8*(output.a/m.aQty);coils[1].visible=m.bQty>0;coils[1].position.x=-4+8*(output.b/(m.bQty||1));}
   if(kind==='tms'){(directLine!.material as THREE.LineBasicMaterial).color.set(p.tms.strategy==='direct'?'#f3b076':'#576b89');(detourLine!.material as THREE.LineBasicMaterial).color.set(p.tms.strategy==='detour'?'#73e2c9':'#576b89');const fraction=t.positionAt(p.progress/100*t.eta),point=pointOnPath(t.route,fraction),next=pointOnPath(t.route,Math.min(1,fraction+.001));trucks.forEach((truck,i)=>{truck.visible=i<t.trucks;truck.position.set(point[0],.15,point[1]+(i-1)*.65);if(fraction<1)truck.rotation.y=-Math.atan2(next[1]-point[1],next[0]-point[0])})}
   if(kind==='wms'&&cart){const s=w.stateAt(p.progress/100*w.seconds),next=w.stateAt(Math.min(w.seconds,p.progress/100*w.seconds+.5));cart.position.set(s.position[0],.2,s.position[1]);if(Math.hypot(next.position[0]-s.position[0],next.position[1]-s.position[1])>.001)cart.rotation.y=-Math.atan2(next.position[1]-s.position[1],next.position[0]-s.position[0]);}
   controls.update();renderer.render(scene,camera);
  }frame=requestAnimationFrame(draw);setReady(true);
  const lost=(e:Event)=>{e.preventDefault();setError(true)};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{const mesh=o as THREE.Mesh;if(mesh.geometry)mesh.geometry.dispose();if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(mat=>mat.dispose())});textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();actions.current=null};
 },[props.kind]);
 return <div className="ops-viewport"><div className="ops-canvas" ref={host}/>{(!ready||error)&&<div className="ops-loading">{error?'3D 显示暂不可用，仍可用右侧对象列表与下方数据继续实验。':'正在构建业务场景…'}</div>}<div className="ops-scene-label"><span/>{props.kind.toUpperCase()} · SYNTHETIC WORLD</div><div className="ops-scene-hint"><Move3D size={14}/>拖动旋转 · 滚轮缩放 · 点击对象{compat?' · 兼容模式':''}</div><div className="ops-camera"><button aria-label="放大业务场景" onClick={()=>actions.current?.zoom(.85)}><Plus size={16}/></button><button aria-label="缩小业务场景" onClick={()=>actions.current?.zoom(1.15)}><Minus size={16}/></button><button aria-label="重置业务场景视角" onClick={()=>actions.current?.reset()}><RotateCcw size={16}/></button></div></div>;
}
