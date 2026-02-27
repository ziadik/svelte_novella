-- Создание view для трофеев (только игры с победами)
-- Этот скрипт создаёт view, который группирует события игр и показывает только те игры, где есть хотя бы одна победа

CREATE OR REPLACE VIEW user_game_trophies AS
SELECT 
    user_key,
    (event_data->>'game_id') AS game_id,
    (event_data->>'game_title') AS game_title,
    COUNT(*) FILTER (WHERE event_type = 'game_start') AS total_plays,
    COUNT(*) FILTER (WHERE event_type = 'game_win') AS wins,
    COUNT(*) FILTER (WHERE event_type = 'game_lose') AS losses,
    CASE 
        WHEN COUNT(*) FILTER (WHERE event_type = 'game_start') > 0
        THEN ROUND(
            COUNT(*) FILTER (WHERE event_type = 'game_win')::numeric / 
            COUNT(*) FILTER (WHERE event_type = 'game_start')::numeric * 100
        , 0)
        ELSE 0
    END AS win_rate,
    MIN(created_at) AS first_played,
    MAX(created_at) AS last_played
FROM user_events
WHERE 
    event_type IN ('game_start', 'game_win', 'game_lose')
    AND event_data->>'game_id' IS NOT NULL
GROUP BY 
    user_key,
    event_data
HAVING COUNT(*) FILTER (WHERE event_type = 'game_win') > 0
ORDER BY wins DESC, total_plays DESC;

-- Пример запроса для проверки:
-- SELECT * FROM user_game_trophies WHERE user_key = 'your_user_key';
