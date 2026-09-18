"""Original deterministic illustration. Reproduce with Python, Pillow and numpy."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import random, math
from pathlib import Path
random.seed(1721);W,H=1800,1050
im=Image.new('RGB',(W,H));d=ImageDraw.Draw(im)
for y in range(H):
 t=y/H;c=(int(23+17*math.sin(t*2.6)),int(31+20*math.sin(t*2.6)),int(29+14*math.sin(t*2.6)));d.line((0,y,W,y),fill=c)
cloud=Image.new('RGBA',(W,H));c=ImageDraw.Draw(cloud)
for i in range(100):
 x=random.randint(-200,1900);y=random.randint(70,640);r=random.randint(90,280);c.ellipse((x-r,y-r*.12,x+r,y+r*.12),fill=(100,114,103,random.randint(3,11)))
im=Image.alpha_composite(im.convert('RGBA'),cloud.filter(ImageFilter.GaussianBlur(25)));d=ImageDraw.Draw(im)
# Distant water-town silhouettes.
for i in range(11):
 x=-80+i*190;y=430+random.randint(-35,60);w=random.randint(180,230);h=random.randint(130,210)
 d.rectangle((x,y,x+w,y+h),fill=(29,38,33));d.polygon([(x-20,y+9),(x+20,y-7),(x+w*.5,y-75),(x+w-15,y-9),(x+w+35,y+8)],fill=(22,30,27));d.line([(x-20,y+9),(x+w+35,y+8)],fill=(50,61,50),width=2)
 for xx in range(x+30,x+w-25,43):d.rectangle((xx,y+30,xx+19,y+68),fill=(17,26,21));d.line((xx+8,y+30,xx+8,y+68),fill=(54,62,47))
d.polygon([(0,730),(1800,690),(1800,907),(0,861)],fill=(47,55,43))
for y in range(742,894,27):
 d.line((0,y,W,y-26),fill=(29,39,28),width=3)
 for x in range(-60,1840,130):
  xx=x+(y%54)*2;d.line((xx,y,xx+12,y+25),fill=(29,39,28),width=2)
# Main house: eroded plaster side and a timber front.
d.polygon([(430,346),(660,305),(660,736),(430,711)],fill=(78,81,62));d.polygon([(660,305),(1513,364),(1513,740),(660,736)],fill=(52,55,40))
for _ in range(7000):
 x=random.randint(434,655);y=random.randint(350,710);r=random.choice([1,1,2,3,5]);v=random.randint(41,84);d.ellipse((x,y,x+r,y+r),fill=(v,v+3,max(29,v-15)))
for x in range(666,1510,27):
 d.rectangle((x,360,x+24,730),fill=(random.randint(36,49),random.randint(42,51),random.randint(29,37)));d.line((x,360,x,732),fill=(18,25,16),width=2)
 for _ in range(18):
  xx=x+random.randrange(3,22);yy=random.randrange(370,720);d.line((xx,yy,xx+random.choice([-1,0,1]),min(728,yy+random.randrange(10,90))),fill=(55,61,41),width=1)
d.polygon([(355,355),(500,284),(617,186),(1255,222),(1444,333),(1584,381),(664,353)],fill=(21,28,24))
for row in range(12):
 t=row/11;y=226+t*139;x0=620-200*t;x1=1260+270*t;d.line((x0,y,x1,y+27),fill=(54-int(t*10),63-int(t*9),48-int(t*8)),width=2)
 for j in range(int((x1-x0)/19)):
  x=x0+j*19+(row%2)*9;yy=y+(x-x0)/(x1-x0)*27;d.arc((int(x),int(yy-6),int(x+19),int(yy+9)),0,160,fill=(65,74,54),width=1)
  if random.random()<.4:d.line((x,yy,x+2,yy+7),fill=(10,18,14),width=2)
d.line([(368,355),(465,335),(614,313),(1558,380),(1585,370)],fill=(87,91,65),width=5);d.line([(369,363),(664,361),(1578,389)],fill=(14,22,16),width=9);d.line([(594,184),(635,206),(1249,243),(1278,229)],fill=(68,80,58),width=6)
for x in [633,1504]:d.line((x,362,x,751),fill=(20,26,16),width=17);d.line((x+7,369,x+7,735),fill=(79,75,48),width=3)
d.rectangle((689,400,886,737),fill=(16,22,15));d.rectangle((700,411,875,730),fill=(42,39,26))
for x in range(706,872,20):
 d.line((x,414,x,730),fill=(18,24,15),width=3)
 for _ in range(10):
  xx=x+random.randint(3,17);yy=random.randint(415,690);d.line((xx,yy,xx,yy+random.randint(7,42)),fill=(66,59,36))
d.line((789,412,789,731),fill=(9,16,10),width=7)
for x in [766,809]:d.ellipse((x-7,565,x+7,585),outline=(114,97,54),width=2);d.ellipse((x-2,563,x+2,567),fill=(138,109,56))
d.rectangle((700,367,892,399),fill=(44,43,28),outline=(88,81,47),width=2)
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Songti.ttc',22);sm=ImageFont.truetype('/System/Library/Fonts/Supplemental/Songti.ttc',18)
except:font=ImageFont.load_default();sm=font
d.text((720,370),'南 湾 泵 房',font=font,fill=(159,146,93));d.rectangle((603,410,646,456),fill=(101,111,86),outline=(29,44,34),width=3);d.text((613,419),'17',font=sm,fill=(27,45,35))
# Window and ledger on the sill.
d.rectangle((947,413,1195,601),fill=(16,24,17),outline=(19,25,15),width=10);d.rectangle((958,424,1182,584),fill=(65,76,49))
for x in range(960,1190,31):d.line((x,421,x,586),fill=(25,33,19),width=7)
for y in range(427,586,32):d.line((958,y,1186,y),fill=(25,33,19),width=7)
d.polygon([(1009,544),(1022,495),(1047,481),(1062,498),(1077,556)],fill=(32,43,26));d.rectangle((935,603,1206,620),fill=(78,73,45));d.line((935,604,1206,604),fill=(138,126,77),width=2);d.polygon([(1011,604),(1017,592),(1091,594),(1098,607)],fill=(142,137,93));d.line((1054,594,1054,606),fill=(65,69,42),width=2)
# Rusted cabinet.
d.rectangle((1300,493,1410,727),fill=(50,62,45),outline=(23,34,23),width=4);d.line((1306,500,1403,500),fill=(93,103,65),width=2);d.rectangle((1312,508,1399,711),outline=(24,36,23),width=2);d.rectangle((1329,531,1384,550),fill=(127,127,83));d.text((1334,530),'防汛',font=sm,fill=(45,52,31));d.rectangle((1383,609,1390,628),fill=(103,102,59))
for _ in range(150):
 x=random.randint(1304,1407);y=random.randint(497,723);d.ellipse((x,y,x+2,y+4),fill=(73,68,40))
for x,y,w,h in [(483,449,52,82),(506,465,50,65),(568,575,30,45)]:
 d.polygon([(x,y),(x+w,y+2),(x+w-2,y+h),(x+3,y+h-3)],fill=(104,103,77))
 for yy in range(y+10,y+h-7,9):d.line((x+7,yy,x+w-6,yy+1),fill=(68,74,51))
reflection=im.crop((0,350,W,880)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).resize((W,180)).filter(ImageFilter.GaussianBlur(1.5))
for y in range(180):im.paste(reflection.crop((0,y,W,y+1)),(int(math.sin(y*.38)*8),880+y))
d=ImageDraw.Draw(im,'RGBA');d.rectangle((0,880,W,H),fill=(10,24,17,140))
for _ in range(950):
 x=random.randrange(W);y=random.randrange(883,H);w=random.randrange(2,70);d.line((x,y,x+w,y),fill=(98,117,76,random.randint(10,35)))
for n in range(5):
 y=743+n*27;x0=808-n*17;x1=1150+n*26;d.polygon([(x0,y),(x1,y),(x1+22,y+18),(x0-15,y+18)],fill=(66-n*4,73-n*4,50-n*3,255));d.line((x0,y,x1,y),fill=(104-n*8,112-n*8,76-n*6,255),width=2);d.line((x0-15,y+20,x1+22,y+20),fill=(15,30,16,255),width=4)
for _ in range(550):
 x=random.choice([random.randrange(0,420),random.randrange(1550,1800)]);y=random.randrange(775,902);h=random.randrange(12,70);d.line([(x,y),(x+random.randrange(-14,14),y-h)],fill=(23,40,24,220),width=random.choice([1,2]))
# Restrained cinnabar lantern.
glow=Image.new('RGBA',im.size);gd=ImageDraw.Draw(glow)
for r in range(100,0,-2):gd.ellipse((1443-r,449-r,1443+r,449+r),fill=(176,83,34,int(2+(1-r/100)*2)))
im=Image.alpha_composite(im.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(22)));d=ImageDraw.Draw(im,'RGBA');d.line((1443,363,1443,413),fill=(135,120,71,255),width=2);d.ellipse((1418,411,1469,487),fill=(109,49,31,255),outline=(135,76,39,255),width=2)
for dx in [-12,-4,4,12]:d.arc((1427+dx//2,412,1460+dx//2,486),80,280,fill=(164,98,50,190),width=1)
d.rectangle((1430,410,1455,416),fill=(29,34,18,255));d.rectangle((1430,483,1455,487),fill=(41,34,19,255));d.line((1443,487,1443,514),fill=(117,51,30,255),width=3);d.ellipse((913,907,1007,913),fill=(174,159,92,50));d.polygon([(940,887),(966,872),(991,887),(980,908),(951,908)],fill=(164,144,80,255));d.line((965,879,965,892),fill=(228,194,102,255),width=3)
# A crooked tree frames the empty building. No human image is used.
def branch(x,y,angle,length,width,depth):
 if depth<=0 or length<10:return
 ex=x+math.cos(angle)*length;ey=y+math.sin(angle)*length;d.line((int(x),int(y),int(ex),int(ey)),fill=(9,19,13,255),width=max(1,int(width)))
 branch(ex,ey,angle+random.uniform(-.3,.15),length*.73,width*.69,depth-1);branch(ex,ey,angle+random.uniform(.4,.9),length*.59,width*.5,depth-1)
 if depth>3:branch(ex,ey,angle-random.uniform(.3,.7),length*.52,width*.47,depth-1)
branch(119,900,-1.72,240,28,8);branch(0,230,-.18,290,17,7)
fog=Image.new('RGBA',im.size);fd=ImageDraw.Draw(fog)
for _ in range(23):
 x=random.randint(-200,1700);y=random.randint(855,1000);fd.ellipse((x,y-15,x+random.randint(180,450),y+18),fill=(138,147,116,random.randint(5,13)))
im=Image.alpha_composite(im,fog.filter(ImageFilter.GaussianBlur(20)))
a=np.asarray(im.convert('RGB')).astype(np.float32);rng=np.random.default_rng(1721);a+=rng.normal(0,2.2,(H,W,1));yy,xx=np.mgrid[0:H,0:W];v=1-.29*((xx-W*.54)/(W*.7))**2-.30*((yy-H*.48)/(H*.8))**2;a*=np.clip(v,.45,1)[:,:,None]
Image.fromarray(np.uint8(np.clip(a,0,255))).save(Path(__file__).parent/'town-night.jpg',quality=94)
print('Original scene saved:',(W,H))
