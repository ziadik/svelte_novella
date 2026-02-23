-- =====================================================
-- СКРИПТ ДЛЯ ДОБАВЛЕНИЯ ИСТОРИЙ И АДМИНА
-- =====================================================

-- ВНИМАНИЕ: Замените placeholder значения на реальные данные перед выполнением!

-- --------------------------------------------------------
-- ШАГ 1: Создайте bucket для хранения JSON файлов (если ещё не создан)
-- --------------------------------------------------------
-- Это делается в интерфейсе Supabase Storage
-- Создайте публичный bucket с именем "stories"

-- --------------------------------------------------------
-- ШАГ 2: Загрузите JSON файлы историй в storage
-- --------------------------------------------------------
-- Загрузите файлы в bucket "stories":
-- - dracula.json -> stories/dracula.json
-- - zombie.json -> stories/zombie.json  
-- - fairy_tale.json -> stories/fairy_tale.json
-- - minigames.json -> stories/minigames.json

-- --------------------------------------------------------
-- ШАГ 3: Вставьте истории в таблицу stories
-- --------------------------------------------------------

-- История "Дракула"
INSERT INTO public.stories (title, author_id, json_url, is_public, allowed_players)
VALUES ('Дракула', NULL, 'stories/dracula.json', true, '{}')
ON CONFLICT DO NOTHING;

-- История "Выживание" (Zombie)
INSERT INTO public.stories (title, author_id, json_url, is_public, allowed_players)
VALUES ('Выживание', NULL, 'stories/zombie.json', true, '{}')
ON CONFLICT DO NOTHING;

-- История "Сказка"
INSERT INTO public.stories (title, author_id, json_url, is_public, allowed_players)
VALUES ('Сказка', NULL, 'stories/fairy_tale.json', true, '{}')
ON CONFLICT DO NOTHING;

-- История "Мини-игры"
INSERT INTO public.stories (title, author_id, json_url, is_public, allowed_players)
VALUES ('Мини-игры', NULL, 'stories/minigames.json', true, '{}')
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------
-- ШАГ 4: Создание админа (два варианта)
-- --------------------------------------------------------

-- ВАРИАНТ А: Создание через Supabase Dashboard
-- 1. Перейдите в Authentication -> Users
-- 2. Создайте пользователя с email admin@example.com
-- 3. Получите UUID пользователя из колонки ID
-- 4. Выполните запрос ниже с этим UUID

-- ВАРИАНТ Б: Если у вас уже есть пользователь, получите его UUID:
-- SELECT id, email FROM auth.users WHERE email = 'ваш_email';

-- После получения UUID, выполните (замените YOUR_ADMIN_UUID):
-- UPDATE public.profiles SET is_author = true WHERE user_id = 'YOUR_ADMIN_UUID';

-- --------------------------------------------------------
-- ШАГ 5: Сделать все истории публичными (если нужно)
-- --------------------------------------------------------
UPDATE public.stories SET is_public = true WHERE is_public = false;

-- --------------------------------------------------------
-- ПРОВЕРКА: Посмотреть все истории
-- --------------------------------------------------------
SELECT id, title, author_id, json_url, is_public, allowed_players 
FROM public.stories 
ORDER BY created_at;

-- --------------------------------------------------------
-- ПРОВЕРКА: Посмотреть всех авторов
-- --------------------------------------------------------
SELECT user_id, telegram_username, telegram_first_name, is_author 
FROM public.profiles 
WHERE is_author = true;
