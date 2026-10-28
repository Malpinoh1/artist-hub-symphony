create or replace function public.enforce_release_submission_gate()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
  v_credit_id uuid;
  v_invoice_id uuid;
  v_claimed integer;
begin
  if public.user_has_distribution_role() then return NEW; end if;
  v_result := public.check_release_submission_allowed(NEW.artist_id);
  if coalesce((v_result->>'allowed')::boolean, false) = false then
    raise exception 'Release submission requires payment. Pay the distribution invoice, choose Pay-Per-Release, or subscribe.' using errcode = 'check_violation';
  end if;
  if v_result->>'reason' = 'credit' then
    v_credit_id := (v_result->>'credit_id')::uuid;
    update public.release_credits set status='used', consumed_at=now(), consumed_release_id=NEW.id
      where id=v_credit_id and status='available';
    get diagnostics v_claimed = row_count;
    if v_claimed = 0 then raise exception 'Release credit was already consumed; retry submission' using errcode='check_violation'; end if;
  elsif v_result->>'reason' = 'distribution_invoice' then
    v_invoice_id := (v_result->>'invoice_id')::uuid;
    update public.distribution_invoices set release_authorized_at=now(), release_id=NEW.id, updated_at=now()
      where id=v_invoice_id and release_authorized_at is null and release_id is null
        and (status='paid' or (allow_release_before_full_payment=true and status in ('issued','partially_paid','overdue')));
    get diagnostics v_claimed = row_count;
    if v_claimed = 0 then raise exception 'Distribution invoice exception was already used; retry submission' using errcode='check_violation'; end if;
  end if;
  return NEW;
end;
$function$;
drop trigger if exists attach_distribution_invoice_to_release on public.releases;
drop function if exists public.attach_distribution_invoice_to_release();
alter table public.distribution_invoices drop column if exists release_claim_txid;
revoke all on function public.enforce_release_submission_gate() from public, anon, authenticated;
