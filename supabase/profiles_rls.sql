-- Включение RLS для таблицы profiles (если ещё не включено)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Удаление старых политик (если есть)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;

-- Политика: пользователь может читать только свой профиль
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: пользователь может обновлять только свой профиль
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Политика: авторизованные пользователи могут читать публичные профили (для будущих функций)
CREATE POLICY "Public can read profiles" ON public.profiles
  FOR SELECT
  USING (true);

-- Таблица stories - RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read stories" ON public.stories;
DROP POLICY IF EXISTS "Users can insert stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can update own stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can delete own stories" ON public.stories;

-- Политика: все могут читать публичные истории
CREATE POLICY "Anyone can read stories" ON public.stories
  FOR SELECT
  USING (is_public = true OR author_id = auth.uid());

-- Политика: авторизованные могут создавать истории
CREATE POLICY "Users can insert stories" ON public.stories
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Политика: автор может обновлять свои истории
CREATE POLICY "Authors can update own stories" ON public.stories
  FOR UPDATE
  USING (auth.uid() = author_id);

-- Политика: автор может удалять свои истории
CREATE POLICY "Authors can delete own stories" ON public.stories
  FOR DELETE
  USING (auth.uid() = author_id);
