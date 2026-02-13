import type {
  StoryData,
  Dialogue,
  Chapter,
  Item,
  StoredFile,
  StatusMessage,
} from "../types";

// Внутреннее состояние
const state = $state({
  // Основные данные
  editorData: {
    dialogues: [],
    chapters: [],
    items: [],
  } as StoryData,

  // UI состояние
  showEditor: false,
  showItems: false,
  selectedChapterId: null as string | null,
  selectedDialogueId: null as string | null,
  editingOptionIndex: null as number | null,
  editingItemIndex: null as number | null,

  // Мета-данные и файлы
  storedFiles: [] as StoredFile[],
  storiesList: ["dracula_story_v3.json"] as string[],
  currentFileName: "dracula_story_v3.json",
  statusMessage: {
    type: "",
    text: "",
  } as StatusMessage,
});

// Computed значения как реактивные значения
let currentDialogueValue = $derived(
  state.selectedDialogueId ? state.editorData.dialogues.find((d) => d.id === state.selectedDialogueId) : null
);

let currentChapterValue = $derived(
  state.selectedChapterId ? state.editorData.chapters?.find((c) => c.id === state.selectedChapterId) : null
);

let chapterDialoguesValue = $derived(
  state.selectedChapterId ? state.editorData.dialogues.filter((d) => d.chapterId === state.selectedChapterId) : []
);

let imageResourcesValue = $derived(
  state.storedFiles.filter((f) => f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i))
);

let rivResourcesValue = $derived(
  state.storedFiles.filter((f) => f.name.endsWith(".riv"))
);

let availableItemsValue = $derived(state.editorData?.items || []);

let backlinksValue = $derived(() => {
  if (!state.editorData || !state.selectedDialogueId) return [];

  return state.editorData.dialogues.filter((d) => {
    if (d.nextDialogueId === state.selectedDialogueId) return true;
    if (d.options) {
      return d.options.some((o) => o.nextDialogueId === state.selectedDialogueId);
    }
    return false;
  });
});

// Геттеры для состояния и computed значений
export const editorData = () => state.editorData;
export const showEditor = () => state.showEditor;
export const showItems = () => state.showItems;
export const selectedChapterId = () => state.selectedChapterId;
export const selectedDialogueId = () => state.selectedDialogueId;
export const editingOptionIndex = () => state.editingOptionIndex;
export const editingItemIndex = () => state.editingItemIndex;
export const storedFiles = () => state.storedFiles;
export const storiesList = () => state.storiesList;
export const currentFileName = () => state.currentFileName;
export const statusMessage = () => state.statusMessage;

// Геттеры для computed значений
export const currentDialogue = () => currentDialogueValue;
export const currentChapter = () => currentChapterValue;
export const chapterDialogues = () => chapterDialoguesValue;
export const imageResources = () => imageResourcesValue;
export const rivResources = () => rivResourcesValue;
export const availableItems = () => availableItemsValue;
export const backlinks = () => backlinksValue;

// Основные методы
export function addDialogue(dialogue: Dialogue) {
  state.editorData.dialogues.push(dialogue);
  state.selectedDialogueId = dialogue.id;
}

export function updateDialogue(id: string, updates: Partial<Dialogue>) {
  const index = state.editorData.dialogues.findIndex((d) => d.id === id);
  if (index !== -1) {
    state.editorData.dialogues[index] = { ...state.editorData.dialogues[index], ...updates };
  }
}

export function deleteDialogue(id: string) {
  state.editorData.dialogues = state.editorData.dialogues.filter((d) => d.id !== id);

  if (state.selectedDialogueId === id) {
    state.selectedDialogueId = null;
  }
}

export function addChapter(chapter: Chapter) {
  if (!state.editorData.chapters) {
    state.editorData.chapters = [];
  }
  state.editorData.chapters.push(chapter);
  state.selectedChapterId = chapter.id;
}

export function updateChapter(id: string, updates: Partial<Chapter>) {
  if (!state.editorData.chapters) return;
  const index = state.editorData.chapters.findIndex((c) => c.id === id);
  if (index !== -1) {
    state.editorData.chapters[index] = { ...state.editorData.chapters[index], ...updates };
  }
}

export function updateStoryData(data: Partial<StoryData>) {
  state.editorData = { ...state.editorData, ...data };
}

// UI методы и actions
export const editorActions = {
  toggleEditor() {
    state.showEditor = !state.showEditor;
  },

  toggleItemsPanel() {
    state.showItems = !state.showItems;
  },

  setStatus(type: StatusMessage["type"], text: string) {
    state.statusMessage = { type, text };
  },

  clearStatus() {
    state.statusMessage = { type: "", text: "" };
  },

  setEditingOptionIndex(index: number | null) {
    state.editingOptionIndex = index;
  },

  setEditingItemIndex(index: number | null) {
    state.editingItemIndex = index;
  },

  getLinkType(source: any, targetId: string): string {
    if (source.nextDialogueId === targetId) return "Auto";
    return "Option";
  },

  // Методы для управления файлами
  setCurrentFileName(fileName: string) {
    state.currentFileName = fileName;
  },

  setStoriesList(files: string[]) {
    state.storiesList = files;
  },

  setStoredFiles(files: StoredFile[]) {
    state.storedFiles = files;
  },

  // Методы для управления состоянием редактора
  setEditorData(data: StoryData) {
    state.editorData = data;
  },

  setSelectedChapterId(id: string | null) {
    state.selectedChapterId = id;
  },

  setSelectedDialogueId(id: string | null) {
    state.selectedDialogueId = id;
  },

  updateDialogue(id: string, updates: Partial<Dialogue>) {
    const index = state.editorData.dialogues.findIndex((d) => d.id === id);
    if (index !== -1) {
      state.editorData.dialogues[index] = { ...state.editorData.dialogues[index], ...updates };
    }
  },
};

// Алиас для обратной совместимости (использовать editorData() вместо data)
export const data = () => state.editorData;
