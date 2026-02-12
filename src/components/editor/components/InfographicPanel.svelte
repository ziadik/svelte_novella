<script lang="ts">
  import { 
    editorData, selectedDialogueId, currentDialogue,
    backlinks, editorActions 
  } from '../../../stores/editorStore.svelte';
  import { storyActions } from '../../../stores/storyStore';
  import { get } from 'svelte/store';
  
  // Получаем текущий диалог из store
  const $currentDialogue = $currentDialogue;
  
  // Получаем текст целевого диалога
  function getTargetText(id: string | undefined): string {
    if (!id) return "Нет";
    const $data = get(data);
    if (!$data) return "Нет";
    
    const target = $data.dialogues.find(d => d.id === id);
    if (!target) return `❌ Не найден: ${id}`;
    return target.text?.substring(0, 40) || "Без текста" + "...";
  }
  
  // Получаем входящие связи
  const $backlinks = $backlinks;
</script>

<div class="infographic-section">
  <h4>Связи и переходы</h4>
  
  <!-- Исходящие связи -->
  <div class="info-block">
    <div class="info-title">👉 Куда ведет:</div>
    
    <!-- Авто-переход -->
    {#if $currentDialogue?.nextDialogueId}
      <div class="link-row">
        <span class="link-type">Auto:</span>
        <span class="link-id">{$currentDialogue.nextDialogueId}</span>
        <span class="link-preview">
          {getTargetText($currentDialogue.nextDialogueId)}
        </span>
        <button 
          class="btn-link" 
          on:click={() => storyActions.jumpTo($currentDialogue.nextDialogueId!)}
        >
          Перейти →
        </button>
      </div>
    {/if}
    
    <!-- Переходы по опциям -->
    {#each $currentDialogue?.options || [] as option}
      {#if option?.nextDialogueId}
        <div class="link-row">
          <span class="link-type">Opt:</span>
          <span class="link-id">{option.nextDialogueId}</span>
          <span class="link-preview">
            {getTargetText(option.nextDialogueId)}
          </span>
          <button 
            class="btn-link" 
            on:click={() => storyActions.jumpTo(option.nextDialogueId!)}
          >
            Перейти →
          </button>
        </div>
      {/if}
    {/each}
    
    {#if !$currentDialogue?.nextDialogueId && 
        (!$currentDialogue?.options || 
         !$currentDialogue.options.some(o => o?.nextDialogueId))}
      <div class="link-row empty">
        Нет исходящих связей (конечная сцена)
      </div>
    {/if}
  </div>
  
  <!-- Входящие связи -->
  <div class="info-block secondary">
    <div class="info-title">👈 Откуда ведут сюда:</div>
    
    {#if $backlinks.length === 0}
      <div class="link-row empty">
        Никто не ссылается на этот диалог (это начало или тупик)
      </div>
    {:else}
      {#each $backlinks as link}
        <div class="link-row">
          <span class="link-id">{link.id || 'Без ID'}</span>
          <span class:auto={editorActions.getLinkType(link, $currentDialogue?.id || '') === 'Auto'}
                class:option={editorActions.getLinkType(link, $currentDialogue?.id || '') === 'Option'}
                class="link-type-badge">
            {editorActions.getLinkType(link, $currentDialogue?.id || '')}
          </span>
          <button 
            class="btn-link" 
            on:click={() => storyActions.jumpTo(link.id)}
          >
            ← Перейти
          </button>
          <span class="link-target">
            "{link.text?.substring(0, 30) || 'Без текста'}..."
          </span>
        </div>
      {/each}
    {/if}
  </div>
  
  <!-- Статистика -->
  <div class="stats-section">
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-label">Всего опций</div>
        <div class="stat-value">
          {$currentDialogue?.options?.length || 0}
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Входящих</div>
        <div class="stat-value">{$backlinks.length}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Активных</div>
        <div class="stat-value">
          {$currentDialogue?.options?.filter(o => o?.enabled).length || 0}
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Видимых</div>
        <div class="stat-value">
          {$currentDialogue?.options?.filter(o => o?.visible).length || 0}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .infographic-section {
    margin-top: 30px;
    background: #2d2d2d;
    padding: 20px;
    border-radius: 4px;
    border: 1px solid #333;
  }

  .infographic-section h4 {
    margin: 0 0 15px 0;
    font-size: 13px;
    color: #ddd;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
  }

  .info-block {
    margin-bottom: 20px;
    padding: 15px;
    background: #1e1e1e;
    border-radius: 4px;
    border: 1px solid #444;
  }

  .info-block.secondary {
    background: #252526;
    border-color: #555;
  }

  .info-title {
    font-size: 12px;
    color: #aaa;
    margin-bottom: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .link-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: #252526;
    border-radius: 4px;
    margin-bottom: 6px;
    font-size: 12px;
    border-left: 3px solid transparent;
  }

  .link-row:hover {
    background: #2d2d2d;
    border-left-color: #555;
  }

  .link-row.empty {
    color: #666;
    font-style: italic;
    background: transparent;
    justify-content: center;
  }

  .link-type {
    color: #888;
    width: 60px;
    font-size: 10px;
    font-weight: bold;
  }

  .link-id {
    color: #4db6ac;
    font-family: monospace;
    font-weight: bold;
    flex: 0 0 80px;
  }

  .link-preview {
    flex: 1;
    color: #aaa;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-target {
    flex: 1;
    color: #888;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-type-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: bold;
    min-width: 50px;
    text-align: center;
  }

  .link-type-badge.auto {
    background: #0d47a1;
    color: white;
  }

  .link-type-badge.option {
    background: #f57c00;
    color: white;
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

  .stats-section {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed #444;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .stat-item {
    text-align: center;
    padding: 10px;
    background: #1e1e1e;
    border-radius: 4px;
    border: 1px solid #444;
  }

  .stat-label {
    font-size: 9px;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #4caf50;
  }
</style>