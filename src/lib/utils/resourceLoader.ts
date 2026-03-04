/**
 * Утилита для загрузки ресурсов истории
 * 
 * Режимы работы:
 * - Игра (GAME_MODE): грузим из public/stories/ (оптимизировано для production)
 * - Редактор (EDITOR_MODE): грузим из Supabase Storage (нужен live-доступ)
 */

import { gameModeState } from '../store/gameModeStore.svelte';

/** Режим работы приложения */
export type AppMode = 'game' | 'editor';

/**
 * Получить URL для загрузки ресурса
 * 
 * @param bucket - имя bucket в Supabase
 * @param fileName - имя файла
 * @returns полный URL для загрузки
 */
export function getResourceUrl(bucket: string, fileName: string): string {
  // Определяем текущий режим
  const isEditorMode = gameModeState.mode === 'editor';
  
  // В редакторе всегда используем Supabase
  if (isEditorMode) {
    return getSupabaseUrl(bucket, fileName);
  }
  
  // В игровом режиме сначала пробуем локальные assets
  const localUrl = getLocalUrl(bucket, fileName);
  
  // Возвращаем локальный URL - далее в loadStoryJson есть fallback на Supabase
  return localUrl;
}

/**
 * Получить локальный URL из public/stories/
 */
export function getLocalUrl(bucket: string, fileName: string): string {
  return `/stories/${bucket}/${fileName}`;
}

/**
 * Получить URL из Supabase Storage
 */
export function getSupabaseUrl(bucket: string, fileName: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
}

/**
 * Проверить, существует ли локальный ресурс
 * (используется для fallback логики)
 */
export async function checkLocalResource(bucket: string, fileName: string): Promise<boolean> {
  try {
    const response = await fetch(getLocalUrl(bucket, fileName), { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Загрузить JSON истории с правильным приоритетом
 * 
 * Приоритет загрузки:
 * 1. Локальный файл (public/stories/<bucket>/<file>.json)
 * 2. Supabase Storage (если не найден локально)
 * 3. Кэш (fallback при ошибках сети)
 */
export async function loadStoryWithFallback(
  bucket: string, 
  fileName: string
): Promise<{ data: unknown; source: 'local' | 'supabase' | 'cache' }> {
  // Сначала пробуем локальный файл
  const localUrl = getLocalUrl(bucket, fileName);
  
  try {
    const localResponse = await fetch(localUrl);
    if (localResponse.ok) {
      const data = await localResponse.json();
      console.log(`[ResourceLoader] Загружено из local: ${localUrl}`);
      return { data, source: 'local' };
    }
  } catch (e) {
    console.log(`[ResourceLoader] Локальный файл не найден: ${localUrl}`);
  }

  // Пробуем Supabase
  const supabaseUrl = getSupabaseUrl(bucket, fileName);
  try {
    const response = await fetch(supabaseUrl);
    if (response.ok) {
      const data = await response.json();
      console.log(`[ResourceLoader] Загружено из Supabase: ${supabaseUrl}`);
      return { data, source: 'supabase' };
    }
  } catch (e) {
    console.log(`[ResourceLoader] Supabase недоступен: ${supabaseUrl}`);
  }

  // Возвращаем null - далее используется кэш
  return { data: null, source: 'cache' };
}

/**
 * Получить базовый путь для ресурсов текущей истории
 * В игровом режиме возвращает локальный путь
 * В редакторе - пустой (используется Supabase)
 */
export function getAssetsBasePath(bucket: string): string {
  const isEditorMode = gameModeState.mode === 'editor';
  
  if (isEditorMode) {
    return ''; // В редакторе используем полные URL
  }
  
  return `/stories/${bucket}`;
}

/**
 * Проверить, доступны ли локальные assets для истории
 * Используется для отображения индикатора в UI
 */
export async function hasLocalAssets(bucket: string): Promise<boolean> {
  // Пробуем загрузить любой файл из локальной папки
  try {
    const response = await fetch(`/stories/${bucket}/.gitkeep`, { method: 'HEAD' });
    // Если файл не найден, это не значит что папки нет
    // Проверяем наличие JSON
    const jsonResponse = await fetch(`/stories/${bucket}/story.json`, { method: 'HEAD' });
    return jsonResponse.ok;
  } catch {
    return false;
  }
}
