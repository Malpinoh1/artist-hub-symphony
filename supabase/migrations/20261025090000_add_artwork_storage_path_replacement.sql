-- Safely update image URL/path references when an artwork object is converted to WebP.
-- Called only by the admin-verified artwork-optimizer Edge Function using service_role.
CREATE OR REPLACE FUNCTION public.replace_artwork_storage_path_references(
  p_old_path text,
  p_new_path text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item record;
  changed integer;
  total_changed integer := 0;
BEGIN
  IF p_old_path IS NULL OR p_new_path IS NULL
     OR length(p_old_path) = 0 OR length(p_new_path) = 0
     OR p_old_path = p_new_path
     OR p_old_path !~ '^[A-Za-z0-9_-]+/.+$'
     OR p_new_path !~ '^[A-Za-z0-9_-]+/.+\.webp$' THEN
    RAISE EXCEPTION 'Invalid artwork storage paths';
  END IF;

  -- Only inspect URL/image/artwork-like text columns. Values are updated only
  -- when they contain the exact old bucket/path substring.
  FOR item IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'character')
      AND (
        c.column_name ILIKE '%url%'
        OR c.column_name ILIKE '%image%'
        OR c.column_name ILIKE '%artwork%'
        OR c.column_name ILIKE '%cover_art%'
        OR c.column_name ILIKE '%photo%'
        OR c.column_name ILIKE '%avatar%'
      )
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = replace(%I, $1, $2) WHERE %I LIKE $3',
      item.table_schema, item.table_name, item.column_name,
      item.column_name, item.column_name
    ) USING p_old_path, p_new_path, '%' || p_old_path || '%';
    GET DIAGNOSTICS changed = ROW_COUNT;
    total_changed := total_changed + changed;
  END LOOP;

  RETURN total_changed;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_artwork_storage_path_references(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_artwork_storage_path_references(text, text) TO service_role;
