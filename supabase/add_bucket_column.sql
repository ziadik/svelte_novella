-- Добавление поля bucket в таблицу stories
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS bucket text DEFAULT 'stories';

-- Обновление существующих записей
UPDATE public.stories 
SET bucket = 'stories' 
WHERE bucket IS NULL;

-- Индекс для поиска по bucket
CREATE INDEX IF NOT EXISTS idx_stories_bucket ON public.stories(bucket);

-- Обновление RLS (если нужно)
-- Политика уже создана в предыдущих скриптах
