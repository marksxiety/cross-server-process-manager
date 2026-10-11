/**
 * Replaces the per-field `template_keys` rows with a single sparse `values`
 * jsonb object on `templates`. Templates are guides: a field is either present
 * with a starting value or absent. The `is_required`/`is_hidden` field states
 * are dropped; hidden entries are not carried over, and every other value is
 * converted to its native JSON type so the payload stays sparse.
 *
 * All statements are issued as raw SQL (not queued builder steps) because the
 * data migration must run after the new column exists and before the old table
 * is dropped.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = async (pgm) => {
  await pgm.db.query(
    `ALTER TABLE templates ADD COLUMN IF NOT EXISTS values jsonb NOT NULL DEFAULT '{}'::jsonb`
  )

  // Aggregate the old rows into one object per template, converting each value
  // by its stored data_type. Hidden rows are dropped.
  await pgm.db.query(`
    UPDATE templates t
    SET values = COALESCE(agg.values, '{}'::jsonb)
    FROM (
      SELECT template_id,
             jsonb_object_agg(property_key, value) AS values
      FROM (
        SELECT template_id,
               property_key,
               CASE data_type
                 WHEN 'number'  THEN to_jsonb(property_value::numeric)
                 WHEN 'boolean' THEN to_jsonb(property_value::boolean)
                 WHEN 'array'   THEN property_value::jsonb
                 WHEN 'object'  THEN property_value::jsonb
                 ELSE to_jsonb(property_value)
               END AS value
        FROM template_keys
        WHERE property_value IS NOT NULL
          AND btrim(property_value) <> ''
          AND is_hidden = false
      ) converted
      GROUP BY template_id
    ) agg
    WHERE t.id = agg.template_id
  `)

  await pgm.db.query(`DROP TABLE IF EXISTS template_keys`)
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = async (pgm) => {
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS template_keys (
      id serial PRIMARY KEY,
      template_id integer NOT NULL REFERENCES templates(id) ON DELETE CASCADE ON UPDATE CASCADE,
      property_key varchar(100) NOT NULL,
      property_value text,
      is_required boolean NOT NULL DEFAULT false,
      is_hidden boolean NOT NULL DEFAULT false,
      data_type varchar(10) NOT NULL,
      created_at timestamp NOT NULL DEFAULT current_timestamp,
      updated_at timestamp NOT NULL DEFAULT current_timestamp,
      CONSTRAINT template_keys_template_id_property_key_unique UNIQUE (template_id, property_key)
    )
  `)

  await pgm.db.query(`
    INSERT INTO template_keys
      (template_id, property_key, property_value, data_type, is_required, is_hidden)
    SELECT t.id,
           kv.key,
           CASE WHEN jsonb_typeof(kv.value) IN ('array', 'object')
                THEN kv.value::text
                ELSE trim(both '"' from kv.value::text)
           END,
           CASE jsonb_typeof(kv.value)
             WHEN 'number'  THEN 'number'
             WHEN 'boolean' THEN 'boolean'
             WHEN 'array'   THEN 'array'
             WHEN 'object'  THEN 'object'
             ELSE 'string'
           END,
           false,
           false
    FROM templates t
    CROSS JOIN LATERAL jsonb_each(t.values) AS kv
    ORDER BY t.id, kv.key
  `)

  await pgm.db.query(`ALTER TABLE templates DROP COLUMN IF EXISTS values`)
}
