<script lang="ts">
  import type { Dialogue } from '../types';
  import { editor, editorDerived } from '../stores/editorStore.svelte';
  import { storyActions } from '../stores/storyStore';
  import { resourceActions } from '../stores/resourceStore';
  import { createNewOption } from '../utils/migration';
  import OptionEditor from './OptionEditor.svelte';

  const conditionTypes = ['always', 'has_item', 'stat_greater', 'flag_true'];

  function addOption(dialogue: Dialogue) {
    if (!dialogue.options) dialogue.options = [];
    const newOption = createNewOption();
    dialogue.options.push(newOption);
    editor.editingOptionIndex = dialogue.options.length - 1;
  }

  function handleEditOption(index: number) {
    if (editor.editingOptionIndex === index) {
      editor.editingOptionIndex = null;
    } else {
      editor.editingOptionIndex = index;
      // Проверяем структуру опции
      const option = editorDerived.currentDialogue?.options?.[index];
      if (option && !option.visibilityCondition) {
        option.visibilityCondition = { type: 'always' };
      }
    }
  }

  function deleteOption(dialogue: Dialogue, index: number) {
    if (confirm("Удалить вариант ответа?")) {
      dialogue.options?.splice(index, 1);
      if (editor.editingOptionIndex === index) {
        editor.editingOptionIndex = null;
      } else if (editor.editingOptionIndex && editor.editingOptionIndex > index) {
        editor.editingOptionIndex--;
      }
    }
  }
</script>

