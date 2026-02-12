import { supabase, bucketName } from "../services/supabase";
import {
  editorData,
  selectedChapterId,
  selectedDialogueId,
  currentFileName,
  statusMessage,
  storiesList,
  editorActions,
} from "./editorStore.svelte";
import { resourceActions } from "./resourceStore.svelte";
import { migrateStoryData } from "../utils/migration";
import type { StoryData, Dialogue } from "../types";

// Хранилище для игрового состояния
const gameStateInternal = $state<{
  currentStory: StoryData | null;
  player: {
    inventory: string[];
    stats: Record<string, number>;
  };
  currentDialogueId: string | null;
}>({
  currentStory: null,
  player: {
    inventory: [],
    stats: {},
  },
  currentDialogueId: null,
});

// Геттеры для состояния
export const gameState = () => gameStateInternal;

// Геттер для текущей истории
let currentStoryValue = $derived(() => gameStateInternal.currentStory);
export const currentStory = () => currentStoryValue;

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
    editorActions.setCurrentFileName(fileName);

    try {
      const { data: fileData, error } = await supabase.storage
        .from(bucketName)
        .download(fileName);

      if (error) throw error;

      let parsedData = JSON.parse(await fileData.text());

      // Применяем миграции
      parsedData = migrateStoryData(parsedData);

      editorActions.setEditorData(parsedData);

      // Устанавливаем выбранные элементы
      if (parsedData.chapters && parsedData.chapters.length > 0) {
        editorActions.setSelectedChapterId(parsedData.chapters[0].id);
      }
      if (parsedData.dialogues && parsedData.dialogues.length > 0) {
        editorActions.setSelectedDialogueId(parsedData.dialogues[0].id);
      }

      editorActions.setStatus("success", "Загружено!");
    } catch (err: any) {
      console.error(err);
      editorActions.setStatus("error", "Ошибка загрузки: " + err.message);
    }
  },

  async saveCurrentStory() {
    const data = editorData();
    const fileName = currentFileName();
    if (!data) return;

    editorActions.setStatus("loading", "Сохранение...");
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, blob, { upsert: true });

    editorActions.setStatus(
      error ? "error" : "success",
      error ? "Ошибка сохранения" : "Сохранено!",
    );
  },

  async saveStoryCopy() {
    const data = editorData();
    const fileName = currentFileName();
    if (!data) return;

    const baseName = fileName.replace(".json", "");
    const timestamp = new Date().getTime();
    let copyName = `${baseName}_copy_${timestamp}.json`.trim();

    const userInput = prompt("Введите имя для копии:", copyName);
    if (!userInput) return;

    copyName = userInput.trim();
    if (!copyName.endsWith(".json")) copyName += ".json";

    editorActions.setStatus("loading", "Создание копии...");
    const blob = new Blob([JSON.stringify(data, null, 2)], {
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
    const id = "ch_" + Date.now();
    const newChapter = { id, title: "Новая глава" };

    // Используем функцию из editorStore
    const { addChapter } = require("./editorStore.svelte");
    addChapter(newChapter);
  },

  addDialogue() {
    const chapterId = selectedChapterId();
    if (!chapterId) return;

    const id = "d_" + Date.now();
    const newDialogue: Dialogue = {
      id,
      chapterId,
      text: "Новый текст...",
      options: [],
    };

    // Используем функцию из editorStore
    const { addDialogue } = require("./editorStore.svelte");
    addDialogue(newDialogue);
  },

  deleteDialogue(id: string) {
    if (!confirm("Удалить диалог " + id + "?")) return;

    // Используем функцию из editorStore
    const { deleteDialogue } = require("./editorStore.svelte");
    deleteDialogue(id);
  },

  jumpTo(id: string) {
    const data = editorData();
    if (!data) return;

    const target = data.dialogues.find((d) => d.id === id);
    if (target) {
      editorActions.setSelectedChapterId(target.chapterId);
      editorActions.setSelectedDialogueId(id);
    }
  },

  getLinkType(source: any, targetId: string): string {
    if (source.nextDialogueId === targetId) return "Auto";
    return "Option";
  },
};
