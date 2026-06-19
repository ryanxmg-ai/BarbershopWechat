#!/usr/bin/env python3
# 生成底部 tabBar 图标（首页/门店/我的，各「未选中灰」「选中金」两版），输出到 miniprogram/images/tab/。
# 4 倍超采样后缩小，得到平滑边缘的 81x81 PNG，透明背景。
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '..', 'miniprogram', 'images', 'tab')
os.makedirs(OUT, exist_ok=True)

SIZE = 81
S = 4               # 超采样倍数
N = SIZE * S
GREY = (153, 153, 153, 255)   # #999999
GOLD = (201, 169, 106, 255)   # #c9a96a

def sc(v):  # 逻辑坐标(0..100) -> 像素
    return v / 100 * N

def home(d, c):
    d.polygon([(sc(50), sc(18)), (sc(16), sc(50)), (sc(84), sc(50))], fill=c)   # 屋顶
    d.rectangle([sc(28), sc(47), sc(72), sc(84)], fill=c)                        # 主体
    # 挖出门洞（透明）
    d.rectangle([sc(44), sc(62), sc(56), sc(84)], fill=(0, 0, 0, 0))

def shop(d, c):
    # 购物袋：袋体 + 提手
    d.rounded_rectangle([sc(28), sc(40), sc(72), sc(84)], radius=sc(7), fill=c)
    w = int(sc(5))
    d.arc([sc(38), sc(24), sc(62), sc(52)], start=180, end=360, fill=c, width=w)  # 提手

def mine(d, c):
    d.ellipse([sc(37), sc(18), sc(63), sc(44)], fill=c)        # 头
    d.ellipse([sc(24), sc(52), sc(76), sc(104)], fill=c)       # 肩/身（底部出界裁切成肩形）

GLYPHS = {'home': home, 'shop': shop, 'mine': mine}

def render(glyph, color):
    img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    glyph(d, color)
    return img.resize((SIZE, SIZE), Image.LANCZOS)

for name, fn in GLYPHS.items():
    render(fn, GREY).save(os.path.join(OUT, f'{name}.png'))
    render(fn, GOLD).save(os.path.join(OUT, f'{name}-on.png'))
    print(f'  ✓ {name}.png / {name}-on.png')

print('tab 图标已生成 ->', os.path.normpath(OUT))
