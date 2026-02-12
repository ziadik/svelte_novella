<script lang="ts">
  import { onMount } from 'svelte';
  import EditorSidebar from './components/EditorSidebar.svelte';
  import DialogueForm from './components/DialogueForm.svelte';
  import ItemsManager from './components/ItemsManager.svelte';
  import PreviewPanel from './components/PreviewPanel.svelte';
  import { 
    editorData as data, // Используем алиас для обратной совместимости
    currentDialogue, selectedChapterId, selectedDialogueId,
    editingOptionIndex, currentFileName, storiesList, statusMessage,
    showItems, editorActions
  } from '../../stores/editorStore.svelte';
  import { resourceActions } from '../../stores/resourceStore.svelte';
  import { storyActions } from '../../stores/storyStore.svelte';

  const { onback } = $props<{
    onback?: () => void
  }>()

  onMount(async () => {
    await resourceActions.loadStoriesList();
    await storyActions.loadStory(currentFileName());
    await resourceActions.loadStoredResources();
  });

  function handleExit() {
    editorActions.toggleEditor();
    onback?.();
  }
</script>

<div class="editor-container">
  <!-- Верхняя панель -->
  <header class="toolbar">
    <div class="logo">
      <h2>Story Editor v3.1</h2>
      <div class="file-info">
        <span class="current-file">📁 {currentFileName()}</span>
        <span class="stats-badge">
          {data().dialogues.length} сцен,
          {data().chapters?.length || 0} глав
        </span>
      </div>
    </div>
    
    <div class="stories-control">
      <select 
        value={currentFileName}
        onchange={(e) => storyActions.loadStory((e.target as HTMLSelectElement).value)}
        class="story-select"
      >
        <option value="">-- Выберите историю --</option>
        {#each storiesList() as story}
          <option value={story}>{story}</option>
        {/each}
      </select>
      
      <div class="toolbar-actions">
        <button 
          onclick={storyActions.createNewStory}
          class="btn primary small"
          title="Создать новую историю"
        >
          + Новая
        </button>
        
        <button 
          onclick={storyActions.saveCurrentStory}
          class="btn success small"
          title="Сохранить текущую историю"
        >
          💾 Сохранить
        </button>
        
        <button 
          onclick={storyActions.saveStoryCopy}
          class="btn small"
          title="Сохранить копию"
        >
          📋 Копия
        </button>
        
        <button 
          onclick={handleExit}
          class="btn danger small"
          title="Выйти из редактора"
        >
          ✕ Выйти
        </button>
      </div>
    </div>
  </header>

  <!-- Основная рабочая область -->
  <div class="main-workspace">
    <!-- Левая панель: Главы и сцены -->
    <EditorSidebar />
    
    <!-- Центральная часть: Редактор -->
    <main class="editor-area">
      <!-- Менеджер предметов -->
      <ItemsManager />
      
      <!-- Редактор диалогов -->
      {#if currentDialogue()}
        <DialogueForm />
      {:else}
        <div class="empty-state">
          <div class="empty-icon">👈</div>
          <div class="empty-title">Выберите сцену</div>
          <div class="empty-hint">
            Выберите сцену из списка слева или создайте новую
          </div>
          {#if selectedChapterId()}
            <button 
              onclick={storyActions.addDialogue}
              class="btn primary"
            >
              + Создать сцену
            </button>
          {:else}
            <div class="empty-warning">
              ⚠️ Сначала выберите главу
            </div>
          {/if}
        </div>
      {/if}
    </main>
    
    <!-- Правая панель: Предпросмотр -->
    <PreviewPanel />
  </div>
  
  <!-- Статус бар -->
  <div class="status-bar">
    {#if statusMessage.text}
      <div
        class:success={statusMessage.type === 'success'}
        class:error={statusMessage.type === 'error'}
        class:loading={statusMessage.type === 'loading'}
        class="status-message"
      >
        {#if statusMessage.type === 'loading'}
          <span class="spinner">⏳</span>
        {/if}
        {statusMessage.text}
        {#if statusMessage.type === 'success'}
          <button 
            onclick={editorActions.clearStatus}
            class="btn-close"
          >
            ×
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) { 
    margin: 0; 
    background: #1e1e1e; 
    color: #ddd; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; 
    overflow: hidden; 
  }
  
  .editor-container { 
    height: 100vh; 
    display: flex; 
    flex-direction: column; 
  }
  
  .toolbar { 
    background: #252526; 
    padding: 12px 20px; 
    border-bottom: 1px solid #333; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    flex-wrap: wrap;
    gap: 20px;
  }
  
  .logo h2 { 
    margin: 0 0 5px 0; 
    color: #ff5555; 
    font-size: 18px; 
    font-weight: 600;
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }
  
  .current-file {
    color: #4caf50;
    font-family: monospace;
    background: rgba(76, 175, 80, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
  }
  
  .stats-badge {
    color: #aaa;
    background: rgba(170, 170, 170, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
  }
  
  .stories-control { 
    display: flex; 
    gap: 12px; 
    align-items: center; 
    flex: 1;
    justify-content: flex-end;
  }
  
  .story-select { 
    background: #3c3c3c; 
    color: white; 
    border: 1px solid #3c3c3c; 
    padding: 8px 12px; 
    border-radius: 4px; 
    font-size: 13px; 
    min-width: 250px;
    transition: border-color 0.2s;
  }
  
  .story-select:focus {
    border-color: #ff5555;
    outline: none;
  }
  
  .toolbar-actions {
    display: flex;
    gap: 8px;
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
    display: flex;
    flex-direction: column;
  }
  
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #666;
    text-align: center;
    padding: 40px 20px;
  }
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.5;
  }
  
  .empty-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #aaa;
  }
  
  .empty-hint {
    font-size: 14px;
    max-width: 400px;
    line-height: 1.5;
    margin-bottom: 20px;
    color: #777;
  }
  
  .empty-warning {
    background: rgba(245, 124, 0, 0.1);
    border: 1px solid #f57c00;
    color: #ffb74d;
    padding: 10px 15px;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .btn { 
    padding: 8px 16px; 
    border: none; 
    border-radius: 4px; 
    cursor: pointer; 
    font-size: 13px; 
    font-weight: 600; 
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  
  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  
  .btn.primary { 
    background: #0e639c; 
    color: white; 
  }
  
  .btn.primary:hover { 
    background: #1177bb; 
  }
  
  .btn.success { 
    background: #2e7d32; 
    color: white; 
  }
  
  .btn.success:hover { 
    background: #388e3c; 
  }
  
  .btn.danger { 
    background: #c62828; 
    color: white; 
  }
  
  .btn.danger:hover { 
    background: #d32f2f; 
  }
  
  .btn.small { 
    padding: 6px 12px; 
    font-size: 12px; 
  }
  
  .status-bar {
    background: #252526;
    border-top: 1px solid #333;
    padding: 8px 20px;
    min-height: 36px;
  }
  
  .status-message {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    animation: slideIn 0.3s ease-out;
  }
  
  .status-message.success {
    background: rgba(46, 125, 50, 0.2);
    color: #a5d6a7;
    border: 1px solid #2e7d32;
  }
  
  .status-message.error {
    background: rgba(198, 40, 40, 0.2);
    color: #ef9a9a;
    border: 1px solid #c62828;
  }
  
  .status-message.loading {
    background: rgba(13, 71, 161, 0.2);
    color: #90caf9;
    border: 1px solid #0d47a1;
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  .btn-close {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 16px;
    cursor: pointer;
    margin-left: auto;
    padding: 0 5px;
  }
  
  .btn-close:hover {
    opacity: 0.8;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Стили для скроллбара */
  .editor-area::-webkit-scrollbar {
    width: 8px;
  }
  
  .editor-area::-webkit-scrollbar-track {
    background: #2d2d2d;
  }
  
  .editor-area::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
  
  .editor-area::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
</style>