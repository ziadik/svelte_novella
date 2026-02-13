<script lang="ts">
  import { editor, editorDerived } from '../stores/editorStore.svelte';
  import { storyActions } from '../stores/storyStore';
  import { resourceActions } from '../stores/resourceStore';
</script>

<aside class="sidebar">
  <!-- Раздел глав -->
  <div class="sidebar-section">
    <div class="section-header">
      <h3>Главы</h3>
      <button onclick={storyActions.addChapter} class="btn-icon">+</button>
    </div>
    <div class="chapter-list">
      {#each editor.data?.chapters || [] as chapter (chapter.id)}
        <button
          type="button"
          class:active={editor.selectedChapterId === chapter.id}
          class="chapter-item" 
          onclick={() => editor.selectedChapterId = chapter.id}
          aria-pressed={editor.selectedChapterId === chapter.id}
        >
          {chapter.title}
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Раздел сцен -->
  <div class="sidebar-section flex-1">
    <div class="section-header">
      <h3>Сцены ({editorDerived.chapterDialogues.length})</h3>
      <button 
        onclick={storyActions.addDialogue} 
        class="btn-icon" 
        disabled={!editor.selectedChapterId}
      >
        +
      </button>
    </div>
    <div class="dialogue-list">
      {#each editorDerived.chapterDialogues as dialogue (dialogue.id)}
        <button
          type="button"
          class:active={editor.selectedDialogueId === dialogue.id}
          class="dialogue-item" 
          onclick={() => editor.selectedDialogueId = dialogue.id}
          aria-pressed={editor.selectedDialogueId === dialogue.id}
        >
          <span class="id-badge">{dialogue.id}</span>
          <span class="preview-text">{dialogue.text.substring(0, 25)}...</span>
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Статус -->
  <div class="status-box">
    {#if editor.statusMessage.text}
      <div class="alert {editor.statusMessage.type}">
        {editor.statusMessage.text}
      </div>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    width: 280px;
    background: #252526;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
  }
  
  .sidebar-section {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #333;
  }
  
  .sidebar-section.flex-1 {
    flex: 1;
    overflow: hidden;
  }
  
  .chapter-list {
    overflow-y: auto;
    max-height: 150px;
  }
  
  .chapter-item {
    width: 100%;
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #333;
    font-size: 13px;
    background: none;
    border: none;
    text-align: left;
    color: inherit;
    border-left: 3px solid transparent;
  }
  
  .chapter-item:hover { background: #2a2d2e; }
  .chapter-item.active { 
    background: #37373d; 
    border-left: 3px solid #ff5555; 
  }
  
  .dialogue-list { flex: 1; overflow-y: auto; }
  
  .dialogue-item {
    width: 100%;
    padding: 8px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    text-align: left;
    color: inherit;
    border-left: 3px solid transparent;
  }
  
  .dialogue-item:hover { background: #2a2d2e; }
  .dialogue-item.active { 
    background: #37373d; 
    border-left: 3px solid #ff5555; 
  }
  
  .id-badge {
    font-size: 10px;
    color: #888;
    font-family: monospace;
  }
  
  .preview-text {
    font-size: 12px;
    color: #ccc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .status-box { padding: 10px; border-top: 1px solid #333; }
  
  .alert {
    padding: 8px;
    border-radius: 4px;
    font-size: 11px;
    margin-bottom: 5px;
  }
  
  .alert.success { background: #1b5e20; color: #a5d6a7; }
  .alert.error { background: #b71c1c; color: #ef9a9a; }
  .alert.loading { background: #0d47a1; color: #90caf9; }
</style>