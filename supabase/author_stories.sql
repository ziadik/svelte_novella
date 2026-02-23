-- Добавление поля is_author в profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_author boolean DEFAULT false;

-- Индекс для быстрого поиска авторов
CREATE INDEX IF NOT EXISTS idx_profiles_is_author ON public.profiles(is_author) WHERE is_author = true;

-- Добавление поля allowed_players в stories (список UUID игроков, которым разрешён доступ)
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS allowed_players uuid[] DEFAULT '{}';

-- Индекс для поиска историй по игроку
CREATE INDEX IF NOT EXISTS idx_stories_allowed_players ON public.stories USING GIN (allowed_players);

-- Обновление существующих RLS политик для поддержки новой логики
-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can read stories" ON public.stories;
DROP POLICY IF EXISTS "Users can insert stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can update own stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can delete own stories" ON public.stories;

-- Новые политики:

-- Все могут читать публичные истории
CREATE POLICY "Public stories are readable" ON public.stories
  FOR SELECT
  USING (is_public = true);

-- Авторы могут читать свои истории
CREATE POLICY "Authors can read own stories" ON public.stories
  FOR SELECT
  USING (author_id = auth.uid());

-- Игроки могут читать истории, к которым им открыт доступ
CREATE POLICY "Players can read allowed stories" ON public.stories
  FOR SELECT
  USING (auth.uid() = ANY(allowed_players));

-- Только авторы могут создавать истории
CREATE POLICY "Authors can insert stories" ON public.stories
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Только авторы могут обновлять свои истории
CREATE POLICY "Authors can update own stories" ON public.stories
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Только авторы могут удалять свои истории
CREATE POLICY "Authors can delete own stories" ON public.stories
  FOR DELETE
  USING (auth.uid() = author_id);
