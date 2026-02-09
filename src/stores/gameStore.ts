// src/stores/gameStore.ts
import { writable, derived, get } from "svelte/store";
import { currentStory } from "./storyStore";
import { StoryService } from "../services/storyService";
import type {
  StoryData,
  Dialogue,
  PlayerState,
  GameSession,
  GameAction,
} from "../types";

// Состояние игры
export const gameState = {
  player: writable<PlayerState>({
    inventory: [],
    stats: { knowledge: 0, courage: 0, charisma: 0 },
    flags: {},
    progress: {
      currentChapter: "",
      completedDialogues: [],
      score: 0,
    },
  }),

  storyData: writable<StoryData | null>(null),
  currentDialogueId: writable<string>("start"),
  isLoading: writable(true),
  error: writable<string>(""),
};

// Computed значения
export const gameStore = {
  // Данные
  player: gameState.player,
  storyData: gameState.storyData,
  currentDialogueId: gameState.currentDialogueId,
  isLoading: gameState.isLoading,
  error: gameState.error,

  // Текущий диалог
  currentDialogue: derived(
    [gameState.storyData, gameState.currentDialogueId],
    ([$storyData, $currentDialogueId]) => {
      if (!$storyData) return null;
      return (
        $storyData.dialogues.find((d) => d.id === $currentDialogueId) || null
      );
    },
  ),

  // Предметы игрока
  playerItems: derived(
    [gameState.storyData, gameState.player],
    ([$storyData, $player]) => {
      if (!$storyData?.items) return [];
      return $player.inventory
        .map((itemId) => $storyData.items!.find((item) => item.id === itemId))
        .filter(Boolean);
    },
  ),

  // Прогресс игры
  progress: derived(gameState.player, ($player) => $player.progress),
};

// Действия игры
export const gameActions = {
  // Загрузить историю
  async loadStory(bucket: string, fileName: string): Promise<void> {
    gameState.isLoading.set(true);
    gameState.error.set("");

    try {
      const storyData = await StoryService.loadStory(bucket, fileName);
      gameState.storyData.set(storyData);

      // Устанавливаем начальный диалог
      if (storyData.dialogues.length > 0) {
        const startDialogue =
          storyData.dialogues.find((d) => d.id === "start") ||
          storyData.dialogues[0];
        gameState.currentDialogueId.set(startDialogue.id);
      }

      // Сбрасываем состояние игрока
      gameState.player.set({
        inventory: [],
        stats: { knowledge: 0, courage: 0, charisma: 0 },
        flags: {},
        progress: {
          currentChapter: storyData.chapters?.[0]?.id || "",
          completedDialogues: [],
          score: 0,
        },
      });
    } catch (err: any) {
      gameState.error.set(err.message || "Ошибка загрузки истории");
      console.error("Ошибка загрузки истории:", err);
    } finally {
      gameState.isLoading.set(false);
    }
  },

  // Перейти к диалогу
  goToDialogue(dialogueId: string): void {
    const storyData = get(gameState.storyData);
    if (!storyData) return;

    const dialogue = storyData.dialogues.find((d) => d.id === dialogueId);
    if (dialogue) {
      gameState.currentDialogueId.set(dialogueId);

      // Добавляем диалог в завершенные
      gameState.player.update((player) => ({
        ...player,
        progress: {
          ...player.progress,
          completedDialogues: [
            ...new Set([...player.progress.completedDialogues, dialogueId]),
          ],
        },
      }));

      // Обновляем текущую главу
      if (dialogue.chapterId) {
        gameState.player.update((player) => ({
          ...player,
          progress: {
            ...player.progress,
            currentChapter: dialogue.chapterId!,
          },
        }));
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

    gameState.player.update((player) => {
      const updatedPlayer = { ...player };

      actions.forEach((action) => {
        switch (action.type) {
          case "add_item":
            if (action.id && !updatedPlayer.inventory.includes(action.id)) {
              updatedPlayer.inventory = [...updatedPlayer.inventory, action.id];
            }
            break;

          case "remove_item":
            if (action.id) {
              updatedPlayer.inventory = updatedPlayer.inventory.filter(
                (id) => id !== action.id,
              );
            }
            break;

          case "stat_change":
            if (action.stat && action.value !== undefined) {
              updatedPlayer.stats = {
                ...updatedPlayer.stats,
                [action.stat]:
                  (updatedPlayer.stats[action.stat] || 0) + action.value,
              };
            }
            break;

          case "set_flag":
            if (action.id) {
              updatedPlayer.flags = {
                ...updatedPlayer.flags,
                [action.id]: true,
              };
            }
            break;

          case "clear_flag":
            if (action.id) {
              updatedPlayer.flags = {
                ...updatedPlayer.flags,
                [action.id]: false,
              };
            }
            break;

          case "add_score":
            if (action.value !== undefined) {
              updatedPlayer.progress.score += action.value;
            }
            break;
        }
      });

      return updatedPlayer;
    });
  },

  // Проверить наличие предмета
  hasItem(itemId: string): boolean {
    const player = get(gameState.player);
    return player.inventory.includes(itemId);
  },

  // Получить значение статы
  getStat(statName: string): number {
    const player = get(gameState.player);
    return player.stats[statName] || 0;
  },

  // Проверить флаг
  hasFlag(flagName: string): boolean {
    const player = get(gameState.player);
    return player.flags[flagName] === true;
  },

  // Сохранить сессию
  saveSession(session: GameSession): void {
    localStorage.setItem(`session_${session.storyId}`, JSON.stringify(session));
  },

  // Загрузить сессию
  loadSession(session: GameSession): void {
    gameState.player.set(session.playerState);
    gameState.currentDialogueId.set(session.currentDialogueId || "start");

    // Загружаем историю если нужно
    const currentStoryValue = get(currentStory);
    if (currentStoryValue && currentStoryValue.id === session.storyId) {
      this.loadStory(currentStoryValue.bucket, currentStoryValue.defaultFile);
    }
  },

  // Сбросить игру
  resetGame(): void {
    gameState.player.set({
      inventory: [],
      stats: { knowledge: 0, courage: 0, charisma: 0 },
      flags: {},
      progress: {
        currentChapter: "",
        completedDialogues: [],
        score: 0,
      },
    });

    const storyData = get(gameState.storyData);
    if (storyData?.dialogues.length) {
      const startDialogue =
        storyData.dialogues.find((d) => d.id === "start") ||
        storyData.dialogues[0];
      gameState.currentDialogueId.set(startDialogue.id);
    }
  },

  // Получить текущее состояние
  getCurrentState(): any {
    return {
      player: get(gameState.player),
      currentDialogueId: get(gameState.currentDialogueId),
      storyData: get(gameState.storyData),
    };
  },
};
