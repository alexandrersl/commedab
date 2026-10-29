import { Schema, Table, column } from '@powersync/common';

// Schéma client : mêmes tables et colonnes que Postgres (specs techniques 2.9, 3.3). Les
// numériques arrivent en texte et sont lus en `real` ; les booléens en 0 ou 1 ; les dates en
// texte UTC.

const household = new Table({
  catalog_contribution: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const household_member = new Table({
  household_id: column.text,
  user_id: column.text,
  created_at: column.text,
});

const category = new Table({
  household_id: column.text,
  key: column.text,
  name: column.text,
  position: column.integer,
  system_key: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const product = new Table(
  {
    household_id: column.text,
    name: column.text,
    name_normalized: column.text,
    category_id: column.text,
    unit_label: column.text,
    pack_size: column.real,
    declared_qty: column.real,
    declared_per_days: column.integer,
    contents_qty: column.real,
    contents_unit: column.text,
    catalog_entry_id: column.text,
    catalog_version: column.integer,
    catalog_qty: column.real,
    catalog_per_days: column.integer,
    archived_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { name: ['name_normalized'] } },
);

const stock_event = new Table(
  {
    household_id: column.text,
    product_id: column.text,
    type: column.text,
    quantity: column.real,
    occurred_at: column.text,
    list_line_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { product: ['product_id', 'occurred_at'] } },
);

const list_line = new Table(
  {
    household_id: column.text,
    product_id: column.text,
    quantity: column.real,
    origin: column.text,
    recipe_id: column.text,
    checked_at: column.text,
    deleted_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { product: ['product_id'] } },
);

const list_recipe = new Table({
  household_id: column.text,
  recipe_id: column.text,
  times: column.integer,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipe = new Table({
  household_id: column.text,
  name: column.text,
  notes: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const recipe_ingredient = new Table(
  {
    household_id: column.text,
    recipe_id: column.text,
    product_id: column.text,
    quantity: column.real,
    unit: column.text,
    deleted_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { recipe: ['recipe_id'] } },
);

export const appSchema = new Schema({
  household,
  household_member,
  category,
  product,
  stock_event,
  list_line,
  list_recipe,
  recipe,
  recipe_ingredient,
});

export type AppTables = (typeof appSchema)['types'];
