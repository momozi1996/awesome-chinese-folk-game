/* 未明 / V5 procedural sound stage. Original synthesis, no downloads or trackers.
   One AudioContext, fixed ambience voices, short-lived effect nodes, bounded gain.
   No speech, jump-scare transients, sub-bass drones or random loud events. */
(function (root) {
  'use strict';
  const profiles = {
    desk:    {label:'隔窗细雨 · 夜班电流', rain:.20, air:.035, water:0, hum:.012},
    paper:   {label:'档案室 · 纸页与远雨', rain:.11, air:.022, water:0, hum:.008},
    message: {label:'私人信道 · 隔墙雨声', rain:.13, air:.027, water:0, hum:.014},
    rain:    {label:'檐下雨 · 水岸回声', rain:.36, air:.06, water:.07, hum:0},
    well:    {label:'井院 · 风与水滴', rain:.18, air:.075, water:.12, hum:0},
    room:    {label:'旧屋 · 木窗漏风', rain:.09, air:.08, water:0, hum:.006},
    snow:    {label:'雪夜 · 门外风声', rain:0, air:.17, water:0, hum:.004},
    theatre: {label:'空戏台 · 风穿帘幕', rain:.10, air:.12, water:.025, hum:.008},
    dawn:    {label:'归档之后 · 雨渐远', rain:.035, air:.03, water:.015, hum:0}
  };
  class Soundscape {
    constructor() {
      this.context=null;this.enabled=false;this.masterValue=.3;this.ambienceValue=.55;
      this.effectsValue=.65;this.profile='desk';this.hidden=false;this.ducked=false;
      this.voices=[];this.transients=new Set();this.activeEffects=0;this.lastCue=0;this.lastSettings='';
    }
    async unlock() {
      if(!this.context){
        const Context=root.AudioContext||root.webkitAudioContext;
        if(!Context)throw new Error('Web Audio unavailable');
        const c=this.context=new Context();
        this.master=c.createGain();this.master.gain.value=0;
        this.ambience=c.createGain();this.ambience.gain.value=0;
        this.effects=c.createGain();this.effects.gain.value=this.effectsValue;
        this.ambience.connect(this.master);this.effects.connect(this.master);
        const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;
        limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.008;limiter.release.value=.3;
        this.analyser=c.createAnalyser();this.analyser.fftSize=1024;
        this.master.connect(limiter);limiter.connect(this.analyser);this.analyser.connect(c.destination);
        this.noiseBuffer=this.noise(8);
        this.addLayer('rain',this.noiseBuffer,'highpass',850, .05);
        this.addLayer('air',this.wind(),'lowpass',480, -.2);
        this.addLayer('water',this.water(), 'lowpass',2400,.23);
        const hum=c.createOscillator();hum.type='sine';hum.frequency.value=146.83;
        const gain=c.createGain();gain.gain.value=0;hum.connect(gain);gain.connect(this.ambience);hum.start();
        this.voices.push({name:'hum',source:hum,gain});
        this.setProfile(this.profile,true);
      }
      if(!this.hidden && this.context.state!=='running')await this.context.resume();
      this.lastSettings='';this.apply();return true;
    }
    noise(seconds) {
      const c=this.context,b=c.createBuffer(2,Math.floor(c.sampleRate*seconds),c.sampleRate);
      let seed=1847;
      const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1};
      for(let channel=0;channel<2;channel++){
        const d=b.getChannelData(channel);
        for(let i=0;i<d.length;i++) d[i]=rand()*.45*(.75+.1*Math.sin(i/c.sampleRate*.6));
        // Short zero-ended tapers avoid a discontinuity when a buffer loops.
        this.taper(d,c.sampleRate*.008);
      }
      return b;
    }
    taper(data,frames) {
      const n=Math.floor(frames);
      for(let i=0;i<n;i++){
        const t=.5-.5*Math.cos(Math.PI*i/n);
        data[i]*=t;data[data.length-1-i]*=t;
      }
    }
    wind() {
      const c=this.context,seconds=16,b=c.createBuffer(2,c.sampleRate*seconds,c.sampleRate);
      let seed=9741;
      for(let channel=0;channel<2;channel++){
        const d=b.getChannelData(channel);let slow=0,mean=0;
        for(let i=0;i<d.length;i++){
          seed=(Math.imul(seed,1664525)+1013904223)>>>0;
          slow=.98*slow+.02*(seed/4294967296*2-1);
          const phase=i/d.length*Math.PI*2;
          d[i]=slow*3*(.7+.16*Math.sin(phase+channel)+.08*Math.sin(phase*3));mean+=d[i];
        }
        mean/=d.length;for(let i=0;i<d.length;i++)d[i]-=mean;
        this.taper(d,c.sampleRate*.07);
      }
      return b;
    }
    water() {
      const c=this.context,b=c.createBuffer(2,c.sampleRate*16,c.sampleRate);
      let seed=3217;
      const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
      for(let channel=0;channel<2;channel++){
        const d=b.getChannelData(channel);let at=.7+rand();
        while(at<15.2){
          const offset=Math.floor(at*c.sampleRate),n=Math.floor(c.sampleRate*.3),pitch=600+rand()*430,amp=.09+rand()*.08;
          for(let k=0;k<n && k+offset<d.length;k++){
            const t=k/c.sampleRate,env=Math.min(1,t/.012)*Math.exp(-t*27);
            d[k+offset]+=amp*env*(Math.sin(2*Math.PI*(pitch*t+340*t*t))+.2*Math.sin(2*Math.PI*pitch*1.71*t));
          }
          at+=.6+rand()*1.7;
        }
      }
      return b;
    }
    addLayer(name,buffer,type,frequency,pan) {
      const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
      source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.45;gain.gain.value=0;
      if(name==='air'){
        const cut=c.createBiquadFilter();cut.type='highpass';cut.frequency.value=85;cut.Q.value=.5;
        source.connect(cut);cut.connect(filter);
      }else source.connect(filter);
      filter.connect(gain);
      if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;gain.connect(p);p.connect(this.ambience);}
      else gain.connect(this.ambience);
      source.start();this.voices.push({name,source,gain});
    }
    setProfile(name,force=false) {
      if(!profiles[name])name='desk';
      if(name===this.profile && !force)return;
      this.profile=name;
      if(this.context)for(const v of this.voices){
        v.gain.gain.cancelScheduledValues(this.context.currentTime);
        v.gain.gain.setTargetAtTime(profiles[name][v.name],this.context.currentTime,.65);
      }
    }
    configure({enabled,master,ambience,effects}) {
      this.enabled=!!enabled;
      if(!this.enabled)this.cancelEffects();
      const clamp=(n,f)=>Number.isFinite(n)?Math.max(0,Math.min(100,n))/100:f;
      this.masterValue=clamp(master,this.masterValue);this.ambienceValue=clamp(ambience,this.ambienceValue);this.effectsValue=clamp(effects,this.effectsValue);
      this.apply();
    }
    apply() {
      if(!this.context)return;
      const signature=[this.enabled,this.hidden,this.ducked,this.masterValue,this.ambienceValue,this.effectsValue].join();
      if(signature===this.lastSettings)return;this.lastSettings=signature;
      const t=this.context.currentTime;
      const fade=(param,value,seconds)=>{
        if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(t);
        else {const current=param.value;param.cancelScheduledValues(t);param.setValueAtTime(current,t);}
        param.linearRampToValueAtTime(value,t+seconds);
      };
      // Finite ramps reach true digital silence at zero, rather than an asymptotic tail.
      fade(this.master.gain,this.enabled&&!this.hidden?this.masterValue*.7:0,.16);
      fade(this.ambience.gain,this.ambienceValue*(this.ducked?.22:1),.28);
      fade(this.effects.gain,this.effectsValue,.08);
    }
    duck(value){this.ducked=!!value;this.apply();}
    async visibility(hidden){
      this.hidden=hidden;this.apply();
      if(!this.context)return;
      if(hidden){this.cancelEffects();await this.context.suspend();}
      else if(this.enabled)await this.context.resume();
    }
    cancelEffects() {
      for(const source of [...this.transients]){
        try{source.stop();}catch{}
        source.onended?.();
      }
    }
    cue(name='page') {
      const c=this.context;
      if(!c||c.state!=='running'||!this.enabled||this.hidden||!this.masterValue||!this.effectsValue)return;
      const t=c.currentTime;
      if(t-this.lastCue<.075||this.activeEffects>=6)return;
      this.lastCue=t;
      const page=['page','select','inspect','stamp','close'].includes(name);
      const source=page?c.createBufferSource():c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain();
      const duration=name==='resolve'?.75:name==='message'?.24:name==='stamp'?.17:.12;
      if(page){source.buffer=this.noiseBuffer;source.playbackRate.value=name==='stamp'?.65:1.3;filter.type='bandpass';filter.frequency.value=name==='stamp'?340:1900;filter.Q.value=.6;}
      else {source.type='sine';source.frequency.setValueAtTime(name==='resolve'?293.66:587.33,t);source.frequency.exponentialRampToValueAtTime(name==='resolve'?440:493.88,t+duration);filter.type='lowpass';filter.frequency.value=1800;}
      const peak=page?(name==='stamp'?.22:.12):.035;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(peak,t+.016);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
      source.connect(filter);filter.connect(gain);gain.connect(this.effects);
      this.transients.add(source);this.activeEffects=this.transients.size;
      let ended=false;
      source.onended=()=>{
        if(ended)return;ended=true;
        source.disconnect();filter.disconnect();gain.disconnect();
        this.transients.delete(source);this.activeEffects=this.transients.size;
      };
      source.start();source.stop(t+duration+.02);
    }
    snapshot() {
      let rms=0;
      if(this.analyser){const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);rms=Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);}
      return Object.freeze({enabled:this.enabled,state:this.context?.state||'not-created',profile:this.profile,label:profiles[this.profile].label,
        master:this.masterValue,ambience:this.ambienceValue,effects:this.effectsValue,ducked:this.ducked,hidden:this.hidden,
        ambienceVoices:this.voices.length,activeEffects:this.activeEffects,rms});
    }
  }
  root.WeimingSound=new Soundscape();
})(window);
