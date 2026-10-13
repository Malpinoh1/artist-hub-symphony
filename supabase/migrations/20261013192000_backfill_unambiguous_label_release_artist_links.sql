-- Repair legacy label releases only when there is exactly one signed artist
-- and the release currently repeats the label account name. Ambiguous releases
-- are deliberately left untouched for manual artist linking.
WITH sole_signed_artist AS (
  SELECT aa.owner_id, min(aa.id::text)::uuid AS artist_account_id,
         min(aa.artist_name) AS artist_name
  FROM public.artist_accounts aa
  WHERE aa.signing_status = 'signed'
    AND trim(aa.artist_name) <> ''
  GROUP BY aa.owner_id
  HAVING count(*) = 1
)
UPDATE public.releases r
SET artist_account_id = s.artist_account_id,
    artist_name = s.artist_name
FROM sole_signed_artist s
JOIN public.artists a ON a.id = s.owner_id
WHERE r.artist_id = s.owner_id
  AND a.account_type = 'label'
  AND r.artist_account_id IS NULL
  AND lower(trim(COALESCE(r.artist_name, ''))) = lower(trim(a.name));
