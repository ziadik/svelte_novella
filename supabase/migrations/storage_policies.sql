-- =============================================
-- RLS Политики для Storage Buckets
-- =============================================

-- Разрешаем чтение всем (публичный доступ)
-- Для каждого bucket нужно создать политику

-- Политика для чтения (все могут читать)
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
USING ( bucket_id IN ('dracula', 'zombie', 'fairy_tale', 'minigames', 'stories') );

-- Политика для вставки (только авторизованные пользователи)
CREATE POLICY "Authenticated insert"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id IN ('dracula', 'zombie', 'fairy_tale', 'minigames', 'stories')
    AND auth.role() = 'authenticated'
);

-- Политика для обновления (только авторизованные пользователи)
CREATE POLICY "Authenticated update"
ON storage.objects
FOR UPDATE
USING (
    bucket_id IN ('dracula', 'zombie', 'fairy_tale', 'minigames', 'stories')
    AND auth.role() = 'authenticated'
);

-- Политика для удаления (только авторизованные пользователи)
CREATE POLICY "Authenticated delete"
ON storage.objects
FOR DELETE
USING (
    bucket_id IN ('dracula', 'zombie', 'fairy_tale', 'minigames', 'stories')
    AND auth.role() = 'authenticated'
);

-- =============================================
-- Альтернативный вариант: разрешить всем всё (для тестирования)
-- =============================================

-- ВНИМАНИЕ: Этот вариант открывает полный доступ для всех!
-- Раскомментируйте только для тестирования

/*
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;

CREATE POLICY "Allow all for stories"
ON storage.objects
FOR ALL
USING ( bucket_id IN ('dracula', 'zombie', 'fairy_tale', 'minigames', 'stories') )
WITH CHECK ( bucket_id IN ('dracula', 'zombie', 'fairy_tale', 'minigames', 'stories') );
*/
