-- Add price column to manga_volumes
ALTER TABLE manga_volumes ADD COLUMN price real NOT NULL DEFAULT 29.90;

-- Set varied prices for existing volumes (S/ 25–45, rounded to nearest 0.10)
UPDATE manga_volumes
SET price = ROUND((25 + random() * 20)::numeric, 1);
