-- Добавление поля bucket в таблицу stories (если ещё не добавлено)
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS bucket text;

-- Обновление существующих записей на основе json_url
-- Извлекаем название bucket из пути (например, stories/dracula.json -> stories)
UPDATE public.stories 
SET bucket = 
  CASE 
    WHEN json_url LIKE 'dracula/%' THEN 'dracula'
    WHEN json_url LIKE 'zombie/%' THEN 'zombie'
    WHEN json_url LIKE 'fairy_tale/%' THEN 'fairy_tale'
    WHEN json_url LIKE 'minigames/%' THEN 'minigames'
    WHEN json_url LIKE 'stories/%' THEN 'stories'
    ELSE 'stories'  -- по умолчанию
  END
WHERE bucket IS NULL;

-- Индекс для поиска по bucket
CREATE INDEX IF NOT EXISTS idx_stories_bucket ON public.stories(bucket);

-- Проверка
SELECT title, json_url, bucket, is_public FROM public.stories;
