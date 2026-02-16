import { editor, editorActions } from '../editor/stores/editorStore.svelte';
import type { BucketInfo } from '../editor/types';

// Состояние игрового режима
let showStorySelector = $state(true);
let selectedStory = $state<string | null>(null);

/**
 * Получить список доступных историй
 */
export function getAvailableStories(): BucketInfo[] {
  // Используем те же данные, что и в редакторе
  return editor.availableBuckets;
}

/**
 * Выбрать историю для игры
 */
export function selectStory(storyName: string) {
  selectedStory = storyName;
  showStorySelector = false;
}

/**
 * Сбросить выбор истории (вернуться к экрану выбора)
 */
export function resetStorySelection() {
  selectedStory = null;
  showStorySelector = true;
}

/**
 * Получить имя выбранной истории
 */
export function getSelectedStory(): string | null {
  return selectedStory;
}

/**
 * Показывать ли экран выбора историй
 */
export function shouldShowStorySelector(): boolean {
  return showStorySelector;
}

/**
 * Загрузить список историй
 */
export function loadStoriesList() {
  // Используем ту же функцию, что и в редакторе
  editorActions.updateBucketsList(editor.availableBuckets);
}

// Реактивное состояние
export const gameModeState = {
  get showStorySelector() { return showStorySelector; },
  get selectedStory() { return selectedStory; },
  selectStory,
  resetStorySelection
};
