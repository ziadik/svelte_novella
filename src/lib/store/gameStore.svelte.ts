import { getPlayerStories, loadStories, storiesState, type Story } from './storiesStore.svelte';

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
    rewardItem?: string;
  };
  // Действия при клике
  actions?: Array<{ type: string; id?: string; value?: any }>;
  // Настройки опции
  enabled?: boolean;
  visible?: boolean;
  // Условие видимости (новый формат)
  visibilityCondition?: {
    type: 'always' | 'has_item' | 'stat_greater' | 'flag_true';
    itemId?: string;
    statName?: string;
    statValue?: number;
    flagName?: string;
  };
  // Устаревший формат (для совместимости)
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

// Типы для статистики игрока
export type StatName = 'knowledge' | 'courage' | 'charisma';

// Тип для действий
export type ActionType = 'add_item' | 'stat_change' | 'remove_item' | 'set_flag';

export interface Action {
  type: ActionType;
  id?: string;
  stat?: StatName;
  value?: number;
  flagName?: string;
}

// Класс состояния игры с использованием Svelte 5 runes
class GameState {
  // Состояние игрока
  player = $state({
    inventory: [] as string[], // Храним только ID предметов
    stats: {
      knowledge: 0,
      courage: 0,
      charisma: 0
    } as Record<StatName, number>,
  });

  // Данные истории
  storyData = $state<GameData | null>(null);

  // Текущий прогресс
  currentDialogueId = $state<string>("0");
  isLoading = $state<boolean>(true);
  error = $state<string>("");

  // Выбранная история (id истории из БД)
  selectedStory = $state<string | null>(null);

  // Выбранный объект истории (полная информация из БД)
  selectedStoryData = $state<Story | null>(null);

  // URL параметр для автоматического выбора истории
  urlStoryId = $state<string | null>(null);

  // Доступные истории - вычисляемое свойство из Supabase
  get availableStories(): Story[] {
    return getPlayerStories();
  }

  // Загрузка историй при инициализации
  async initStories(): Promise<void> {
    console.log('[GameState] initStories начало');
    
    // Проверяем URL параметр story
    const params = new URLSearchParams(window.location.search);
    const storyParam = params.get('story');
    if (storyParam) {
      this.urlStoryId = storyParam;
      console.log('[GameState] URL параметр story:', storyParam);
    }

    if (!storiesState.initialized) {
      console.log('[GameState] Загружаем истории...');
      await loadStories();
      console.log('[GameState] Истории загружены, initialized:', storiesState.initialized);
    } else {
      console.log('[GameState] Истории уже загружены');
    }

    // Если указан URL параметр, автоматически выбираем историю
    if (this.urlStoryId) {
      console.log('[GameState] Выбираем историю:', this.urlStoryId);
      this.selectStoryById(this.urlStoryId);
    }
    
    console.log('[GameState] initStories завершено');
  }

  // Выбрать историю по ID (включая из fallback)
  selectStoryById(id: string): boolean {
    console.log('[GameState] selectStoryById:', id);
    console.log('[GameState] storiesState.stories:', storiesState.stories.length);
    console.log('[GameState] storiesState.initialized:', storiesState.initialized);
    
    // Сначала ищем в загруженных историях из БД
    let story = storiesState.stories.find(s => s.id === id);
    console.log('[GameState] Найдена в БД:', story?.title);
    
    // Если не найдена в БД, используем FALLBACK_STORIES напрямую
    if (!story) {
      const FALLBACK_STORIES = [
        { id: 'dracula', title: 'Дракула', bucket: 'dracula', json_url: 'dracula_story.json' },
        { id: 'zombie', title: 'Выживание', bucket: 'zombie', json_url: 'zombie_story.json' },
        { id: 'fairy_tale', title: 'Сказка', bucket: 'fairy_tale', json_url: 'fairy_tale_story.json' },
        { id: 'minigames', title: 'Мини-игры', bucket: 'minigames', json_url: 'minigames_story.json' }
      ];
      story = FALLBACK_STORIES.find(s => s.id === id) as unknown as Story;
      console.log('[GameState] Найдена в fallback:', story?.title);
    }

    if (story) {
      this.selectedStory = story.id;
      this.selectedStoryData = story as unknown as Story;
      console.log('[GameState] Выбрана история:', (story as any).title);
      return true;
    }

    console.warn('[GameState] История не найдена:', id);
    return false;
  }

