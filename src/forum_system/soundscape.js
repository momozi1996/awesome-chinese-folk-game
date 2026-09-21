/* 未明 / V6.2 music + effects mixer. No continuous noise generators.
   Local CC0 piano: Emma_MA, Haunting piano (see art/source/music/).
   One AudioContext, one music voice, bounded short-lived interaction effects. */
(function (root) {
  'use strict';
  // Scene IDs remain compatible with saves/UI, but never restart the same score.
  const profiles = {
    desk:'夜读', paper:'查档', message:'私信', rain:'水岸', well:'井院',
    room:'旧屋', snow:'雪夜', theatre:'戏台', dawn:'归档'
  };
  class Soundscape {
    constructor() {
      this.context=null;this.enabled=false;this.masterValue=.3;this.ambienceValue=.55;
      this.effectsValue=.65;this.profile='desk';this.hidden=false;this.ducked=false;
      this.musicEnabled=true;this.musicBuffer=null;this.musicSource=null;this.musicLoad=null;
      this.musicStatus='unloaded';this.musicError=false;this.musicOffset=0;this.musicStarted=0;
      this.transients=new Set();this.activeEffects=0;this.lastCue=0;this.lastSettings='';
    }
    async unlock() {
      if(!this.context){
        const Context=root.AudioContext||root.webkitAudioContext;
        if(!Context)throw new Error('Web Audio unavailable');
        const c=this.context=new Context();
        this.master=c.createGain();this.master.gain.value=0;
        this.music=c.createGain();this.music.gain.value=0;
        this.effects=c.createGain();this.effects.gain.value=this.effectsValue;
        this.music.connect(this.master);this.effects.connect(this.master);
        const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;
        limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.008;limiter.release.value=.3;
        this.analyser=c.createAnalyser();this.analyser.fftSize=1024;
        this.master.connect(limiter);limiter.connect(this.analyser);this.analyser.connect(c.destination);
        // Noise is retained only as a 170ms paper/marking effect, never looped.
        this.noiseBuffer=this.noise(.3);
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
        // Taper the one-shot texture; this buffer is never used as a looping bed.
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
    setProfile(name) {
      this.profile=Object.prototype.hasOwnProperty.call(profiles,name)?name:'desk';
      this.notify();
    }
    async loadMusic() {
      if(this.musicBuffer)return this.musicBuffer;
      if(this.musicLoad)return this.musicLoad;
      this.musicStatus='loading';this.notify();
      this.musicLoad=(async()=>{
        if(!root.WeimingMusicData)await new Promise((resolve,reject)=>{
          const script=document.createElement('script');script.src='assets/music/music-data.js';
          const timer=setTimeout(()=>{script.remove();reject(new Error('Music timeout'));},12000);
          script.onload=()=>{clearTimeout(timer);script.remove();root.WeimingMusicData?resolve():reject(new Error('Music data missing'));};
          script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Music unavailable'));};
          document.head.append(script);
        });
        const bytes=Uint8Array.from(atob(root.WeimingMusicData.base64),c=>c.charCodeAt(0));
        return this.context.decodeAudioData(bytes.buffer);
      })();
      try {
        this.musicBuffer=await this.musicLoad;this.musicError=false;
        this.musicStatus='paused';this.syncMusic();return this.musicBuffer;
      } catch {
        this.musicStatus='error';this.musicError=true;return null;
      } finally {this.musicLoad=null;this.notify();}
    }
    wantsMusic(){return this.context?.state==='running'&&this.enabled&&!this.hidden&&this.masterValue>0&&this.musicEnabled&&this.ambienceValue>0;}
    syncMusic() {
      if(!this.wantsMusic()){this.stopMusic();return;}
      if(this.musicSource||this.musicError)return;
      if(!this.musicBuffer){this.loadMusic();return;}
      const c=this.context,source=c.createBufferSource();source.buffer=this.musicBuffer;
      source.loop=true;source.loopEnd=Math.min(52.85,this.musicBuffer.duration);
      source.connect(this.music);this.musicStarted=c.currentTime;
      this.musicSource=source;source.start(0,this.musicOffset%source.loopEnd);
      // Restart/return is soft, not a fresh attack in the middle of a piano note.
      this.music.gain.cancelScheduledValues(c.currentTime);this.music.gain.setValueAtTime(0,c.currentTime);
      this.music.gain.linearRampToValueAtTime(this.ambienceValue*(this.ducked?.18:1),c.currentTime+.45);
      this.musicStatus='playing';this.notify();
    }
    stopMusic() {
      if(this.musicSource){
        const source=this.musicSource;
        this.musicOffset=(this.musicOffset+this.context.currentTime-this.musicStarted)%source.loopEnd;
        source.stop();source.disconnect();this.musicSource=null;
      }
      if(this.musicBuffer)this.musicStatus='paused';
      this.notify();
    }
    retryMusic(){this.musicError=false;this.musicStatus=this.musicBuffer?'paused':'unloaded';this.syncMusic();this.notify();}
    musicLabel(){
      if(!this.enabled)return '声音已关闭 · 旁读与音效也已静音';
      if(!this.musicEnabled||!this.ambienceValue)return 'BGM 已关闭 · 旁读、磁带与操作音仍可使用';
      if(this.musicError)return '钢琴曲未能加载 · 其他声音不受影响，可重试';
      if(this.musicStatus==='loading')return '正在准备本地钢琴曲…';
      return `悬疑钢琴 · Haunting piano / Emma_MA · CC0 · ${profiles[this.profile]}`;
    }
    notify(){
      if(typeof document==='undefined')return;
      const e=document.querySelector('.sound-readout');if(e)e.textContent=this.musicLabel();
      const b=document.querySelector('[data-action="retry-music"]');if(b)b.hidden=!this.musicError;
    }
    configure({enabled,master,ambience,effects,musicEnabled}) {
      this.enabled=!!enabled;
      if(typeof musicEnabled==='boolean')this.musicEnabled=musicEnabled;
      if(!this.enabled)this.cancelEffects();
      const clamp=(n,f)=>Number.isFinite(n)?Math.max(0,Math.min(100,n))/100:f;
      this.masterValue=clamp(master,this.masterValue);this.ambienceValue=clamp(ambience,this.ambienceValue);this.effectsValue=clamp(effects,this.effectsValue);
      this.apply();
    }
    apply() {
      if(!this.context)return;
      const signature=[this.enabled,this.hidden,this.ducked,this.masterValue,this.ambienceValue,this.effectsValue,this.musicEnabled].join();
      if(signature===this.lastSettings)return;this.lastSettings=signature;
      const t=this.context.currentTime;
      const fade=(param,value,seconds)=>{
        if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(t);
        else {const current=param.value;param.cancelScheduledValues(t);param.setValueAtTime(current,t);}
        param.linearRampToValueAtTime(value,t+seconds);
      };
      // Finite ramps reach true digital silence at zero, rather than an asymptotic tail.
      fade(this.master.gain,this.enabled&&!this.hidden?this.masterValue*.7:0,.16);
      fade(this.music.gain,this.ambienceValue*(this.ducked?.18:1),.28);
      fade(this.effects.gain,this.effectsValue,.08);
      this.syncMusic();this.notify();
    }
    duck(value){this.ducked=!!value;this.apply();}
    async visibility(hidden){
      this.hidden=hidden;this.apply();
      if(!this.context)return;
      if(hidden){this.cancelEffects();await this.context.suspend();}
      else if(this.enabled){await this.context.resume();this.syncMusic();}
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
      return Object.freeze({enabled:this.enabled,state:this.context?.state||'not-created',profile:this.profile,label:this.musicLabel(),
        master:this.masterValue,ambience:this.ambienceValue,effects:this.effectsValue,ducked:this.ducked,hidden:this.hidden,
        ambienceVoices:0,noiseLoops:0,musicVoices:this.musicSource?1:0,musicState:this.musicStatus,musicEnabled:this.musicEnabled,music:this.ambienceValue,musicOffset:this.musicOffset,musicGain:this.music?.gain.value||0,activeEffects:this.activeEffects,rms});
    }
  }
  root.WeimingSound=new Soundscape();
})(window);
