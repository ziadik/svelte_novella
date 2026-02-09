import { writable, derived, get } from "svelte/store";
import type { StoryData, Dialogue, Chapter, Item } from "../types";

// Основные данные
export const editorData = writable<StoryData>({
  dialogues: [],
  chapters: [],
});

// UI состояние
export const showEditor = writable(false);
export const showItems = writable(false);
export const selectedChapterId = writable<string | null>(null);
export const selectedDialogueId = writable<string | null>(null);
export const editingOptionIndex = writable<number | null>(null);
export const editingItemIndex = writable<number | null>(null);

// Computed значения
export const currentDialogue = derived(
  [editorData, selectedDialogueId],
  ([$data, $selectedId]) =>
    $selectedId ? $data.dialogues.find((d) => d.id === $selectedId) : null,
);

export const currentChapter = derived(
  [editorData, selectedChapterId],
  ([$data, $selectedId]) =>
    $selectedId ? $data.chapters?.find((c) => c.id === $selectedId) : null,
);

export const chapterDialogues = derived(
  [editorData, selectedChapterId],
  ([$data, $chapterId]) =>
    $chapterId ? $data.dialogues.filter((d) => d.chapterId === $chapterId) : [],
);

// Методы
export function addDialogue(dialogue: Dialogue) {
  editorData.update((data) => ({
    ...data,
    dialogues: [...data.dialogues, dialogue],
  }));
  selectedDialogueId.set(dialogue.id);
}

export function updateDialogue(id: string, updates: Partial<Dialogue>) {
  editorData.update((data) => ({
    ...data,
    dialogues: data.dialogues.map((d) =>
      d.id === id ? { ...d, ...updates } : d,
    ),
  }));
}

export function deleteDialogue(id: string) {
  editorData.update((data) => ({
    ...data,
    dialogues: data.dialogues.filter((d) => d.id !== id),
  }));

  if (get(selectedDialogueId) === id) {
    selectedDialogueId.set(null);
  }
}
