#!/usr/bin/env python3
# 为每家门店生成品牌风占位图（深绿底金字 + 门店名），上传到 Supabase store-images 桶并写回 stores.images。
# 同时把 miniprogram 的两张 1x1 黑色占位图替换为像样的中性占位图。
# 用法：python3 scripts/gen-upload-store-images.py
import os, json, uuid, urllib.request, urllib.parse, io
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # server/
MP_IMAGES = os.path.join(ROOT, '..', 'miniprogram', 'images')

def load_env():
    env = {}
    with open(os.path.join(ROOT, '.env')) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    return env

ENV = load_env()
URL = ENV['SUPABASE_URL'].rstrip('/')
KEY = ENV['SUPABASE_SERVICE_ROLE_KEY']

DARK_TOP = (36, 58, 44)     # #243a2c
DARK_BOT = (20, 32, 26)     # #14201a
GOLD = (201, 169, 106)      # #c9a96a
CREAM = (243, 234, 214)     # #f3ead6

def font(size):
    for p in ['/System/Library/Fonts/Hiragino Sans GB.ttc',
              '/System/Library/Fonts/STHeiti Medium.ttc',
              '/System/Library/Fonts/STHeiti Light.ttc']:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def center_text(draw, cx, y, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    w = box[2] - box[0]
    draw.text((cx - w / 2, y), text, font=fnt, fill=fill)

def make_card(title, w=750, h=500, sub='RYAN · 男士理发馆'):
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):  # 竖向渐变
        t = y / h
        r = int(DARK_TOP[0] + (DARK_BOT[0] - DARK_TOP[0]) * t)
        g = int(DARK_TOP[1] + (DARK_BOT[1] - DARK_TOP[1]) * t)
        b = int(DARK_TOP[2] + (DARK_BOT[2] - DARK_TOP[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    d = ImageDraw.Draw(img)
    center_text(d, w / 2, h / 2 - 110, 'RYAN', font(64), GOLD)
    center_text(d, w / 2, h / 2 - 20, title, font(78), CREAM)
    d.line([(w / 2 - 60, h / 2 + 90), (w / 2 + 60, h / 2 + 90)], fill=GOLD, width=3)
    center_text(d, w / 2, h / 2 + 110, sub, font(26), (154, 167, 159))
    return img

def png_bytes(img):
    buf = io.BytesIO(); img.save(buf, 'PNG'); return buf.getvalue()

def supa(method, path, data=None, headers=None):
    req = urllib.request.Request(URL + path, data=data, method=method)
    req.add_header('apikey', KEY)
    req.add_header('Authorization', 'Bearer ' + KEY)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req) as r:
        return r.read()

def upload(bucket, png):
    path = f'store-{uuid.uuid4()}.png'
    supa('POST', f'/storage/v1/object/{bucket}/{path}', data=png,
         headers={'Content-Type': 'image/png', 'x-upsert': 'true'})
    return f'{URL}/storage/v1/object/public/{bucket}/{path}'

# 1) 拉门店列表
stores = json.loads(supa('GET', '/rest/v1/stores?select=id,name&order=created_at'))
print(f'门店 {len(stores)} 家')
for s in stores:
    url = upload('store-images', png_bytes(make_card(s['name'])))
    body = json.dumps({'images': [url]}).encode()
    supa('PATCH', f"/rest/v1/stores?id=eq.{s['id']}", data=body,
         headers={'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    print(f"  ✓ {s['name']} -> {url}")

# 2) 替换 1x1 黑色占位图
make_card('门店', sub='RYAN · 男士理发馆').save(os.path.join(MP_IMAGES, 'placeholder-store.png'))
av = make_card('', w=256, h=256)
ImageDraw.Draw(av)  # avatar 占位：深绿底 + 金色 RYAN
av = make_card('理发师', w=256, h=256, sub='RYAN')
av.save(os.path.join(MP_IMAGES, 'placeholder-avatar.png'))
print('占位图已更新')
print('完成')
