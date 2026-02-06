// Определение типов для нашей новой JSON структуры
export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
}

export interface Option {
  text: string;
  nextDialogueId?: string;
  // Мини-игра вместо перехода
  miniGame?: {
    id: string;
    onWinDialogueId: string;
    onLoseDialogueId: string;
  };
  // Действия при клике
  actions?: Array<{ type: string; id?: string; value?: any }>;
  // Условие видимости (например, наличие предмета)
  visibleIf?: { hasItem?: string };
}

export interface Dialogue {
  id: string;
  text: string;
  backgroundImage?: string;
  characterImage?: string;
  stateMachineCharacterRive?: string;
  smTriggerBackgroundRive?: string;
  nextDialogueId?: string;
  options?: Option[];
  // Действия при входе в диалог
  onEnter?: Array<{ type: string; id?: string; value?: any }>;
}

export interface GameData {
  dialogues: Dialogue[];
  items: Item[];
  // ... мини-игры и активности можно добавить позже
}

class GameState {
  // Состояние игрока
  player = $state({
    inventory: [] as string[], // Храним только ID предметов
    stats: { knowledge: 0, courage: 0, charisma: 0 },
  });

  // Данные истории
  storyData = $state<GameData | null>(null);

  // Текущий прогресс
  currentDialogueId = $state("0");
  isLoading = $state(true);
  error = $state("");

  // Методы
  async loadStory(url: string) {
    this.isLoading = true;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      this.storyData = await res.json();
      this.currentDialogueId = this.storyData.dialogues[0]?.id || "0";
    } catch (err: any) {
      this.error = "Ошибка загрузки: " + err.message;
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  findDialogue(id: string): Dialogue | undefined {
    return this.storyData?.dialogues.find((d) => d.id === id);
  }

  // Получить объект предмета по ID
  getItem(id: string) {
    return this.storyData?.items.find((i) => i.id === id);
  }

  // Проверить наличие предмета
  hasItem(id: string) {
    return this.player.inventory.includes(id);
  }

  // Добавить предмет
  addItem(id: string) {
    if (!this.player.inventory.includes(id)) {
      this.player.inventory = [...this.player.inventory, id];
    }
  }

  // Выполнить действия (дать предмет, изменить статы)
  runActions(actions: Array<any>) {
    if (!actions) return;
    actions.forEach((action) => {
      if (action.type === "add_item" && action.id) {
        this.addItem(action.id);
      }
      if (
        action.type === "stat_change" &&
        action.stat &&
        action.value !== undefined
      ) {
        // @ts-ignore
        this.player.stats[action.stat] += action.value;
      }
    });
  }

  // Переход к диалогу
  goToDialogue(id: string) {
    this.currentDialogueId = id;
  }
}

// Экспортируем единственный экземпляр хранилища
export const gameState = new GameState();
