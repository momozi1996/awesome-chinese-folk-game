"""Original V5 patina/light pass for 未明; Blender 4/5, deterministic procedural materials.
Run: blender -b --python art/source/build_scenes.py -- [scene names]
No external assets, textures, fonts or network calls. Outputs live in this project.
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
random.seed(47)
def material(name, a, b=None, scale=5, rough=.8, metal=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*a,1); m.use_nodes=True
 n=m.node_tree.nodes; l=m.node_tree.links; bs=n.get('Principled BSDF'); bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
 noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=scale; noise.inputs['Detail'].default_value=5
 tex=n.new('ShaderNodeTexCoord'); stretch=n.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY'
 stretch.inputs[1].default_value=(2.5,20,.8) if 'cedar' in name or 'lacquer' in name else (1,1,1)
 l.new(tex.outputs['Generated'],stretch.inputs[0]);l.new(stretch.outputs[0],noise.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=(*a,1); ramp.color_ramp.elements[1].color=(*(b or a),1)
 l.new(noise.outputs['Fac'],ramp.inputs[0]); l.new(ramp.outputs[0],bs.inputs['Base Color'])
 bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.28; bump.inputs['Distance'].default_value=.026
 l.new(noise.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs[0],bs.inputs['Normal'])
 return m
wood=material('old cedar',(0.019,.014,.011),(.19,.105,.051),8)
red=material('faded cinnabar lacquer',(.055,.008,.007),(.29,.04,.018),12)
stone=material('wet limestone',(.035,.051,.051),(.19,.23,.21),7)
plaster=material('lime wall stains',(.04,.055,.054),(.29,.28,.22),2)
paper=material('aged rag paper',(.32,.25,.14),(.7,.63,.43),25)
metal=material('oxidised copper',(.05,.073,.055),(.21,.24,.13),8,.34,.6)
black=material('soot',(.006,.011,.014),(.025,.037,.038))
water=material('water',(.009,.02,.022),(.025,.048,.051),3,.095,.72)
cloth=material('undyed hanging cloth',(.13,.14,.12),(.5,.47,.35),40)
def box(name,p,s,mat=wood,bev=.03,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1, location=p); o=bpy.context.object; o.name=name; o.dimensions=s; o.rotation_euler.z=rot; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
 o.data.materials.append(mat)
 if bev:
  mod=o.modifiers.new('worn edges','BEVEL'); mod.width=bev; mod.segments=2; o.modifiers.new('normals','WEIGHTED_NORMAL')
 return o
def cyl(name,p,r,d,mat=wood,vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d,location=p); o=bpy.context.object; o.name=name; o.data.materials.append(mat); mod=o.modifiers.new('edge','BEVEL'); mod.width=.018; mod.segments=2; o.modifiers.new('normals','WEIGHTED_NORMAL');return o
def line(name,a,b,r=.018,mat=metal):
 a,b=Vector(a),Vector(b); o=cyl(name,(a+b)/2,r,(b-a).length,mat,12); o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def glow(p,power=90,color=(1,.46,.15),size=.5):
 d=bpy.data.lights.new('warm practical','POINT'); d.energy=power;d.color=color;d.shadow_soft_size=size;o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o);o.location=p

def lamp(x,y,z=2.5):
 cyl('lantern upper frame',(x,y,z+.36),.28,.05,wood)
 cyl('paper shade',(x,y,z),.27,.65,paper)
 for j in range(12):
  a=j*math.tau/12; line('bamboo ribs',(x+.273*math.cos(a),y+.273*math.sin(a),z-.3),(x+.273*math.cos(a),y+.273*math.sin(a),z+.3),.008,wood)
 cyl('lantern rim',(x,y,z-.36),.28,.05,wood);line('suspension',(x,y,z+.38),(x,y,3.65),.01)
 glow((x,y-.4,z),130)
def table(x,y,w=2):
 box('desk top',(x,y,1.02),(w,1,.11))
 for dx in [-w/2+.12,w/2-.12]:
  for dy in [-.36,.36]:box('table leg',(x+dx,y+dy,.48),(.09,.09,.97))
 box('carved apron',(x,y-.44,.85),(w-.2,.06,.18))
def pages(x,y,z=1.09,n=7):
 for i in range(n):
  a=random.uniform(-.1,.1);box('loose manuscript',(x+random.uniform(-.04,.04),y,z+i*.008),(.43,.56,.009),paper,.001,a)
 # thin ink columns instead of pseudo legible generated text
 for j in range(7):
  for k in range(10):
   if random.random()>.15:box('ink',(x-.15+j*.047,y-.2+k*.04,z+n*.008),(.014,random.uniform(.014,.025),.001),black,0)
def shelf(x,y):
 for xx in [x-.8,x+.8]:box('cabinet side',(xx,y,1.65),(.1,.48,3.3))
 for z in [.18,.86,1.55,2.24,2.98]:
  box('shelf',(x,y,z),(1.7,.55,.075))
  if z<2.9:
   for k in range(4):
    box('archive box',(x-.57+k*.38,y-.02,z+.21),(.3,.39,.33),wood)
    box('archive label',(x-.57+k*.38,y-.22,z+.21),(.11,.005,.19),paper,.001)
def architecture(courtyard=False):
 for i in range(-7,8):
  for j in range(-5,7):box('uneven paving',(i*.66+(j%2)*.33,j*.61,-.07+random.uniform(-.015,.015)),(.64,.59,.13),stone,.02)
 box('rear lime wall',(0,3.6,1.9),(10,.22,4),plaster)
 for x in [-4.3,-2.7,0,2.7,4.3]:
  box('cedar column',(x,2.6,1.9),(.18,.2,3.8))
  box('stone column base',(x,2.6,.12),(.33,.32,.24),stone)
 for z in [3.2,3.65]:box('horizontal lintel',(0,2.6,z),(9,.2,.2))
 for x in [-3.5,3.5]:
  box('window recess',(x,3.46,2),(1.25,.08,1.55),black)
  for i in range(7):box('lattice',(x-.54+i*.18,3.36,2),(.025,.04,1.5))
  for i in range(5):box('window crossbar',(x,3.32,1.32+i*.33),(1.17,.05,.025))
 for x in [-4.4,4.4]:box('side shadow wall',(x,.8,1.9),(.2,5.8,3.8),plaster)
 # high roof overhang, curved individual ceramic courses
 for j in range(6):
  y=1.25+j*.42;z=3.74+j*.085
  for i in range(35):
   o=box('old roof tile',(-4.35+i*.256,y,z),(.25,.47,.045),stone,.018);o.rotation_euler.x=.2
 if courtyard:
  box('moonlight opening',(0,3.44,2),(1.45,.05,2.9),black)
 else:
  box('back doorway',(0,3.45,1.38),(1.4,.05,2.75),black)
  for x in [-.8,.8]:box('door jamb',(x,3.35,1.38),(.13,.18,2.8))
 # broken plaster, wall inscriptions represented by faded strips
 for i in range(24):
  x=random.uniform(-4,4);z=random.uniform(.3,3)
  box('flaking wall',(x,3.475,z),(random.uniform(.05,.35),.008,random.uniform(.02,.09)),stone,.005)
 lamp(-2.72,2.1);lamp(2.72,2.1)
def well(x,y):
 for layer in range(4):
  for i in range(18):
   a=(i+layer%2*.5)*math.tau/18;box('well stone',(x+.87*math.cos(a),y+.87*math.sin(a),.14+layer*.23),(.34,.27,.22),stone,.035,a+math.pi/2)
 cyl('dark well water',(x,y,.07),.69,.02,water)
 for xx in [x-1.12,x+1.12]:box('well support',(xx,y,1.3),(.13,.14,2.6))
 line('winch crossbeam',(x-1.2,y,2.45),(x+1.2,y,2.45),.07,wood);line('well rope',(x,y,2.45),(x,y,.2),.013,cloth)
def mirror(x,y):
 # broad tarnished mirror, not a portal or face placeholder
 o=cyl('polished brass mirror',(x,y,1.75),.69,.06,metal,64);o.rotation_euler.x=math.pi/2
 for i in range(32):
  a=i*math.tau/32;line('mirror frame bead',(x+.73*math.cos(a),y,1.75+.73*math.sin(a)),(x+.73*math.cos(a+.12),y,1.75+.73*math.sin(a+.12)),.033,wood)
 box('mirror stand',(x,y,.63),(.13,.18,1.25));box('mirror foot',(x,y-.05,.12),(.7,.4,.12))
def garment(x,y):
 # Sleeved cloth silhouette with a rippled surface, not a hanging cuboid.
 verts=[];faces=[]
 for j in range(15):
  z=1.0+j*.105; half=.21 if j<10 else .48 if j<13 else .25
  for i in range(13):
   xx=(i/12*2-1)*half;verts.append((x+xx,y+.028*math.sin(i*2.5)+.013*math.cos(j),z))
 for j in range(14):
  for i in range(12):a=j*13+i;faces.append((a,a+1,a+14,a+13))
 mesh=bpy.data.meshes.new('worn jacket mesh');mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new('unclaimed old jacket',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(cloth)
 mod=o.modifiers.new('cloth thickness','SOLIDIFY');mod.thickness=.007
 line('jacket rail loop',(x,y,2.46),(x,y,2.85),.01,wood)
def render(name):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 courtyard=name in ['well','gate','caravan','snow'];architecture(courtyard)
 if name in ['lamp','wall']:
  shelf(-1.75,3.1);table(.9,.75,2.6);pages(.55,.65);pages(1.4,.9,n=3)
  for x in [.1,.85,1.6]:
   cyl('oil lamp foot',(x,.35,1.13),.1,.06,metal);cyl('oil bowl',(x,.35,1.26),.14,.06,metal);line('wick',(x,.35,1.25),(x,.35,1.32),.012,black)
   if x==.85:glow((x,.35,1.44),30)
  if name=='wall':
   for x in [1.2,1.65,2.1]:line('exposed voice pipe',(x,3.12,.4),(x,3.12,2.8),.043,metal)
   box('removed wall panel',(2.1,1,.12),(1.3,.8,.06));box('watchman chair',(-1,1.15,.5),(.55,.55,.13))
 elif name in ['mirror','wardrobe']:
  table(-1.2,1.1,2.3);mirror(-1.2,1.6);pages(-1.65,1);shelf(2.2,3.1)
  for i in range(5):
   x=.6+i*.38;garment(x,2.55+i*.04)
  line('clothes rail',(.35,2.55,2.85),(2.4,2.55,2.85),.035)
  if name=='wardrobe':
   box('archive trunk',(0,.2,.35),(1.6,.8,.65),wood);pages(-.4,.2,.7);box('copper comb',(.42,.1,.71),(.32,.08,.025),metal)
 elif name in ['well','postroom']:
  if name=='well':well(-.5,.6);box('sealed stone',(1.2,.2,.12),(.9,.7,.2),stone)
  else: table(0,.6,2.7);pages(-.55,.55);pages(.55,.4,n=4);shelf(-2.4,3.12);shelf(2.4,3.12)
  for i in range(5):box('letter packets',(-2.4+i*.4,2.3,.12),(.24,.35,.15),paper)
 elif name in ['gate','attic']:
  table(0,1.5,3);pages(.2,1.4)
  for i in range(7):box('ancestor tablet',(-1.16+i*.39,1.65,1.52),(.25,.11,.82),wood);box('paper name',(-1.16+i*.39,1.58,1.53),(.13,.01,.5),paper,.003)
  box('empty registry seat',(0,.15,.51),(.58,.58,.1));box('chair back',(0,.4,.92),(.59,.09,.8))
  if name=='attic':
   for x in [-2.3,2.3]:
    box('roof joist',(x,0,2.9),(.22,6,.22))
    for y in [-.8,.4,1.6]:box('clay document casket',(x,y,.28),(.7,.42,.48),stone)
 elif name=='bridal':
  box('sedan base',(-1.8,.9,.3),(1.3,1.25,.28),red)
  for x in [-2.38,-1.22]:
   for y in [.35,1.45]:box('sedan post',(x,y,1.1),(.08,.09,1.6),red)
  box('sedan roof',(-1.8,.9,1.94),(1.5,1.42,.13),red);box('sedan curtain',(-1.8,1.5,1.12),(1.05,.04,1.4),red)
  line('carrying rail',(-3,.4,.45),(-.6,.4,.45),.055,wood);table(.55,1,1.8);pages(.55,1);box('document chest',(2.1,.2,.4),(1,.7,.76));
 elif name=='caravan':
  for i in range(6):
   x=-2+i*.8;box('road post',(x,1.8,.7),(.1,.12,1.4));box('white road tag',(x,1.71,1.18),(.24,.015,.38),paper)
  table(1.6,.1,1.6);pages(1.6,.1);box('bell box',(-1.4,.1,.25),(.8,.6,.48));cyl('brass bell',(-1.4,.1,.65),.16,.32,metal)
 elif name=='snow':
  # interior threshold / snowy courtyard; blue pool light rather than blizzard overlay
  table(0,.9,3.6)
  for i in range(6):
   x=-1.4+i*.55;cyl('empty bowl',(x,.65,1.11),.16,.08,paper)
  for x in [-1.45,0,1.45]:box('stool',(x,-.05,.47),(.45,.45,.08));pages(1.2,1.1)
  box('snow sill',(-3.5,3.3,1.22),(1.3,.2,.08),cloth)
 elif name=='shadowplay':
  box('stage',(0,1.6,.3),(5,2,.6));box('paper theatre screen',(0,2.6,2.1),(3.1,.04,1.95),cloth)
  for x in [-1.9,1.9]:box('red stage curtain',(x,2.1,2.1),(.65,.1,2.25),red)
  table(-1.7,-.05,1.5);pages(-1.7,-.05);box('prop drawer',(1.7,-.05,.34),(1,.7,.62))
  for i in range(4):line('puppet control rod',(-.7+i*.4,1.4,.7),(-.7+i*.4,1.4,2.15),.014,wood)
 # V5 patina: weathered lower plaster, hairline cracks and irregular damp paving.
 moss=material('lower wall patina',(.025,.032,.027),(.08,.10,.071),11,.95)
 for i in range(66):
  x=random.uniform(-4.15,4.15);z=random.uniform(.06,.5)
  o=box('plaster damp edge',(x,3.471,z),(random.uniform(.025,.16),.004,random.uniform(.04,.36)),moss,.004)
 for i in range(14):
  x=random.uniform(-4.1,4.1); z=random.uniform(.8,3.2)
  for j in range(3):
   nx=x+random.uniform(-.075,.075);nz=z-random.uniform(.04,.13)
   line('hairline plaster age',(x,3.47,z),(nx,3.47,nz),.0018,moss);x,z=nx,nz
 # Low puddles follow paving; their shapes carry no gameplay information.
 for i in range(14):
  x=random.uniform(-3.5,3.5); y=random.uniform(-2.3,1.4)
  verts=[(x,y,.012)]; count=28
  for j in range(count):
   a=j*math.tau/count;r=random.uniform(.8,1.1)
   verts.append((x+math.cos(a)*r*.34,y+math.sin(a)*r*.14,.012))
  faces=[(0,j+1,(j+1)%count+1) for j in range(count)]
  mesh=bpy.data.meshes.new('damp patch');mesh.from_pydata(verts,[],faces);mesh.update()
  obj=bpy.data.objects.new('reflected eave light',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(water)
 # Fine cords and shelf binding, not legible extra evidence.
 for obj in list(bpy.context.scene.objects):
  if obj.name.startswith('archive box'):
   x,y,z=obj.location;line('archive binding',(x-.07,y-.222,z-.145),(x-.07,y-.222,z+.15),.005,cloth)
 # Foreground threshold, layered like a still from an investigation film.
 for x in [-3.8,3.9]:box('foreground doorway',(x,-2.3,1.7),(.28,.3,3.8),black)
 for i in range(7):
  box('faded paper notice',(-3.6+i*.24,3.33,1.7+random.uniform(-.12,.12)),(.14,.012,.39),paper,.002,random.uniform(-.08,.08))
 # leaves, small fragments and fine irregularities
 for i in range(48):
  box('fallen fragment',(random.uniform(-3.5,3.5),random.uniform(-1.6,2.4),.016),(.02+random.random()*.04,.08,.008),wood,.002,random.random()*6)
 world=bpy.data.worlds.new('blue hour');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.2,.25,1);world.node_tree.nodes['Background'].inputs[1].default_value=.065
 d=bpy.data.lights.new('moon through courtyard','AREA');d.energy=190;d.color=(.32,.60,.69);d.shape='DISK';d.size=6;o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o);o.location=(-2,-1,5)
 d=bpy.data.lights.new('soft warm bounce','AREA');d.energy=42;d.color=(.52,.67,.72);d.size=4;o=bpy.data.objects.new(d.name,d);bpy.context.collection.objects.link(o);o.location=(0,-3,3);o.rotation_euler=(Vector((0,1,1))-o.location).to_track_quat('-Z','Y').to_euler()
 pos={'wall':(2.3,-3.4,2.5),'wardrobe':(-1.4,-3.6,2.6),'postroom':(1.6,-4.1,2.7),'attic':(-2,-3.6,2.4)}.get(name,(-.55,-7.2,2.7)); target=(0,1.6,1.3); bpy.ops.object.camera_add(location=pos);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=35;bpy.context.scene.camera=cam
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
 scene.render.resolution_x=1920;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.15
 scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=94;scene.render.filepath=str(ROOT/'assets/scenes'/f'{name}.jpg')
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source'/'latest-set.blend'))
 bpy.ops.render.render(write_still=True)
names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['lamp','wall','mirror','wardrobe','well','postroom','gate','attic','bridal','caravan','snow','shadowplay']
for name in names:render(name)
