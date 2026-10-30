"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
type Props = { active?: boolean; listening?: boolean; showControls?: boolean; onPrompt?: (prompt: string) => void };
export default function NeuralIntelligence({active=false,listening=false,showControls=false,onPrompt}:Props) {
 const host=useRef<HTMLDivElement>(null);
 const mode=useRef({active,listening}); mode.current={active,listening};
 useEffect(()=>{
  const root=host.current; if(!root)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer:THREE.WebGLRenderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"}); } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)); renderer.setSize(root.clientWidth,root.clientHeight); renderer.setClearColor(0x020817,0); root.appendChild(renderer.domElement);
  const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(42,root.clientWidth/root.clientHeight,.1,100); camera.position.z=12;
  const world=new THREE.Group(); scene.add(world);
  scene.add(new THREE.AmbientLight(0x78baff,1.8));
  const glow=new THREE.PointLight(0x38caff,22,20); glow.position.set(-3,3,5); scene.add(glow);
  const blue=new THREE.PointLight(0x565bff,13,18); blue.position.set(4,-2,1); scene.add(blue);
  const brain=new THREE.Group(); world.add(brain);
  for(const side of [-1,1]){
   const geo=new THREE.IcosahedronGeometry(1.42,5), pos=geo.attributes.position as THREE.BufferAttribute, v=new THREE.Vector3();
   for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);const ridge=1+Math.sin(v.y*14+v.z*5)*.045+Math.sin(v.x*17+v.y*8)*.026;pos.setXYZ(i,v.x*ridge*.78,v.y*ridge,v.z*ridge*.82);}
   geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({color:0x51b8f2,emissive:0x07518c,emissiveIntensity:1.35,metalness:.22,roughness:.26,transparent:true,opacity:.8,clearcoat:1}));
   mesh.position.x=side*.57; brain.add(mesh);
   const wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,24),new THREE.LineBasicMaterial({color:0x9ceaff,transparent:true,opacity:.28})); wire.position.copy(mesh.position); brain.add(wire);
  }
  const seam=new THREE.Mesh(new THREE.TorusGeometry(.025,.018,8,40),new THREE.MeshBasicMaterial({color:0xb8f4ff})); seam.scale.set(1,2.5,.5); brain.add(seam);
  let seed=19; const rand=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  const nodes:THREE.Vector3[]=[];
  for(let i=0;i<240;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=2.8+rand()*5,q=Math.sqrt(1-z*z);nodes.push(new THREE.Vector3(Math.cos(a)*q*r,z*r*.58,Math.sin(a)*q*r*.42));}
  const vertices:number[]=[], colors:number[]=[];
  for(let i=0;i<nodes.length;i++){const near=nodes.map((p,j)=>({j,d:p.distanceTo(nodes[i])})).filter(x=>x.j!==i).sort((a,b)=>a.d-b.d).slice(0,3);for(const n of near){if(n.j<i)continue;vertices.push(...nodes[i].toArray(),...nodes[n.j].toArray());colors.push(.12,.62,.98,.28,.35,1);}}
  const netGeo=new THREE.BufferGeometry();netGeo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));netGeo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  const net=new THREE.LineSegments(netGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.56,blending:THREE.AdditiveBlending,depthWrite:false}));world.add(net);
  const pointGeo=new THREE.BufferGeometry().setFromPoints(nodes), pointMat=new THREE.PointsMaterial({color:0x8be5ff,size:.052,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false});world.add(new THREE.Points(pointGeo,pointMat));
  const dustPos=new Float32Array(500*3);for(let i=0;i<500;i++){dustPos[i*3]=(rand()-.5)*25;dustPos[i*3+1]=(rand()-.5)*14;dustPos[i*3+2]=(rand()-.5)*12-2;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));const dustMat=new THREE.PointsMaterial({color:0x79aaff,size:.02,transparent:true,opacity:.48});scene.add(new THREE.Points(dustGeo,dustMat));
  const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(root);
  let raf=0,px=0,py=0,tx=0,ty=0,focus=0;
  const pointer=(e:PointerEvent)=>{const r=root.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*.65;ty=((e.clientY-r.top)/r.height-.5)*.45;};
  const click=()=>{focus=performance.now()+1200;};
  root.addEventListener("pointermove",pointer);root.addEventListener("click",click);
  let raf=0;const clock=new THREE.Clock();const animate=()=>{raf=requestAnimationFrame(animate);const t=clock.getElapsedTime(),m=mode.current;px+=(tx-px)*.035;py+=(ty-py)*.035;brain.rotation.y=(reduced?0:Math.sin(t*.2)*.18)+px*.45;brain.rotation.x=(reduced?0:Math.sin(t*.14)*.08)+py*.3;brain.position.y=reduced?0:Math.sin(t*.7)*.13;const focused=performance.now()<focus;brain.scale.setScalar((m.active?1.15:m.listening?1.08:focused?1.1:1)*(1+(m.active&&!reduced?Math.sin(t*4)*.025:0)));world.rotation.y=(reduced?0:Math.sin(t*.07)*.08)+px*.12;world.rotation.x=py*.1;net.rotation.y=reduced?0:-t*.014;glow.intensity=m.active?32:m.listening?27:focused?30:22;renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();root.removeEventListener("pointermove",pointer);root.removeEventListener("click",click);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments||o instanceof THREE.Points){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className={["ss-neural-universe",active?"is-active":"",listening?"is-listening":""].join(" ")} aria-hidden="true"><div className="ss-neural-vignette"/><div className="ss-neural-readout"><span>NEURAL CORE / 01</span><span>{listening?"INPUT STREAM":active?"SYNAPTIC PROCESSING":"NETWORK ONLINE"}</span></div><div className="ss-neural-crosshair">✳</div>{showControls&&<div className="ss-neural-hotspots"><button type="button" onClick={()=>onPrompt?.("Explain a difficult concept from my course in simple terms.")}>01 <span>Understand</span></button><button type="button" onClick={()=>onPrompt?.("Give me practice questions on the topic I am studying.")}>02 <span>Practice</span></button><button type="button" onClick={()=>onPrompt?.("Help me make a study plan for my upcoming work.")}>03 <span>Plan</span></button><button type="button" onClick={()=>onPrompt?.("Help me understand this homework problem step by step.")}>04 <span>Work through</span></button></div>}</div>;
}
