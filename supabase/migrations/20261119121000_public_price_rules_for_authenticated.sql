-- Visitantes autenticados devem ver os mesmos preços públicos dos visitantes anônimos.
alter policy "price rules public read" on public.listing_price_rules
  to anon, authenticated;
