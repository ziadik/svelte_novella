import { bucketName } from "../../supabaseClient";
import type { StoryData, StoredFile, StatusMessage, Dialogue, Option, Item } from "../types";

// Тип для типа сообщения статуса
export type StatusMessageType = 'success' | 'error' | 'info' | 'warning' | '';

// Интерфейс для состояния редактора
interface EditorState {
  // UI состояние
  showEditor: boolean;
  showItems: boolean;
  editingOptionIndex: number | null;
  editingItemIndex: number | null;

  // Выбранные элементы
  selectedChapterId: string | null;
  selectedDialogueId: string | null;

  // Данные
  data: StoryData;
  storedFiles: StoredFile[];
  storiesList: string[];

  // Мета-данные
  currentFileName: string;
  statusMessage: StatusMessage;
  bucketName: string;
}

// Создаем реактивное состояние с использованием Svelte 5 runes
// Экспортируем напрямую реактивный объект
export const editor = $state<EditorState>({
  // Текущее состояние
  showEditor: false,
  showItems: false,
  editingOptionIndex: null,
  editingItemIndex: null,

  // Выбранные элементы
  selectedChapterId: null,
  selectedDialogueId: null,

  // Данные
  data: { 
    meta: { version: "3.1", title: "Новая история" },
    dialogues: [], 
    chapters: [],
    items: [],
    miniGames: []
  } as StoryData,
  storedFiles: [],
  storiesList: [],

  // Мета-данные
  currentFileName: "dracula_story_v3.json",
  statusMessage: { type: "", text: "" },
  bucketName,
});

// Экспортируем derived значения как отдельные функции для доступа
export const editorDerived = {
  get currentDialogue(): Dialogue | undefined {
    return editor.data?.dialogues.find((d) => d.id === editor.selectedDialogueId);
  },

  get currentChapter() {
    return editor.data?.chapters?.find((c) => c.id === editor.selectedChapterId);
  },

  get currentEditingOption(): Option | undefined {
    return editorDerived.currentDialogue && editor.editingOptionIndex !== null
      ? editorDerived.currentDialogue.options?.[editor.editingOptionIndex]
      : undefined;
  },

  get chapterDialogues(): Dialogue[] {
    if (!editor.data?.dialogues || !editor.selectedChapterId) return [];
    return editor.data.dialogues.filter(
      (d) => d.chapterId === editor.selectedChapterId,
    );
  },

  get imageResources(): StoredFile[] {
    return editor.storedFiles.filter((f) =>
      f.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i),
    );
  },

  get riveResources(): StoredFile[] {
    return editor.storedFiles.filter((f) => f.name.endsWith(".riv"));
  },

  get availableItems(): Item[] {
    return editor.data?.items || [];
  },

  get backlinks(): Dialogue[] {
    if (!editor.data || !editor.selectedDialogueId) return [];

    return editor.data.dialogues.filter((d) => {
      if (d.nextDialogueId === editor.selectedDialogueId) return true;
      if (d.options) {
        return d.options.some(
          (o) => o.nextDialogueId === editor.selectedDialogueId,
        );
      }
      return false;
    });
  },

  get hasUnsavedChanges(): boolean {
    return false; // TODO: реализовать проверку изменений
  },
};

// Actions для управления состоянием редактора
export const editorActions = {
  // Переключение видимости редактора
  toggleEditor(): void {
    editor.showEditor = !editor.showEditor;
  },

  // Переключение панели предметов
  toggleItemsPanel(): void {
    editor.showItems = !editor.showItems;
  },

  // Установка статуса
  setStatus(type: StatusMessageType, text: string): void {
    editor.statusMessage = { type, text };
  },

  // Очистка статуса
  clearStatus(): void {
    editor.statusMessage = { type: "", text: "" };
  },

  // Выбор главы
  selectChapter(chapterId: string | null): void {
    editor.selectedChapterId = chapterId;
    editor.selectedDialogueId = null;
  },

  // Выбор диалога
  selectDialogue(dialogueId: string | null): void {
    editor.selectedDialogueId = dialogueId;
  },

  // Выбор опции для редактирования
  selectOption(optionIndex: number | null): void {
    editor.editingOptionIndex = optionIndex;
  },

  // Выбор предмета для редактирования
  selectItem(itemIndex: number | null): void {
    editor.editingItemIndex = itemIndex;
  },

  // Обновление данных истории
  updateStoryData(data: StoryData): void {
    editor.data = data;
  },

  // Обновление списка файлов
  updateStoredFiles(files: StoredFile[]): void {
    editor.storedFiles = files;
  },

  // Обновление списка историй
  updateStoriesList(stories: string[]): void {
    editor.storiesList = stories;
  },

  // Установка текущего имени файла
  setCurrentFileName(fileName: string): void {
    editor.currentFileName = fileName;
  },

  // Добавление нового диалога
  addDialogue(dialogue: Dialogue): void {
    editor.data.dialogues = [...editor.data.dialogues, dialogue];
  },

  // Обновление диалога
  updateDialogue(dialogueId: string, updates: Partial<Dialogue>): void {
    editor.data.dialogues = editor.data.dialogues.map(d =>
      d.id === dialogueId ? { ...d, ...updates } : d
    );
  },

  // Удаление диалога
  deleteDialogue(dialogueId: string): void {
    editor.data.dialogues = editor.data.dialogues.filter(d => d.id !== dialogueId);
    
    // Сброс выбора, если удален текущий диалог
    if (editor.selectedDialogueId === dialogueId) {
      editor.selectedDialogueId = null;
    }
  },

  // Добавление новой главы
  addChapter(chapter: { id: string; title: string }): void {
    editor.data.chapters = [...editor.data.chapters, chapter];
  },

  // Обновление главы
  updateChapter(chapterId: string, updates: { title: string }): void {
    editor.data.chapters = editor.data.chapters.map(c =>
      c.id === chapterId ? { ...c, ...updates } : c
    );
  },

  // Удаление главы
  deleteChapter(chapterId: string): void {
    editor.data.chapters = editor.data.chapters.filter(c => c.id !== chapterId);
    
    // Сброс выбора, если удалена текущая глава
    if (editor.selectedChapterId === chapterId) {
      editor.selectedChapterId = null;
      editor.selectedDialogueId = null;
    }
  },

  // Добавление предмета
  addItem(item: Item): void {
    editor.data.items = [...(editor.data.items || []), item];
  },

  // Обновление предмета
  updateItem(itemId: string, updates: Partial<Item>): void {
    if (!editor.data.items) return;
    editor.data.items = editor.data.items.map(i =>
      i.id === itemId ? { ...i, ...updates } : i
    );
  },

  // Удаление предмета
  deleteItem(itemId: string): void {
    if (!editor.data.items) return;
    editor.data.items = editor.data.items.filter(i => i.id !== itemId);
  },

  // Сброс состояния редактора
  reset(): void {
    editor.showEditor = false;
    editor.showItems = false;
    editor.editingOptionIndex = null;
    editor.editingItemIndex = null;
    editor.selectedChapterId = null;
    editor.selectedDialogueId = null;
    editor.statusMessage = { type: "", text: "" };
  },
};
