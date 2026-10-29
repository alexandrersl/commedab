-- Schéma initial (specs techniques 3.3, 3.6, 5.5, 5.6).
-- Les identifiants sont générés par le client (UUID v7), sauf ceux que crée l'inscription.
-- Les clés étrangères vers une table métier passent par (household_id, id) : une ligne ne
-- peut référencer qu'une ligne de son propre household.

create table public.household (
  id uuid primary key default gen_random_uuid(),
  catalog_contribution boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_member (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household on delete cascade,
  user_id uuid not null unique references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create index on public.household_member (household_id);

create table public.category (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.household on delete cascade,
  key text not null,
  name text not null,
  position integer not null,
  system_key text check (system_key in ('fresh', 'frozen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, key),
  unique (household_id, id)
);

create table public.product (
  id uuid primary key,
  household_id uuid not null references public.household on delete cascade,
  name text not null check (btrim(name) <> ''),
  name_normalized text not null,
  category_id uuid,
  unit_label text not null default 'pièce',
  pack_size numeric(10, 3) not null default 1 check (pack_size > 0),
  declared_qty numeric(10, 3) check (declared_qty >= 0),
  declared_per_days smallint check (declared_per_days > 0),
  contents_qty numeric(10, 3) check (contents_qty > 0),
  contents_unit text,
  catalog_entry_id text,
  catalog_version smallint,
  catalog_qty numeric(10, 3) check (catalog_qty > 0),
  catalog_per_days smallint check (catalog_per_days > 0),
  archived_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (household_id, id),
  foreign key (household_id, category_id) references public.category (household_id, id)
);

create table public.recipe (
  id uuid primary key,
  household_id uuid not null references public.household on delete cascade,
  name text not null check (btrim(name) <> ''),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (household_id, id)
);

create table public.recipe_ingredient (
  id uuid primary key,
  household_id uuid not null references public.household on delete cascade,
  recipe_id uuid not null,
  product_id uuid not null,
  quantity numeric(10, 3) check (quantity > 0),
  unit text,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (household_id, recipe_id) references public.recipe (household_id, id),
  foreign key (household_id, product_id) references public.product (household_id, id)
);

create index on public.recipe_ingredient (household_id);
create unique index recipe_ingredient_once on public.recipe_ingredient (recipe_id, product_id)
  where deleted_at is null;

create table public.list_line (
  id uuid primary key,
  household_id uuid not null references public.household on delete cascade,
  product_id uuid not null,
  quantity numeric(10, 3) not null check (quantity > 0),
  origin text not null check (origin in ('suggestion', 'manual', 'recipe')),
  recipe_id uuid,
  checked_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (household_id, id),
  foreign key (household_id, product_id) references public.product (household_id, id),
  foreign key (household_id, recipe_id) references public.recipe (household_id, id)
);

-- Un produit a au plus une ligne non cochée (EF-2.9).
create unique index list_line_one_pending on public.list_line (household_id, product_id)
  where checked_at is null and deleted_at is null;

create table public.list_recipe (
  id uuid primary key,
  household_id uuid not null references public.household on delete cascade,
  recipe_id uuid not null,
  times smallint not null check (times >= 1),
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (household_id, recipe_id) references public.recipe (household_id, id)
);

create index on public.list_recipe (household_id);

create table public.stock_event (
  id uuid primary key,
  household_id uuid not null references public.household on delete cascade,
  product_id uuid not null,
  type text not null default 'purchased' check (type in ('purchased')),
  quantity numeric(10, 3) not null check (quantity >= 0),
  occurred_at timestamptz not null,
  list_line_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (household_id, product_id) references public.product (household_id, id),
  foreign key (household_id, list_line_id) references public.list_line (household_id, id)
);

create index on public.stock_event (household_id, product_id, occurred_at desc);

-- RLS (3.6, 5.5) : une politique par table, sur le household du compte. Les suppressions sont
-- retirées par les privilèges, sauf sur `stock_event` ; `household` et `household_member`
-- ne s'écrivent que par l'inscription et `delete_account`.

alter table public.household enable row level security;
alter table public.household_member enable row level security;

create policy household_member_own on public.household_member
  for select to authenticated using (user_id = (select auth.uid()));

create policy household_own on public.household
  for all to authenticated
  using (id in (select household_id from public.household_member where user_id = (select auth.uid())))
  with check (id in (select household_id from public.household_member where user_id = (select auth.uid())));

do $$
declare
  t text;
begin
  foreach t in array array[
    'category', 'product', 'recipe', 'recipe_ingredient', 'list_line', 'list_recipe', 'stock_event'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (household_id in (select household_id from public.household_member where user_id = (select auth.uid())))
         with check (household_id in (select household_id from public.household_member where user_id = (select auth.uid())))',
      t || '_own', t
    );
  end loop;
end
$$;

revoke all on public.household, public.household_member, public.category, public.product,
  public.recipe, public.recipe_ingredient, public.list_line, public.list_recipe,
  public.stock_event from anon, authenticated;
grant select on public.household_member to authenticated;
grant select, update on public.household to authenticated;
grant select, update on public.category to authenticated;
grant select, insert, update on public.product, public.recipe, public.recipe_ingredient,
  public.list_line, public.list_recipe to authenticated;
grant select, insert, update, delete on public.stock_event to authenticated;

-- Inscription (5.6) : household, lien du compte et rayons par défaut (7.4), dans l'ordre et
-- avec les noms de `DEFAULT_CATEGORIES` (packages/core/src/categories.ts).

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  new_household uuid;
begin
  insert into public.household default values returning id into new_household;
  insert into public.household_member (household_id, user_id) values (new_household, new.id);
  insert into public.category (household_id, key, name, position, system_key)
  select new_household, c.key, c.name, c.position, c.system_key
  from (values
    ('hygiene-beaute', 'Hygiène et beauté', 1, null),
    ('bebe-animaux', 'Bébé et animaux', 2, null),
    ('entretien-maison', 'Entretien et maison', 3, null),
    ('fruits-legumes', 'Fruits et légumes', 4, null),
    ('boulangerie', 'Boulangerie', 5, null),
    ('epicerie-salee', 'Épicerie salée', 6, null),
    ('epicerie-sucree', 'Épicerie sucrée', 7, null),
    ('boissons', 'Boissons', 8, null),
    ('cremerie', 'Crémerie', 9, 'fresh'),
    ('viande-poisson-traiteur', 'Viande, poisson, traiteur', 10, 'fresh'),
    ('surgeles', 'Surgelés', 11, 'frozen')
  ) as c (key, name, position, system_key);
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Suppression du compte (EF-5.6) : le household et toutes ses données, puis l'utilisateur.

create function public.delete_account() returns void
  language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'delete_account requires an authenticated user';
  end if;
  delete from public.household
  where id in (select household_id from public.household_member where user_id = auth.uid());
  delete from auth.users where id = auth.uid();
end
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Réplication vers PowerSync (5.3).
create publication powersync for table public.household, public.household_member,
  public.category, public.product, public.recipe, public.recipe_ingredient, public.list_line,
  public.list_recipe, public.stock_event;
