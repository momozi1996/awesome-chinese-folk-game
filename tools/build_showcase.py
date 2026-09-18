"""Compose repository art from owned game scenes + real captured screenshots.
Optional authoring dependency: Pillow. Never used by the game or launcher.
"""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--font',default='/System/Library/Fonts/Supplemental/Songti.ttc',help='CJK TTF/TTC font file (not redistributed)')
parser.add_argument('--latin-font',default='/System/Library/Fonts/Supplemental/Arial.ttf')
args=parser.parse_args()
def font(size,latin=False): return ImageFont.truetype(args.latin_font if latin else args.font,size)
W,H=1600,720
scene=Image.open(ROOT/'src/forum_system/assets/scenes/lamp.jpg').convert('RGB')
im=ImageOps.fit(scene,(W,H),centering=(0.5,0.55)).convert('RGBA')
shade=Image.new('RGBA',(W,H));d=ImageDraw.Draw(shade)
for x in range(W):
    opacity=int(236-135*(x/W)**1.4)
    d.line((x,0,x,H),fill=(5,14,17,opacity))
im=Image.alpha_composite(im,shade);d=ImageDraw.Draw(im)
ink=(219,214,197);faded=(152,163,157);red=(153,78,61)
d.line((72,65,1528,65),fill=(86,102,98),width=1)
d.text((76,89),'WEIMING  /  NIGHT ARCHIVE',font=font(20,True),fill=faded)
d.rectangle((78,162,121,206),outline=red,width=2);d.text((85,165),'未',font=font(28),fill=red)
d.text((75,236),'未明旧案柜',font=font(106),fill=ink)
d.text((82,379),'先留下证据。天亮以后，再决定相信什么。',font=font(31),fill=ink)
d.text((82,459),'读帖  /  私信  /  实地取证  /  拼合真相',font=font(25),fill=faded)
d.line((82,536,701,536),fill=(80,94,89),width=1)
d.text((82,566),'九个可玩案卷     五十八个待开发主题',font=font(26),fill=ink)
d.text((82,619),'AWESOME CHINESE FOLK GAME  ·  OFFLINE INVESTIGATION',font=font(17,True),fill=faded)
# Red archival stamp remains separate from any game clues.
d.rectangle((1320,510,1470,658),outline=red,width=2)
d.text((1341,530),'入夜',font=font(44),fill=red)
d.text((1341,587),'再查',font=font(44),fill=red)
im.convert('RGB').save(ROOT/'assets/cover_banner.png',optimize=True)
frames=[]
for name in ['serial-forum','reading-post','private-message','investigation','evidence-board']:
    pic=Image.open(ROOT/f'assets/screenshots/{name}.png').convert('RGB')
    pic=pic.resize((960,640),Image.Resampling.LANCZOS)
    frames.append(pic.quantize(colors=160,method=Image.Quantize.MEDIANCUT))
frames[0].save(ROOT/'assets/preview_gif.gif',save_all=True,append_images=frames[1:],duration=[1800,2400,2200,2600,2400],loop=0,optimize=True,disposal=2)
print('Built cover_banner.png and preview_gif.gif from local assets.')
