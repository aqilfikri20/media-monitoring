CREATE TABLE mentions (
    id BIGSERIAL PRIMARY KEY,
    external_id TEXT,
    source TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    engagement INT,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
)