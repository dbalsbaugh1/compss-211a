import {Observatory} from './world.mjs';
import {ChamberSound} from './sound.mjs';
import {fieldNotes} from './story.mjs';
import {createPuzzle,analyze,toggleLamp,landmarks,lampNames,sourceNames,canStand,mechanisms,pickMechanism,viewRay} from './simulation.mjs';
const $=s=>document.querySelector(s),keys=new Set(),places=landmarks(),targets=mechanisms(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const audio=new ChamberSound();
let audioLast=0,stepDistance=0,captureMouse=true,captureUnavailable=false,pointer=null,pointerDown=null,suppressClick=false;
let world,puzzle,playing=false,finished=false,guided=false,still=reduced.matches,textMode=false,drag=null,last=0,elapsed=0,captionUntil=0,focus=null,placeIndex=12,traced=null,pulsed=null,hintCount=0,ending=false,knownSources=new Set();
try{world=new Observatory($('#world'));}catch{textMode=true;document.body.classList.add('text-mode');$('#text-mode').checked=true;$('#text-mode').disabled=true;$('#text-mode').closest('label').querySelector('small').textContent='3D is unavailable here. Explore the same circuit in text.';}
$('#still').checked=still;
$('#place').innerHTML=places.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');
function clearInput(){keys.clear();drag=null;pointerDown=null;}
function releaseMouse(){if(document.pointerLockElement===($('#world')))document.exitPointerLock();}
function canCaptureMouse(){return captureMouse&&!captureUnavailable&&matchMedia('(pointer:fine)').matches&&typeof $('#world').requestPointerLock==='function';}
function mouseUI(){
  const locked=document.pointerLockElement===$('#world');document.body.classList.toggle('mouse-captured',locked);
  $('#look-status').textContent=locked?'Click a mechanism · Esc releases the cursor':'Click a mechanism · Drag to look';
}
function captureFailure(error){
  if(error?.message)console.warn('Mouse capture:',error.message);
  captureUnavailable=error?.name==='SecurityError'||error?.name==='NotSupportedError';
  clearInput();mouseUI();
}
function requestMouse(){
  if(!playing||guided||textMode||$('#settings').open||!canCaptureMouse()||document.pointerLockElement===$('#world'))return;
  try{const request=$('#world').requestPointerLock();if(request&&typeof request.catch==='function')request.catch(captureFailure);}catch{captureFailure();}
}
function rotateLook(x,y){if(!world)return;world.camera.yaw+=x*.0028;world.camera.pitch=Math.max(-1,Math.min(.8,world.camera.pitch-y*.0025));}
function aimUI(){
  const free=pointer&&document.pointerLockElement!==$('#world');document.body.classList.toggle('free-pointer',Boolean(free));
}
document.addEventListener('pointerlockchange',()=>{clearInput();pointer=null;suppressClick=true;mouseUI();aimUI();});
document.addEventListener('pointerlockerror',captureFailure);
function say(text,duration=8,entryGoal=false){$('#whisper').classList.toggle('entry-goal',entryGoal);$('#announcer').textContent=text;$('#whisper').textContent=text;captionUntil=elapsed+duration;$('#whisper').classList.add('visible');}
function pairNames(source){return puzzle.wiring.flatMap((s,i)=>s===source?[lampNames[i]]:[]).join(' and ');}
function describe(){
  if(!focus)return;
  $('#scene-title').textContent=focus.name;
  let description='',clue='';
  if(focus.type==='lamp'){
    const source=puzzle.wiring[focus.id];description=puzzle.enabled[focus.id]?'Its shutter is open. A brass lever sits beside the light. A separate blue contact joins a cable at the foot of the pedestal.':'Its shutter is closed. The brass lever can reopen it. The blue cable contact remains lit below.';
    if(traced===focus.id)clue=`Following this cable leads behind the rear screens to the ${sourceNames[source].toLowerCase()} well.`;
    if(knownSources.has(source))clue=`The ${sourceNames[source].toLowerCase()} well powers this lamp. Its pulse also reaches the ${pairNames(source)}.`;
  }else if(focus.type==='source'){
    description=`Behind the screens, a well bears a ${sourceNames[focus.id].toLowerCase()} marking. Two cables leave the well.`;
    if(knownSources.has(focus.id))clue=`Its pulse reaches the ${pairNames(focus.id)}. Their markings and rhythms match.`;
  }else if(focus.type==='receiver'){
    description='Four patterned places sit inside the lens. Some patterns arrive as overlapping, trembling rings. A single contribution makes a clean ring; an absent pattern leaves a gap.';
    if(analyze(puzzle).balanced)clue='All four places carry a single, steady ring. The far doorway is open.';
  }else description=analyze(puzzle).balanced?'The beam is steady. The doorway stands open.':'The doorway is sealed. Its four markings repeat the shapes inside the receiver.';
  $('#scene-text').textContent=description;$('#clue-text').textContent=clue;
}
function sync(){
  const result=analyze(puzzle);audio.update(result.counts,world?.camera);
  $('#room-state').textContent=result.balanced?'The doorway is open':'The doorway is sealed';
  if(world){world.puzzle=puzzle;world.traceLamp=traced;world.pulseSource=pulsed;world.focus=focus?.kind?focus:null;}
  $('#guided-navigation').hidden=!(guided||textMode);$('#scene-description').hidden=!textMode;
  const label=!focus?'Approach a mechanism':focus.type==='lamp'?(puzzle.enabled[focus.id]?'Lower shutter lever':'Raise shutter lever'):focus.type==='source'?'Pulse the well':focus.type==='receiver'?'Listen to the beam':result.balanced?'Step through':'Inspect doorway';
  $('#action-label').textContent=label;$('#interact').disabled=!focus;
  $('#trace').hidden=focus?.type!=='lamp';
  document.body.classList.toggle('has-target',Boolean(focus?.kind));
  $('#world').classList.toggle('mechanism-hover',Boolean(focus?.kind));
  if(textMode)describe();
}
function visit(index){
  placeIndex=(Number(index)+places.length)%places.length;focus=places[placeIndex];$('#place').value=String(placeIndex);
  if(world){const [x,y,z]=focus.stand,delta=focus.position.map((v,i)=>v-[x,y,z][i]);world.camera={x,y,z,yaw:Math.atan2(delta[0],-delta[2]),pitch:Math.atan2(delta[1],Math.hypot(delta[0],delta[2]))};}
  clearInput();sync();if(textMode)$('#announcer').textContent=focus.name+'. '+$('#scene-text').textContent;
}
function start(){
  audio.start().then(()=>{if(puzzle)audio.update(analyze(puzzle).counts,world?.camera);}).catch(()=>{audio.setEnabled(false);$('#sound-button').textContent='Sound unavailable';$('#sound-button').disabled=true;});
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];puzzle=createPuzzle(seed);playing=true;finished=false;ending=false;focus=null;traced=null;pulsed=null;hintCount=0;knownSources=new Set();clearInput();
  $('#intro').hidden=true;$('#ending').hidden=true;$('#hud').hidden=false;$('#restart').hidden=false;$('#hint-text').textContent='';
  if(world){world.intro=false;world.reset(puzzle);}if(guided||textMode)visit(12);else sync();
  say('Open the far door by making all four patterns in the central ring steady.',14,true);mouseUI();requestMouse();
}
function act(){
  if(!playing||ending||$('#settings').open||!focus)return;
  clearInput();
  if(world)world.press={kind:focus.kind||(focus.type==='lamp'?'shutter':focus.type==='source'?'well':focus.type),id:focus.id,at:elapsed};
  if(focus.type==='lamp'&&focus.kind==='contact'){trace();return;}
  if(focus.type==='lamp'){
    const before=analyze(puzzle);puzzle=toggleLamp(puzzle,focus.id);audio.switch(puzzle.enabled[focus.id]);const after=analyze(puzzle);
    if(!before.balanced&&after.balanced){audio.unlock();say('The beam settles. The far doorway opens.');}
    else if(before.balanced&&!after.balanced)say('The beam changes again. The doorway closes.');
    else say(puzzle.enabled[focus.id]?'A beam joins the lens.':'A beam fades. The lens responds.');
  }else if(focus.type==='source'){
    pulsed=focus.id;audio.pulse(focus.id);traced=null;knownSources.add(focus.id);say('One well. Two lamps answer with the same pulse.');
  }else if(focus.type==='receiver'){
    const result=analyze(puzzle);say(result.balanced?'Four clear patterns. A steady beam.':result.active===0?'Silence. Every pattern is missing.':result.repeated&&result.missing?'Some patterns repeat. Others are missing.':result.repeated?'A pattern is arriving more than once.':'There are gaps where a pattern should be.');
  }else if(analyze(puzzle).balanced){end();return;}else say('Four empty outlines in the door. The receiver hums behind you.');
  sync();
}
function trace(){if(!playing||$('#settings').open||focus?.type!=='lamp')return;if(world)world.press={kind:'contact',id:focus.id,at:elapsed};audio.tone(620,.5,.045);traced=focus.id;pulsed=null;say('The contact sends a pulse down its cable.');sync();}
function end(){if(ending)return;releaseMouse();ending=true;playing=false;finished=true;clearInput();$('#transition').classList.add('active');setTimeout(()=>{$('#hud').hidden=true;$('#ending').hidden=false;if(world)world.intro=true;$('#ending').focus({preventScroll:true});$('#transition').classList.remove('active');window.scrollTo(0,0);},still?0:330);}
function pick(at=pointer){
  if(!world)return null;
  const rect=$('#world').getBoundingClientRect(),locked=document.pointerLockElement===$('#world');
  const nx=at&&!locked?(at.x-rect.left)/rect.width*2-1:0,ny=at&&!locked?1-(at.y-rect.top)/rect.height*2:0;
  return pickMechanism(world.camera,viewRay(world.camera,nx,ny,rect.width/rect.height),targets);
}
function useMechanism(target){if(!target)return;focus=target;act();}
$('#start').addEventListener('click',start);$('#again').addEventListener('click',start);$('#restart').addEventListener('click',start);$('#interact').addEventListener('click',()=>useMechanism(focus?.type==='lamp'?targets.find(t=>t.type==='lamp'&&t.kind==='shutter'&&t.id===focus.id):focus));$('#trace').addEventListener('click',trace);
$('.wordmark').addEventListener('click',e=>e.preventDefault());
$('#place').addEventListener('change',e=>visit(e.target.value));$('#previous-place').addEventListener('click',()=>visit(placeIndex-1));$('#next-place').addEventListener('click',()=>visit(placeIndex+1));
function setSound(enabled){audio.setEnabled(enabled);$('#sound-enabled').checked=enabled;$('#sound-button').textContent=enabled?'Sound on':'Sound off';$('#sound-button').setAttribute('aria-pressed',String(enabled));if(enabled&&playing)audio.start().then(()=>audio.update(analyze(puzzle).counts,world?.camera)).catch(()=>{});}
$('#sound-button').addEventListener('click',()=>setSound(!audio.enabled));$('#sound-enabled').addEventListener('change',e=>setSound(e.target.checked));
$('#settings-button').addEventListener('click',()=>{releaseMouse();clearInput();$('#settings').showModal();});$('#settings-done').addEventListener('click',()=>$('#settings').close());
$('#guided').addEventListener('change',e=>{guided=e.target.checked;if(guided)releaseMouse();document.body.classList.toggle('guided',guided);clearInput();if(playing&&(guided||textMode))visit(placeIndex);else if(puzzle)sync();});
$('#still').addEventListener('change',e=>{still=e.target.checked;document.body.classList.toggle('still',still);if(world)world.still=still;});
$('#text-mode').addEventListener('change',e=>{textMode=e.target.checked;if(textMode)releaseMouse();document.body.classList.toggle('text-mode',textMode);if(world)world.hidden=textMode;clearInput();if(playing&&(guided||textMode))visit(placeIndex);else if(puzzle)sync();});
$('#capture-mouse').addEventListener('change',e=>{captureMouse=e.target.checked;captureUnavailable=false;if(!captureMouse)releaseMouse();mouseUI();});
$('#hint').addEventListener('click',()=>{$('#hint-text').textContent=["Try changing one shutter, then inspect the receiver. What changes?","There's a route behind the screens. The marks on the backs of the lamps may help.","The receiver needs each source once. Different lamps can carry the same source. Follow their cables before choosing."][Math.min(hintCount++,2)];});
$('#download').addEventListener('click',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([fieldNotes],{type:'text/plain;charset=utf-8'}));a.href=url;a.download='echo-chamber-field-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const controlKeys=['w','a','s','d','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','f'];
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'||e.key==='Tab'){releaseMouse();clearInput();}
  if(!playing||$('#settings').open||ending||['INPUT','SELECT','A'].includes(e.target.tagName))return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k==='e'||e.code==='Space'){if(e.code==='Space'&&e.target.tagName==='BUTTON')return;e.preventDefault();if(!e.repeat)act();return;}
  if(controlKeys.includes(k)&&!guided&&!textMode){e.preventDefault();keys.add(k);}
});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{clearInput();releaseMouse();});document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden)releaseMouse();last=0;if(audio.ready){if(document.hidden)audio.context.suspend();else if(audio.enabled&&playing)audio.context.resume().catch(()=>{});}});
for(const b of document.querySelectorAll('[data-control]')){b.addEventListener('pointerdown',e=>{if(!playing||$('#settings').open||guided||textMode)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.control);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.control));}
$('#world').addEventListener('pointerdown',e=>{
  if(!playing||$('#settings').open||textMode||e.button!==0)return;
  suppressClick=false;
  if(document.pointerLockElement===$('#world'))return;
  pointer={x:e.clientX,y:e.clientY};pointerDown={...pointer};aimUI();
  if(!guided){drag={...pointer};$('#world').setPointerCapture(e.pointerId);}
});
$('#world').addEventListener('pointermove',e=>{
  if(document.pointerLockElement===$('#world'))return;
  pointer={x:e.clientX,y:e.clientY};aimUI();
  if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>6)suppressClick=true;
  if(!drag||!world||guided)return;rotateLook(e.clientX-drag.x,e.clientY-drag.y);drag={...pointer};
});
$('#world').addEventListener('click',e=>{
  if(!playing||ending||$('#settings').open||textMode||suppressClick)return;
  const at={x:e.clientX,y:e.clientY},target=pick(at);
  if(target)useMechanism(target);else if(!guided)requestMouse();
});
$('#world').addEventListener('pointerleave',()=>{pointer=null;aimUI();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('#world')&&playing&&!$('#settings').open&&!guided&&!textMode)rotateLook(e.movementX,e.movementY);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#world').addEventListener(event,()=>{drag=null;pointerDown=null;if(event==='pointercancel')suppressClick=true;});
window.addEventListener('resize',()=>world?.resize());
function frame(now){
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt;$('#whisper').classList.toggle('visible',elapsed<captionUntil);
  if(world){
    world.still=still;
    if(playing&&!$('#settings').open&&!guided&&!textMode){
      const c=world.camera;c.pitch=Math.max(-1,Math.min(.8,c.pitch+((keys.has('r')?1:0)-(keys.has('f')?1:0))*dt));c.yaw+=((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*1.4;
      let forward=(keys.has('w')||keys.has('ArrowUp')?1:0)-(keys.has('s')||keys.has('ArrowDown')?1:0),side=(keys.has('d')?1:0)-(keys.has('a')?1:0);const length=Math.hypot(forward,side)||1;forward/=length;side/=length;
      const nx=c.x+(Math.sin(c.yaw)*forward+Math.cos(c.yaw)*side)*dt*3.3,nz=c.z+(-Math.cos(c.yaw)*forward+Math.sin(c.yaw)*side)*dt*3.3;
      const oldX=c.x,oldZ=c.z;if(canStand(nx,c.z))c.x=nx;if(canStand(c.x,nz))c.z=nz;
      const moved=Math.hypot(c.x-oldX,c.z-oldZ);stepDistance+=moved;if(stepDistance>.95){audio.footstep();stepDistance=0;}world.walkBob=!still&&moved>.001?Math.sin(elapsed*8)*.018:0;
      const selected=pick();if(selected!==focus){focus=selected;sync();}
      if(analyze(puzzle).balanced&&c.z< -10.8&&Math.abs(c.x)<1.3)end();
    }
    if(playing&&puzzle&&elapsed-audioLast>.15){audio.update(analyze(puzzle).counts,world.camera);audioLast=elapsed;}
    world.render(elapsed);
  }
  requestAnimationFrame(frame);
}
document.body.classList.toggle('still',still);mouseUI();requestAnimationFrame(frame);
