import { supabase } from '../supabaseClient';
import { authState } from './authStore.svelte';
import type { StoryData } from '../editor/types';

// Тип истории из таблицы
export interface Story {
  id: string;
  created_at: string;
  title: string;
  author_id: string | null;
  json_url: string;
  preview_image_url: string | null;
  is_public: boolean;
  allowed_players: string[];
}

// Состояние
interface StoriesState {
  stories: Story[];
  loading: boolean;
  initialized: boolean;
}

const stories: StoriesState = $state({
  stories: [],
  loading: false,
  initialized: false,
});

// Функции для получения производных данных

// Публичные истории - видят ВСЕ (гости, игроки, авторы)
export function getPublicStories(): Story[] {
  return stories.stories.filter(s => s.is_public);
}

// Истории, доступные конкретному игроку (публичные + персональный доступ)
export function getPlayerStories(): Story[] {
  const userId = authState.user?.id;
  
  // Если пользователь не авторизован - показываем только публичные
  if (!userId) {
    return getPublicStories();
  }
  
  // Авторизованный игрок видит публичные + те, где он в списке allowed_players
  return stories.stories.filter(s => 
    s.is_public || (s.allowed_players && s.allowed_players.includes(userId))
  );
}

// Истории автора (только свои)
export function getAuthorStories(): Story[] {
  return stories.stories.filter(s => s.author_id === authState.user?.id);
}

export function hasAuthorStories(): boolean {
  return stories.stories.some(s => s.author_id === authState.user?.id);
}

// Загрузка историй
export async function loadStories(): Promise<void> {
  stories.loading = true;

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stories:', error);
      stories.stories = [];
    } else {
      stories.stories = data || [];
    }
  } catch (error) {
    console.error('Error loading stories:', error);
    stories.stories = [];
  }

  stories.loading = false;
  stories.initialized = true;
}

// Создание истории (для авторов)
export async function createStory(title: string): Promise<{ success: boolean; story?: Story; error?: string }> {
  if (!authState.user) {
    return { success: false, error: 'Необходимо войти' };
  }

  try {
    // Создаём JSON файл в storage
    const bucketName = 'stories';
    const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.json`;
    
    const newStory: StoryData = {
      meta: { version: "3.1", title },
      chapters: [{ id: "ch1", title: "Глава 1", description: "" }],
      dialogues: [
        {
          id: "start",
          chapterId: "ch1",
          text: "Начало истории...",
          options: [],
        },
      ],
      items: [],
      miniGames: [],
    };

    const jsonString = JSON.stringify(newStory, null, 2);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, { contentType: "application/json" });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const jsonUrl = `${bucketName}/${fileName}`;

    // Создаём запись в таблице stories
    const { data, error } = await supabase
      .from('stories')
      .insert({
        title,
        author_id: authState.user.id,
        json_url: jsonUrl,
        is_public: false,
        allowed_players: [],
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    await loadStories();
    return { success: true, story: data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Обновление истории (для авторов)
export async function updateStory(storyId: string, updates: Partial<Story>): Promise<{ success: boolean; error?: string }> {
  if (!authState.user) {
    return { success: false, error: 'Необходимо войти' };
  }

  try {
    const { error } = await supabase
      .from('stories')
      .update(updates)
      .eq('id', storyId)
      .eq('author_id', authState.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await loadStories();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Удаление истории (для авторов)
export async function deleteStory(storyId: string): Promise<{ success: boolean; error?: string }> {
  if (!authState.user) {
    return { success: false, error: 'Необходимо войти' };
  }

  try {
    // Получаем информацию о истории
    const story = stories.stories.find(s => s.id === storyId);
    if (!story) {
      return { success: false, error: 'История не найдена' };
    }

    // Удаляем файл из storage
    if (story.json_url) {
      const [bucket, ...pathParts] = story.json_url.split('/');
      const filePath = pathParts.join('/');
      
      await supabase.storage.from(bucket).remove([filePath]);
    }

    // Удаляем запись из БД
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('author_id', authState.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    await loadStories();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Загрузка JSON истории из storage
export async function loadStoryJson(story: Story): Promise<StoryData | null> {
  try {
    const [bucket, ...pathParts] = story.json_url.split('/');
    const filePath = pathParts.join('/');

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Error downloading story:', error);
      return null;
    }

    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Error loading story JSON:', error);
    return null;
  }
}

// Сохранение JSON истории в storage
export async function saveStoryJson(storyId: string, storyData: StoryData): Promise<{ success: boolean; error?: string }> {
  try {
    const story = stories.stories.find(s => s.id === storyId);
    if (!story) {
      return { success: false, error: 'История не найдена' };
    }

    const [bucket, ...pathParts] = story.json_url.split('/');
    const filePath = pathParts.join('/');

    const jsonString = JSON.stringify(storyData, null, 2);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);

    const { error } = await supabase.storage
      .from(bucket)
      .update(filePath, uint8Array, { contentType: "application/json" });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Добавить игрока к истории
export async function addPlayerToStory(storyId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  const story = stories.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: 'История не найдена' };
  }

  const currentPlayers = story.allowed_players || [];
  if (currentPlayers.includes(playerId)) {
    return { success: true }; // Уже добавлен
  }

  return updateStory(storyId, {
    allowed_players: [...currentPlayers, playerId],
  });
}

// Удалить игрока из истории
export async function removePlayerFromStory(storyId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
  const story = stories.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: 'История не найдена' };
  }

  const currentPlayers = story.allowed_players || [];
  return updateStory(storyId, {
    allowed_players: currentPlayers.filter(id => id !== playerId),
  });
}

export const storiesState = stories;
