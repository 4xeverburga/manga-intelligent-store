CREATE OR REPLACE FUNCTION match_mangas(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  jikan_id int,
  title text,
  synopsis text,
  genres text[],
  image_url text,
  score real,
  popularity int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.jikan_id,
    m.title,
    m.synopsis,
    m.genres,
    m.image_url,
    m.score,
    m.popularity,
    1 - (m.embedding <=> query_embedding)::float AS similarity
  FROM mangas m
  WHERE m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
