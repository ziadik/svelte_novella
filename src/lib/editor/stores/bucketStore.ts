import { editor, editorActions } from "./editorStore.svelte";
import type { BucketInfo } from "../types";

// Фиксированный список историй
const AVAILABLE_STORIES = ['dracula', 'zombie', 'fairy_tale', "minigames"];

/**
 * Получить фиксированный список историй
 */
export function getStoriesList(): BucketInfo[] {
  const buckets: BucketInfo[] = AVAILABLE_STORIES.map(name => ({
    id: name,
    name,
    public: false,
    file_count: 0,
    created_at: new Date().toISOString()
  }));
  
  editorActions.updateBucketsList(buckets);
  return buckets;
}

/**
 * Получить текущий выбранный bucket
 * Возвращает имя bucket или null, если ничего не выбрано
 */
export function getCurrentBucket(): string | null {
  return editor.selectedBucket;
}

/**
 * Проверить, выбран ли bucket
 */
export function isBucketSelected(): boolean {
  return editor.selectedBucket !== null;
}
