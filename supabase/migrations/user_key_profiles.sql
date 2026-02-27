-- Таблица связи user_keys с profiles
-- Один profile может иметь множество user_keys (для разных устройств/браузеров)
-- Один user_key может быть связан только с одним profile

CREATE TABLE IF NOT EXISTS user_key_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_key VARCHAR(255) NOT NULL UNIQUE,
    profile_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого поиска по user_key
CREATE INDEX IF NOT EXISTS idx_user_key_profiles_user_key ON user_key_profiles(user_key);

-- Индекс для быстрого поиска по profile_id
CREATE INDEX IF NOT EXISTS idx_user_key_profiles_profile_id ON user_key_profiles(profile_id);

-- RLS политики
ALTER TABLE user_key_profiles ENABLE ROW LEVEL SECURITY;

-- Все пользователи могут читать свои связи
CREATE POLICY "Users can read own user_key_profiles" 
ON user_key_profiles FOR SELECT 
USING (profile_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- Пользователи могут добавлять свои связи
CREATE POLICY "Users can insert own user_key_profiles" 
ON user_key_profiles FOR INSERT 
WITH CHECK (profile_id = auth.uid());

-- Пользователи могут обновлять свои связи
CREATE POLICY "Users can update own user_key_profiles" 
ON user_key_profiles FOR UPDATE 
USING (profile_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- Только владелец может удалять
CREATE POLICY "Users can delete own user_key_profiles" 
ON user_key_profiles FOR DELETE 
USING (profile_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- Функция для связывания userKey с профилем при авторизации
-- Возвращает новый user_key если старый уже связан с другим профилем
CREATE OR REPLACE FUNCTION link_user_key_to_profile(
    p_user_key VARCHAR(255),
    p_profile_id UUID
) RETURNS VARCHAR(255) AS $$
DECLARE
    v_existing_profile_id UUID;
    v_new_user_key VARCHAR(255);
BEGIN
    -- Проверяем, связан ли уже этот userKey с каким-то профилем
    SELECT profile_id INTO v_existing_profile_id
    FROM user_key_profiles
    WHERE user_key = p_user_key;

    IF v_existing_profile_id IS NULL THEN
        -- userKey не связан - связываем с текущим профилем
        INSERT INTO user_key_profiles (user_key, profile_id)
        VALUES (p_user_key, p_profile_id)
        ON CONFLICT (user_key) DO NOTHING;
        
        RETURN p_user_key;
        
    ELSIF v_existing_profile_id = p_profile_id THEN
        -- userKey уже связан с этим профилем - всё ок
        RETURN p_user_key;
        
    ELSE
        -- userKey связан с другим профилем - создаём новый ключ
        -- Генерируем новый UUID для нового ключа
        v_new_user_key := gen_random_uuid()::VARCHAR;
        
        -- Связываем новый ключ с профилем
        INSERT INTO user_key_profiles (user_key, profile_id)
        VALUES (v_new_user_key, p_profile_id);
        
        -- Возвращаем новый ключ
        RETURN v_new_user_key;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения всех user_keys профиля
CREATE OR REPLACE FUNCTION get_profile_user_keys(p_profile_id UUID)
RETURNS TABLE(user_key VARCHAR(255), created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT ukp.user_key, ukp.created_at
    FROM user_key_profiles ukp
    WHERE ukp.profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
