// stores/userKeyStore.ts
import { writable, type Writable } from "svelte/store";
import { supabase } from "../supabaseClient";
import { v4 as uuid } from "uuid";

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

// Тип для хранилища
interface UserKeyStore {
  subscribe: Writable<string | null>["subscribe"];
  init: () => Promise<string | null>;
  getUserStats: (userKey: string) => Promise<UserStats | null>;
  regenerateKey: () => Promise<string | null>;
  clearKey: () => void;
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
  };
}

// Экспортируем экземпляр хранилища
export const userKeyStore = createUserKeyStore();

// Также экспортируем типы для использования в других файлах
export type { UserStats, UserKeyData };
