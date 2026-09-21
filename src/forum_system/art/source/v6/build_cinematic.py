"""V6 original procedural sets. Blender 5; no external assets.
Independent hall, corridor, and physical evidence closeup; not gameplay truth.
Run: blender -b --python art/source/v6/build_cinematic.py
"""
from pathlib import Path
BASE=Path(__file__).resolve().parents[3]
legacy=BASE/'art/source/build_scenes.py'
# Reuse only construction helpers, never the V5 render loop.
ns={'__file__':str(legacy)}
exec(compile(legacy.read_text().split('names=sys.argv')[0],str(legacy),'exec'),ns)
for k in ['bpy','math','random','Vector','box','cyl','line','material','glow','pages','shelf','wood','paper','stone','plaster','metal','black','cloth']:
 globals()[k]=ns[k]
OUT=BASE/'assets/scenes-v6';OUT.mkdir(exist_ok=True)
bronze=material('v6 hand-worn bronze',(.09,.046,.015),(.35,.21,.075),7,.35,.72)
porcelain=material('v6 frosted electric bulb',(.68,.6,.36),(.92,.82,.57),12,.3)
wire=material('v6 rubber cable',(.006,.006,.005),(.023,.025,.021),8,.65)

def area(name,pos,target,energy,color,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def bulb(x,y,z):
 cyl('copper foot',(x,y,z),.12,.04,bronze)
 cyl('copper stem',(x,y,z+.12),.046,.23,bronze)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=(x,y,z+.26));o=bpy.context.object;o.name='copper bowl';o.scale=(.24,.24,.074);o.data.materials.append(bronze)
 cyl('electrical socket',(x,y,z+.31),.058,.09,black)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=(x,y,z+.4));o=bpy.context.object;o.name='unlit frosted bulb';o.scale=(.075,.075,.12);o.data.materials.append(porcelain)
 for f in o.data.polygons:f.use_smooth=True
 # Cable connected to shared trunk, not magical flames.
 line('individual insulated lead',(x,y,z+.04),(x,y+.35,z+.01),.012,wire)

def base():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 random.seed(61)
 for x in range(-7,8):
  for y in range(-6,12):box('cut stone',(.62*x+(y%2)*.31,.58*y,-.06),(.605,.565,.12),stone,.01)
 world=bpy.data.worlds.new('v6 night air');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.21,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.025;bpy.context.scene.world=world

def hall():
 base()
 box('plaster rear',(0,4,2.2),(9,.18,4.5),plaster)
 box('left plaster',(-4,1,2.2),(.18,6,4.5),plaster)
 # Off-centre long window and deep opening on the right.
 for x in [-3.9,-1.7,1.7,4]:box('weathered post',(x,3.8,2),(.18,.3,4),wood)
 box('high beam',(0,3.75,3.8),(8.2,.32,.25),wood)
 for x in [1.9,2.45,3,3.55]:
  box('blue window',(x,3.87,2.3),(.48,.04,2.2),black)
  for z in [1.24,1.8,2.4,2.95,3.38]:box('window crossbar',(x,3.8,z),(.5,.08,.045),wood)
  box('vertical lattice',(x,3.77,2.3),(.028,.08,2.2),wood)
 shelf(-2.8,3.55)
 box('inner doorway',(.25,3.87,1.55),(1.25,.08,3.1),black)
 for x in [-.45,.95]:box('door trim',(x,3.7,1.6),(.12,.14,3.2),wood)
 # Diagonal viewpoint across one long worktable.
 box('broad desk',(-.1,.65,1),(4.5,1.5,.16),wood,.04)
 for x in [-2.1,1.9]:
  for y in [.04,1.22]:box('desk leg',(x,y,.47),(.16,.16,.94),wood)
 box('apron',(-.1,-.03,.8),(4.3,.11,.25),wood)
 for i in range(6):bulb(-1.67+i*.62,.62,1.1)
 line('single shared cable',(-1.67,.97,1.115),(2.07,.97,1.115),.017,wire)
 line('shared cable to wall',(2.07,.97,1.115),(2.45,3.8,1.3),.017,wire)
 pages(-1.35,-.28,1.095,9)
 box('closed register',(-.66,-.23,1.14),(.43,.56,.1),cloth,.005,-.08)
 for i in range(5):box('loose slips',(-1.4+i*.11,-.15,1.18+i*.007),(.2,.28,.005),paper,.001,.1*i)
 cyl('maintenance flashlight',(1.28,-.22,1.15),.058,.32,black).rotation_euler.y=math.pi/2
 # Worn surfaces and mundane set dressing; no new readable evidence.
 for i in range(110):
  x=random.uniform(-3.9,3.9);z=random.uniform(.15,3.8)
  box('lime flakes',(x,3.885,z),(random.uniform(.02,.22),.005,random.uniform(.01,.065)),stone,.003)
 for i in range(70):
  x=random.uniform(-2.1,1.9);y=random.uniform(-.03,1.2)
  box('desk wear',(x,y,1.085),(random.uniform(.025,.18),.003,.001),paper,0)
 for i in range(10):
  x=-3.4+i*.19
  box('old unreadable notice',(x,3.88,2.98+random.uniform(-.06,.06)),(.15,.012,.34),paper,.002)
 box('upper shadow lintel',(.5,-.5,3.55),(7,.35,.28),wood)
 box('foreground right jamb',(3.2,-1.8,1.95),(.32,.36,3.9),black)
 for x in [-3,-1,1,3]:box('ceiling beam',(x,2,3.95),(.17,4,.17),wood)
 cyl('empty storage pot',(-2.8,1.65,.3),.27,.6,stone)
 for i in range(24):
  box('floor fragments',(random.uniform(-3,3),random.uniform(-1,3),.015),(.03,.09,.008),wood,.001,random.random()*6)
 # Foreground framing without obscuring objects.
 box('near door post',(-3,-2.1,1.9),(.25,.32,3.8),wood)
 area('cold through high window',(2.8,3.2,3.3),(-1,0,.5),250,(.30,.57,1),.7)
 area('maintenance desk light',(-2,-1,3.4),(0,.5,1),155,(1,.55,.23),.8)
 area('soft reader fill',(0,-4,3),(0,1,1),18,(.65,.77,1),3)
 return (4.7,-6.8,3.7),(-.1,1.2,1.65),40

