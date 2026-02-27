// stores/userKeyStore.ts
import { writable, type Writable, get } from "svelte/store";
import { supabase } from "../supabaseClient";
import { v4 as uuid } from "uuid";
import type { Json } from "../types/supabase";

// Интерфейсы для типизации
interface UserKeyData {
  id?: number;
  user_key: string;
  created_at?: string;
  last_visit?: string;
  visit_count?: number;
  user_agent?: string | null;
  referrer?: string | null;
  country?: string | null;
}

interface UserStats {
  id: number;
  user_key: string;
  created_at: string;
  last_visit: string;
  visit_count: number;
  user_agent: string | null;
  referrer: string | null;
  country: string | null;
}

// Типы событий аналитики
type AnalyticsEventType = 
  | 'story_start' 
  | 'story_complete' 
  | 'game_start' 
  | 'game_win' 
  | 'game_lose'
  | 'session_time';

interface AnalyticsEventData {
  story_id?: string;
  story_title?: string;
  game_id?: string;
  game_title?: string;
  duration_seconds?: number;
  dialogue_count?: number;
}

// Интерфейс для статистики игры
interface GameStats {
  gameId: string;
  gameTitle: string;
  totalPlays: number;
  wins: number;
  losses: number;
  winRate: number;
}

// Тип для хранилища
interface UserKeyStore {
  subscribe: Writable<string | null>["subscribe"];
  init: () => Promise<string | null>;
  getUserStats: (userKey: string) => Promise<UserStats | null>;
  regenerateKey: () => Promise<string | null>;
  clearKey: () => void;
  // Аналитика
  trackEvent: (eventType: AnalyticsEventType, eventData?: AnalyticsEventData) => Promise<void>;
  trackStoryStart: (storyId: string, storyTitle: string) => Promise<void>;
  trackStoryComplete: (storyId: string, storyTitle: string, dialogueCount: number) => Promise<void>;
  trackGameStart: (gameId: string, gameTitle: string, storyId?: string) => Promise<void>;
  trackGameResult: (gameId: string, gameTitle: string, won: boolean, storyId?: string) => Promise<void>;
  // Трофеи
  getGameStats: () => Promise<GameStats[]>;
  // Трекинг времени
  startSessionTimer: () => void;
  stopSessionTimer: () => Promise<void>;
  getCurrentKey: () => string | null;
}

// Функция для обновления статистики
async function updateUserStats(
  userKey: string,
  userAgent: string,
): Promise<void> {
  try {
    // Получаем текущие данные
    const { data: user, error: fetchError } = await supabase
      .from("user_keys")
      .select("visit_count")
      .eq("user_key", userKey)
      .single<{ visit_count: number }>();

    if (fetchError) {
      console.error("Error fetching user stats:", fetchError);
      return;
    }

    // Обновляем счетчик и дату последнего визита
    const { error: updateError } = await supabase
      .from("user_keys")
      .update({
        visit_count: (user?.visit_count || 0) + 1,
        last_visit: new Date().toISOString(),
        user_agent: userAgent,
      })
      .eq("user_key", userKey);

    if (updateError) {
      console.error("Error updating user stats:", updateError);
    } else {
      console.log("User stats updated for:", userKey);
    }
  } catch (error) {
    console.error("Error in updateUserStats:", error);
  }
}

// Трекер времени сессии
let sessionStartTime: number | null = null;

// Функция для записи события аналитики
async function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  eventData?: AnalyticsEventData
): Promise<void> {
  const userKey = get(userKeyStore);
  if (!userKey) {
    console.warn("[Analytics] No user key, skipping event:", eventType);
    return;
  }

  try {
    const { error } = await supabase.from("user_events").insert([
      {
        user_key: userKey,
        event_type: eventType,
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        event_data: eventData || {},
      },
    ]);

    if (error) {
      console.error("[Analytics] Error tracking event:", error);
    } else {
      console.log("[Analytics] Event tracked:", eventType, eventData);
    }
  } catch (error) {
    console.error("[Analytics] Exception:", error);
  }
}

