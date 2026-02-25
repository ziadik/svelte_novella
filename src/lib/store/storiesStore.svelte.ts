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
  bucket: string; // bucket где хранятся ресурсы истории
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

// Статический список историй для гостей (fallback)
const FALLBACK_STORIES: Story[] = [
  {
    id: 'dracula',
    created_at: new Date().toISOString(),
    title: 'Дракула',
    author_id: null,
    json_url: 'dracula_story.json',
    preview_image_url: null,
    is_public: true,
    allowed_players: [],
    bucket: 'dracula'
  },
  {
    id: 'zombie',
    created_at: new Date().toISOString(),
    title: 'Выживание',
    author_id: null,
    json_url: 'zombie_story.json',
    preview_image_url: null,
    is_public: true,
    allowed_players: [],
    bucket: 'zombie'
  },
  {
    id: 'fairy_tale',
    created_at: new Date().toISOString(),
    title: 'Сказка',
    author_id: null,
    json_url: 'fairy_tale_story.json',
    preview_image_url: null,
    is_public: true,
    allowed_players: [],
    bucket: 'fairy_tale'
  },
  {
    id: 'minigames',
    created_at: new Date().toISOString(),
    title: 'Мини-игры',
    author_id: null,
    json_url: 'minigames_story.json',
    preview_image_url: null,
    is_public: true,
    allowed_players: [],
    bucket: 'minigames'
  }
];

// Публичные истории - видят ВСЕ (гости, игроки, авторы)
export function getPublicStories(): Story[] {
  console.log('[getPublicStories] initialized:', stories.initialized, 'stories.length:', stories.stories.length);
  // Если stories не загружены - возвращаем fallback
  if (!stories.initialized || stories.stories.length === 0) {
    console.log('[getPublicStories] Возвращаем fallback, count:', FALLBACK_STORIES.length);
    return FALLBACK_STORIES;
  }
  const filtered = stories.stories.filter(s => s.is_public);
  console.log('[getPublicStories] Публичных историй:', filtered.length);
  return filtered;
}

// Истории, доступные конкретному игроку (публичные + персональный доступ)
export function getPlayerStories(): Story[] {
  const userId = authState.user?.id;
  
  // Если пользователь не авторизован - показываем fallback или публичные
  if (!userId) {
    const publicStories = getPublicStories();
    const result = publicStories.length > 0 ? publicStories : FALLBACK_STORIES;
    console.log('[getPlayerStories] Гость, результат:', result.length);
    return result;
  }
  
  // Авторизованный игрок видит публичные + те, где он в списке allowed_players
  const result = stories.stories.filter(s => 
    s.is_public || (s.allowed_players && s.allowed_players.includes(userId))
  );
  console.log('[getPlayerStories] Авторизован, результат:', result.length);
  return result;
}

// Истории автора (только свои + все для админа)
export function getAuthorStories(): Story[] {
  const userId = authState.user?.id;
  
  // Админ видит все истории
  if (userId && authState.profile?.is_admin) {
    return stories.stories;
  }
  
  // Обычный автор видит только свои
  return stories.stories.filter(s => s.author_id === userId);
}

export function hasAuthorStories(): boolean {
  return stories.stories.some(s => s.author_id === authState.user?.id);
}

// Загрузка историй
export async function loadStories(): Promise<void> {
  console.log('[storiesStore] loadStories начало');
  stories.loading = true;

  try {
    console.log('[storiesStore] Загрузка историй из таблицы...');
    
    // Проверяем наличие сети
    if (!navigator.onLine) {
      console.log('[storiesStore] Нет сети - используем fallback');
      stories.stories = [];
      stories.loading = false;
      stories.initialized = true;
      console.log('[storiesStore] loadStories завершено (офлайн)');
      return;
    }
    
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[storiesStore] Error loading stories:', error);
      console.log('[storiesStore] Используем fallback истории');
      stories.stories = [];
    } else {
      console.log('[storiesStore] Загружено историй из БД:', data?.length || 0);
      stories.stories = data || [];
    }
  } catch (error) {
    console.error('[storiesStore] Exception loading stories:', error);
    console.log('[storiesStore] Используем fallback истории');
    stories.stories = [];
  }

  stories.loading = false;
  stories.initialized = true;
  console.log('[storiesStore] loadStories завершено. Историй в сторе:', stories.stories.length);
}

// Создание истории (для авторов)
export async function createStory(title: string, bucketName: string = 'stories'): Promise<{ success: boolean; story?: Story; error?: string }> {
  if (!authState.user) {
    return { success: false, error: 'Необходимо войти' };
  }

  try {
    // Создаём JSON файл в storage
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

    const jsonUrl = fileName;

    // Создаём запись в таблице stories
    const { data, error } = await supabase
      .from('stories')
      .insert({
        title,
        author_id: authState.user.id,
        json_url: jsonUrl,
        bucket: bucketName,
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
    // Используем bucket из истории, по умолчанию 'stories'
    const bucket = story.bucket || 'stories';
    const jsonPath = story.json_url;
    
    // Если json_url содержит путь (stories/file.json), извлекаем имя файла
    const fileName = jsonPath.split('/').pop() || 'story.json';

    console.log(`[storiesStore] Загрузка истории "${story.title}" из bucket: ${bucket}, файл: ${fileName}`);

    // Пробуем загрузить из storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(fileName);

    if (error) {
      console.error('[storiesStore] Error downloading story:', error.message);
      
      // Fallback: пробуем загрузить напрямую из публичного URL
      const fallbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
      console.log('[storiesStore] Пробуем fallback URL:', fallbackUrl);
      
      try {
        const response = await fetch(fallbackUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const jsonData = await response.json();
        console.log('[storiesStore] Загружено через fallback URL');
        return jsonData;
      } catch (fetchError) {
        console.error('[storiesStore] Fallback also failed:', fetchError);
        
        // Дополнительный fallback: пробуем загрузить из локальной папки public/stories
        const localUrl = `/stories/${fileName}`;
        console.log('[storiesStore] Пробуем локальный URL:', localUrl);
        try {
          const localResponse = await fetch(localUrl);
          if (localResponse.ok) {
            return await localResponse.json();
          }
        } catch (localError) {
          console.error('[storiesStore] Локальный fallback тоже не работает');
        }
        
        return null;
      }
    }

    const text = await data.text();
    const jsonData = JSON.parse(text);
    console.log('[storiesStore] История загружена успешно');
    return jsonData;
  } catch (error) {
    console.error('[storiesStore] Error loading story JSON:', error);
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

    const bucket = story.bucket || 'stories';
    const jsonPath = story.json_url;
    const fileName = jsonPath.split('/').pop() || 'story.json';

    const jsonString = JSON.stringify(storyData, null, 2);
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);

    const { error } = await supabase.storage
      .from(bucket)
      .update(fileName, uint8Array, { contentType: "application/json" });

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
