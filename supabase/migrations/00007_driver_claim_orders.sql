-- Drivers can browse/claim unassigned ready_for_pickup orders
drop policy if exists orders_driver_select_unassigned_ready on shimai.orders;
create policy orders_driver_select_unassigned_ready
  on shimai.orders
  for select
  to authenticated
  using (
    shimai.is_driver()
    and driver_id is null
    and status = 'ready_for_pickup'::shimai.order_status
  );

drop policy if exists orders_driver_claim_unassigned on shimai.orders;
create policy orders_driver_claim_unassigned
  on shimai.orders
  for update
  to authenticated
  using (
    shimai.is_driver()
    and (
      driver_id = auth.uid()
      or (driver_id is null and status = 'ready_for_pickup'::shimai.order_status)
    )
  )
  with check (
    shimai.is_driver()
    and driver_id = auth.uid()
  );
