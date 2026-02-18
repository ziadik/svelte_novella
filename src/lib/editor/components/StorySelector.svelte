<script lang="ts">
  import { onMount } from 'svelte';
  import { editor } from '../stores/editorStore.svelte';
  import { getStoriesList } from '../stores/bucketStore';
  import { storyActions } from '../stores/storyStore';
  import { resourceActions } from '../stores/resourceStore';


    // Информация об историях
  const storiesInfo = {
    dracula: {
      title: 'Дракула',
      description: 'Тёмная готическая история о вампире и его жертве',
      icon: '🧛'
    },
    zombie: {
      title: 'Выживание',
      description: 'Постапокалиптическая история о зомби',
      icon: '🧟'
    },
    fairy_tale: {
      title: 'Сказка',
      description: 'Волшебная история с феями и драконами',
      icon: '🧚'
    },
    minigames: {
      title: 'Мини-игры',
      description: 'Демонстрация мини-игр в визуальной новелле',
      icon: '🎮'
    }
  };

  onMount(() => {
    loadBuckets();
  });

  function loadBuckets() {
    getStoriesList();
  }

  async function handleSelectBucket(bucketName: string) {
    editor.selectedBucket = bucketName;
    // Сбрасываем данные
    editor.data = {
      meta: { version: "3.1", title: "Новая история" },
      dialogues: [],
      chapters: [],
      items: [],
      miniGames: []
    };
    // Загружаем список файлов и ресурсы
    await resourceActions.loadStoriesList();
    await resourceActions.loadStoredResources();
  }
</script>

<div class="story-selector">
  <div class="selector-header">
    <h2>Выберите историю</h2>
  </div>

  <div class="buckets-list">
    {#each editor.availableBuckets as bucket (bucket)}
     {@const info = storiesInfo[bucket.id as keyof typeof storiesInfo] || {
        title: bucket,
        description: 'Интерактивная история',
        icon: '📖'
      }}
      <div 
        class:selected={editor.selectedBucket === bucket.name}
        class="bucket-card"
      >
        <div class="bucket-info">
          <div class="story-icon">{info.icon}</div>
        <div class="story-content">
          <h3 class="story-title">{info.title}</h3>
          <p class="story-description">{info.description}</p>
        </div>
        <div class="story-arrow">→</div>
        </div>
        
        <div class="bucket-actions">
          {#if editor.selectedBucket === bucket.name}
            <span class="selected-badge">Выбрано</span>
          {:else}
            <button 
              class="btn small"
              onclick={() => handleSelectBucket(bucket.name)}
            >
              Выбрать
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
   .story-icon {
    font-size: 34px;
    flex-shrink: 0;
  }
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

  .selector-header h2 {
      font-size: 34px;
    margin: 0 0 12px 0;
    background: linear-gradient(90deg, #e94560, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .buckets-list {
     display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    max-width: 900px;
    width: 100%;
    margin-bottom: 40px;
  }

  .bucket-card {
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

  .bucket-card:hover {
      background: rgba(255, 255, 255, 0.1);
    border-color: #e94560;
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(233, 69, 96, 0.3);
    outline: none;
  }

  .bucket-card.selected {
    border-color: #4CAF50;
    background: #e8f5e9;
  }

  .bucket-info {
    flex: 1;
  }

  .bucket-name {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .bucket-meta {
    font-size: 14px;
    color: #666;
  }

  .bucket-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .selected-badge {
    padding: 4px 12px;
    background: #4CAF50;
    color: white;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    background: #f5f5f5;
    color: #333;
  }

  .btn:hover {
    background: #e0e0e0;
  }

  .btn.small {
    padding: 6px 12px;
    font-size: 13px;
  }
</style>
