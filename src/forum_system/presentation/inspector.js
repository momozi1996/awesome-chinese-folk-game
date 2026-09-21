import * as THREE from '../vendor/three.module.js';
// Demand-rendered: zero idle animation frames, no global engine singleton/context.
export function createInspector(host, onFailure) {
  let renderer;
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});} catch(e){throw e;}
  let disposed=false;
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(36,1,.1,30), group=new THREE.Group();scene.add(group);
  // Seeded surface wear generated locally: no network textures and no AI lettering.
  const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=256;
  const ctx=texCanvas.getContext('2d'), image=ctx.createImageData(256,256);let seed=61;
  for(let i=0;i<image.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=(seed>>>16)/65535;
    image.data[i]=125+n*65;image.data[i+1]=101+n*47;image.data[i+2]=58+n*40;image.data[i+3]=255;}
  ctx.putImageData(image,0,0);
  const patina=new THREE.CanvasTexture(texCanvas);patina.colorSpace=THREE.SRGBColorSpace;
  const bronze=new THREE.MeshStandardMaterial({color:0xd1b77a,map:patina,bumpMap:patina,bumpScale:.014,metalness:.58,roughness:.52});
  const black=new THREE.MeshStandardMaterial({color:0x151b19,roughness:.7});
  const bulb=new THREE.MeshStandardMaterial({color:0xe6ddba,roughness:.24});
  const materials=[bronze,black,bulb], geometries=[];
  function mesh(g,m,x,y,z){geometries.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);group.add(o);return o;}
  mesh(new THREE.CylinderGeometry(.5,.54,.09,64),bronze,0,-.56,0);
  mesh(new THREE.CylinderGeometry(.1,.19,.48,40),bronze,0,-.3,0);
  for(const y of [-.51,-.43,-.17]){
    const ring=mesh(new THREE.TorusGeometry(y===-.51?.47:.12,.014,8,48),bronze,0,y,0);ring.rotation.x=Math.PI/2;
  }
  const points=[[0,0],[.18,.01],[.45,.05],[.69,.16],[.74,.23],[.71,.25],[.65,.18],[.43,.09],[.17,.055]].map(p=>new THREE.Vector2(...p));
  mesh(new THREE.LatheGeometry(points,64),bronze,0,-.1,0);
  mesh(new THREE.CylinderGeometry(.13,.13,.16,32),black,0,.06,0);
  const glass=mesh(new THREE.SphereGeometry(.19,32,24),bulb,0,.3,0);glass.scale.y=1.4;
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.49,0),new THREE.Vector3(.4,-.59,.3),new THREE.Vector3(.9,-.59,.1),new THREE.Vector3(1.2,-.59,-.45)]);
  mesh(new THREE.TubeGeometry(curve,48,.026,10,false),black,0,0,0);
  scene.add(new THREE.HemisphereLight(0xc4dce6,0x3a2918,2.4));
  function light(color,intensity,x,y,z){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);}
  light(0xffcd85,3,2,4,3);light(0x83bcde,2,-3,1,-2);
  camera.position.set(1.6,1.25,3.6);camera.lookAt(0,-.05,0);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','铜盏与电珠的可旋转结构示意；方向键旋转，Home 复位');canvas.tabIndex=0;canvas.style.touchAction='pan-y';host.append(canvas);
  function draw(){if(!disposed&&!document.hidden)renderer.render(scene,camera);}
  function resize(){if(disposed)return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();draw();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  let drag=null;
  const down=e=>{drag={x:e.clientX,y:e.clientY,rx:group.rotation.x,ry:group.rotation.y};canvas.setPointerCapture(e.pointerId);};
  const move=e=>{if(!drag)return;group.rotation.y=drag.ry+(e.clientX-drag.x)*.008;group.rotation.x=THREE.MathUtils.clamp(drag.rx+(e.clientY-drag.y)*.004,-.45,.45);draw();};
  const up=()=>{drag=null;};
  const reset=()=>{group.rotation.set(0,0,0);draw();};
  const rotate=n=>{group.rotation.y+=n;draw();};
  const key=e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();e.key==='Home'?reset():rotate(e.key==='ArrowLeft'?-.24:.24);}};
  const lost=e=>{e.preventDefault();dispose();onFailure();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',draw);
  function dispose(){if(disposed)return;disposed=true;observer.disconnect();document.removeEventListener('visibilitychange',draw);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('keydown',key);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());patina.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
  resize();return {rotate,reset,dispose};
}
