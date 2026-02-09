import { supabase, bucketName } from "../../supabaseClient";
import { editor, editorActions } from "./editorStore.svelte";
import { migrateStoryData } from "../utils/migration";
import type { StoryData } from "../types";

export const storyActions = {
  async createNewStory() {
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
      .from(bucketName)
      .upload(name, blob);

    if (error) {
      editorActions.setStatus("error", "Ошибка создания: " + error.message);
    } else {
      await resourceActions.loadStoriesList();
      await this.loadStory(name);
    }
  },

  async loadStory(fileName: string) {
    editorActions.setStatus("loading", "Загрузка...");
    editor.currentFileName = fileName;

    try {
      const { data: fileData, error } = await supabase.storage
        .from(bucketName)
        .download(fileName);

      if (error) throw error;

      let parsedData = JSON.parse(await fileData.text());

      // Применяем миграции
      parsedData = migrateStoryData(parsedData);

      editor.data = parsedData;

      // Устанавливаем выбранные элементы
      if (editor.data.chapters && editor.data.chapters.length > 0) {
        editor.selectedChapterId = editor.data.chapters[0].id;
      }
      if (editor.data.dialogues && editor.data.dialogues.length > 0) {
        editor.selectedDialogueId = editor.data.dialogues[0].id;
      }

      editorActions.setStatus("success", "Загружено!");
    } catch (err: any) {
      console.error(err);
      editorActions.setStatus("error", "Ошибка загрузки: " + err.message);
    }
  },

  async saveCurrentStory() {
    if (!editor.data) return;

    editorActions.setStatus("loading", "Сохранение...");
    const blob = new Blob([JSON.stringify(editor.data, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(editor.currentFileName, blob, { upsert: true });

    editorActions.setStatus(
      error ? "error" : "success",
      error ? "Ошибка сохранения" : "Сохранено!",
    );
  },

  async saveStoryCopy() {
    if (!editor.data) return;

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
      .from(bucketName)
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
