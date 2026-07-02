CREATE TABLE IF NOT EXISTS template_sizes (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  width        INTEGER NOT NULL,
  height       INTEGER NOT NULL,
  data         TEXT NOT NULL DEFAULT '{"elements":[]}',
  custom_html  TEXT NOT NULL DEFAULT '',
  custom_js    TEXT NOT NULL DEFAULT '',
  custom_css   TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Migrate any existing single-size template rows into template_sizes
INSERT INTO template_sizes (id, template_id, width, height, data, custom_html, custom_js, custom_css, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, width, height, data, custom_html, custom_js, custom_css, created_at, updated_at
FROM templates;

ALTER TABLE templates DROP COLUMN width;
ALTER TABLE templates DROP COLUMN height;
ALTER TABLE templates DROP COLUMN data;
ALTER TABLE templates DROP COLUMN custom_html;
ALTER TABLE templates DROP COLUMN custom_js;
ALTER TABLE templates DROP COLUMN custom_css;

CREATE INDEX IF NOT EXISTS idx_template_sizes_template_id ON template_sizes(template_id);
