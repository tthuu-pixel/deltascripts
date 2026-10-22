-- Add a separate example section without changing any existing theory or question source.
ALTER TABLE topics ADD COLUMN examples TEXT NOT NULL DEFAULT '';
ALTER TABLE topics ADD COLUMN examples_preamble TEXT NOT NULL DEFAULT '';
