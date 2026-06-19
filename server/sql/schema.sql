-- 门店
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  business_hours text not null default '10:00-22:00',
  phone text,
  images jsonb not null default '[]'::jsonb,
  status text not null default 'open',        -- open | closed
  rating numeric(2,1) not null default 4.8,
  review_count int not null default 0,
  city text not null default '上海',
  created_at timestamptz not null default now()
);

-- 理发师
create table if not exists barbers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  title text not null default '发型师',        -- 店长 | 高级发型师 | 发型师
  avatar_url text,
  specialties jsonb not null default '[]'::jsonb,
  rating numeric(2,1) not null default 4.8,
  review_count int not null default 0,
  years_experience int not null default 1,
  bio text,
  status text not null default 'active',        -- active | resting
  created_at timestamptz not null default now()
);

-- 服务项目
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '基础服务',
  description text,
  price numeric(10,2) not null,
  duration int not null default 30,
  status text not null default 'active',        -- active=上架 | inactive=下架
  sort_order int not null default 0
);

-- 预约
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_phone text not null,
  store_id uuid not null references stores(id),
  barber_id uuid not null references barbers(id),
  service_id uuid not null references services(id),
  appointment_date date not null,
  appointment_time text not null,
  status text not null default 'confirmed',     -- pending | confirmed | completed | cancelled
  payment_method text not null default 'wechat',-- wechat | balance
  amount numeric(10,2) not null default 0,
  remark text,
  created_at timestamptz not null default now()
);

-- 同一理发师同一时段在“未取消”状态下唯一
create unique index if not exists uniq_active_slot
  on appointments (barber_id, appointment_date, appointment_time)
  where status <> 'cancelled';

create index if not exists idx_barbers_store on barbers(store_id);
create index if not exists idx_appt_phone on appointments(user_phone);
create index if not exists idx_appt_date on appointments(appointment_date);

-- 管理员
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null
);
