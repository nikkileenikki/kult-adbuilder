-- flashtalking_credentials was never wired up to anything in the UI — the actual
-- Flashtalking API calls (publish, videos, video-upload, video-encode) read
-- FT_EMAIL/FT_PASSWORD from environment secrets instead, and the /api/flashtalking/
-- credentials endpoint had no frontend caller. Drop the unused table.
DROP TABLE IF EXISTS flashtalking_credentials;
