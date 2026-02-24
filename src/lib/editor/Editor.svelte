<script lang="ts">
  import { onMount } from 'svelte';
  import EditorSidebar from './components/EditorSidebar.svelte';
  import DialogueForm from './components/DialogueForm.svelte';
  import ItemsManager from './components/ItemsManager.svelte';
  import InfographicPanel from './components/InfographicPanel.svelte';
  import PreviewPanel from './components/PreviewPanel.svelte';
  import StorySelector from './components/StorySelector.svelte';
  import { editor, editorDerived } from './stores/editorStore.svelte';
  import { resourceActions } from './stores/resourceStore';
  import { storyActions } from './stores/storyStore';
  import { getStoriesList } from './stores/bucketStore';

  // Функция загрузки истории по bucket
  async function loadStoryForBucket(bucketName: string) {
    console.log(`[Editor] Загрузка для bucket: ${bucketName}`);
    try {
      // Добавляем timeout для загрузки ресурсов
      const resourcesPromise = resourceActions.loadStoredResources();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout loading resources')), 15000)
      );
      
      await Promise.race([resourcesPromise, timeoutPromise]);
      
      const storyFileName = `${bucketName}_story.json`;
      editor.currentFileName = storyFileName;
      
      // Таймаут для загрузки истории
      const storyPromise = storyActions.loadStory(storyFileName);
      const storyTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout loading story')), 15000)
      );
      
      await Promise.race([storyPromise, storyTimeoutPromise]);
      
      console.log(`[Editor] История загружена: ${storyFileName}`);
    } catch (err) {
      console.error('[Editor] Ошибка загрузки истории:', err);
    }
  }

  onMount(async () => {
    // Загружаем список историй
    getStoriesList();
    
    // Если есть истории и ни одна не выбрана, выбираем первую и загружаем
    if (editor.availableBuckets.length > 0 && !editor.selectedBucket) {
      editor.selectedBucket = editor.availableBuckets[0].name;
      await loadStoryForBucket(editor.selectedBucket);
    }
  });

  // Реагируем на изменение выбранного bucket (только для старых bucket'ов)
  $effect(() => {
    if (editor.selectedBucket && !editor.manualStorySelected) {
      loadStoryForBucket(editor.selectedBucket);
    }
  });

  // Сброс флага при смене истории через кнопку "Сменить историю"
  function handleChangeStory() {
    editor.manualStorySelected = false;
    editor.selectedBucket = null;
    editor.currentFileName = '';
    editor.data = null;
  }
</script>

