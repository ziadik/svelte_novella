import { bucketName } from "../../supabaseClient";
import type { StoryData, StoredFile, StatusMessage } from "../types";

const editorStore = $state({
  // Текущее состояние
  showEditor: false,
  showItems: false,
  editingOptionIndex: null as number | null,
  editingItemIndex: null as number | null,

  // Выбранные элементы
  selectedChapterId: null as string | null,
  selectedDialogueId: null as string | null,

  // Данные
  data: { dialogues: [], chapters: [] } as StoryData,
  storedFiles: [] as StoredFile[],
  storiesList: [] as string[],

  // Мета-данные
  currentFileName: "dracula_story_v3.json",
  statusMessage: { type: "", text: "" } as StatusMessage,

  // Computed значения
  get currentDialogue() {
    return this.data?.dialogues.find((d) => d.id === this.selectedDialogueId);
  },

  get currentChapter() {
    return this.data?.chapters?.find((c) => c.id === this.selectedChapterId);
  },

  get currentEditingOption() {
    return this.currentDialogue && this.editingOptionIndex !== null
      ? this.currentDialogue.options?.[this.editingOptionIndex]
      : null;
  },

  get chapterDialogues() {
    return (
      this.data?.dialogues.filter(
        (d) => d.chapterId === this.selectedChapterId,
      ) || []
    );
  },

  get imageResources() {
    return this.storedFiles.filter((f) =>
      f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i),
    );
  },

  get rivResources() {
    return this.storedFiles.filter((f) => f.name.endsWith(".riv"));
  },

  get availableItems() {
    return this.data?.items || [];
  },

  get backlinks() {
    if (!this.data || !this.selectedDialogueId) return [];

    return this.data.dialogues.filter((d) => {
      if (d.nextDialogueId === this.selectedDialogueId) return true;
      if (d.options) {
        return d.options.some(
          (o) => o.nextDialogueId === this.selectedDialogueId,
        );
      }
      return false;
    });
  },
});

// Экспортируем store и его методы
export const editor = editorStore;

export const editorActions = {
  toggleEditor() {
    editor.showEditor = !editor.showEditor;
  },

  toggleItemsPanel() {
    editor.showItems = !editor.showItems;
  },

  setStatus(type: StatusMessage["type"], text: string) {
    editor.statusMessage = { type, text };
  },

  clearStatus() {
    editor.statusMessage = { type: "", text: "" };
  },

  // ... другие методы управления состоянием
};
