-- Rythme déclaré enregistré en jours par unité (specs techniques 3.3, 4.3). Sans échelle :
-- la valeur relue est exactement celle écrite par le client, 7/6 compris.

alter table public.product
  add column declared_days_per_unit numeric check (declared_days_per_unit > 0);

update public.product
  set declared_days_per_unit = declared_per_days / declared_qty
  where declared_qty > 0 and declared_per_days > 0;

alter table public.product
  drop column declared_qty,
  drop column declared_per_days;