// Создание хранилища
function createUserKeyStore(): UserKeyStore {
  const { subscribe, set, update }: Writable<string | null> = writable(null);

  return {
    subscribe,

    // Инициализация/получение ключа
    init: async (): Promise<string | null> => {
      try {
        // Проверяем поддержку localStorage
        if (typeof localStorage === "undefined") {
          console.error("localStorage is not available");
          return null;
        }

        // Проверяем поддержку navigator
        if (typeof navigator === "undefined") {
          console.error("navigator is not available");
          return null;
        }

        let userKey = localStorage.getItem("userKey");
        const userAgent = navigator.userAgent;
        const referrer =
          typeof document !== "undefined"
            ? document.referrer || "direct"
            : "direct";

        if (!userKey) {
          // Создаем новый ключ
          userKey = uuid();

          // Сохраняем в Supabase
          const { error } = await supabase
            .from("user_keys")
            .insert<UserKeyData>([
              {
                user_key: userKey,
                user_agent: userAgent,
                referrer: referrer,
              },
            ]);

          if (error) {
            console.error("Error saving to Supabase:", error);
            return null;
          }

          console.log("New user created with key:", userKey);

          // Сохраняем в localStorage
          localStorage.setItem("userKey", userKey);
        } else {
          // Обновляем существующего пользователя
          await updateUserStats(userKey, userAgent);
        }

        set(userKey);
        return userKey;
      } catch (error) {
        console.error("Error in init:", error);
        return null;
      }
    },

    // Получение статистики пользователя
    getUserStats: async (userKey: string): Promise<UserStats | null> => {
      try {
        const { data, error } = await supabase
          .from("user_keys")
          .select("*")
          .eq("user_key", userKey)
          .single<UserStats>();

        if (error) {
          console.error("Error getting user stats:", error);
          return null;
        }

        return data;
      } catch (error) {
        console.error("Error in getUserStats:", error);
        return null;
      }
    },

    // Генерация нового ключа (для случаев, когда нужно сбросить)
    regenerateKey: async (): Promise<string | null> => {
      try {
        if (
          typeof localStorage === "undefined" ||
          typeof navigator === "undefined"
        ) {
          return null;
        }

        const newKey = uuid();
        const userAgent = navigator.userAgent;
        const referrer =
          typeof document !== "undefined"
            ? document.referrer || "direct"
            : "direct";

        // Сохраняем новый ключ в Supabase
        const { error } = await supabase.from("user_keys").insert<UserKeyData>([
          {
            user_key: newKey,
            user_agent: userAgent,
            referrer: referrer,
          },
        ]);

        if (error) {
          console.error("Error saving new key to Supabase:", error);
          return null;
        }

        // Обновляем localStorage
        localStorage.setItem("userKey", newKey);
        set(newKey);

        console.log("Key regenerated:", newKey);
        return newKey;
      } catch (error) {
        console.error("Error in regenerateKey:", error);
        return null;
      }
    },

    // Очистка ключа (выход пользователя)
    clearKey: (): void => {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("userKey");
      }
      set(null);
      console.log("User key cleared");
    },

    // Записать событие аналитики
    trackEvent: async (
      eventType: AnalyticsEventType,
      eventData?: AnalyticsEventData
    ): Promise<void> => {
      await trackAnalyticsEvent(eventType, eventData);
    },

    // Запуск истории
    trackStoryStart: async (
      storyId: string,
      storyTitle: string
    ): Promise<void> => {
      await trackAnalyticsEvent("story_start", {
        story_id: storyId,
        story_title: storyTitle,
      });
    },

    // Завершение истории
    trackStoryComplete: async (
      storyId: string,
      storyTitle: string,
      dialogueCount: number
    ): Promise<void> => {
      await trackAnalyticsEvent("story_complete", {
        story_id: storyId,
        story_title: storyTitle,
        dialogue_count: dialogueCount,
      });
    },

    // Запуск мини-игры
    trackGameStart: async (
      gameId: string,
      gameTitle: string,
      storyId?: string
    ): Promise<void> => {
      await trackAnalyticsEvent("game_start", {
        game_id: gameId,
        game_title: gameTitle,
        story_id: storyId,
      });
    },

    // Результат мини-игры
    trackGameResult: async (
      gameId: string,
      gameTitle: string,
      won: boolean,
      storyId?: string
    ): Promise<void> => {
      await trackAnalyticsEvent(won ? "game_win" : "game_lose", {
        game_id: gameId,
        game_title: gameTitle,
        story_id: storyId,
      });
    },

    // Начать таймер сессии
    startSessionTimer: (): void => {
      sessionStartTime = Date.now();
      console.log("[Analytics] Session timer started");
    },

    // Остановить таймер и записать время
    stopSessionTimer: async (): Promise<void> => {
      if (!sessionStartTime) {
        console.warn("[Analytics] No session start time");
        return;
      }

      const durationSeconds = Math.floor(
        (Date.now() - sessionStartTime) / 1000
      );

      await trackAnalyticsEvent("session_time", {
        duration_seconds: durationSeconds,
      });

      console.log(
        "[Analytics] Session time recorded:",
        durationSeconds,
        "seconds"
      );
      sessionStartTime = null;
    },

    // Получить текущий ключ
    getCurrentKey: (): string | null => {
      return get(userKeyStore);
    },

    // Получить статистику игр (трофеи) - только игры с победами
    getGameStats: async (): Promise<GameStats[]> => {
      const userKey = get(userKeyStore);
      if (!userKey) {
        return [];
      }

      try {
        // Используем view для получения трофеев (только игры с победами)
        const { data, error } = await supabase
          .from("user_game_trophies")
          .select("*")
          .eq("user_key", userKey);

        if (error) {
          console.error("[Trophies] Error fetching trophies:", error);
          return [];
        }

        // Маппим данные из view
        return (data || []).map(row => ({
          gameId: row.game_id,
          gameTitle: row.game_title,
          totalPlays: row.total_plays,
          wins: row.wins,
          losses: row.losses,
          winRate: row.win_rate
        }));
      } catch (error) {
        console.error("[Trophies] Exception:", error);
        return [];
      }
    },
  };
}

// Экспортируем экземпляр хранилища
export const userKeyStore = createUserKeyStore();

// Также экспортируем типы для использования в других файлах
export type { UserStats, UserKeyData };
