<script lang="ts">
  import type { Dialogue } from '../../../types';
  import {
    currentDialogue,
    editingOptionIndex,
    imageResources,
    rivResources,
    editorData,
    availableItems,
    editorActions
  } from '../../../stores/editorStore.svelte';
  import { storyActions } from '../../../stores/storyStore.svelte';
  import { resourceActions } from '../../../stores/resourceStore.svelte';
  import { createNewOption } from '../../../utils/migration';
  import OptionEditor from './OptionEditor.svelte';

  const conditionTypes = ['always', 'has_item', 'stat_greater', 'flag_true'];

  // Реактивные значения
  const dialogue = $derived(currentDialogue());
  const data = $derived(editorData());
  const imgs = $derived(imageResources());
  const rivs = $derived(rivResources());

  // Отладка
  $effect(() => {
    console.log('DialogueForm: currentDialogue changed', dialogue);
    console.log('DialogueForm: imageResources', imgs);
    console.log('DialogueForm: rivResources', rivs);
    console.log('DialogueForm: dialogue.backgroundImage', dialogue?.backgroundImage);
    console.log('DialogueForm: dialogue.characterImage', dialogue?.characterImage);
  });

  function addOption(dialogue: Dialogue) {
    if (!dialogue.options) dialogue.options = [];
    const newOption = createNewOption();
    dialogue.options.push(newOption);
    editorActions.setEditingOptionIndex(dialogue.options.length - 1);
  }

  function handleEditOption(index: number) {
    if (editingOptionIndex() === index) {
      editorActions.setEditingOptionIndex(null);
    } else {
      editorActions.setEditingOptionIndex(index);
      // Проверяем структуру опции
      const option = dialogue?.options?.[index];
      if (option && !option.visibilityCondition) {
        option.visibilityCondition = { type: 'always' };
      }
    }
  }

  function deleteOption(dialogue: Dialogue, index: number) {
    if (confirm("Удалить вариант ответа?")) {
      dialogue.options?.splice(index, 1);
      if (editingOptionIndex() === index) {
        editorActions.setEditingOptionIndex(null);
      } else if (editingOptionIndex() && editingOptionIndex() > index) {
        editorActions.setEditingOptionIndex(editingOptionIndex() - 1);
      }
    }
  }
</script>

{#if dialogue}
  <div class="dialogue-form">
    <!-- Основные поля -->
    <div class="form-group">
      <label for="dialogue-id">ID диалога</label>
      <input 
        id="dialogue-id"
        type="text" 
        value={dialogue.id}
        onchange={(e) => {
          const target = e.target as HTMLInputElement;
          editorActions.updateDialogue(dialogue.id, { id: target.value });
        }}
        class="input" 
      />
    </div>

    <div class="form-group">
      <label for="dialogue-text">Текст</label>
      <textarea 
        id="dialogue-text"
        value={dialogue.text}
        onchange={(e) => {
          const target = e.target as HTMLTextAreaElement;
          editorActions.updateDialogue(dialogue.id, { text: target.value });
        }}
        class="textarea" 
        rows="3"
      ></textarea>
    </div>

    <!-- Медиа ресурсы -->
    <div class="media-section">
      <h4>Медиа ресурсы ({imgs.length} изображений, {rivs.length} Rive)</h4>

      {#if imgs.length === 0 && rivs.length === 0}
        <p style="color: #888; font-size: 12px;">Нет загруженных ресурсов. Нажмите "Загрузить" чтобы добавить изображения или .riv файлы.</p>
      {/if}

      <div class="form-group">
        <label for="dialogue-background">
          Фон: {dialogue.backgroundImage || '(не выбран)'}
        </label>
        <div class="input-group">
          <select 
            id="dialogue-background"
            value={dialogue.backgroundImage || ''}
            onchange={(e) => {
              const target = e.target as HTMLSelectElement;
              editorActions.updateDialogue(dialogue.id, { backgroundImage: target.value || undefined });
            }}
            class="input select"
          >
            <option value="">-- Нет --</option>
            {#each imgs as img}
              <option value={img.name}>{img.name}</option>
            {/each}
            {#each rivs as riv}
              <option value={riv.name}>{riv.name} (Rive)</option>
            {/each}
          </select>
          <label class="btn-file">
            Загрузить
            <input
              type="file"
              accept="image/*,.riv"
              onchange={(e) => resourceActions.uploadNewFile(e)}
              hidden
            />
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="dialogue-character">
          Персонаж: {dialogue.characterImage || '(не выбран)'}
        </label>
        <div class="input-group">
          <select 
            id="dialogue-character"
            value={dialogue.characterImage || ''}
            onchange={(e) => {
              const target = e.target as HTMLSelectElement;
              editorActions.updateDialogue(dialogue.id, { characterImage: target.value || undefined });
            }}
            class="input select"
          >
            <option value="">-- Нет --</option>
            {#each imgs as img}
              <option value={img.name}>{img.name}</option>
            {/each}
            {#each rivs as riv}
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
          onclick={() => addOption(dialogue)}
          class="btn small"
        >
          + Добавить
        </button>
      </div>
      
      {#each dialogue.options || [] as option, index (index)}
        <div class:editing={editingOptionIndex() === index} class="option-card">
          <div
            class="option-header"
            role="button"
            tabindex="0"
            onclick={() => handleEditOption(index)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleEditOption(index)
              }
            }}
          >
            <span class="status-icons">
              {#if !option.visible}👁️‍🗨️
              {:else if !option.enabled}🔒
              {:else}✅{/if}
            </span>
            <span>#{index + 1} {option.text}</span>
            <button 
              onclick={() => deleteOption(dialogue, index)}
              class="btn-icon danger"
            >
              ×
            </button>
          </div>

          {#if editingOptionIndex() === index}
            <OptionEditor 
              {option} 
              {index} 
              dialogues={data.dialogues}
              availableItems={availableItems}
              {conditionTypes}
            />
          {/if}
        </div>
      {/each}
    </div>

    <!-- Авто-переход -->
    <div class="links-section">
      <h4>Авто-переход</h4>
      <select 
        value={dialogue.nextDialogueId || ''}
        onchange={(e) => {
          const target = e.target as HTMLSelectElement;
          editorActions.updateDialogue(dialogue.id, { nextDialogueId: target.value || undefined });
        }}
        class="input select"
      >
        <option value="">-- Нет --</option>
        {#each data.dialogues as d}
          <option value={d.id}>
            {d.id}: {d.text.substring(0, 30)}...
          </option>
        {/each}
      </select>
    </div>

    <!-- Кнопка удаления -->
    <div class="form-actions">
      <button 
        onclick={() => storyActions.deleteDialogue(dialogue.id)}
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

  .option-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-weight: bold;
    font-size: 13px;
    gap: 10px;
  }

  .option-header:hover {
    color: #fff;
  }

  .option-header:focus {
    outline: 1px solid #ff5555;
    outline-offset: 2px;
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