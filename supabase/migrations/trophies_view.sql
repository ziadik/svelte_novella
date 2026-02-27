-- Создание view для трофеев (только игры с победами)
-- Этот скрипт создаёт view, который группирует события игр и показывает только те игры, где есть хотя бы одна победа
-- Учитывает связанные userKey из таблицы user_key_profiles

-- Удаляем старый view перед созданием нового
DROP VIEW IF EXISTS user_game_trophies;

CREATE VIEW user_game_trophies AS
SELECT 
    e.user_key,
    ukp.profile_id AS user_id,
    (e.event_data->>'game_id') AS game_id,
    (e.event_data->>'game_title') AS game_title,
    COUNT(*) FILTER (WHERE e.event_type = 'game_start') AS total_plays,
    COUNT(*) FILTER (WHERE e.event_type = 'game_win') AS wins,
    COUNT(*) FILTER (WHERE e.event_type = 'game_lose') AS losses,
    CASE 
        WHEN COUNT(*) FILTER (WHERE e.event_type = 'game_start') > 0
        THEN ROUND(
            COUNT(*) FILTER (WHERE e.event_type = 'game_win')::numeric / 
            COUNT(*) FILTER (WHERE e.event_type = 'game_start')::numeric * 100
        , 0)
        ELSE 0
    END AS win_rate,
    MIN(e.created_at) AS first_played,
    MAX(e.created_at) AS last_played
FROM user_events e
LEFT JOIN user_key_profiles ukp ON e.user_key = ukp.user_key
WHERE 
    e.event_type IN ('game_start', 'game_win', 'game_lose')
    AND e.event_data->>'game_id' IS NOT NULL
GROUP BY 
    e.user_key,
    ukp.profile_id,
    e.event_data
HAVING COUNT(*) FILTER (WHERE e.event_type = 'game_win') > 0
ORDER BY wins DESC, total_plays DESC;

-- Пример запроса для конкретного пользователя (по profile_id):
-- SELECT * FROM user_game_trophies WHERE user_id = 'uuid-профиля';

-- Пример запроса для гостя (без профиля):
-- SELECT * FROM user_game_trophies WHERE user_id IS NULL;
