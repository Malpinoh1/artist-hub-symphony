-- Expand artwork path replacement to text, JSON/JSONB, and text-like arrays.
-- The RPC remains service-role-only and is invoked only after a verified WebP upload.

CREATE OR REPLACE FUNCTION public._replace_artwork_path_in_jsonb(
  p_value jsonb,
  p_old_path text,
  p_new_path text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  CASE jsonb_typeof(p_value)
    WHEN 'string' THEN
      RETURN to_jsonb(replace(p_value #>> '{}', p_old_path, p_new_path));
    WHEN 'array' THEN
      SELECT COALESCE(
        jsonb_agg(public._replace_artwork_path_in_jsonb(value, p_old_path, p_new_path) ORDER BY ordinal),
        '[]'::jsonb
      )
      INTO result
      FROM jsonb_array_elements(p_value) WITH ORDINALITY AS a(value, ordinal);
      RETURN result;
    WHEN 'object' THEN
      SELECT COALESCE(
        jsonb_object_agg(
          replace(key, p_old_path, p_new_path),
          public._replace_artwork_path_in_jsonb(value, p_old_path, p_new_path)
        ),
        '{}'::jsonb
      )
      INTO result
      FROM jsonb_each(p_value) AS o(key, value);
      RETURN result;
    ELSE
      RETURN p_value;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public._replace_artwork_path_in_jsonb(jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._replace_artwork_path_in_jsonb(jsonb, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.replace_artwork_storage_path_references(
  p_old_path text,
  p_new_path text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
     OR p_new_path !~* '^[A-Za-z0-9_-]+/.+\.webp$' THEN
    RAISE EXCEPTION 'Invalid artwork storage paths';
  END IF;

  -- Text-like columns: search all public base tables, not just columns with image-like names.
  FOR item IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'character')
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = replace(%I, $1, $2) WHERE %I LIKE $3',
      item.table_schema, item.table_name, item.column_name,
      item.column_name, item.column_name
    ) USING p_old_path, p_new_path, '%' || p_old_path || '%';
    GET DIAGNOSTICS changed = ROW_COUNT;
    total_changed := total_changed + changed;
  END LOOP;

  -- JSON and JSONB columns, including nested object values and arrays.
  FOR item IN
    SELECT c.table_schema, c.table_name, c.column_name, c.udt_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('json', 'jsonb')
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = public._replace_artwork_path_in_jsonb(%I::jsonb, $1, $2)::%I WHERE %I::text LIKE $3',
      item.table_schema, item.table_name, item.column_name,
      item.column_name, item.udt_name, item.column_name
    ) USING p_old_path, p_new_path, '%' || p_old_path || '%';
    GET DIAGNOSTICS changed = ROW_COUNT;
    total_changed := total_changed + changed;
  END LOOP;

  -- Text, varchar, and char arrays. Preserve array order and null elements.
  FOR item IN
    SELECT c.table_schema, c.table_name, c.column_name,
           CASE c.udt_name WHEN '_text' THEN 'text' WHEN '_varchar' THEN 'varchar' WHEN '_bpchar' THEN 'bpchar' END AS element_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'ARRAY'
      AND c.udt_name IN ('_text', '_varchar', '_bpchar')
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = ARRAY(SELECT replace(value::text, $1, $2)::%I FROM unnest(%I) WITH ORDINALITY AS a(value, ordinal) ORDER BY ordinal) WHERE array_to_string(%I, $4) LIKE $3',
      item.table_schema, item.table_name, item.column_name,
      item.element_type, item.column_name, item.column_name
    ) USING p_old_path, p_new_path, '%' || p_old_path || '%', E'\n';
    GET DIAGNOSTICS changed = ROW_COUNT;
    total_changed := total_changed + changed;
  END LOOP;

  RETURN total_changed;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_artwork_storage_path_references(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_artwork_storage_path_references(text, text) TO service_role;
