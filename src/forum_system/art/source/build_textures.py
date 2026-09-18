"""Deterministic, seamless paper/cloth surface textures; no downloaded assets.
Optional authoring dependencies: Pillow, numpy. Runtime uses only local WebP files.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/textures';OUT.mkdir(exist_ok=True)
rng=np.random.default_rng(1847);N=512
# Periodic low-frequency waves avoid visible tile edges.
y,x=np.mgrid[0:N,0:N];cloud=np.zeros((N,N))
for _ in range(24):
 a,b=rng.integers(1,8,size=2);cloud+=np.sin(2*np.pi*(a*x+b*y)/N+rng.random()*6.28)/(a+b)
noise=rng.normal(0,2.0,(N,N));surface=cloud*7+noise
for name,base in [('paper-fibers',(198,184,148)),('archive-cloth',(29,37,35))]:
 arr=np.clip(np.array(base)[None,None,:]+surface[:,:,None]*(1 if name.startswith('paper') else .32),0,255).astype('uint8')
 im=Image.fromarray(arr);d=ImageDraw.Draw(im,'RGBA')
 if name.startswith('paper'):
  for _ in range(2200):
   a,b=rng.integers(0,N,size=2);d.line((int(a),int(b),int(a+rng.integers(-8,8)),int(b+rng.integers(1,7))),fill=(64,49,29,int(rng.integers(5,22))),width=1)
 else:
  for i in range(0,N,3):d.line((i,0,i,N),fill=(131,142,121,9));d.line((0,i,N,i),fill=(0,0,0,25))
 im.save(OUT/(name+'.webp'),quality=88)
print(OUT)
