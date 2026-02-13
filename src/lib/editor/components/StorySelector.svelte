<script lang="ts">
  import { onMount } from 'svelte';
  import { editor } from '../stores/editorStore.svelte';
  import { getStoriesList } from '../stores/bucketStore';
  import { storyActions } from '../stores/storyStore';
  import { resourceActions } from '../stores/resourceStore';

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
    {#each editor.availableBuckets as bucket}
      <div 
        class:selected={editor.selectedBucket === bucket.name}
        class="bucket-card"
      >
        <div class="bucket-info">
          <div class="bucket-name">{bucket.name}</div>
          <div class="bucket-meta">📖 Интерактивная история</div>
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
  .story-selector {
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .selector-header h2 {
    margin: 0;
    font-size: 24px;
  }

  .buckets-list {
    display: grid;
    gap: 12px;
  }

  .bucket-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f5f5f5;
    border: 2px solid transparent;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .bucket-card:hover {
    background: #e8e8e8;
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
