-- schema
create table if not exists products (id bigserial primary key, name text not null, price numeric(12,2) not null default 0);
create table if not exists orders (id bigserial primary key, company_name text, taken_by text, end_customer_name text, contact_email text, image_url text, delivery_date date, total_excl_vat numeric(12,2) default 0, total_incl_vat numeric(12,2) default 0, created_at timestamp default now());
create table if not exists order_items (id bigserial primary key, order_id bigint not null references orders(id) on delete cascade, product_id bigint not null references products(id), color text, quantity int not null check (quantity > 0), note text, unit_price numeric(12,2) not null, line_total numeric(12,2) generated always as (quantity * unit_price) stored, produced boolean default false, packaged boolean default false, shipped boolean default false, created_at timestamp default now());
create table if not exists messages (id bigserial primary key, order_id bigint references orders(id) on delete cascade, sender text, content text, created_at timestamp default now());
create table if not exists needs (id bigserial primary key, department text not null, content text not null, is_done boolean default false, created_at timestamp default now());
create table if not exists announcements (id bigserial primary key, content text not null, is_active boolean default true, created_at timestamp default now());
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table messages enable row level security;
alter table needs enable row level security;
alter table announcements enable row level security;
create policy products_select on products for select using (true);
create policy orders_insert on orders for insert using (true) with check (true);
create policy order_items_insert on order_items for insert using (true) with check (true);
