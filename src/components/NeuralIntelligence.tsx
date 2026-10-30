"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Action = "new-chat" | "history";
type Props = { active?: boolean; listening?: boolean; showControls?: boolean; controlsOnly?: boolean; activeAction?: Action; onPrompt?: (prompt: string) => void; onAction?: (action: Action) => void };

export default function NeuralIntelligence({active=false,listening=false,showControls=true,controlsOnly=false,activeAction,onPrompt,onAction}:Props) {
 const host=useRef<HTMLDivElement>(null);
 const mode=useRef({active,listening});
 useEffect(()=>{mode.current={active,listening};},[active,listening]);
 useEffect(()=>{
  const root=host.current;if(!root||controlsOnly)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(root.clientWidth,root.clientHeight);renderer.setClearColor(0x171612,0);root.appendChild(renderer.domElement);
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(38,root.clientWidth/root.clientHeight,.1,100);camera.position.set(0,0,10.2);
  const world=new THREE.Group();scene.add(world);
  scene.add(new THREE.AmbientLight(0xd8cbb5,1.9));
  const key=new THREE.PointLight(0xd0b98e,28,22);key.position.set(-3,3,5);scene.add(key);
  const fill=new THREE.PointLight(0x8b8578,18,20);fill.position.set(4,-2,1);scene.add(fill);
  const brain=new THREE.Group();world.add(brain);
  const material=new THREE.MeshPhysicalMaterial({color:0xb7ad9a,emissive:0x3e382d,emissiveIntensity:.38,metalness:.28,roughness:.34,transparent:true,opacity:.96,clearcoat:.8});
  const seamMat=new THREE.MeshStandardMaterial({color:0x514b40,metalness:.35,roughness:.45});
  for(const side of [-1,1]){
   const geo=new THREE.IcosahedronGeometry(1.52,5),pos=geo.attributes.position as THREE.BufferAttribute,v=new THREE.Vector3();
   for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const fold=1+Math.sin(v.y*11+v.z*7)*.035+Math.sin(v.x*15-v.y*5)*.022+Math.cos(v.z*17+v.x*4)*.018;pos.setXYZ(i,v.x*fold*.78,v.y*fold,v.z*fold*.84);}
   geo.computeVertexNormals();const lobe=new THREE.Mesh(geo,material.clone());lobe.position.set(side*.55,0,0);lobe.scale.set(1,.98,1);brain.add(lobe);
   const wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:0xe0d4bf,transparent:true,opacity:.19}));wire.position.copy(lobe.position);brain.add(wire);
   const folds=new THREE.Group();for(let k=0;k<8;k++){const curve=new THREE.TorusGeometry(.72+k*.045,.012,5,90,.95*Math.PI);const line=new THREE.Mesh(curve,new THREE.MeshBasicMaterial({color:0x766d5d,transparent:true,opacity:.23}));line.position.set(side*.55,(k-3.5)*.16,.92-(k%3)*.12);line.rotation.y=side*.3;line.scale.set(.85,.58,.45);folds.add(line);}brain.add(folds);
  }
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.045,2.35,.07),seamMat);brain.add(seam);
  let seed=43;const rand=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  const nodes:THREE.Vector3[]=[];for(let i=0;i<210;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=3.1+rand()*4.3,q=Math.sqrt(1-z*z);nodes.push(new THREE.Vector3(Math.cos(a)*q*r,z*r*.58,Math.sin(a)*q*r*.38));}
  const edges:number[]=[];for(let i=0;i<nodes.length;i++){const near=nodes.map((p,j)=>({j,d:p.distanceTo(nodes[i])})).filter(x=>x.j!==i).sort((a,b)=>a.d-b.d).slice(0,3);for(const n of near)if(n.j>i)edges.push(...nodes[i].toArray(),...nodes[n.j].toArray());}
  const netGeo=new THREE.BufferGeometry();netGeo.setAttribute("position",new THREE.Float32BufferAttribute(edges,3));const net=new THREE.LineSegments(netGeo,new THREE.LineBasicMaterial({color:0x938875,transparent:true,opacity:.3}));world.add(net);
  const pointGeo=new THREE.BufferGeometry().setFromPoints(nodes);world.add(new THREE.Points(pointGeo,new THREE.PointsMaterial({color:0xd4c5a8,size:.045,transparent:true,opacity:.82})));
  const starPos=new Float32Array(620*3);for(let i=0;i<620;i++){starPos[i*3]=(rand()-.5)*23;starPos[i*3+1]=(rand()-.5)*14;starPos[i*3+2]=(rand()-.5)*10-2;}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute("position",new THREE.BufferAttribute(starPos,3));const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xc5bba8,size:.022,transparent:true,opacity:.58}));scene.add(stars);
  const orbitGroup=new THREE.Group();world.add(orbitGroup);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.3+i*.52,.009,6,150),new THREE.MeshBasicMaterial({color:i===1?0xc2a77c:0x9a9182,transparent:true,opacity:.38-i*.06}));ring.rotation.set(.65+i*.5,.4+i*.35,.3+i*.55);orbitGroup.add(ring);}
  const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(root);
  let raf=0,px=0,py=0,tx=0,ty=0,focus=0;const pointer=(e:PointerEvent)=>{const r=root.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*.48;ty=((e.clientY-r.top)/r.height-.5)*.34;};const click=()=>{focus=performance.now()+900;};root.addEventListener("pointermove",pointer);root.addEventListener("click",click);
  const clock=new THREE.Clock();const animate=()=>{raf=requestAnimationFrame(animate);const t=clock.getElapsedTime(),m=mode.current;px+=(tx-px)*.025;py+=(ty-py)*.025;brain.rotation.y=(reduced?0:Math.sin(t*.19)*.13)+px*.3;brain.rotation.x=(reduced?0:Math.sin(t*.13)*.055)+py*.2;brain.position.y=reduced?0:Math.sin(t*.55)*.09;brain.scale.setScalar((m.active?1.14:m.listening?1.08:performance.now()<focus?1.06:1.04)*(1+(m.active&&!reduced?Math.sin(t*3.5)*.014:0)));world.rotation.y=(reduced?0:Math.sin(t*.06)*.045)+px*.08;world.rotation.x=py*.07;net.rotation.y=reduced?0:-t*.009;orbitGroup.rotation.y=reduced?0:t*.025;stars.rotation.y=reduced?0:t*.003;key.intensity=m.active?33:m.listening?30:performance.now()<focus?31:26;renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();root.removeEventListener("pointermove",pointer);root.removeEventListener("click",click);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments||o instanceof THREE.Points){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[controlsOnly]);
 return <div ref={host} className={["ss-neural-universe","ss-neural-universe-concrete",active?"is-active":"",listening?"is-listening":""].join(" ")}>
  <div className="ss-neural-vignette"/><div className="ss-neural-readout"><span>STUDYSPACE / INTELLIGENCE</span><span>{listening?"LISTENING":active?"THINKING":"NEURAL NETWORK READY"}</span></div>
  {showControls&&<div className="ss-neural-hotspots" aria-label="Neural workspace controls">
   <button type="button" aria-pressed={activeAction==="new-chat"} className={["brain-action","action-new",activeAction==="new-chat"?"is-selected":""].join(" ")} onClick={()=>onAction?.("new-chat")}><b>＋</b><span>New chat</span></button>
   <button type="button" aria-pressed={activeAction==="history"} className={["brain-action","action-history",activeAction==="history"?"is-selected":""].join(" ")} onClick={()=>onAction?.("history")}><b>↶</b><span>History</span></button>
  </div>}
 </div>;
}
