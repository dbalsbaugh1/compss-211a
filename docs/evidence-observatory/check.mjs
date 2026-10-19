import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPuzzle,analyze,toggleLamp,cablePath,sourcePositions,canStand,lineOfSight,landmarks,mechanisms,pickMechanism,viewRay,contactPosition} from './dist/simulation.mjs';
const wirings=new Set();
for(let seed=1;seed<=32;seed++){
  const initial=createPuzzle(seed);wirings.add(initial.wiring.join(''));
  assert.equal(analyze(initial).balanced,false);
  assert.deepEqual(analyze(initial).counts,[2,2,2,2]);
  let solutions=0;
  for(let mask=0;mask<256;mask++){
    const puzzle={...initial,enabled:initial.enabled.map((_,i)=>Boolean(mask&(1<<i)))},result=analyze(puzzle);
    if(result.balanced){solutions++;assert.equal(result.active,4);assert.equal(new Set(puzzle.wiring.filter((_,i)=>puzzle.enabled[i])).size,4);}
  }
  assert.equal(solutions,16,'Each circuit must allow choices, not one scripted answer.');
  for(let lamp=0;lamp<8;lamp++){
    const once=toggleLamp(initial,lamp),twice=toggleLamp(once,lamp);
    assert.equal(analyze(once).balanced,false);assert.deepEqual(twice,initial);assert.equal(initial.enabled[lamp],true);
    const end=cablePath(initial,lamp).at(-1),well=sourcePositions[initial.wiring[lamp]];assert.equal(end[0],well[0]);assert.equal(end[2],well[2]);
  }
  const dark={...initial,enabled:Array(8).fill(false)};assert.equal(analyze(dark).balanced,false);assert.equal(analyze(dark).missing,4);
  for(const bank of [0,4]){const half={...initial,enabled:initial.enabled.map((_,i)=>i>=bank&&i<bank+4)};assert.equal(analyze(half).balanced,false);}
}
assert.ok(wirings.size>20);
assert.equal(canStand(0,-3.8),false);assert.equal(canStand(2.75,-7.6),false);assert.equal(canStand(5.6,-7.6),true);assert.equal(canStand(0,-7.6),true);
assert.equal(lineOfSight([-2.75,1.7,-6.5],[-2.75,.55,-9.3]),false);assert.equal(lineOfSight([-2.75,1.7,-8.4],[-2.75,.55,-9.3]),true);
// Every clue and control must be reachable on foot, around the real collision map.
const step=.2,queue=[[0,37]],seen=new Set(['0,37']);
for(let at=0;at<queue.length;at++){
  const [x,z]=queue[at];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,nz=z+dz,key=nx+','+nz;
    if(!seen.has(key)&&canStand(nx*step,nz*step)){seen.add(key);queue.push([nx,nz]);}
  }
}
for(const place of landmarks()){
  const p=place.stand;
  assert.ok(seen.has(Math.round(p[0]/step)+','+Math.round(p[2]/step)),place.name+' must be reachable');
  assert.ok(lineOfSight(p,place.position),place.name+' must be visible from its accessible viewpoint');
}
const controls=mechanisms(),direction=(eye,target)=>{const d=target.map((v,i)=>v-eye[i]),length=Math.hypot(...d);return d.map(v=>v/length);};
for(const control of controls){
  const station=landmarks().find(p=>p.type===control.type&&p.id===control.id),[x,y,z]=station.stand,camera={x,y,z,yaw:0,pitch:0};
  assert.equal(pickMechanism(camera,direction(station.stand,control.position),controls),control,station.name+' must expose its '+control.kind+' independently');
  const ray=direction(station.stand,control.position);
  const looking={...camera,yaw:Math.atan2(ray[0],-ray[2]),pitch:Math.asin(ray[1])};
  assert.equal(pickMechanism(looking,viewRay(looking),controls),control,'Centered first-person aiming must hit the same mechanism');
  if(control.kind==='contact')assert.deepEqual(cablePath(createPuzzle(7),control.id)[0],contactPosition(control.id),'A traced route must begin at the clicked contact');
}
const first=controls[0],far={x:0,y:1.7,z:7.5,yaw:0,pitch:0};
assert.equal(pickMechanism(far,direction([far.x,far.y,far.z],first.position),controls),null,'Distant controls must require approach');
assert.equal(pickMechanism({x:-5,y:1.7,z:4.3},direction([-5,1.7,4.3],first.position),controls),null,'The lever cannot be used through the back of its pedestal');
const hiddenWell=controls.find(c=>c.type==='source'&&c.id===1),behindScreen={x:-1.4,y:1.7,z:-6.5};
assert.equal(pickMechanism(behindScreen,direction([-1.4,1.7,-6.5],hiddenWell.position),controls),null,'Screens must block clicking wells');
const front={x:-2.7,y:1.7,z:5.3,yaw:0,pitch:0};
assert.equal(pickMechanism(front,direction([-2.7,1.7,5.3],[-3.9,1.5,4.3]),controls),null,'Clicking the lamp globe must not operate either mechanism');
// Clicking away from the center uses the same perspective as the rendered view.
const offsetCamera={...front,yaw:Math.PI/9,pitch:-.2},aim=direction([front.x,front.y,front.z],first.position),aspect=16/9;
const sy=Math.sin(offsetCamera.yaw),cy=Math.cos(offsetCamera.yaw),sp=Math.sin(offsetCamera.pitch),cp=Math.cos(offsetCamera.pitch);
const forward=aim[0]*sy*cp+aim[1]*sp-aim[2]*cy*cp,right=aim[0]*cy+aim[2]*sy,up=-aim[0]*sy*sp+aim[1]*cp+aim[2]*cy*sp;
assert.equal(pickMechanism(offsetCamera,viewRay(offsetCamera,right/(forward*Math.tan(Math.PI/6)*aspect),up/(forward*Math.tan(Math.PI/6)),aspect),controls),first,'Screen-space clicks must agree with the 3D camera');
const html=await readFile(new URL('./dist/index.html',import.meta.url),'utf8');
assert.ok(!html.includes('Your next move'));assert.ok(!html.includes('<table'));assert.ok(!html.includes('advancePhase'));assert.ok(!html.includes('<script type="module" src='));
assert.equal(html,await readFile(new URL('./play.html',import.meta.url),'utf8'));
assert.equal(html,await readFile(new URL('../interactives/echo-chamber.html',import.meta.url),'utf8'));
assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'));
console.log('Verified 8,192 circuit configurations, every physical click target, separate lever/contact aiming, approach distance, blocked/back-facing targets, perspective picking, walkable routes, and standalone files.');
