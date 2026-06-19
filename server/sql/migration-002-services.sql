-- 迁移 002：服务项目增加 分类/说明/状态 字段（支持后台「服务项目管理」）
-- 在 Supabase SQL Editor 执行；幂等，可重复运行。

alter table services
  add column if not exists category text not null default '基础服务',
  add column if not exists description text,
  add column if not exists status text not null default 'active'; -- active=上架, inactive=下架

-- 给已有的种子服务补充分类与说明（按名称匹配，存在才更新；不影响预约数据）
update services set category='剪发造型', description='专业洗剪吹，含基础造型与日常打理建议。'      where name='男士剪发(洗剪吹)';
update services set category='剪发造型', description='进阶造型设计，结合脸型与气质量身打造。'      where name='造型设计(含造型)';
update services set category='潮流造型', description='渐变、油头等潮流发型，凸显型格质感。'        where name='渐变·油头造型';
update services set category='烫染',     description='纹理烫/定位烫，塑造蓬松自然的立体造型。'    where name='烫发(纹理·定位)';
