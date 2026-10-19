import {Observatory} from './world.mjs';
import {ChamberSound} from './sound.mjs';
import {fieldNotes} from './story.mjs';
import {createPuzzle,analyze,toggleLamp,landmarks,lampNames,sourceNames,canStand,lineOfSight} from './simulation.mjs';
const $=s=>document.querySelector(s),keys=new Set(),places=landmarks(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const audio=new ChamberSound();
let audioLast=0,stepDistance=0,captureMouse=true,captureUnavailable=false;
let world,puzzle,playing=false,finished=false,guided=false,still=reduced.matches,textMode=false,drag=null,last=0,elapsed=0,captionUntil=0,focus=null,placeIndex=12,traced=null,pulsed=null,hintCount=0,ending=false,knownSources=new Set();
try{world=new Observatory($('#world'));}catch{textMode=true;document.body.classList.add('text-mode');$('#text-mode').checked=true;$('#text-mode').disabled=true;$('#text-mode').closest('label').querySelector('small').textContent='3D is unavailable here. Explore the same circuit in text.';}
$('#still').checked=still;
$('#place').innerHTML=places.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');
function clearInput(){keys.clear();drag=null;}
function releaseMouse(){if(document.pointerLockElement===($('#world')))document.exitPointerLock();}
function canCaptureMouse(){return captureMouse&&!captureUnavailable&&matchMedia('(pointer:fine)').matches&&typeof $('#world').requestPointerLock==='function';}
function mouseUI(){
  const locked=document.pointerLockElement===$('#world');document.body.classList.toggle('mouse-captured',locked);
  $('#look-status').textContent=locked?'Esc releases the cursor':canCaptureMouse()?'Click scene to capture mouse':'Drag to look';
}
function captureFailure(error){
  if(error?.message)console.warn('Mouse capture:',error.message);
  captureUnavailable=error?.name==='SecurityError'||error?.name==='NotSupportedError';
  clearInput();mouseUI();if(playing)say(captureUnavailable?'Mouse capture is unavailable here. Drag to look, or use the arrow keys.':'Click inside the scene to capture the mouse. You can also drag to look.');
}
function requestMouse(){
  if(!playing||guided||textMode||$('#settings').open||!canCaptureMouse()||document.pointerLockElement===$('#world'))return;
  try{const request=$('#world').requestPointerLock();if(request&&typeof request.catch==='function')request.catch(captureFailure);}catch{captureFailure();}
}
function rotateLook(x,y){if(!world)return;world.camera.yaw+=x*.0028;world.camera.pitch=Math.max(-1,Math.min(.8,world.camera.pitch-y*.0025));}
document.addEventListener('pointerlockchange',()=>{clearInput();mouseUI();});
document.addEventListener('pointerlockerror',captureFailure);
function say(text){$('#announcer').textContent=text;$('#whisper').textContent=text;captionUntil=elapsed+8;$('#whisper').classList.add('visible');}
function pairNames(source){return puzzle.wiring.flatMap((s,i)=>s===source?[lampNames[i]]:[]).join(' and ');}
function describe(){
  if(!focus)return;
  $('#scene-title').textContent=focus.name;
  let description='',clue='';
  if(focus.type==='lamp'){
    const source=puzzle.wiring[focus.id];description=puzzle.enabled[focus.id]?'Its shutter is open. A beam reaches the central lens. A cable leaves the back of the pedestal.':'Its shutter is closed. The beam is absent, but the cable remains.';
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
  if(world){world.puzzle=puzzle;world.traceLamp=traced;world.pulseSource=pulsed;world.focus=focus;}
  $('#guided-navigation').hidden=!(guided||textMode);$('#scene-description').hidden=!textMode;
  const label=!focus?'Walk close and look at an object':focus.type==='lamp'?(puzzle.enabled[focus.id]?'Close lamp shutter':'Open lamp shutter'):focus.type==='source'?'Pulse the well':focus.type==='receiver'?'Listen to the beam':result.balanced?'Step through':'Inspect doorway';
  $('#action-label').textContent=label;$('#interact').disabled=!focus;
  $('#trace').hidden=focus?.type!=='lamp';
  $('#target-label').textContent=focus?.name||'';$('#target-label').hidden=!focus||textMode;
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
  say('The beam is bright. The doorway stays shut.');mouseUI();requestMouse();
}
function act(){
  if(!playing||ending||$('#settings').open||!focus)return;
  clearInput();
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
function trace(){if(!playing||$('#settings').open||focus?.type!=='lamp')return;audio.tone(620,.5,.045);traced=focus.id;pulsed=null;say('A thin line leaves the pedestal and runs behind the screens.');sync();}
function end(){if(ending)return;releaseMouse();ending=true;playing=false;finished=true;clearInput();$('#transition').classList.add('active');setTimeout(()=>{$('#hud').hidden=true;$('#ending').hidden=false;if(world)world.intro=true;$('#ending').focus({preventScroll:true});$('#transition').classList.remove('active');window.scrollTo(0,0);},still?0:330);}
function pick(){
  if(!world)return null;const c=world.camera,dir=[Math.sin(c.yaw)*Math.cos(c.pitch),Math.sin(c.pitch),-Math.cos(c.yaw)*Math.cos(c.pitch)];let best=null,score=.88;
  for(const place of places){const d=place.position.map((v,i)=>v-[c.x,c.y,c.z][i]),length=Math.hypot(...d);if(length>3.1)continue;const dot=d.reduce((n,v,i)=>n+v*dir[i],0)/length;if(dot>score&&lineOfSight([c.x,c.y,c.z],place.position)){score=dot;best=place;}}
  return best;
}
$('#start').addEventListener('click',start);$('#again').addEventListener('click',start);$('#restart').addEventListener('click',start);$('#interact').addEventListener('click',act);$('#trace').addEventListener('click',trace);
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
  if(k==='q'){e.preventDefault();if(!e.repeat)trace();return;}
  if(controlKeys.includes(k)&&!guided&&!textMode){e.preventDefault();keys.add(k);}
});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{clearInput();releaseMouse();});document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden)releaseMouse();last=0;if(audio.ready){if(document.hidden)audio.context.suspend();else if(audio.enabled&&playing)audio.context.resume().catch(()=>{});}});
for(const b of document.querySelectorAll('[data-control]')){b.addEventListener('pointerdown',e=>{if(!playing||$('#settings').open||guided||textMode)return;e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.control);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.control));}
$('#world').addEventListener('pointerdown',e=>{
  if(!playing||$('#settings').open||guided||textMode)return;
  if(document.pointerLockElement===$('#world'))return;
  if(e.pointerType==='mouse')requestMouse();
  drag={x:e.clientX,y:e.clientY};$('#world').setPointerCapture(e.pointerId);
});
$('#world').addEventListener('pointermove',e=>{if(document.pointerLockElement===$('#world')||!drag||!world)return;rotateLook(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('#world')&&playing&&!$('#settings').open&&!guided&&!textMode)rotateLook(e.movementX,e.movementY);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('#world').addEventListener(event,()=>drag=null);
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
