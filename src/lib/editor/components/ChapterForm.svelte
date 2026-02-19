<script lang="ts">
  import { editor, editorDerived, editorActions } from '../stores/editorStore.svelte';

  function handleSave() {
    if (!editorDerived.currentEditingChapter) return;

    editorActions.updateChapter(editorDerived.currentEditingChapter.id, {
      title: editorDerived.currentEditingChapter.title,
      description: editorDerived.currentEditingChapter.description
    });

    editorActions.selectEditingChapter(null);
  }

  function handleCancel() {
    editorActions.selectEditingChapter(null);
  }

  function handleDelete() {
    if (!editorDerived.currentEditingChapter) return;
    if (!confirm(`Удалить главу "${editorDerived.currentEditingChapter.title}"?`)) return;

    editorActions.deleteChapter(editorDerived.currentEditingChapter.id);
    editorActions.selectEditingChapter(null);
  }
</script>

{#if editorDerived.currentEditingChapter}
  <div class="chapter-form">
    <div class="form-header">
      <h4>Редактирование главы</h4>
      <div class="header-actions">
        <button onclick={handleDelete} class="btn-icon danger" title="Удалить главу">×</button>
      </div>
    </div>

    <div class="form-group">
      <label for="chapter-title">Название главы</label>
      <input
        type="text"
        id="chapter-title"
        bind:value={editorDerived.currentEditingChapter.title}
        class="input"
        placeholder="Название главы"
      />
    </div>

    <div class="form-group">
      <label for="chapter-description">Описание главы</label>
      <textarea
        id="chapter-description"
        bind:value={editorDerived.currentEditingChapter.description}
        class="textarea"
        rows="4"
        placeholder="Описание главы..."
      ></textarea>
    </div>

    <div class="form-actions">
      <button onclick={handleCancel} class="btn">Отмена</button>
      <button onclick={handleSave} class="btn primary">Сохранить</button>
    </div>
  </div>
{/if}

<style>
  .chapter-form {
    background: #252526;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #333;
    margin-bottom: 10px;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #444;
  }

  .form-header h4 {
    margin: 0;
    font-size: 13px;
    color: #ddd;
  }

  .header-actions {
    display: flex;
    gap: 5px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    color: #aaa;
  }

  .input, .textarea {
    width: 100%;
    background: #3c3c3c;
    border: 1px solid #3c3c3c;
    color: white;
    padding: 8px;
    border-radius: 4px;
    box-sizing: border-box;
    font-size: 12px;
  }

  .input:focus, .textarea:focus {
    border-color: #ff5555;
    outline: none;
  }

  .textarea {
    min-height: 80px;
    resize: vertical;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 15px;
  }

  .btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    background: #444;
    color: white;
  }

  .btn:hover {
    background: #555;
  }

  .btn.primary {
    background: #ff5555;
  }

  .btn.primary:hover {
    background: #ff6666;
  }

  .btn-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #444;
    border-radius: 4px;
    cursor: pointer;
    color: white;
    font-weight: bold;
    font-size: 14px;
    line-height: 1;
  }

  .btn-icon:hover {
    background: #555;
  }

  .btn-icon.danger {
    background: #b71c1c;
  }

  .btn-icon.danger:hover {
    background: #c62828;
  }
</style>
