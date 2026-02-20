/**
 * Общие типы для мини-игр
 */

export interface Item {
  id: string;
  icon?: string;
  name: string;
  description?: string;
  type?: 'tool' | 'key' | 'consumable' | 'quest' | 'misc';
}

export interface RewardItem {
  id?: string;
  icon?: string;
  name?: string;
}

/**
 * Общие props для всех мини-игр
 */
export interface MinigameProps {
  /** Режим интеграции с визуальной новеллой */
  integrated?: boolean;
  /** Callback при победе */
  onWin?: () => void;
  /** Callback при поражении */
  onLose?: () => void;
  /** Награда за победу (ID предмета или объект) */
  rewardItem?: string | RewardItem;
  /** Массив всех предметов для поиска описания награды */
  items?: Item[];
  /** Имя bucket в Supabase для загрузки ресурсов */
  bucketName?: string;
}

/**
 * Тип для статуса сообщения
 */
export type StatusMessageType = "" | "success" | "error" | "loading" | "info";

/**
 * Интерфейс для сообщения о статусе
 */
export interface StatusMessage {
  type: StatusMessageType;
  text: string;
}

/**
 * Интерфейс для модального окна
 */
export interface ModalState {
  show: boolean;
  title: string;
  text: string;
  actions: Array<{
    text: string;
    action: () => void;
    class?: string;
  }>;
}
