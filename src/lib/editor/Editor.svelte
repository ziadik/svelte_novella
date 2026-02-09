<script lang="ts">
  import { onMount } from 'svelte';
  import EditorSidebar from './components/EditorSidebar.svelte';
  import DialogueForm from './components/DialogueForm.svelte';
  import ItemsManager from './components/ItemsManager.svelte';
  import InfographicPanel from './components/InfographicPanel.svelte';
  import PreviewPanel from './components/PreviewPanel.svelte';
  import { editor } from './stores/editorStore.svelte';
  import { resourceActions } from './stores/resourceStore';
  import { storyActions } from './stores/storyStore';

  onMount(async () => {
    await resourceActions.loadStoriesList();
    await storyActions.loadStory(editor.currentFileName);
    await resourceActions.loadStoredResources();
  });
</script>

<div class="editor-container">
  <!-- Верхняя панель -->
  <header class="toolbar">
    <div class="logo"><h2>Story Editor v3.1</h2></div>
    <div class="stories-control">
      <select 
        bind:value={editor.currentFileName} 
        onchange={(e) => storyActions.loadStory(e.target.value)} 
        class="story-select"
      >
        {#each editor.storiesList as story}
          <option value={story}>{story}</option>
        {/each}
      </select>
      
      <button onclick={storyActions.createNewStory} class="btn primary small">
        + Новая
      </button>
      
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
      <!-- Менеджер предметов -->
      <ItemsManager />
      
      <!-- Редактор диалогов -->
      {#if editor.currentDialogue}
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
</div>

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
  
  .logo h2 { 
    margin: 0; 
    color: #ff5555; 
    font-size: 18px; 
  }
  
  .stories-control { 
    display: flex; 
    gap: 10px; 
    align-items: center; 
  }
  
  .story-select { 
    background: #3c3c3c; 
    color: white; 
    border: 1px solid #3c3c3c; 
    padding: 5px; 
    border-radius: 4px; 
    font-size: 12px; 
    min-width: 200px; 
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
</style>