def passage():
 base()
 for x in [-1.35,1.35]:box('narrow lime walls',(x,2.2,2),(.16,9,4),plaster)
 for y in [-1,1,3,5,6.5]:
  for x in [-1.22,1.22]:box('corridor post',(x,y,1.9),(.14,.17,3.8),wood)
  box('overhead tie',(0,y,3.7),(2.5,.2,.2),wood)
 for y in [.3,1.8,3.8,5.3]:
  box('old piping',(1.21,y,.4),(.07,1.2,.07),metal)
 for i in range(90):
  x=random.choice([-1.255,1.255]);y=random.uniform(-1,6);z=random.uniform(.2,3.3)
  box('corridor lime flake',(x,y,z),(.008,random.uniform(.04,.2),random.uniform(.02,.09)),stone,.003)
 box('corridor ceiling',(0,2.2,3.9),(2.8,9,.2),wood)
 box('dark vanishing point',(0,6.65,2),(2.6,.1,4),black)
 # Open wall panel on left + low transfer shelf on right.
 box('service opening',(-1.24,1.85,1.7),(.04,1.3,1.1),black)
 for z in [1.1,2.28]:box('service edge',(-1.19,1.85,z),(.12,1.4,.08),wood)
 for y in [1.3,1.55,1.8,2.05,2.3]:line('cable behind plaster',(-1.13,y,1.22),(-1.13,y,2.15),.018,wire)
 box('transfer ledge',(.82,3.4,.9),(.7,1.6,.1),wood)
 pages(.8,3.2,.97,8)
 box('hanging shade',(.6,4.7,2.8),(.28,.28,.4),paper)
 glow((.5,4.45,2.65),35,(1,.40,.13))
 area('cold doorway',(.1,-2,3),(0,3,1),85,(.32,.54,1),1)
 area('raking task light',(.8,1,2.8),(-1.1,1.8,1.7),90,(1,.62,.28),.6)
 return (.38,-4.4,2.25),(-.2,3,1.7),33

def shot(name,pos,target,lens):
 bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;bpy.context.scene.camera=cam
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=True
 try:
  prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.refresh_devices()
  for d in prefs.devices:d.use=d.type=='METAL'
  if any(d.type=='METAL' for d in prefs.devices):s.cycles.device='GPU'
 except Exception:pass
 s.render.resolution_x=1920;s.render.resolution_y=1200;s.render.resolution_percentage=100
 s.view_settings.view_transform='AgX';s.view_settings.exposure=-.2
 s.render.image_settings.file_format='JPEG';s.render.image_settings.quality=93
 s.render.filepath=str(OUT/(name+'.jpg'))
 bpy.ops.render.render(write_still=True)
 # Save portable individual scene sources.
 s.render.filepath='//../../../assets/scenes-v6/'+name+'.jpg'
 bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'art/source/v6'/(name+'.blend')))
 from bpy_extras.object_utils import world_to_camera_view
 if name in ['hall','passage']:
  marks={'trace':(.2,.64,1.45),'register':(-1.35,-.28,1.16)} if name=='hall' else {'sealed':(-1.16,1.8,1.7),'transfer':(.8,3.2,.99)}
  for k,p in marks.items():
   q=world_to_camera_view(s,cam,Vector(p));print('HOTSPOT',k,round(q.x*100,2),round((1-q.y)*100,2),flush=True)

shot('hall',*hall())
shot('lamp-detail',(1.8,-1.7,2.55),(.5,.65,1.24),55)
shot('passage',*passage())
