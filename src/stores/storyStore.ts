import { writable } from "svelte/store";

// Типы
export interface StoryInfo {
  id: string;
  name: string;
  bucket: string;
  defaultFile: string;
  description?: string;
}

// Хранилище историй
export const stories = writable<StoryInfo[]>([
  {
    id: "dracula",
    name: "Дракула",
    bucket: "dracula",
    defaultFile: "dracula_story_v3.json",
  },
  {
    id: "sherlock",
    name: "Шерлок Холмс",
    bucket: "sherlock_cases",
    defaultFile: "story.json",
  },
]);

// Текущая выбранная история
export const currentStory = writable<StoryInfo | null>(null);

// Состояние загрузки
export const isLoading = writable(false);
export const error = writable<string | null>(null);

// Методы
export function setCurrentStory(story: StoryInfo) {
  currentStory.set(story);
  localStorage.setItem("currentStory", JSON.stringify(story));
}

export function loadCurrentStory() {
  const saved = localStorage.getItem("currentStory");
  if (saved) {
    currentStory.set(JSON.parse(saved));
  }
}
