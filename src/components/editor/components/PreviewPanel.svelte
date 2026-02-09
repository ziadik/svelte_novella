<script lang="ts">
  import DialogueCard from '../../novella/DialogueCard.svelte';
  import { editor } from '../../../stores/editorStore.svelte';
  
  function resetEditingOption() {
    editor.editingOptionIndex = null;
  }
</script>

<aside class="preview-panel">
  <div class="preview-header">
    <h3>Предпросмотр</h3>
    <button 
      onclick={resetEditingOption} 
      class="btn-link small"
    >
      Сбросить редакт. опций
    </button>
  </div>
  
  <div class="preview-wrapper">
    {#if editor.currentDialogue}
      <div class="preview-container">
        <DialogueCard 
          dialogue={editor.currentDialogue} 
          index={0} 
        />
        
        <!-- Дополнительная информация -->
        <div class="preview-info">
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">{editor.currentDialogue.id}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Глава:</span>
            <span class="info-value">{editor.currentChapter?.title || 'Без главы'}</span>
          </div>
          
          {#if editor.currentDialogue.backgroundImage}
            <div class="info-row">
              <span class="info-label">Фон:</span>
              <span class="info-value">{editor.currentDialogue.backgroundImage}</span>
            </div>
          {/if}
          
          {#if editor.currentDialogue.characterImage}
            <div class="info-row">
              <span class="info-label">Персонаж:</span>
              <span class="info-value">{editor.currentDialogue.characterImage}</span>
            </div>
          {/if}
        </div>
        
        <!-- Предупреждения -->
        {#if !editor.currentDialogue.options || editor.currentDialogue.options.length === 0}
          <div class="preview-warning">
            ⚠️ Нет вариантов ответов
          </div>
        {/if}
        
        {#if editor.currentDialogue.options?.some(o => !o.nextDialogueId)}
          <div class="preview-warning">
            ⚠️ Некоторые варианты не ведут дальше
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-preview">
        <div class="empty-icon">👈</div>
        <div class="empty-text">Выберите сцену для предпросмотра</div>
      </div>
    {/if}
  </div>
</aside>

<style>
  .preview-panel {
    width: 400px;
    background: #121212;
    border-left: 1px solid #333;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .preview-header {
    padding: 15px;
    background: #252526;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .preview-header h3 {
    margin: 0;
    font-size: 14px;
    color: #ddd;
  }

  .preview-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .preview-container {
    background: #1e1e1e;
    border-radius: 8px;
    padding: 20px;
    border: 1px solid #333;
  }

  .preview-info {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #333;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 12px;
    border-bottom: 1px solid #2a2a2a;
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    color: #888;
  }

  .info-value {
    color: #ddd;
    font-family: monospace;
    font-size: 11px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-warning {
    margin-top: 15px;
    padding: 10px;
    background: rgba(245, 124, 0, 0.1);
    border: 1px solid #f57c00;
    border-radius: 4px;
    color: #ffb74d;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .empty-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    text-align: center;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 14px;
    max-width: 200px;
    line-height: 1.4;
  }

  .btn-link {
    background: none;
    border: none;
    color: #4caf50;
    cursor: pointer;
    font-size: 11px;
    text-decoration: underline;
    padding: 2px 5px;
    border-radius: 3px;
  }

  .btn-link:hover {
    background: rgba(76, 175, 80, 0.1);
  }

  .btn-link.small {
    font-size: 10px;
    padding: 1px 4px;
  }
</style>