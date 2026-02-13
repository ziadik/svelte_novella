import { StoryService } from "../services/storyService";
import type {
  StoryData,
  Dialogue,
  PlayerState,
  GameSession,
  GameAction,
} from "../types";

// Внутреннее состояние игры
const gameStateInternal = $state({
  player: {
    inventory: [],
    stats: { knowledge: 0, courage: 0, charisma: 0 },
    flags: {},
    progress: {
      currentChapter: "",
      completedDialogues: [],
      score: 0,
    },
  } as PlayerState,
  storyData: null as StoryData | null,
  currentDialogueId: "start",
  isLoading: true,
  error: "",
});

// Геттеры для состояния
export const gameState = () => gameStateInternal;

// Computed значения
let currentDialogueValue = $derived(() => {
  if (!gameStateInternal.storyData) return null;
  return (
    gameStateInternal.storyData.dialogues.find((d) => d.id === gameStateInternal.currentDialogueId) || null
  );
});

let playerItemsValue = $derived(() => {
  if (!gameStateInternal.storyData?.items) return [];
  return gameStateInternal.player.inventory
    .map((itemId) => gameStateInternal.storyData!.items!.find((item) => item.id === itemId))
    .filter(Boolean);
});

let progressValue = $derived(() => gameStateInternal.player.progress);

// Геттеры для computed значений
export const currentDialogue = () => currentDialogueValue;
export const playerItems = () => playerItemsValue;
export const progress = () => progressValue;

// Действия игры
export const gameActions = {
  // Загрузить историю
  async loadStory(bucket: string, fileName: string): Promise<void> {
    gameStateInternal.isLoading = true;
    gameStateInternal.error = "";

    try {
      const storyData = await StoryService.loadStory(bucket, fileName);
      gameStateInternal.storyData = storyData;

      // Устанавливаем начальный диалог
      if (storyData.dialogues.length > 0) {
        const startDialogue =
          storyData.dialogues.find((d) => d.id === "start") ||
          storyData.dialogues[0];
        gameStateInternal.currentDialogueId = startDialogue.id;
      }

      // Сбрасываем состояние игрока
      gameStateInternal.player = {
        inventory: [],
        stats: { knowledge: 0, courage: 0, charisma: 0 },
        flags: {},
        progress: {
          currentChapter: storyData.chapters?.[0]?.id || "",
          completedDialogues: [],
          score: 0,
        },
      };
    } catch (err: any) {
      gameStateInternal.error = err.message || "Ошибка загрузки истории";
      console.error("Ошибка загрузки истории:", err);
    } finally {
      gameStateInternal.isLoading = false;
    }
  },

  // Перейти к диалогу
  goToDialogue(dialogueId: string): void {
    if (!gameStateInternal.storyData) return;

    const dialogue = gameStateInternal.storyData.dialogues.find((d) => d.id === dialogueId);
    if (dialogue) {
      gameStateInternal.currentDialogueId = dialogueId;

      // Добавляем диалог в завершенные
      gameStateInternal.player.progress.completedDialogues = [
        ...new Set([...gameStateInternal.player.progress.completedDialogues, dialogueId]),
      ];

      // Обновляем текущую главу
      if (dialogue.chapterId) {
        gameStateInternal.player.progress.currentChapter = dialogue.chapterId;
      }

      // Выполняем действия onEnter
      if (dialogue.onEnter) {
        this.runActions(dialogue.onEnter);
      }
    }
  },

  // Выполнить действия
  runActions(actions: GameAction[]): void {
    if (!actions || actions.length === 0) return;

    actions.forEach((action) => {
      switch (action.type) {
        case "add_item":
          if (action.id && !gameStateInternal.player.inventory.includes(action.id)) {
            gameStateInternal.player.inventory = [...gameStateInternal.player.inventory, action.id];
          }
          break;

        case "remove_item":
          if (action.id) {
            gameStateInternal.player.inventory = gameStateInternal.player.inventory.filter(
              (id) => id !== action.id,
            );
          }
          break;

        case "stat_change":
          if (action.stat && action.value !== undefined) {
            gameStateInternal.player.stats = {
              ...gameStateInternal.player.stats,
              [action.stat]:
                (gameStateInternal.player.stats[action.stat] || 0) + action.value,
            };
          }
          break;

        case "set_flag":
          if (action.id) {
            gameStateInternal.player.flags = {
              ...gameStateInternal.player.flags,
              [action.id]: true,
            };
          }
          break;

        case "clear_flag":
          if (action.id) {
            gameStateInternal.player.flags = {
              ...gameStateInternal.player.flags,
              [action.id]: false,
            };
          }
          break;

        case "add_score":
          if (action.value !== undefined) {
            gameStateInternal.player.progress.score += action.value;
          }
          break;
      }
    });
  },

  // Проверить наличие предмета
  hasItem(itemId: string): boolean {
    return gameStateInternal.player.inventory.includes(itemId);
  },

  // Получить значение статы
  getStat(statName: string): number {
    return gameStateInternal.player.stats[statName] || 0;
  },

  // Проверить флаг
  hasFlag(flagName: string): boolean {
    return gameStateInternal.player.flags[flagName] === true;
  },

  // Сохранить сессию
  saveSession(session: GameSession): void {
    localStorage.setItem(`session_${session.storyId}`, JSON.stringify(session));
  },

  // Загрузить сессию
  loadSession(session: GameSession): void {
    gameStateInternal.player = session.playerState;
    gameStateInternal.currentDialogueId = session.currentDialogueId || "start";

    // Загружаем историю если нужно
    // Примечание: текущая история должна быть загружена отдельно через loadStory
    if (session.bucket && session.fileName) {
      this.loadStory(session.bucket, session.fileName);
    }
  },

  // Сбросить игру
  resetGame(): void {
    gameStateInternal.player = {
      inventory: [],
      stats: { knowledge: 0, courage: 0, charisma: 0 },
      flags: {},
      progress: {
        currentChapter: "",
        completedDialogues: [],
        score: 0,
      },
    };

    if (gameStateInternal.storyData?.dialogues.length) {
      const startDialogue =
        gameStateInternal.storyData.dialogues.find((d) => d.id === "start") ||
        gameStateInternal.storyData.dialogues[0];
      gameStateInternal.currentDialogueId = startDialogue.id;
    }
  },

  // Получить текущее состояние
  getCurrentState(): any {
    return {
      player: gameStateInternal.player,
      currentDialogueId: gameStateInternal.currentDialogueId,
      storyData: gameStateInternal.storyData,
    };
  },
};
