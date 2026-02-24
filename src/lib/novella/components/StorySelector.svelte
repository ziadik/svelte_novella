<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState } from '../../store/gameStore.svelte';
  import type { Story } from '../../store/storiesStore.svelte';

  let loading = $state(true);

  onMount(async () => {
    await gameState.initStories();
    loading = false;
  });

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
  }

  function handleBack() {
    gameState.selectedStory = null;
    gameState.selectedStoryData = null;
  }
</script>

<div class="story-selector">
  <div class="selector-header">
    <h1>🎭 Визуальные новеллы</h1>
    <p>Выберите историю для прохождения</p>
  </div>

  {#if loading}
    <div class="loading">Загрузка историй...</div>
  {:else if gameState.availableStories.length === 0}
    <div class="empty-state">
      <p>Историй пока нет</p>
      <p class="hint">Создайте свою историю в редакторе!</p>
    </div>
  {:else}
    <div class="stories-grid">
      {#each gameState.availableStories as story (story.id)}
        {@const icon = defaultIcons[story.title.toLowerCase()] || '📖'}
        <div 
          class="story-card"
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
          <div class="story-icon">{icon}</div>
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
</div>

<style>
  .story-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 10px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: white;
    font-family: sans-serif;
  }

  .selector-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .selector-header h1 {
    font-size: 34px;
    margin: 0 0 12px 0;
    background: linear-gradient(90deg, #e94560, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .selector-header p {
    font-size: 14px;
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

  @media (max-width: 400px) {
    .selector-header h1 {
      font-size: 32px;
    }

    .selector-header p {
      font-size: 14px;
    }

    .stories-grid {
      grid-template-columns: 1fr;
    }

    .story-card {
      padding: 16px;
    }

    .story-icon {
      font-size: 36px;
    }
  }
</style>
