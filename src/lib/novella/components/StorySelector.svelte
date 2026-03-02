<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState } from '../../store/gameStore.svelte';
  import { storiesState, getPlayerStories, loadStoryJson, preloadAllStories } from '../../store/storiesStore.svelte';
  import type { Story } from '../../store/storiesStore.svelte';

  // В App.svelte управляется через window или dispatch event
  // Для простоты используем кастомное событие
  function openAllGames() {
    window.dispatchEvent(new CustomEvent('open-all-games'));
  }

  let loading = $state(true);
  let autoSelected = $state(false);
  let storyLoading = $state<string | null>(null); // ID истории, которая сейчас загружается

  onMount(async () => {
    console.log('[StorySelector] Инициализация...');
    await gameState.initStories();
    console.log('[StorySelector] Истории загружены:', {
      initialized: storiesState.initialized,
      count: storiesState.stories.length,
      available: getPlayerStories().length,
      urlStoryId: gameState.urlStoryId
    });
    
    // Запускаем предзагрузку в фоне (не блокируем UI)
    if (typeof window !== 'undefined') {
      preloadAllStories();
    }
    
    // Если история была выбрана через URL - загружаем её
    if (gameState.urlStoryId && gameState.selectedStoryData && !autoSelected) {
      autoSelected = true;
      await selectAndLoadStory(gameState.selectedStoryData);
    }
    
    loading = false;
  });

  // Выбрать историю и загрузить JSON (асинхронно)
  async function selectAndLoadStory(story: Story) {
    storyLoading = story.id;
    
    try {
      const storyData = await loadStoryJson(story);
      if (storyData) {
        gameState.storyData = storyData;
        gameState.currentDialogueId = storyData.dialogues?.[0]?.id || "0";
        gameState.isLoading = false;
      } else {
        console.error('[StorySelector] Не удалось загрузить историю');
      }
    } catch (error) {
      console.error('[StorySelector] Ошибка загрузки истории:', error);
    } finally {
      storyLoading = null;
    }
  }

  // Информация об историях (fallback для историй без preview)
  const defaultIcons: Record<string, string> = {
    dracula: '🧛',
    zombie: '🧟',
    fairy_tale: '🧚',
    minigames: '🎮'
  };

  function handleSelectStory(story: Story) {
    gameState.selectedStory = story.id;
    gameState.selectedStoryData = story;
    selectAndLoadStory(story);
  }

  function handleBack() {
    gameState.selectedStory = null;
    gameState.selectedStoryData = null;
  }
</script>

