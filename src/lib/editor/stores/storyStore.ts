import { supabase } from "../../supabaseClient";
import { editor, editorActions } from "./editorStore.svelte";
import { resourceActions } from "./resourceStore";
import { migrateStoryData } from "../utils/migration";
import type { StoryData } from "../types";

/**
 * Проверить доступность файла через публичный URL
 */
async function checkPublicAccess(bucketName: string, fileName: string): Promise<boolean> {
  try {
    const publicUrl = `${supabase.storage.from(bucketName).getPublicUrl(fileName).data.publicUrl}`;
    console.log(`[StoryStore] Проверка публичного URL: ${publicUrl}`);

    const response = await fetch(publicUrl, { method: 'HEAD' });
    console.log(`[StoryStore] Статус ответа: ${response.status}`);
    return response.ok;
  } catch (err) {
    console.error(`[StoryStore] Ошибка проверки публичного доступа:`, err);
    return false;
  }
}

export const storyActions = {
  async createNewStory() {
    if (!editor.selectedBucket) {
      editorActions.setStatus("error", "Не выбрана история (bucket)");
      return;
    }

    const name = prompt("Введите имя файла истории:", "new_story.json");
    if (!name) return;

    const newTemplate: StoryData = {
      meta: { version: "3.1", title: "New Story" },
      chapters: [{ id: "ch1", title: "Глава 1" }],
      dialogues: [
        {
          id: "start",
          chapterId: "ch1",
          text: "Начало...",
          options: [],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(newTemplate, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(editor.selectedBucket)
      .upload(name, blob);

    if (error) {
      editorActions.setStatus("error", "Ошибка создания: " + error.message);
    } else {
      await resourceActions.loadStoriesList();
      await this.loadStory(name);
    }
  },

  async loadStory(fileName: string) {
    if (!editor.selectedBucket) {
      editorActions.setStatus("error", "Не выбрана история (bucket)");
      return;
    }

    console.log(`[StoryStore] Загрузка истории: ${fileName} из bucket: ${editor.selectedBucket}`);
    editorActions.setStatus("loading", "Загрузка...");
    editor.currentFileName = fileName;

    try {
      // Сначала пробуем через обычный метод download
      const { data: fileData, error } = await supabase.storage
        .from(editor.selectedBucket)
        .download(fileName);

      console.log(`[StoryStore] Результат загрузки (download):`, { hasData: !!fileData, error });

      let textData: string;

      if (error) {
        console.warn(`[StoryStore] Ошибка download, пробуем публичный URL:`, error);

        // Пробуем через публичный URL
        const publicUrl = supabase.storage.from(editor.selectedBucket).getPublicUrl(fileName).data.publicUrl;
        console.log(`[StoryStore] Публичный URL: ${publicUrl}`);

        const response = await fetch(publicUrl);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить файл: ${response.statusText}`);
        }

        textData = await response.text();
        console.log(`[StoryStore] Данные загружены через публичный URL, длина: ${textData.length}`);
      } else {
        textData = await fileData.text();
        console.log(`[StoryStore] Данные загружены через download, длина: ${textData.length}`);
      }

      let parsedData = JSON.parse(textData);
      console.log(`[StoryStore] Данные распарсены:`, {
        meta: parsedData.meta,
        chaptersCount: parsedData.chapters?.length,
        dialoguesCount: parsedData.dialogues?.length,
        itemsCount: parsedData.items?.length
      });

      // Применяем миграции
      parsedData = migrateStoryData(parsedData);

      console.log(`[StoryStore] Присваиваем данные в editor.data`);
      editor.data = parsedData;

      console.log(`[StoryStore] editor.data обновлен:`, {
        chapters: editor.data.chapters?.length,
        dialogues: editor.data.dialogues?.length
      });

      // Устанавливаем выбранные элементы
      if (editor.data.chapters && editor.data.chapters.length > 0) {
        editor.selectedChapterId = editor.data.chapters[0].id;
        console.log(`[StoryStore] Выбрана глава: ${editor.selectedChapterId}`);
      }
      if (editor.data.dialogues && editor.data.dialogues.length > 0) {
        editor.selectedDialogueId = editor.data.dialogues[0].id;
        console.log(`[StoryStore] Выбран диалог: ${editor.selectedDialogueId}`);
      }

      console.log(`[StoryStore] Загрузка завершена успешно`);
      editorActions.setStatus("success", "Загружено!");
    } catch (err: any) {
      console.error(`[StoryStore] Ошибка загрузки:`, err);
      editorActions.setStatus("error", "Ошибка загрузки: " + err.message);
    }
  },

  async saveCurrentStory() {
    if (!editor.data) return;
    if (!editor.selectedBucket) {
      editorActions.setStatus("error", "Не выбрана история (bucket)");
      return;
    }

    editorActions.setStatus("loading", "Сохранение...");
    const blob = new Blob([JSON.stringify(editor.data, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(editor.selectedBucket)
      .upload(editor.currentFileName, blob, { upsert: true });

    editorActions.setStatus(
      error ? "error" : "success",
      error ? "Ошибка сохранения" : "Сохранено!",
    );
  },

  async saveStoryCopy() {
    if (!editor.data) return;
    if (!editor.selectedBucket) {
      editorActions.setStatus("error", "Не выбрана история (bucket)");
      return;
    }

    const baseName = editor.currentFileName.replace(".json", "");
    const timestamp = new Date().getTime();
    let copyName = `${baseName}_copy_${timestamp}.json`.trim();

    const userInput = prompt("Введите имя для копии:", copyName);
    if (!userInput) return;

    copyName = userInput.trim();
    if (!copyName.endsWith(".json")) copyName += ".json";

    editorActions.setStatus("loading", "Создание копии...");
    const blob = new Blob([JSON.stringify(editor.data, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(editor.selectedBucket)
      .upload(copyName, blob, { upsert: true });

    if (error) {
      editorActions.setStatus("error", `Ошибка копии: ${error.message}`);
    } else {
      await resourceActions.loadStoriesList();
      editorActions.setStatus("success", "Копия сохранена!");
    }
  },

  // Логика редактора
  addChapter() {
    if (!editor.data || !editor.data.chapters) return;

    const id = "ch_" + Date.now();
    editor.data.chapters.push({ id, title: "Новая глава" });
    editor.selectedChapterId = id;
  },

  addDialogue() {
    if (!editor.data || !editor.selectedChapterId) return;

    const id = "d_" + Date.now();
    editor.data.dialogues.push({
      id,
      chapterId: editor.selectedChapterId,
      text: "Новый текст...",
      options: [],
    });

    editor.selectedDialogueId = id;
  },

  deleteDialogue(id: string) {
    if (!confirm("Удалить диалог " + id + "?")) return;
    if (!editor.data) return;

    editor.data.dialogues = editor.data.dialogues.filter((d) => d.id !== id);

    // Очищаем ссылки на удаленный диалог
    editor.data.dialogues.forEach((d) => {
      if (d.nextDialogueId === id) d.nextDialogueId = "";
      if (d.options) {
        d.options.forEach((o) => {
          if (o.nextDialogueId === id) o.nextDialogueId = "";
        });
      }
    });

    if (editor.selectedDialogueId === id) {
      editor.selectedDialogueId = null;
    }
  },

  jumpTo(id: string) {
    const target = editor.data?.dialogues.find((d) => d.id === id);
    if (target) {
      editor.selectedChapterId = target.chapterId;
      editor.selectedDialogueId = id;
    }
  },

  getLinkType(source: any, targetId: string): string {
    if (source.nextDialogueId === targetId) return "Auto";
    return "Option";
  },
};
