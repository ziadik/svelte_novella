import type { StoryData, Dialogue, Option } from "../types";

export function migrateStoryData(data: any): StoryData {
  // 1. Миграция для новых полей опций
  if (data.dialogues) {
    data.dialogues.forEach((dialogue: Dialogue) => {
      if (dialogue.options) {
        dialogue.options.forEach((option: any) => {
          // Обеспечиваем наличие новых полей
          if (typeof option.enabled === "undefined") {
            option.enabled = true;
          }
          if (typeof option.visible === "undefined") {
            option.visible = true;
          }

          // Миграция старых visibleIf в новую структуру Condition
          if (option.visibleIf && !option.visibilityCondition) {
            if (option.visibleIf.hasItem) {
              option.visibilityCondition = {
                type: "has_item",
                itemId: option.visibleIf.hasItem,
              };
            }
            // Удаляем старый формат
            delete option.visibleIf;
          }

          // Если нет условия видимости, устанавливаем always
          if (!option.visibilityCondition) {
            option.visibilityCondition = { type: "always" };
          }
        });
      }
    });
  }

  // 2. Миграция глав (если их нет, создаем основную)
  if (!data.chapters) {
    data.chapters = [{ id: "main", title: "Основная история" }];
    if (data.dialogues) {
      data.dialogues.forEach((dialogue: any) => {
        if (!dialogue.chapterId) {
          dialogue.chapterId = "main";
        }
      });
    }
  }

  // 3. Миграция предметов (если нет, создаем пустой массив)
  if (!data.items) {
    data.items = [];
  }

  // 4. Миграция meta (если нет, создаем)
  if (!data.meta) {
    data.meta = { version: "3.1", title: data.title || "Untitled" };
  }

  // 5. Миграция мини-игр (если есть старый формат)
  if (data.miniGames && Array.isArray(data.miniGames)) {
    data.miniGames = data.miniGames.map((game: any) => {
      if (game.id && !game.onWinDialogueId) {
        return {
          ...game,
          onWinDialogueId: game.winTarget || "",
          onLoseDialogueId: game.loseTarget || "",
        };
      }
      return game;
    });
  }

  return data as StoryData;
}

// Функция для проверки структуры опции
export function ensureOptionStructure(option: any): Option {
  return {
    text: option.text || "",
    nextDialogueId: option.nextDialogueId,
    miniGame: option.miniGame,
    actions: option.actions || [],
    enabled: option.enabled ?? true,
    visible: option.visible ?? true,
    visibilityCondition: option.visibilityCondition || { type: "always" },
  };
}

// Функция для создания нового диалога с правильной структурой
export function createNewDialogue(chapterId: string): Dialogue {
  return {
    id: `d_${Date.now()}`,
    chapterId,
    text: "Новый текст...",
    options: [],
  };
}

// Функция для создания новой опции
export function createNewOption(): Option {
  return {
    text: "Новый вариант",
    enabled: true,
    visible: true,
    visibilityCondition: { type: "always" },
  };
}
