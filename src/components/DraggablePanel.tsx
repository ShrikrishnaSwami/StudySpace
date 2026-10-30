"use client";
import {useRef,useState,type PointerEvent, type ReactNode} from "react";
import {X,Grip} from "lucide-react";
type Props={title:string;children:ReactNode;onClose:()=>void;className?:string};
export default function DraggablePanel({title,children,onClose,className=""}:Props){
 const [offset,setOffset]=useState({x:0,y:0});const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 function start(e:PointerEvent<HTMLDivElement>){if((e.target as HTMLElement).closest("button"))return;drag.current={x:e.clientX,y:e.clientY,left:offset.x,top:offset.y};e.currentTarget.setPointerCapture(e.pointerId);}
 function move(e:PointerEvent<HTMLDivElement>){if(!drag.current)return;setOffset({x:drag.current.left+e.clientX-drag.current.x,y:drag.current.top+e.clientY-drag.current.y});}
 function stop(){drag.current=null;}
 return <section className={`ss-draggable-panel ${className}`} style={{transform:`translate3d(${offset.x}px,${offset.y}px,0)`}}>
  <div className="ss-draggable-panel-head" onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}><span><Grip size={13}/>{title}</span><button type="button" onClick={onClose} aria-label={`Close ${title}`}><X size={15}/></button></div>
  <div className="ss-draggable-panel-body">{children}</div>
 </section>;
}
