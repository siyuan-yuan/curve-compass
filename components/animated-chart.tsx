"use client";
import {memo,useLayoutEffect,useRef} from 'react';
type Point=[number,number];
const parse=(d:string):Point[]=>Array.from(d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g),m=>[Number(m[1]),Number(m[2])]);
const path=(points:Point[])=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
function at(points:Point[],t:number):Point {const n=t*(points.length-1),i=Math.floor(n),a=points[i],b=points[Math.min(i+1,points.length-1)],f=n-i;return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}
// Include every source and destination vertex; final geometry is the original daily path.
export const AnimatedCurve=memo(function AnimatedCurve({d,color,width,area,bottom}:{d:string;color:string;width:number;area?:boolean;bottom:number}){
 const line=useRef<SVGPathElement>(null),shade=useRef<SVGPathElement>(null),dot=useRef<SVGCircleElement>(null),current=useRef<Point[]>([]),base=useRef(bottom),initial=useRef(d);
 useLayoutEffect(()=>{const target=parse(d),source=current.current;let frame=0;const media=matchMedia('(prefers-reduced-motion: reduce)');
  const draw=(points:Point[],floor:number)=>{current.current=points;base.current=floor;const value=path(points);line.current?.setAttribute('d',value);if(points.length){const first=points[0],last=points.at(-1)!;shade.current?.setAttribute('d',`${value} L${last[0]},${floor} L${first[0]},${floor} Z`);dot.current?.setAttribute('cx',String(last[0]));dot.current?.setAttribute('cy',String(last[1]));}};
  if(!source.length||media.matches){draw(target,bottom);return;}
  const stops=Array.from(new Set([...source.map((_,i)=>i/Math.max(1,source.length-1)),...target.map((_,i)=>i/Math.max(1,target.length-1))])).sort((a,b)=>a-b),from=stops.map(t=>at(source,t)),to=stops.map(t=>at(target,t)),floor=base.current,start=performance.now();
  const tick=(now:number)=>{const t=Math.min(1,(now-start)/550),ease=1-(1-t)**3;if(t===1){draw(target,bottom);return;}draw(from.map((a,i)=>[a[0]+(to[i][0]-a[0])*ease,a[1]+(to[i][1]-a[1])*ease]),floor+(bottom-floor)*ease);frame=requestAnimationFrame(tick);};
  draw(source,floor);frame=requestAnimationFrame(tick);const reduce=()=>{if(media.matches){cancelAnimationFrame(frame);draw(target,bottom);}};media.addEventListener('change',reduce);return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',reduce);};
 },[d,bottom]);
 return <>{area&&<path ref={shade} className="curve-area" fill="url(#fade)"/>}<path ref={line} className="curve-line" pathLength="1" d={initial.current} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/><circle ref={dot} r="3" fill={color} stroke="var(--surface)" strokeWidth="1.5"/></>;
});
export const AnimatedNumber=memo(function AnimatedNumber({value,prefix=''}:{value?:number;prefix?:string}){
 const ref=useRef<HTMLSpanElement>(null),current=useRef(0);useLayoutEffect(()=>{if(value===undefined)return;const el=ref.current;if(!el)return;const source=current.current,start=performance.now(),media=matchMedia('(prefers-reduced-motion: reduce)'),format=new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});let frame=0;const draw=(v:number)=>{current.current=v;el.textContent=prefix+format.format(v);};const tick=(now:number)=>{const t=Math.min(1,(now-start)/1100);draw(source+(value-source)*(1-(1-t)**3));if(t<1)frame=requestAnimationFrame(tick);};if(media.matches)draw(value);else frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[value,prefix]);return <span ref={ref} className="animated-number">{value===undefined?'—':prefix+'0.00'}</span>;
});
