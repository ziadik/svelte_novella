-- =====================================================
-- НАСТРОЙКА АДМИНИСТРАТОРА
-- =====================================================

-- Добавление поля is_admin в profiles (если ещё нет)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Индекс для быстрого поиска админов
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- --------------------------------------------------------
-- Сделать пользователя админом
-- --------------------------------------------------------
-- Замените USER_UUID на UUID вашего пользователя
-- Получить UUID: SELECT id, email FROM auth.users;

-- UPDATE public.profiles SET is_admin = true WHERE user_id = 'USER_UUID';

-- --------------------------------------------------------
-- Обновление RLS политик для админа
-- --------------------------------------------------------

-- Удаляем старые политики
DROP POLICY IF EXISTS "Authors can read own stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can update own stories" ON public.stories;
DROP POLICY IF EXISTS "Authors can delete own stories" ON public.stories;

-- Новые политики с поддержкой админа:

-- Читать могут все (публичные + свои для авторов + разрешённые для игроков + ВСЁ для админов)
CREATE POLICY "Anyone can read stories" ON public.stories
  FOR SELECT
  USING (
    is_public = true 
    OR author_id = auth.uid() 
    OR auth.uid() = ANY(COALESCE(allowed_players, '{}'))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Создавать могут авторы и админы
CREATE POLICY "Authors and admins can insert stories" ON public.stories
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Обновлять могут авторы (свои) и админы (все)
CREATE POLICY "Authors and admins can update stories" ON public.stories
  FOR UPDATE
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Удалять могут авторы (свои) и админы (все)
CREATE POLICY "Authors and admins can delete stories" ON public.stories
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- --------------------------------------------------------
-- Проверка: назначить существующего пользователя админом
-- --------------------------------------------------------
-- Выполните после создания пользователя:
-- UPDATE public.profiles SET is_admin = true WHERE user_id = 'YOUR_USER_UUID';

-- --------------------------------------------------------
-- Просмотр профилей с правами
-- --------------------------------------------------------
SELECT 
  p.user_id,
  p.telegram_username,
  p.telegram_first_name,
  p.is_author,
  p.is_admin,
  COUNT(s.id) FILTER (WHERE s.author_id = p.user_id) as stories_count
FROM public.profiles p
LEFT JOIN public.stories s ON s.author_id = p.user_id
GROUP BY p.user_id, p.telegram_username, p.telegram_first_name, p.is_author, p.is_admin
ORDER BY p.is_admin DESC, p.is_author DESC;
