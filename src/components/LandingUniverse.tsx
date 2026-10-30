"use client";
import {useEffect,useRef} from "react";
import * as THREE from "three";
export default function LandingUniverse(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});}catch{return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(root.clientWidth,root.clientHeight);renderer.setClearColor(0x0d0d0b,0);root.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,root.clientWidth/root.clientHeight,.1,100);camera.position.set(0,0,12.8);
  const world=new THREE.Group();world.position.set(2.55,.05,0);world.scale.setScalar(1.42);scene.add(world);
  scene.add(new THREE.AmbientLight(0xd8cbb5,1.55));
  const key=new THREE.PointLight(0xc7ad83,38,24);key.position.set(-3,3,5);scene.add(key);
  const fill=new THREE.PointLight(0xaaa294,17,22);fill.position.set(4,-3,-2);scene.add(fill);
  const brain=new THREE.Group();world.add(brain);
  const mat=new THREE.MeshPhysicalMaterial({color:0xb6ac99,emissive:0x373126,emissiveIntensity:.45,metalness:.32,roughness:.32,transparent:true,opacity:.96,clearcoat:.9});
  for(const side of [-1,1]){const geo=new THREE.IcosahedronGeometry(1.55,5),p=geo.attributes.position as THREE.BufferAttribute,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const f=1+Math.sin(v.y*12+v.z*6)*.04+Math.cos(v.x*15-v.y*4)*.025;p.setXYZ(i,v.x*f*.8,v.y*f,v.z*f*.84);}geo.computeVertexNormals();const lobe=new THREE.Mesh(geo,mat.clone());lobe.position.x=side*.57;brain.add(lobe);const wire=new THREE.LineSegments(new THREE.EdgesGeometry(geo,26),new THREE.LineBasicMaterial({color:0xe0d4c1,transparent:true,opacity:.22}));wire.position.copy(lobe.position);brain.add(wire);}
  const seam=new THREE.Mesh(new THREE.BoxGeometry(.045,2.45,.08),new THREE.MeshStandardMaterial({color:0x5d5548,metalness:.3,roughness:.5}));brain.add(seam);
  const orbit=new THREE.Group();world.add(orbit);for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.25+i*.56,.009,6,180),new THREE.MeshBasicMaterial({color:i===1?0xc7ad83:0x8e877b,transparent:true,opacity:.42-i*.055}));ring.rotation.set(.55+i*.42,.35+i*.52,.3+i*.6);orbit.add(ring);}
  const atom=new THREE.Group();world.add(atom);atom.position.set(.25,.1,1.3);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.012,6,120),new THREE.MeshBasicMaterial({color:0xc9b58f,transparent:true,opacity:.58}));ring.rotation.set(i*.9,(i+1)*.7,i*.55);atom.add(ring);}const nucleus=new THREE.Mesh(new THREE.SphereGeometry(.085,16,16),new THREE.MeshBasicMaterial({color:0xe0cba8}));atom.add(nucleus);
  const stars:THREE.Vector3[]=[];let seed=67;const rand=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};for(let i=0;i<420;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=2.6+rand()*5.2,q=Math.sqrt(1-z*z);stars.push(new THREE.Vector3(Math.cos(a)*q*r,z*r*.72,Math.sin(a)*q*r*.4));}const starGeo=new THREE.BufferGeometry().setFromPoints(stars);const starMat=new THREE.PointsMaterial({color:0xd1c4ac,size:.034,transparent:true,opacity:.72});world.add(new THREE.Points(starGeo,starMat));
  const floaters=new THREE.Group();world.add(floaters);for(let i=0;i<7;i++){const g=new THREE.Group();const r=new THREE.Mesh(new THREE.SphereGeometry(.035+(i%3)*.012,12,12),new THREE.MeshBasicMaterial({color:i%2?0xc7ad83:0xb9b1a4}));g.add(r);const ring=new THREE.Mesh(new THREE.TorusGeometry(.11+(i%2)*.05,.006,5,40),new THREE.MeshBasicMaterial({color:0x9e927d,transparent:true,opacity:.5}));ring.rotation.x=1.1+i*.3;g.add(ring);g.userData={a:i*Math.PI*2/7,r:3.1+(i%3)*.62,s:.35+(i%4)*.12};floaters.add(g);}
  const dustPos=new Float32Array(520*3);for(let i=0;i<520;i++){dustPos[i*3]=(rand()-.5)*24;dustPos[i*3+1]=(rand()-.5)*15;dustPos[i*3+2]=(rand()-.5)*12-2;}const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xbeb4a2,size:.019,transparent:true,opacity:.48}));scene.add(dust);
  let px=0,py=0,tx=0,ty=0;const move=(e:PointerEvent)=>{const rect=root.getBoundingClientRect();tx=((e.clientX-rect.left)/rect.width-.5)*.62;ty=((e.clientY-rect.top)/rect.height-.5)*.4;};const leave=()=>{tx=0;ty=0;};root.addEventListener("pointermove",move);root.addEventListener("pointerleave",leave);
  const resize=()=>{const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const obs=new ResizeObserver(resize);obs.observe(root);
  let raf=0;const clock=new THREE.Clock();const animate=()=>{raf=requestAnimationFrame(animate);const t=clock.getElapsedTime();px+=(tx-px)*.024;py+=(ty-py)*.024;if(!reduced){brain.rotation.y=t*.045+px*.22;brain.rotation.x=Math.sin(t*.16)*.045+py*.14;orbit.rotation.y=t*.018;orbit.rotation.z=Math.sin(t*.12)*.035;atom.rotation.y=-t*.16;atom.rotation.x=Math.sin(t*.25)*.12;floaters.children.forEach((g:any)=>{const d=g.userData;g.position.set(Math.cos(d.a+t*d.s*.12)*d.r,Math.sin(d.a+t*d.s*.12)*d.r*.56,Math.sin(t*d.s+d.a)*.65);g.rotation.y=t*d.s;});dust.rotation.y=t*.004;}world.rotation.y=px*.08;camera.position.x=px*.7;camera.position.y=-py*.5;camera.lookAt(0,0,0);renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(raf);obs.disconnect();root.removeEventListener("pointermove",move);root.removeEventListener("pointerleave",leave);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.LineSegments){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div ref={host} className="ss-landing-universe ss-landing-universe-forefront" aria-hidden="true"><div className="ss-landing-universe-fade"/></div>;
}
