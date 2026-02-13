import { supabase } from "../../supabaseClient";
import { editor, editorActions } from "./editorStore.svelte";
import type { StoredFile } from "../types";

export const resourceActions = {
  async loadStoriesList() {
    if (!editor.selectedBucket) {
      console.warn('[ResourceStore] No bucket selected');
      return;
    }

    console.log(`[ResourceStore] Формирование имени файла для bucket: ${editor.selectedBucket}`);
    const storyFileName = `${editor.selectedBucket}_story.json`;

    // Проверяем, существует ли файл
    const { data: files, error } = await supabase.storage
      .from(editor.selectedBucket)
      .list("", { search: storyFileName });

    console.log(`[ResourceStore] Проверка файла ${storyFileName}:`, { files, error });

    if (!error && files && files.some(f => f.name === storyFileName)) {
      editor.storiesList = [storyFileName];
      console.log(`[ResourceStore] Найден файл: ${storyFileName}`);
    } else {
      editor.storiesList = [];
      console.warn(`[ResourceStore] Файл ${storyFileName} не найден`);
    }
  },

  async loadStoredResources() {
    if (!editor.selectedBucket) {
      console.warn('No bucket selected');
      return;
    }

    const { data: files } = await supabase.storage.from(editor.selectedBucket).list();
    if (files) {
      editor.storedFiles = files.filter(
        (f) =>
          f.name !== ".emptyFolderPlaceholder" && !f.name.endsWith(".json"),
      );
    }
  },

  async uploadNewFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (!editor.selectedBucket) {
      editorActions.setStatus("error", "Не выбрана история");
      return;
    }

    const file = input.files[0];
    editorActions.setStatus("loading", "Загрузка файла...");

    // Читаем файл как ArrayBuffer и конвертируем в Uint8Array
    // Это предотвращает добавление multipart заголовков Supabase SDK
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from(editor.selectedBucket)
      .upload(file.name, uint8Array, { upsert: true, contentType: file.type });

    if (error) {
      editorActions.setStatus("error", "Ошибка загрузки");
    } else {
      editorActions.setStatus("success", "Файл загружен");
      await this.loadStoredResources();
    }
  },

  async deleteFile(fileName: string) {
    if (!editor.selectedBucket) {
      editorActions.setStatus("error", "Не выбрана история");
      return;
    }

    const { error } = await supabase.storage
      .from(editor.selectedBucket)
      .remove([fileName]);

    if (error) {
      editorActions.setStatus("error", "Ошибка удаления файла");
    } else {
      editorActions.setStatus("success", "Файл удален");
      await this.loadStoredResources();
    }
  },
};
