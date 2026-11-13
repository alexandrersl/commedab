-- Suppression logique d'un produit jamais acheté ou archivé (EF-3.9, specs techniques 3.2).

alter table public.product
  add column deleted_at timestamptz;
