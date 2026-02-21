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

  // Получаем текст целевого диалога
  function getTargetText(id: string | undefined): string {
    if (!id || !editor.data) return "Нет";
    const target = editor.data.dialogues.find(d => d.id === id);
    if (!target) return `❌ ${id}`;
    return target.text.substring(0, 25) + "...";
  }

  // Получаем исходящие связи
  function getOutgoingLinks() {
    const links: { type: string; id: string; text: string }[] = [];
    const dialogue = editorDerived.currentDialogue;
    if (!dialogue) return links;

    if (dialogue.nextDialogueId) {
      links.push({
        type: 'Auto',
        id: dialogue.nextDialogueId,
        text: getTargetText(dialogue.nextDialogueId)
      });
    }

    dialogue.options?.forEach((opt, idx) => {
      if (opt.nextDialogueId) {
        links.push({
          type: `Опция #${idx + 1}`,
          id: opt.nextDialogueId,
          text: getTargetText(opt.nextDialogueId)
        });
      }
    });

    return links;
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
        onchange={(event) => {
          const target = event.target as HTMLInputElement;
          editor.selectedDialogueId = target.value;
        }}
        class="input" 
      />
    </div>

    <div class="form-group">
      <label for="dialogue-chapter">Глава</label>
      <select 
        id="dialogue-chapter"
        bind:value={editorDerived.currentDialogue.chapterId}
        onchange={(event) => {
          const target = event.target as HTMLSelectElement;
          editor.selectedChapterId = target.value;
        }}
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

    <!-- Связи диалога -->
    <div class="links-section">
      <div class="links-grid">
        <!-- Исходящие связи -->
        <div class="link-block">
          <h5>👉 Куда ведет ({getOutgoingLinks().length})</h5>
          {#if getOutgoingLinks().length === 0}
            <div class="empty-links">Нет связей</div>
          {:else}
            <div class="links-list">
              {#each getOutgoingLinks() as link}
                <div class="link-item">
                  <span class="link-type">{link.type}:</span>
                  <span class="link-id">{link.id}</span>
                  <button
                    class="btn-jump"
                    onclick={() => storyActions.jumpTo(link.id)}
                    title="Перейти к диалогу"
                  >
                    →
                  </button>
                  <span class="link-text">{link.text}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Входящие связи -->
        <div class="link-block secondary">
          <h5>👈 Откуда ведут ({editorDerived.backlinks.length})</h5>
          {#if editorDerived.backlinks.length === 0}
            <div class="empty-links">Никто не ссылается</div>
          {:else}
            <div class="links-list">
              {#each editorDerived.backlinks.slice(0, 5) as link}
                {@const linkType = storyActions.getLinkType(link, editorDerived.currentDialogue!.id)}
                <div class="link-item">
                  <span class="link-id">{link.id}</span>
                  <span class:link-auto={linkType === 'Auto'}
                        class:link-option={linkType === 'Option'}
                        class="link-type-badge">
                    {linkType}
                  </span>
                  <button
                    class="btn-jump"
                    onclick={() => storyActions.jumpTo(link.id)}
                    title="Перейти к диалогу"
                  >
                    ←
                  </button>
                  <span class="link-text">{link.text.substring(0, 20)}...</span>
                </div>
              {/each}
              {#if editorDerived.backlinks.length > 5}
                <div class="more-links">...ещё {editorDerived.backlinks.length - 5}</div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
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

  /* Стили для секции связей */
  .links-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .link-block {
    background: #1e1e1e;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #444;
  }

  .link-block.secondary {
    background: #252526;
    border-color: #555;
  }

  .link-block h5 {
    margin: 0 0 10px 0;
    font-size: 11px;
    color: #aaa;
    text-transform: uppercase;
    font-weight: 600;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: #2a2d2e;
    border-radius: 3px;
    font-size: 11px;
    border-left: 2px solid #444;
  }

  .link-item:hover {
    background: #333;
    border-left-color: #666;
  }

  .link-type {
    color: #888;
    font-size: 10px;
    min-width: 50px;
    white-space: nowrap;
  }

  .link-id {
    color: #4db6ac;
    font-family: monospace;
    font-weight: bold;
    min-width: 60px;
    font-size: 10px;
  }

  .link-type-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
    min-width: 35px;
    text-align: center;
  }

  .link-type-badge.link-auto {
    background: #0d47a1;
    color: white;
  }

  .link-type-badge.link-option {
    background: #f57c00;
    color: white;
  }

  .btn-jump {
    background: #3c3c3c;
    border: none;
    color: #4caf50;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 3px;
    min-width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-jump:hover {
    background: #4a4a4a;
  }

  .link-text {
    flex: 1;
    color: #888;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-links {
    color: #666;
    font-style: italic;
    font-size: 11px;
    text-align: center;
    padding: 10px;
  }

  .more-links {
    color: #666;
    font-size: 10px;
    text-align: center;
    padding: 4px;
    font-style: italic;
  }
</style>