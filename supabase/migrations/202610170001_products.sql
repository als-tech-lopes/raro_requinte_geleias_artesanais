create extension if not exists "pgcrypto";
create type public.product_status as enum ('ativo', 'inativo', 'esgotado');

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description text not null check (char_length(short_description) between 10 and 180),
  description text,
  category text not null check (char_length(category) between 2 and 80),
  net_weight numeric(10, 3) not null check (net_weight > 0),
  unit text not null check (unit in ('kg', 'g', 'L', 'ml', 'unidade')),
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  estimated_cost numeric(12, 2) not null default 0 check (estimated_cost >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  status public.product_status not null default 'ativo',
  featured boolean not null default false,
  main_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on public.products(status);
create index products_category_idx on public.products(category);
create index products_featured_idx on public.products(featured) where featured = true;
create index product_images_product_id_idx on public.product_images(product_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_images_set_updated_at before update on public.product_images for each row execute function public.set_updated_at();
create trigger admin_users_set_updated_at before update on public.admin_users for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "Admins read own role" on public.admin_users for select to authenticated using (user_id = auth.uid());
create policy "Public reads active products" on public.products for select to anon using (status = 'ativo');
create policy "Admins read all products" on public.products for select to authenticated using (public.is_admin());
create policy "Admins insert products" on public.products for insert to authenticated with check (public.is_admin());
create policy "Admins update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete products" on public.products for delete to authenticated using (public.is_admin());
create policy "Public reads active product images" on public.product_images for select to anon using (exists(select 1 from public.products p where p.id = product_id and p.status = 'ativo'));
create policy "Admins manage product images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public reads product files" on storage.objects for select to anon using (bucket_id = 'product-images');
create policy "Admins upload product files" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins update product files" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins delete product files" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
