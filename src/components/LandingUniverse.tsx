"use client";
import {useEffect,useRef} from "react";
import * as THREE from "three";
export default function LandingUniverse(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(root.clientWidth,root.clientHeight);renderer.setClearColor(0x080b10,0);root.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,root.clientWidth/root.clientHeight,.1,100);camera.position.set(0,0,13);
  const world=new THREE.Group();scene.add(world);scene.add(new THREE.AmbientLight(0xffdfb2,1.15));
  const light=new THREE.PointLight(0xc6a878,35,22);light.position.set(-3,3,5);scene.add(light);
  const blue=new THREE.PointLight(0x718cb8,15,20);blue.position.set(4,-3,-2);scene.add(blue);
  const coreGeo=new THREE.IcosahedronGeometry(1.6,5),p=coreGeo.attributes.position as THREE.BufferAttribute,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const d=1+Math.sin(v.x*4+v.y*6)*.035+Math.cos(v.z*7+v.x*3)*.025;p.setXYZ(i,v.x*d,v.y*d,v.z*d);}coreGeo.computeVertexNormals();
  const core=new THREE.Mesh(coreGeo,new THREE.MeshPhysicalMaterial({color:0x9e8c6e,emissive:0x493b27,emissiveIntensity:.7,metalness:.42,roughness:.25,transparent:true,opacity:.88,clearcoat:1}));world.add(core);
  const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(1.72,2),new THREE.MeshBasicMaterial({color:0xe2c99a,wireframe:true,transparent:true,opacity:.12}));world.add(wire);
  const ringMat=new THREE.MeshBasicMaterial({color:0xc8ad7d,transparent:true,opacity:.36});
  const rings=[new THREE.Mesh(new THREE.TorusGeometry(3.2,.008,8,180),ringMat),new THREE.Mesh(new THREE.TorusGeometry(4.2,.006,8,180),ringMat.clone()),new THREE.Mesh(new THREE.TorusGeometry(5.1,.005,8,180),ringMat.clone())];rings.forEach((r,i)=>{r.rotation.x=.7+i*.38;r.rotation.y=i*.6;world.add(r);});
  const points:THREE.Vector3[]=[];let seed=31;const rand=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
  for(let i=0;i<175;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=2.4+rand()*3.3,q=Math.sqrt(1-z*z);points.push(new THREE.Vector3(Math.cos(a)*q*r,z*r*.72,Math.sin(a)*q*r*.42));}
  const lines:number[]=[];for(let i=0;i<points.length;i++){const near=points.map((pt,j)=>({j,d:pt.distanceTo(points[i])})).filter(n=>n.j!==i).sort((a,b)=>a.d-b.d).slice(0,2);for(const n of near)if(n.j>i)lines.push(...points[i].toArray(),...points[n.j].toArray());}
  const netGeo=new THREE.BufferGeometry();netGeo.setAttribute("position",new THREE.Float32BufferAttribute(lines,3));const net=new THREE.LineSegments(netGeo,new THREE.LineBasicMaterial({color:0xb9a47e,transparent:true,opacity:.32}));world.add(net);
  const nodeGeo=new THREE.BufferGeometry().setFromPoints(points),nodeMat=new THREE.PointsMaterial({color:0xe5cfaa,size:.045,transparent:true,opacity:.85});world.add(new THREE.Points(nodeGeo,nodeMat));
  const dustPos=new Float32Array(520*3);for(let i=0;i<520;i++){dustPos[i*3]=(rand()-.5)*24;dustPos[i*3+1]=(rand()-.5)*15;dustPos[i*3+2]=(rand()-.5)*12-2;}const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xb5a17d,size:.018,transparent:true,opacity:.55}));scene.add(dust);
  let px=0,py=0,targetX=0,targetY=0;const move=(e:PointerEvent)=>{const rect=root.getBoundingClientRect();targetX=((e.clientX-rect.left)/rect.width-.5)*.7;targetY=((e.clientY-rect.top)/rect.height-.5)*.5;};const leave=()=>{targetX=0;targetY=0;};root.addEventListener("pointermove",move);root.addEventListener("pointerleave",leave);
  const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const obs=new ResizeObserver(resize);obs.observe(root);
  let raf=0;const clock=new THREE.Clock();const animate=()=>{raf=requestAnimationFrame(animate);const t=clock.getElapsedTime();px+=(targetX-px)*.025;py+=(targetY-py)*.025;if(!reduced){world.rotation.y=t*.035+px;world.rotation.x=Math.sin(t*.14)*.045+py;core.rotation.y=-t*.07;wire.rotation.y=t*.035;wire.rotation.x=-t*.025;rings.forEach((r,i)=>{r.rotation.z=t*(i%2?-.025:.018);});dust.rotation.y=t*.006;}camera.position.x=px*1.2;camera.position.y=-py*.8;camera.lookAt(0,0,0);renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(raf);obs.disconnect();root.removeEventListener("pointermove",move);root.removeEventListener("pointerleave",leave);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.LineSegments){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="ss-landing-universe" aria-hidden="true"><div className="ss-landing-universe-fade"/></div>;
}
