import {Atmosphere} from './atmosphere.mjs';
import {createPuzzle,analyze,lampPositions,sourcePositions,receiverPosition,cablePath,shutterPosition,contactPosition} from './simulation.mjs';
// Small, dependency-free WebGL scene. All geometry and materials are made here.
const VERTEX=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uProjection;uniform mat4 uView;uniform mat4 uModel;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uProjection*uView*p;}`;
const FRAGMENT=`precision mediump float;uniform vec3 uColor;uniform vec3 uCamera;uniform float uGlow;uniform vec3 uFog;uniform vec4 uLamps[8];uniform float uTime;uniform float uSurface;uniform float uOpacity;uniform float uOpen;varying vec3 vNormal;varying vec3 vWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){vec3 n=normalize(vNormal);vec3 view=normalize(uCamera-vWorld);float key=max(dot(n,normalize(vec3(-.45,.85,-.3))),0.);float fill=max(dot(n,normalize(vec3(.7,.2,.8))),0.);float stone=.91+.09*noise(vWorld.xz*3.+vWorld.y);vec3 color=uColor*(vec3(.19,.25,.34)+vec3(.5,.59,.72)*key+vec3(.22,.17,.13)*fill)*stone;
for(int i=0;i<8;i++){vec3 delta=uLamps[i].xyz-vWorld;float distance=max(length(delta),.15);vec3 light=delta/distance;float fall=uLamps[i].w/(1.+distance*distance*.45);float diffuse=max(dot(n,light),0.);color+=uColor*vec3(1.,.64,.32)*fall*(.25+diffuse)*.9;if(uSurface>.5&&uSurface<1.5){vec3 halfVector=normalize(light+view);float shine=pow(max(dot(n,halfVector),0.),64.);color+=vec3(1.,.69,.38)*shine*fall*1.2;}}
float center=1./(1.+dot(vWorld-vec3(0.,2.4,-3.8),vWorld-vec3(0.,2.4,-3.8))*.22);color+=uColor*mix(vec3(.3,.18,.08),vec3(.12,.42,.45),uOpen)*center;
float rim=pow(1.-max(dot(n,view),0.),3.);color+=uColor*vec3(.12,.17,.24)*rim;
if(uSurface>.5&&uSurface<1.5){float wet=noise(vWorld.xz*.65);float fresnel=pow(1.-max(dot(n,view),0.),4.);color=mix(color,color+vec3(.075,.13,.18)*fresnel,wet*.7);}
color=mix(color,uColor*1.27,uGlow);float density=mix(1.9,.65,clamp(vWorld.y/6.,0.,1.));float fog=1.-exp(-length(vWorld-uCamera)*.022*density);color=mix(color,uFog,fog*(1.-uGlow*.25));float alpha=uOpacity;
if(uSurface>1.5){float cloud=noise(vWorld.xz*.32+vec2(uTime*.018,0.))*.65+noise(vWorld.xz*.85-vec2(0.,uTime*.012))*.35;float edge=(1.-smoothstep(4.,7.,abs(vWorld.x)))*(1.-smoothstep(7.,13.,abs(vWorld.z+2.)));alpha*=smoothstep(.25,.8,cloud)*edge;color=vec3(.45,.59,.67);}
gl_FragColor=vec4(color,alpha);}`;
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target){let z=eye.map((a,i)=>a-target[i]),l=Math.hypot(...z);z=z.map(x=>x/l);let x=[z[2],0,-z[0]];l=Math.hypot(...x);x=x.map(v=>v/l);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,v,i)=>a+v*eye[i],0),-y.reduce((a,v,i)=>a+v*eye[i],0),-z.reduce((a,v,i)=>a+v*eye[i],0),1]);}
function model(x,y,z,sx,sy,sz,ry=0,rx=0){const c=Math.cos(ry),s=Math.sin(ry),a=Math.cos(rx),b=Math.sin(rx);return new Float32Array([c*sx,0,-s*sx,0,s*b*sy,a*sy,c*b*sy,0,s*a*sz,-b*sz,c*a*sz,0,x,y,z,1]);}
function cube(){let p=[],n=[];const faces=[[[1,0,0],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]],[[-1,0,0],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]],[[0,1,0],[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]],[[0,-1,0],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]],[[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]];for(const [normal,...vs] of faces)for(const i of [0,1,2,0,2,3]){p.push(...vs[i]);n.push(...normal);}return {p,n};}
function sphere(segments=32,rings=20){let p=[],n=[];const point=(u,v)=>[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=point(i/segments*Math.PI*2,j/rings*Math.PI),b=point((i+1)/segments*Math.PI*2,j/rings*Math.PI),c=point((i+1)/segments*Math.PI*2,(j+1)/rings*Math.PI),d=point(i/segments*Math.PI*2,(j+1)/rings*Math.PI);for(const v of [a,b,c,a,c,d]){p.push(...v);n.push(...v);}}return {p,n};}
function torus(major=1,minor=.1,segments=72,sides=10,half=false){let p=[],n=[];const point=(u,v)=>({p:[(major+minor*Math.cos(v))*Math.cos(u),(major+minor*Math.cos(v))*Math.sin(u),minor*Math.sin(v)],n:[Math.cos(v)*Math.cos(u),Math.cos(v)*Math.sin(u),Math.sin(v)]});for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const u=i/segments*Math.PI*(half?1:2),v=j/sides*Math.PI*2,du=Math.PI*(half?1:2)/segments,dv=Math.PI*2/sides;const a=point(u,v),b=point(u+du,v),c=point(u+du,v+dv),d=point(u,v+dv);for(const q of [a,b,c,a,c,d]){p.push(...q.p);n.push(...q.n);}}return {p,n};}
function cylinder(segments=48){let p=[],n=[];for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,x=Math.cos(a),z=Math.sin(a),xx=Math.cos(b),zz=Math.sin(b);for(const [v,normal] of [[[x,-.5,z],[x,0,z]],[[xx,-.5,zz],[xx,0,zz]],[[xx,.5,zz],[xx,0,zz]],[[x,-.5,z],[x,0,z]],[[xx,.5,zz],[xx,0,zz]],[[x,.5,z],[x,0,z]],[[0,.5,0],[0,1,0]],[[x,.5,z],[0,1,0]],[[xx,.5,zz],[0,1,0]],[[0,-.5,0],[0,-1,0]],[[xx,-.5,zz],[0,-1,0]],[[x,-.5,z],[0,-1,0]]]){p.push(...v);n.push(...normal);}}return {p,n};}

export class Observatory {
  constructor(canvas){this.canvas=canvas;this.camera={x:0,y:1.7,z:6.8,yaw:0,pitch:0};this.room=0;this.puzzle=createPuzzle(1);this.traceLamp=null;this.pulseSource=null;this.focus=null;this.solved=false;this.intro=true;this.still=false;this.hidden=false;this.time=0;this.aperture=0;this.lastRender=0;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'});if(!this.gl)throw Error('3D rendering unavailable');const gl=this.gl;const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Could not create scene');gl.useProgram(this.program);this.u={};for(const name of ['Projection','View','Model','Color','Camera','Glow','Fog','Time','Surface','Opacity','Open'])this.u[name]=gl.getUniformLocation(this.program,'u'+name);this.u.Lamps=gl.getUniformLocation(this.program,'uLamps[0]');try{this.effects=new Atmosphere(gl);}catch{this.effects=null;}this.position=gl.getAttribLocation(this.program,'aPosition');this.normal=gl.getAttribLocation(this.program,'aNormal');this.meshes={};for(const [key,geometry]of Object.entries({cube:cube(),sphere:sphere(),torus:torus(),ring:torus(1,.025),arch:torus(1,.17,48,10,true),rib:torus(1,.025,48,8,true),cylinder:cylinder()})){const pos=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pos);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.p),gl.STATIC_DRAW);const norm=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,norm);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.n),gl.STATIC_DRAW);this.meshes[key]={pos,norm,count:geometry.p.length/3};}gl.enable(gl.DEPTH_TEST);this.resize();this.build();}
  resize(){const ratio=Math.min(devicePixelRatio||1,1.5);const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);this.projection=perspective(Math.PI/3,w/h,.1,140);if(this.effects)try{this.effects.resize(w,h);}catch{this.effects=null;}}
  build(){this.objects=[];const add=(mesh,pos,scale,color,ry=0,rx=0,glow=0,surface=0)=>this.objects.push({mesh,pos,scale,color:hex(color),ry,rx,glow,surface});const box=(x,y,z,w,h,d,color,ry=0,surface=0)=>add('cube',[x,y,z],[w,h,d],color,ry,0,0,surface);const ink='#354556',floor='#344456';
    box(0,-.23,-15,150,.4,150,floor,0,1);
    // A tiled plaza, long colonnades, and an open sky establish a readable space.
    for(let i=-15;i<=15;i++){box(i*2,-.021,-15,.016,.008,80,'#405363');box(0,-.02,i*2-15,80,.008,.016,'#405363');}
    for(const side of [-1,1]){box(side*7.5,.15,-5,2.4,.35,32,'#263a4c');box(side*7.5,6.9,-5,2.4,.4,32,'#31485c');for(let z=7;z>=-20;z-=4.6){box(side*7.5,3.5,z,.72,6.7,.72,'#455669');box(side*7.5,.45,z,1.2,.25,1.2,'#33485b');box(side*7.5,6.5,z,1.08,.3,1.08,'#4d5f70');box(side*7.08,3.5,z+.4,.04,5.7,.04,'#6c7f87');}}
    // The exit is an architectural arch; its center lights up after verification.
    box(-3.7,2.8,-12,3.3,5.6,.8,ink);box(3.7,2.8,-12,3.3,5.6,.8,ink);box(0,6.25,-12,10.7,1.3,.8,ink);add('arch',[0,3.5,-11.5],[2.1,2.1,1],'#aa805e');box(-2.1,1.75,-11.5,.34,3.5,.34,'#aa805e');box(2.1,1.75,-11.5,.34,3.5,.34,'#aa805e');box(0,.05,-11,4.6,.1,3.4,'#3b4f5e');
    // Long shadows make the geometry feel physical without external assets.
    for(const side of [-1,1])for(let z=6;z>=-12;z-=4.6)box(side*4.7,-.004,z-1,5.5,.006,.7,'#213345',-.35);
    for(let z=5;z>=-8;z-=1.8){box(0,.005,z,.035,.008,.5,'#62685e');}
    // Central evidence pedestal and concentric inspection marks.
    add('cylinder',[0,.17,-3.8],[1.75,.34,1.75],'#3d5261');add('cylinder',[0,.4,-3.8],[1.5,.16,1.5],'#627477');add('cylinder',[0,.73,-3.8],[1.15,.5,1.15],'#2d404f');add('ring',[0,.012,-3.8],[2.2,2.2,2.2],'#9e7d5c',0,Math.PI/2);add('ring',[0,.016,-3.8],[2.45,2.45,2.45],'#535f64',0,Math.PI/2);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(Math.cos(a)*2.7,.014,-3.8+Math.sin(a)*2.7,.08,.012,.24,'#987b57',-a);}
    // Distant observatory towers, a suspended sun, and shallow steps.
    add('sphere',[0,9.5,-32],[5.1,5.1,5.1],'#e1cbb0',0,0,.7);add('ring',[0,9.5,-31.8],[6.1,6.1,6.1],'#d9aa73',.2,.2);
    for(const side of [-1,1]){box(side*14,4,-26,5,8,5,'#273c52');box(side*21,6,-38,6,12,6,'#23384b');add('sphere',[side*14,9.6,-26],[1.2,1.2,1.2],'#7f9aa9');for(let i=0;i<3;i++)box(side*4,.1+i*.12,-14-i*.6,3,.2,.7,'#304558');}
    for(const side of [-1,1]){add('sphere',[side*4.9,1.08,-7.6],[.22,.22,.22],'#f9cd91',0,0,1);box(side*4.9,.5,-7.6,.1,1,.1,'#536570');}
    for(const side of [-1,1]){box(side*2.75,1.5,-7.6,4.4,3,.35,'#354959');box(side*2.75,3.03,-7.6,4.55,.08,.45,'#718184');}
    // Vault ribs and a broken celestial instrument give the hall its scale.
    for(const z of [6,0,-6,-12,-18]){add('arch',[0,6.5,z],[7.5,7.5,.8],'#34495e');add('rib',[0,6.5,z+.22],[7.5,7.5,.4],'#8d8068',0,0,.05);}
    for(const side of [-1,1])for(let z=4;z>=-14;z-=6){box(side*5.8,5.6,z,.025,2,.025,'#af9774');add('sphere',[side*5.8,4.55,z],[.065,.065,.065],'#e8ba80',0,0,1);}
    add('sphere',[.7,9.9,-30.6],[4.9,4.9,4.9],'#142c42',0,0,1);
    for(const radius of [3.2,4.1])add('ring',[0,-.006,-3.8],[radius,radius,radius],'#6a827f',0,Math.PI/2,.1);
    this.palettes=[{artifact:'#c5a06e',fog:'#243e53',detail:'#899d9e'}];
  }
  draw(mesh,pos,scale,color,ry=0,rx=0,glow=0,surface=0,opacity=1){const gl=this.gl,m=this.meshes[mesh];if(this.lastMesh!==mesh){gl.bindBuffer(gl.ARRAY_BUFFER,m.pos);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.norm);gl.enableVertexAttribArray(this.normal);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,0,0);this.lastMesh=mesh;}gl.uniformMatrix4fv(this.u.Model,false,model(...pos,...scale,ry,rx));gl.uniform3fv(this.u.Color,Array.isArray(color)?color:hex(color));gl.uniform1f(this.u.Glow,glow);gl.uniform1f(this.u.Surface,surface);gl.uniform1f(this.u.Opacity,opacity);gl.drawArrays(gl.TRIANGLES,0,m.count);}
  render(seconds){
    if(this.hidden)return;
    const gl=this.gl,t=this.still?0:seconds,p=this.palettes[0],c=this.camera;
    const delta=this.lastRender?Math.min(.05,seconds-this.lastRender):0;this.lastRender=seconds;
    const result=analyze(this.puzzle);this.aperture=this.still?Number(result.balanced):this.aperture+(Number(result.balanced)-this.aperture)*Math.min(1,delta*1.8);
    let eye,target;
    if(this.intro){const mobile=innerWidth<600,drift=this.still?0:Math.sin(t*.055)*.25;eye=mobile?[4.8,2.9,12]:[4.8+drift,3.6,12.5];target=mobile?[-1,2,-4]:[-5.9,2.4,-5];}
    else{eye=[c.x,c.y+(this.still?0:this.walkBob||0),c.z];target=[c.x+Math.sin(c.yaw)*Math.cos(c.pitch),eye[1]+Math.sin(c.pitch),c.z-Math.cos(c.yaw)*Math.cos(c.pitch)];}
    const view=lookAt(eye,target),fog=hex(p.fog);
    if(this.effects)this.effects.begin(eye,target,t,this.aperture);else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);}
    gl.useProgram(this.program);gl.uniformMatrix4fv(this.u.Projection,false,this.projection);gl.uniformMatrix4fv(this.u.View,false,view);gl.uniform3fv(this.u.Camera,eye);gl.uniform3fv(this.u.Fog,fog);gl.uniform1f(this.u.Time,t);gl.uniform1f(this.u.Open,this.aperture);
    const lights=[];for(let id=0;id<8;id++)lights.push(...lampPositions[id],this.puzzle.enabled[id]?1.3:.06);gl.uniform4fv(this.u.Lamps,lights);
    this.lastMesh=null;for(const o of this.objects)this.draw(o.mesh,o.pos,o.scale,o.color,o.ry,o.rx,o.glow,o.surface);
    const analysis=analyze(this.puzzle);this.solved=analysis.balanced;
    this.draw('torus',[0,2.4,-3.8],[2.5,2.5,2.5],this.solved?'#a1dbe1':'#b18a65',0,0,.05);
    this.draw('ring',[0,2.4,-3.8],[2.85,2.85,2.85],p.detail,.22,0,.2);
    this.draw('ring',[0,2.4,-3.8],[2.75,2.75,2.75],'#9d8059',this.still?.3:.3+Math.sin(t*.07)*.18,.48,.2);
    this.draw('ring',[0,2.4,-3.8],[3.02,3.02,3.02],'#596d78',-.15,Math.PI/2.6,.1);
    for(let i=0;i<4;i++){
      const position=receiverPosition(i),count=analysis.counts[i],pulse=this.still?1:1+Math.sin(t*(1.2+i*.4))*.035;
      this.glyph(i,position,.95,0,count===0?'#566c7e':count===1?'#b7eee1':'#edb17c');
      if(count===1)this.draw('ring',position,[.38,.38,.38],'#b7eee1',0,0,.8);
      if(count>1){for(let j=0;j<count;j++){const offset=this.still?(j-.5)*.12:Math.sin(t*3+j*Math.PI)*.1;this.draw('ring',[position[0]+offset,position[1],position[2]+j*.04],[.38*pulse,.38*pulse,.38],j%2?'#e4816f':'#f4cea3',0,0,.5);}this.draw('cube',position,[.055,.55,.055],'#b6677b',.4,.7);}
    }
    for(let id=0;id<8;id++){
      const position=lampPositions[id],source=this.puzzle.wiring[id],on=this.puzzle.enabled[id],side=Math.sign(position[0]);
      this.shutterOpen??=this.puzzle.enabled.map(Number);this.shutterOpen[id]=this.still?Number(on):this.shutterOpen[id]+(Number(on)-this.shutterOpen[id])*Math.min(1,delta*10);const openness=this.shutterOpen[id];
      const chosen=this.traceLamp===id||this.pulseSource===source;
      const path=cablePath(this.puzzle,id);
      for(let k=1;k<path.length;k++)this.thread(path[k-1],path[k],chosen?'#e1b56c':'#5a7183',chosen?.045:.014);
      if(chosen&&!this.still){const route=(t*.42)% (path.length-1),segment=Math.floor(route),k=route-segment;const point=path[segment].map((v,i)=>v+(path[segment+1][i]-v)*k);this.draw('sphere',[point[0],point[1]+.055,point[2]],[.07,.07,.07],'#fff7ce',0,0,1);}
      this.draw('cylinder',[position[0],.1,position[2]],[.4,.2,.4],'#526374');
      this.draw('cube',[position[0],.83,position[2]],[.44,1.4,.44],'#475969');
      const lever=shutterPosition(id),contact=contactPosition(id),highlight=this.focus?.type==='lamp'&&this.focus.id===id;
      this.draw('cube',[position[0]-side*.24,lever[1],position[2]],[.06,.46,.28],'#263c4c');
      this.draw('sphere',lever,[.1,.1,.1],'#9d835b');
      const grip=[lever[0]-side*.08,lever[1]+(openness*2-1)*.12,lever[2]];
      this.thread(lever,grip,'#d6b57d',.055);
      this.draw('sphere',grip,[.07,.07,.07],highlight&&this.focus.kind==='shutter'?'#fff2c7':'#d6b57d',0,0,.25);
      this.draw('cube',[contact[0],contact[1],contact[2]-.045],[.34,.3,.07],'#273d4a');
      this.draw('ring',contact,[.14,.14,.14],highlight&&this.focus.kind==='contact'?'#fff2c7':'#b29c73',0,0,.35);
      this.draw('sphere',[contact[0],contact[1],contact[2]+.015],[.085,.085,.045],chosen?'#e9f5d3':'#6cabb7',0,0,chosen?.9:.35);
      this.glyph(source,[position[0]+side*.245,.94,position[2]],.9,side*Math.PI/2,'#bcbca5');
      const rhythm=this.still?1:1+Math.sin(t*(1.2+source*.4))*.1;
      this.draw('sphere',position,[.18*rhythm,.18*rhythm,.18*rhythm],on?'#ffe0a2':'#324251',0,0,on?.8:0);
      this.draw('ring',position,[.3,.3,.3],chosen?'#ffffff':on?'#e8b779':'#5d737f',0,0,.4);
      // Two metal leaves close over the light; the nearby lever stays operable.
      for(const blade of [-1,1])this.draw('cube',[position[0]+blade*(.13+openness*.27),position[1],position[2]+.21],[.25,.48,.065],on?'#77827c':'#a59574',0,blade*.24*openness);
      if(on)this.thread(position,receiverPosition(source),analysis.counts[source]>1?'#dfb17e':'#b9e2e3',.016);
      if(highlight)this.draw('ring',this.focus.position,[.25,.25,.25],'#fff8e0',this.focus.kind==='shutter'?side*Math.PI/2:0,0,.7);
    }
    for(let source=0;source<4;source++){
      const pos=sourcePositions[source],selected=this.pulseSource===source||this.traceLamp!==null&&this.puzzle.wiring[this.traceLamp]===source;
      this.draw('cylinder',[pos[0],.22,pos[2]],[.44,.44,.44],'#425667');
      this.draw('ring',[pos[0],.46,pos[2]],[.46,.46,.46],selected?'#fff2b9':'#7f9ca5',0,Math.PI/2,.6);
      this.glyph(source,[pos[0],.95,pos[2]],1.5,0,selected?'#fff1bf':'#c8cfc5');
      this.draw('sphere',[pos[0],.53,pos[2]],[.13,.08,.13],selected?'#fff3bb':'#91bec4',0,0,1);
    }
    this.draw('sphere',[0,.51,-3.8],[.45,.035,.45],this.solved?'#c8eee1':'#eab87a',0,0,1);
    this.draw('cube',[0,.8,-2.63],[.65,.55,.18],'#435968');
    this.draw('ring',[0,1.05,-2.55],[.25,.25,.25],this.focus?.type==='receiver'?'#fff2c7':'#b9a27c',0,0,.4);
    for(let i=-1;i<=1;i++)this.draw('cube',[i*.11,1.05,-2.53],[.025,.21,.025],'#a1c4c6',0,0,.2);
    if(this.aperture>.01){
      this.draw('cube',[0,2.65,-21.5],[4.2,5.3,.03],'#274f66',0,0,.25);
      this.draw('sphere',[0,2.6,-20],[.42,.42,.42],'#e0d7af',0,0,this.aperture);
      this.draw('ring',[0,2.6,-11.35],[1.5,1.5,1.5],'#d7eee0',0,0,this.aperture);
      for(let i=0;i<7;i++)this.draw('ring',[0,2.6,-11.7-i*1.25],[1.5,1.5,1.5],i%2?'#7299a5':'#a6d6d0',0,0,.65);
    }
    if(this.aperture<.98){
      for(const side of [-1,1])this.draw('cube',[side*(.98+this.aperture*2),2.65,-11.9],[1.96,5.3,.15],'#243d50');
      for(let i=0;i<4;i++)this.glyph(i,[(i%2?1:-1)*(.65+this.aperture*2),1.65+Math.floor(i/2)*1.1,-11.45],1.35,0,'#b4b99f');
    }
    // Low haze stays translucent enough to preserve all floor-cable clues.
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    for(const height of [.12,.38])this.draw('cube',[0,height,-2],[14,.004,26],'#7c9baa',0,0,0,2,.09);
    gl.depthMask(true);gl.disable(gl.BLEND);
    if(this.effects){this.effects.drawDust(view,this.projection,t);this.effects.finish(this.aperture);}

  }
  thread(from,to,color,width=.02){const delta=to.map((v,i)=>v-from[i]),length=Math.hypot(...delta);if(length<.001)return;this.draw('cube',from.map((v,i)=>(v+to[i])/2),[width,width,length],color,Math.atan2(delta[0],delta[2]),-Math.asin(delta[1]/length),.7);}
  glyph(source,pos,size=1,ry=0,color='#f2dbc3'){
    const map=([x,y])=>[pos[0]+Math.cos(ry)*x*size,pos[1]+y*size,pos[2]-Math.sin(ry)*x*size];
    if(source===0){this.draw('ring',pos,[.19*size,.19*size,.19*size],color,ry,0,.7);return;}
    const lines=source===1?[[[0,.22],[.19,0]],[[.19,0],[0,-.22]],[[0,-.22],[-.19,0]],[[-.19,0],[0,.22]]]:source===2?[[[-.2,0],[.2,0]],[[0,-.2],[0,.2]]]:[[[-.16,-.2],[-.16,.2]],[[0,-.2],[0,.2]],[[.16,-.2],[.16,.2]]];
    for(const [from,to]of lines)this.thread(map(from),map(to),color,.035*size);
  }
  reset(puzzle){this.puzzle=puzzle;this.shutterOpen=puzzle.enabled.map(Number);this.traceLamp=null;this.pulseSource=null;this.solved=false;this.aperture=0;this.camera={x:0,y:1.7,z:7.5,yaw:0,pitch:0};}
}
