// 给所有理发师生成并上传头像（占位头像，来自 ui-avatars，可后续在后台替换为真实照片）
// 用法：node scripts/upload-avatars.js
require('dotenv').config();
const supabase = require('../src/supabase');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const { data: barbers, error } = await supabase.from('barbers').select('id, name, avatar_url');
  if (error) throw error;

  let done = 0;
  for (const b of barbers) {
    const api = `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&size=256&background=1f3026&color=c9a96a&bold=true&format=png`;
    const resp = await fetch(api);
    if (!resp.ok) { console.log(`✗ ${b.name} 头像下载失败 ${resp.status}`); continue; }
    const buf = Buffer.from(await resp.arrayBuffer());

    const path = `seed-${uuidv4()}.png`;
    const { error: upErr } = await supabase.storage.from('avatars')
      .upload(path, buf, { contentType: 'image/png', upsert: false });
    if (upErr) { console.log(`✗ ${b.name} 上传失败 ${upErr.message}`); continue; }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: updErr } = await supabase.from('barbers')
      .update({ avatar_url: pub.publicUrl }).eq('id', b.id);
    if (updErr) { console.log(`✗ ${b.name} 写库失败 ${updErr.message}`); continue; }

    done++;
    console.log(`✓ ${b.name}`);
  }
  console.log(`完成 ${done}/${barbers.length} 个理发师头像`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