  // Получить историю по ID
  getStoryById(id: string): Story | undefined {
    return storiesState.stories.find(s => s.id === id);
  }

  // Компьютерное свойство для получения текущего диалога
  get currentDialogue(): Dialogue | undefined {
    return this.findDialogue(this.currentDialogueId);
  }

  // Загрузка истории из URL
  async loadStory(url: string): Promise<void> {
    this.isLoading = true;
    this.error = "";
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      this.storyData = data;
      this.currentDialogueId = this.storyData?.dialogues?.[0]?.id || "0";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      this.error = `Ошибка загрузки: ${message}`;
      console.error('Ошибка загрузки истории:', err);
    } finally {
      this.isLoading = false;
    }
  }

  // Поиск диалога по ID
  findDialogue(id: string): Dialogue | undefined {
    return this.storyData?.dialogues.find((d) => d.id === id);
  }

  // Получить объект предмета по ID
  getItem(id: string): Item | undefined {
    return this.storyData?.items.find((i) => i.id === id);
  }

  // Проверить наличие предмета
  hasItem(id: string): boolean {
    return this.player.inventory.includes(id);
  }

  // Добавить предмет в инвентарь
  addItem(id: string): void {
    if (!this.player.inventory.includes(id)) {
      this.player.inventory = [...this.player.inventory, id];
    }
  }

  // Удалить предмет из инвентаря
  removeItem(id: string): void {
    this.player.inventory = this.player.inventory.filter(itemId => itemId !== id);
  }

  // Изменить значение стата
  changeStat(statName: StatName, value: number): void {
    if (statName in this.player.stats) {
      this.player.stats[statName] += value;
    }
  }

  // Получить значение стата
  getStat(statName: StatName): number {
    return this.player.stats[statName] ?? 0;
  }

  // Проверить условие видимости опции
  checkVisibilityCondition(option: Option): boolean {
    // Проверка устаревшего формата (для совместимости)
    if (option.visibleIf) {
      if (option.visibleIf.hasItem) {
        return this.hasItem(option.visibleIf.hasItem);
      }
    }
    
    // Проверка нового формата
    if (option.visibilityCondition) {
      switch (option.visibilityCondition.type) {
        case 'always':
          return true;
        case 'has_item':
          return option.visibilityCondition.itemId
            ? this.hasItem(option.visibilityCondition.itemId)
            : true;
        case 'stat_greater':
          return option.visibilityCondition.statName && option.visibilityCondition.statValue !== undefined
            ? this.getStat(option.visibilityCondition.statName as StatName) > option.visibilityCondition.statValue
            : true;
        case 'flag_true':
          // Заглушка для будущей системы флагов
          return true;
        default:
          return true;
      }
    }

    return true;
  }

  // Выполнить действия (дать предмет, изменить статы)
  runActions(actions: Action[] | undefined): void {
    if (!actions) return;
    
    actions.forEach((action) => {
      switch (action.type) {
        case 'add_item':
          if (action.id) this.addItem(action.id);
          break;
        case 'remove_item':
          if (action.id) this.removeItem(action.id);
          break;
        case 'stat_change':
          if (action.stat && action.value !== undefined) {
            this.changeStat(action.stat, action.value);
          }
          break;
        case 'set_flag':
          // Заглушка для будущей системы флагов
          console.log(`Set flag: ${action.flagName} = ${action.value}`);
          break;
        default:
          console.warn('Неизвестный тип действия:', action.type);
      }
    });
  }

  // Переход к диалогу
  goToDialogue(id: string): void {
    this.currentDialogueId = id;
  }

  // Сброс состояния игры
  reset(): void {
    this.player.inventory = [];
    this.player.stats = { knowledge: 0, courage: 0, charisma: 0 };
    this.currentDialogueId = this.storyData?.dialogues[0]?.id || "0";
    this.error = "";
  }

  // Получить все предметы в инвентаре
  getInventoryItems(): Item[] {
    return this.player.inventory
      .map(id => this.getItem(id))
      .filter((item): item is Item => item !== undefined);
  }
}

// Экспортируем единственный экземпляр хранилища
export const gameState = new GameState();
