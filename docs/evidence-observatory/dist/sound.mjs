// A quiet, synthesized acoustic space. Sound is optional and starts on a gesture.
export class ChamberSound {
  constructor(){this.enabled=true;this.voices=[];this.ready=false;}
  async start(){
    if(!this.enabled)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');
    if(this.ready){await this.context.resume();return;}
    const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=.15;this.master.connect(c.destination);
    const room=c.createConvolver(),length=Math.floor(c.sampleRate*2.8),impulse=c.createBuffer(2,length,c.sampleRate);for(let channel=0;channel<2;channel++){const a=impulse.getChannelData(channel);for(let i=0;i<length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/length,3)*.55;}room.buffer=impulse;const wet=c.createGain();wet.gain.value=.3;room.connect(wet);wet.connect(this.master);this.reverb=room;
    for(let source=0;source<4;source++){const oscillator=c.createOscillator(),gain=c.createGain(),pan=c.createStereoPanner();oscillator.type='sine';oscillator.frequency.value=[110,138.59,164.81,220][source];gain.gain.value=0;oscillator.connect(gain);gain.connect(pan);pan.connect(this.master);gain.connect(room);oscillator.start();this.voices.push({oscillator,gain,pan});}
    const noise=c.createBuffer(1,c.sampleRate*3,c.sampleRate),a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;const air=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();air.buffer=noise;air.loop=true;filter.type='lowpass';filter.frequency.value=230;gain.gain.value=.075;air.connect(filter);filter.connect(gain);gain.connect(this.master);air.start();this.ready=true;await c.resume();
  }
  setEnabled(value){this.enabled=value;if(this.ready)this.master.gain.setTargetAtTime(value?.15:0,this.context.currentTime,.15);}
  update(counts,camera){if(!this.ready)return;const t=this.context.currentTime;for(let i=0;i<4;i++){const v=this.voices[i],count=counts[i];v.gain.gain.setTargetAtTime(count===0?0:count===1?.045:.075,t,.6);v.oscillator.frequency.setTargetAtTime([110,138.59,164.81,220][i]+(count>1?1.8:0),t,.8);v.pan.pan.setTargetAtTime(Math.sin(i*Math.PI/2-(camera?.yaw||0))*.55,t,.15);}}
  tone(frequency,duration=.3,level=.15,type='sine'){if(!this.ready||!this.enabled)return;const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);g.connect(this.reverb);o.start();o.stop(t+duration+.05);}
  switch(on){this.tone(on?330:165,.22,.1,'triangle');}
  pulse(source){this.tone([220,277.18,329.63,440][source],1.8,.18);}
  unlock(){for(const [i,f]of [220,277.18,329.63,440].entries())setTimeout(()=>this.tone(f,3,.16),i*130);}
  footstep(){this.tone(52+Math.random()*10,.12,.035,'triangle');}
}