{#if editorDerived.currentDialogue}
  <div class="dialogue-form">
    <!-- Основные поля -->
    <div class="form-group">
      <label for="dialogue-id">ID диалога</label>
      <input 
        type="text" 
        id="dialogue-id"
        bind:value={editorDerived.currentDialogue.id} 
        onchange={(event) => editor.selectedDialogueId = event.target?.value}
        class="input" 
      />
    </div>

    <div class="form-group">
      <label for="dialogue-chapter">Глава</label>
      <select 
        id="dialogue-chapter"
        bind:value={editorDerived.currentDialogue.chapterId}
        onchange={(event) => editor.selectedChapterId = event.target?.value}
        class="input select"
      >
        <option value="">-- Не выбрано --</option>
        {#each editor.data.chapters || [] as chapter}
          <option value={chapter.id}>
            {chapter.title}
            {#if chapter.description}
              - {chapter.description.substring(0, 30)}...
            {/if}
          </option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="dialogue-text">Текст</label>
      <textarea 
        id="dialogue-text"
        bind:value={editorDerived.currentDialogue.text} 
        class="textarea" 
        rows="3"
      ></textarea>
    </div>

    <!-- Медиа ресурсы -->
    <div class="media-section">
      <h4>Медиа ресурсы</h4>
      
      <div class="form-group">
        <label for="dialogue-background">Фон</label>
        <div class="input-group">
          <select 
            id="dialogue-background"
            bind:value={editorDerived.currentDialogue.backgroundImage} 
            class="input select"
          >
            <option value="">-- Нет --</option>
            {#each editorDerived.imageResources as img}
              <option value={img.name}>{img.name}</option>
            {/each}
            {#each editorDerived.riveResources as riv}
              <option value={riv.name}>{riv.name} (Rive)</option>
            {/each}
          </select>
          <label class="btn-file">
            Загрузить 
            <input 
              type="file" 
              accept="image/*,.riv" 
              onchange={resourceActions.uploadNewFile} 
              hidden 
            />
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="dialogue-character">Персонаж</label>
        <div class="input-group">
          <select 
            id="dialogue-character"
            bind:value={editorDerived.currentDialogue.characterImage} 
            class="input select"
          >
            <option value="">-- Нет --</option>
            {#each editorDerived.imageResources as img}
              <option value={img.name}>{img.name}</option>
            {/each}
            {#each editorDerived.riveResources as riv}
              <option value={riv.name}>{riv.name} (Rive)</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Варианты ответов -->
    <div class="options-section">
      <div class="section-header">
        <h4>Варианты ответов</h4>
        <button 
          onclick={() => addOption(editorDerived.currentDialogue!)} 
          class="btn small"
        >
          + Добавить
        </button>
      </div>
      
      {#each editorDerived.currentDialogue.options || [] as option, index (index)}
        <div class:editing={editor.editingOptionIndex === index} class="option-card">
          <div class="option-header-row">
            <div
              class="option-header"
              role="button"
              tabindex="0"
              onclick={() => handleEditOption(index)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleEditOption(index);
                }
              }}
              aria-expanded={editor.editingOptionIndex === index}
              aria-controls={`option-content-${index}`}
            >
              <span class="status-icons">
                {#if !option.visible}👁️‍🗨️
                {:else if !option.enabled}🔒
                {:else}✅{/if}
              </span>
              <span>#{index + 1} {option.text}</span>
            </div>
            <button
              type="button"
              onclick={() => deleteOption(editorDerived.currentDialogue!, index)}
              class="btn-icon danger"
              aria-label="Удалить вариант"
            >
              ×
            </button>
          </div>

          {#if editor.editingOptionIndex === index}
            <div id={`option-content-${index}`} class="option-content">
              <OptionEditor
                {option}
                {index}
                dialogues={editor.data.dialogues}
                availableItems={editorDerived.availableItems}
                {conditionTypes}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Авто-переход -->
    <div class="links-section">
      <h4>Авто-переход</h4>
      <select 
        bind:value={editorDerived.currentDialogue.nextDialogueId} 
        class="input select"
      >
        <option value="">-- Нет --</option>
        {#each editor.data.dialogues as d}
          <option value={d.id}>
            {d.id}: {d.text.substring(0, 30)}...
          </option>
        {/each}
      </select>
    </div>

    <!-- Кнопка удаления -->
    <div class="form-actions">
      <button 
        onclick={() => storyActions.deleteDialogue(editorDerived.currentDialogue!.id)} 
        class="btn danger"
      >
        Удалить сцену
      </button>
    </div>
  </div>
{:else}
  <div class="empty-state">Выберите сцену</div>
{/if}

<style>
  .dialogue-form {
    max-width: 800px;
    margin: 0 auto;
    background: #252526;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #333;
  }

  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 12px;
    color: #aaa;
  }

  .input, .textarea, .select {
    width: 100%;
    background: #3c3c3c;
    border: 1px solid #3c3c3c;
    color: white;
    padding: 8px;
    border-radius: 4px;
    box-sizing: border-box;
  }

  .input:focus, .select:focus {
    border-color: #ff5555;
    outline: none;
  }

  .textarea {
    min-height: 80px;
    resize: vertical;
  }

  .media-section, .options-section, .links-section {
    margin-top: 20px;
    padding: 15px;
    background: #2d2d2d;
    border-radius: 4px;
    border: 1px solid #333;
  }

  .media-section h4, .options-section h4, .links-section h4 {
    margin: 0 0 10px 0;
    font-size: 13px;
    color: #ddd;
  }

  .input-group {
    display: flex;
    gap: 5px;
  }

  .btn-file {
    background: #444;
    color: white;
    padding: 0 10px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-file:hover {
    background: #555;
  }

  .options-section .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .option-card {
    background: #1e1e1e;
    border: 1px solid #444;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
  }

  .option-card.editing {
    border-color: #ff5555;
    box-shadow: 0 0 5px rgba(255, 85, 85, 0.2);
  }

  .option-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .option-header {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    cursor: pointer;
    font-weight: bold;
    font-size: 13px;
    gap: 10px;
    padding: 0;
  }

  .option-header:hover {
    color: #fff;
  }

  .option-content {
    margin-top: 10px;
  }

  .status-icons {
    font-size: 14px;
    min-width: 40px;
  }

  .form-actions {
    margin-top: 20px;
    text-align: right;
  }
</style>