<div class="story-selector">
  {#if loading}
    <div class="loading">Загрузка историй...</div>
  {:else}
    <div class="selector-header">
      <h1>🎭 Визуальные новеллы</h1>
      <p>Выберите историю для прохождения</p>
    </div>

    <!-- Кнопка перехода к мини-играм -->
    <button type="button" class="btn-all-games" onclick={openAllGames}>
      <span class="games-icon">🎮</span>
      <span class="games-text">Все мини-игры</span>
      <span class="games-arrow">→</span>
    </button>

    {#if gameState.availableStories.length === 0}
      <div class="empty-state">
        <p>Историй пока нет</p>
        <p class="hint">Создайте свою историю в редакторе!</p>
      </div>
    {:else}
    <div class="stories-grid">
      {#each gameState.availableStories as story (story.id)}
        {@const icon = defaultIcons[story.title.toLowerCase()] || '📖'}
        {@const isLoading = storyLoading === story.id}
        <div 
          class="story-card"
          class:loading={isLoading}
          role="button"
          tabindex="0"
          onclick={() => handleSelectStory(story)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectStory(story);
            }
          }}
        >
          {#if isLoading}
            <div class="story-loading">
              <div class="spinner"></div>
            </div>
          {:else}
            <div class="story-icon">{icon}</div>
          {/if}
          <div class="story-content">
            <h3 class="story-title">{story.title}</h3>
            <p class="story-description">{story.preview_image_url ? 'Нажмите для начала' : 'Интерактивная история'}</p>
          </div>
          <div class="story-arrow">→</div>
        </div>
      {/each}
    </div>
    {/if}

    <div class="selector-footer">
      <p class="hint">💡 Совет: Вы можете создать свою историю в редакторе</p>
    </div>
  {/if}
</div>

<style>
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  .story-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 10px;
    padding-top: calc(10px + var(--safe-area-top));
    padding-bottom: calc(10px + var(--safe-area-bottom));
    padding-left: calc(10px + var(--safe-area-left));
    padding-right: calc(10px + var(--safe-area-right));
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: white;
    font-family: sans-serif;
  }

  .selector-header {
    text-align: center;
    margin-bottom: 16px;
  }

  .selector-header h1 {
    font-size: 28px;
    margin: 0 0 8px 0;
    background: linear-gradient(90deg, #e94560, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }

  .selector-header p {
    font-size: 13px;
    color: #aaa;
    margin: 0;
  }

  .stories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    max-width: 900px;
    width: 100%;
    margin-bottom: 40px;
  }

  .story-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .story-card:hover,
  .story-card:focus {
    background: rgba(255, 255, 255, 0.1);
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(233, 69, 96, 0.3);
    outline: none;
  }

  .story-card:focus-visible {
    border-color: #e94560;
    outline: 2px solid #e94560;
    outline-offset: 2px;
  }

  .story-card.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .story-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(233, 69, 96, 0.3);
    border-top-color: #e94560;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .story-icon {
    font-size: 34px;
    flex-shrink: 0;
  }

  .story-content {
    flex: 1;
  }

  .story-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: #fff;
  }

  .story-description {
    font-size: 12px;
    color: #aaa;
    margin: 0;
    line-height: 1.4;
  }

  .story-arrow {
    font-size: 24px;
    color: #e94560;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.3s ease;
  }

  .story-card:hover .story-arrow {
    opacity: 1;
    transform: translateX(0);
  }

  .selector-footer {
    text-align: center;
  }

  .hint {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .loading {
    font-size: 18px;
    color: #aaa;
    padding: 40px;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #aaa;
  }

  .empty-state p {
    margin: 8px 0;
  }

  .btn-all-games {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 400px;
    padding: 16px 20px;
    margin-bottom: 24px;
    background: linear-gradient(135deg, rgba(233, 69, 96, 0.2), rgba(233, 69, 96, 0.1));
    border: 2px solid rgba(233, 69, 96, 0.5);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
    color: white;
  }

  .btn-all-games:hover {
    background: linear-gradient(135deg, rgba(233, 69, 96, 0.3), rgba(233, 69, 96, 0.2));
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
  }

  .games-icon {
    font-size: 28px;
  }

  .games-text {
    flex: 1;
    font-size: 16px;
    font-weight: 600;
    text-align: left;
  }

  .games-arrow {
    font-size: 20px;
    color: #e94560;
    transition: transform 0.3s ease;
  }

  .btn-all-games:hover .games-arrow {
    transform: translateX(4px);
  }

  .trophies-btn {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.1));
    border-color: rgba(255, 215, 0, 0.5);
  }

  .trophies-btn:hover {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 170, 0, 0.2));
    border-color: #ffd700;
    box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);
  }

  @media (max-width: 400px) {
    .selector-header h1 {
      font-size: 24px;
    }

    .selector-header p {
      font-size: 12px;
    }

    .stories-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .story-card {
      padding: 12px;
    }

    .story-icon {
      font-size: 32px;
    }

    .story-title {
      font-size: 16px;
    }

    .btn-all-games {
      padding: 12px 16px;
      gap: 10px;
    }

    .games-icon {
      font-size: 24px;
    }

    .games-text {
      font-size: 14px;
    }

    .games-arrow {
      font-size: 18px;
    }
  }

  /* Для очень узких экранов (< 360px) */
  @media (max-width: 360px) {
    .selector-header h1 {
      font-size: 20px;
    }

    .story-card {
      padding: 10px;
      gap: 10px;
    }

    .story-icon {
      font-size: 28px;
    }

    .story-title {
      font-size: 14px;
    }

    .story-description {
      font-size: 11px;
    }
  }
</style>