<!-- Экран выбора истории -->
{#if !editor.selectedBucket}
  <StorySelector />
{:else}
  <div class="editor-container">
    <!-- Верхняя панель -->
    <header class="toolbar">
      <div class="logo">
        <h2>Story Editor v3.1 - {editor.selectedBucket}</h2>
      </div>
      <div class="stories-control">
        <span class="story-file-name">{editor.currentFileName || 'Нет файла'}</span>

        <!-- Отображение статуса -->
        {#if editor.statusMessage.text}
          <span class="status-message {editor.statusMessage.type}">
            {editor.statusMessage.text}
          </span>
        {/if}

        <button onclick={storyActions.saveCurrentStory} class="btn success small">
          💾 Сохранить
        </button>

        <button onclick={storyActions.saveStoryCopy} class="btn small">
          📋 Копия
        </button>
      </div>
    </header>

    <!-- Основная рабочая область -->
    <div class="main-workspace">
      <!-- Левая панель: Главы и сцены -->
      <EditorSidebar />
      
      <!-- Центральная часть: Редактор -->
      <main class="editor-area">
        <!-- Отладочная информация -->
        {#if editor.data}
          <div class="debug-info">
            <small>
              Загружено: {editor.data.meta?.title} |
              Глав: {editor.data.chapters?.length || 0} |
              Диалогов: {editor.data.dialogues?.length || 0} |
              Предметов: {editor.data.items?.length || 0}
            </small>
          </div>
        {:else}
          <div class="debug-info warning">
            <small>⚠️ Данные не загружены</small>
          </div>
        {/if}

        <!-- Менеджер предметов -->
        <ItemsManager />

        <!-- Редактор диалогов -->
        {#if editorDerived.currentDialogue}
          <DialogueForm
            {editor}
            {storyActions}
            {resourceActions}
          />
        {:else}
          <div class="empty-state">Выберите сцену</div>
        {/if}
      </main>
      
      <!-- Правая панель: Предпросмотр -->
      <PreviewPanel />
    </div>

    <!-- Кнопка возврата в правом нижнем углу -->
    <button 
      class="btn-back-to-game"
      onclick={handleChangeStory}
      title="Сменить историю"
    >
      ← Назад к игре
    </button>
  </div>
{/if}

<style>
  :global(body) { 
    margin: 0; 
    background: #1e1e1e; 
    color: #ddd; 
    font-family: sans-serif; 
    overflow: hidden; 
  }
  
  .editor-container { 
    height: 100vh; 
    display: flex; 
    flex-direction: column; 
  }
  
  .toolbar { 
    background: #252526; 
    padding: 10px 20px; 
    border-bottom: 1px solid #333; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
  }
  
  .logo { 
    display: flex; 
    align-items: center; 
    gap: 12px;
  }
  
  .logo h2 { 
    margin: 0; 
    color: #ff5555; 
    font-size: 18px; 
  }

  .btn-link {
    background: none;
    border: none; 
    color: #888;
    cursor: pointer; 
    font-size: 12px; 
    padding: 4px 8px;
    border-radius: 4px; 
    transition: all 0.2s;
  }
  
  .btn-link:hover {
    color: #fff;
    background: #444;
  }
  
  .stories-control { 
    display: flex; 
    gap: 10px; 
    align-items: center; 
  }
  
  .story-file-name {
    background: #3c3c3c; 
    color: #888;
    padding: 5px 12px;
    border-radius: 4px; 
    font-size: 12px; 
    min-width: 200px; 
  }
  
  .status-message {
    padding: 5px 12px;
    border-radius: 4px; 
    font-size: 12px; 
    font-weight: 600; 
  }
  
  .status-message.success {
    background: #2e7d32;
    color: white; 
  }
  
  .status-message.error {
    background: #c62828;
    color: white;
  }

  .status-message.loading {
    background: #0e639c;
    color: white;
  }

  .status-message.warning {
    background: #f57f17;
    color: white;
  }
  
  .main-workspace { 
    display: flex; 
    flex: 1; 
    overflow: hidden; 
  }
  
  .editor-area { 
    flex: 1; 
    padding: 20px; 
    overflow-y: auto; 
    background: #1e1e1e; 
  }
  
  .debug-info {
    background: #2d2d2d;
    padding: 8px 12px;
    border-radius: 4px; 
    margin-bottom: 12px;
    color: #888;
  }
  
  .debug-info.warning {
    background: #3d2d2d;
    color: #ffaa88;
  }
  
  .empty-state { 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    color: #666; 
    font-size: 14px; 
    height: 100%; 
  }
  
  .btn { 
    padding: 6px 12px; 
    border: none; 
    border-radius: 4px; 
    cursor: pointer; 
    font-size: 12px; 
    font-weight: 600; 
  }
  
  .btn.primary { background: #0e639c; color: white; }
  .btn.success { background: #2e7d32; color: white; }
  .btn.danger { background: #c62828; color: white; }
  .btn.small { padding: 4px 8px; font-size: 11px; }
  
  .btn-icon { 
    width: 24px; 
    height: 24px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    background: #444; 
    border-radius: 4px; 
    cursor: pointer; 
    color: white; 
    font-weight: bold; 
  }
  
  .btn-icon:hover { background: #555; }
  .btn-icon.danger { background: #b71c1c; }

  .btn-back-to-game {
    position: fixed;
    bottom: 16px;
    right: 16px;
    padding: 10px 16px;
    background: rgba(102, 126, 234, 0.8);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .btn-back-to-game:hover {
    background: rgba(102, 126, 234, 1);
    transform: scale(1.05);
  }
</style>