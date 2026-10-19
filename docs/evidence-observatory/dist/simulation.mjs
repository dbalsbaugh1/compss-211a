// The cables, pulses, receiver, and win condition all use this same circuit.
export const lampPositions=[[-3.9,1.5,4.3],[-3.9,1.5,.7],[-3.9,1.5,-3],[-3.9,1.5,-6.5],[3.9,1.5,4.3],[3.9,1.5,.7],[3.9,1.5,-3],[3.9,1.5,-6.5]];
export const lampNames=['West entrance lamp','West middle lamp','West rear lamp','West alcove lamp','East entrance lamp','East middle lamp','East rear lamp','East alcove lamp'];
export const sourcePositions=[[-4.2,.55,-9.3],[-1.4,.55,-9.3],[1.4,.55,-9.3],[4.2,.55,-9.3]];
export const sourceNames=['Hollow circle','Diamond','Cross','Three bars'];
export function createPuzzle(seed=1){
  let n=seed>>>0;const rand=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  let wiring;
  do{wiring=[0,0,1,1,2,2,3,3];for(let i=7;i>0;i--){const j=Math.floor(rand()*(i+1));[wiring[i],wiring[j]]=[wiring[j],wiring[i]];}}
  while(new Set(wiring.slice(0,4)).size!==3||new Set(wiring.slice(4)).size!==3);
  return {wiring,enabled:Array(8).fill(true),seed};
}
export function analyze(puzzle){
  const counts=Array(4).fill(0);puzzle.wiring.forEach((source,i)=>{if(puzzle.enabled[i])counts[source]++;});
  return {counts,repeated:counts.filter(v=>v>1).length,missing:counts.filter(v=>v===0).length,active:puzzle.enabled.filter(Boolean).length,balanced:counts.every(v=>v===1)};
}
export function toggleLamp(puzzle,id){if(!Number.isInteger(id)||id<0||id>7)return puzzle;return {...puzzle,enabled:puzzle.enabled.map((on,i)=>i===id?!on:on)};}
export function receiverPosition(source){const a=source*Math.PI/2+Math.PI/4;return [Math.cos(a)*1.05,2.45+Math.sin(a)*1.05,-3.8];}
export function shutterPosition(id){const p=lampPositions[id];return [p[0]-Math.sign(p[0])*.38,1.06,p[2]];}
export function contactPosition(id){const p=lampPositions[id];return [p[0],.48,p[2]+.29];}
export function cablePath(puzzle,id){const p=lampPositions[id],well=sourcePositions[puzzle.wiring[id]],side=Math.sign(p[0]),lane=side*(5.2+(id%4)*.08);return [contactPosition(id),[p[0],.025,p[2]+.42],[lane,.025,p[2]+.42],[lane,.025,-8.7],[well[0],.025,-8.7],[well[0],.025,well[2]]];}
// The same positions drive rendered mechanisms and click targets.
export function mechanisms(){return [
  ...lampPositions.flatMap((p,id)=>[
    {type:'lamp',kind:'shutter',id,name:'Shutter lever',position:shutterPosition(id),radius:.27,normal:[-Math.sign(p[0]),0,0]},
    {type:'lamp',kind:'contact',id,name:'Cable contact',position:contactPosition(id),radius:.22,normal:[0,0,1]}
  ]),
  ...sourcePositions.map((p,id)=>({type:'source',kind:'well',id,name:'Well plunger',position:p,radius:.35,normal:[0,1,0]})),
  {type:'receiver',kind:'receiver',id:0,name:'Listening plate',position:[0,1.05,-2.55],radius:.34,normal:[0,0,1]},
  {type:'door',kind:'door',id:0,name:'Door seal',position:[0,1.5,-11.5],radius:.7,normal:[0,0,1]}
];}
export function viewRay(camera,nx=0,ny=0,aspect=1){
  const sy=Math.sin(camera.yaw),cy=Math.cos(camera.yaw),sp=Math.sin(camera.pitch),cp=Math.cos(camera.pitch),f=Math.tan(Math.PI/6);
  const dir=[sy*cp+nx*f*aspect*cy-ny*f*sy*sp,sp+ny*f*cp,-cy*cp+nx*f*aspect*sy+ny*f*cy*sp],length=Math.hypot(...dir);
  return dir.map(v=>v/length);
}
export function pickMechanism(camera,dir,targets=mechanisms()){
  const eye=[camera.x,camera.y,camera.z];let best=null,nearest=Infinity;
  for(const target of targets){
    const offset=target.position.map((v,i)=>v-eye[i]),distance=Math.hypot(...offset);
    if(distance>2.8||!lineOfSight(eye,target.position)||offset.reduce((sum,v,i)=>sum+v*target.normal[i],0)>=0)continue;
    const along=offset.reduce((sum,v,i)=>sum+v*dir[i],0),miss=distance*distance-along*along;
    if(along<=0||miss>target.radius*target.radius)continue;
    const hit=along-Math.sqrt(Math.max(0,target.radius*target.radius-miss));
    if(hit<nearest){nearest=hit;best=target;}
  }
  return best;
}
export function canStand(x,z){
  if(x< -6.3||x>6.3||z< -11.2||z>8.2)return false;
  if(Math.hypot(x,z+3.8)<1.65)return false;
  if(z> -8.03&&z< -7.17&&(x> -5.12&&x< -.38||x>.38&&x<5.12))return false;
  if(lampPositions.some(p=>Math.hypot(x-p[0],z-p[2])<.48))return false;
  if(sourcePositions.some(p=>Math.hypot(x-p[0],z-p[2])<.48))return false;
  return true;
}
export function landmarks(){return [
  ...lampPositions.map((p,id)=>({type:'lamp',id,name:lampNames[id],position:p,stand:[p[0]-Math.sign(p[0])*1.2,1.7,p[2]+1]})),
  ...sourcePositions.map((p,id)=>({type:'source',id,name:sourceNames[id]+' well',position:p,stand:[p[0],1.7,-8.4]})),
  {type:'receiver',id:0,name:'Central receiver',position:[0,1.5,-3.8],stand:[0,1.7,-.9]},
  {type:'door',id:0,name:'Far doorway',position:[0,1.5,-11.5],stand:[0,1.7,-10.2]}
];}
export function lineOfSight(from,to){
  // The source niches cannot be inspected through their opaque screens.
  for(const cx of [-2.75,2.75]){
    const low=[cx-2.2,0,-7.775],high=[cx+2.2,3,-7.425];let enter=0,exit=1;
    for(let axis=0;axis<3;axis++){
      const delta=to[axis]-from[axis];
      if(Math.abs(delta)<1e-9){if(from[axis]<low[axis]||from[axis]>high[axis]){enter=2;break;}}
      else{let a=(low[axis]-from[axis])/delta,b=(high[axis]-from[axis])/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);exit=Math.min(exit,b);}
    }
    if(enter<=exit&&exit>=0&&enter<=1)return false;
  }
  return true;
}
