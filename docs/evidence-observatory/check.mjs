import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPuzzle,analyze,toggleLamp,cablePath,sourcePositions,canStand,lineOfSight,landmarks} from './dist/simulation.mjs';
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
const html=await readFile(new URL('./dist/index.html',import.meta.url),'utf8');
assert.ok(!html.includes('Your next move'));assert.ok(!html.includes('<table'));assert.ok(!html.includes('advancePhase'));assert.ok(!html.includes('<script type="module" src='));
assert.equal(html,await readFile(new URL('./play.html',import.meta.url),'utf8'));
assert.equal(html,await readFile(new URL('../interactives/echo-chamber.html',import.meta.url),'utf8'));
assert.ok(html.includes('name="robots" content="noindex,nofollow,noarchive"'));
console.log('Verified 8,192 circuit configurations: 16 valid choices per wiring; switching one lamp repeatedly cannot win. Checked cable origins, dark/missing/duplicate states, screen occlusion, walkable paths to every landmark, and standalone files.');
