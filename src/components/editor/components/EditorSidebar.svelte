<script lang="ts">
  import { 
    data, selectedChapterId, selectedDialogueId,
    chapterDialogues, editorActions, 
    statusMessage

  } from '../../../stores/editorStore.svelte';
  import { storyActions } from '../../../stores/storyStore.svelte';
  import type { Dialogue } from '../../../types';

  // Безопасная функция для получения статистики диалога
  function getDialogueStats(dialogue: Dialogue | undefined) {
    if (!dialogue) {
      return {
        totalOptions: 0,
        enabledOptions: 0,
        visibleOptions: 0,
        hasAutoTransition: false,
        linkedOptions: 0,
        conditionalOptions: 0
      };
    }

    const stats = {
      totalOptions: dialogue.options?.length || 0,
      enabledOptions: 0,
      visibleOptions: 0,
      hasAutoTransition: !!dialogue.nextDialogueId,
      linkedOptions: 0,
      conditionalOptions: 0
    };

    if (dialogue.options) {
      dialogue.options.forEach(option => {
        if (option.enabled) stats.enabledOptions++;
        if (option.visible) stats.visibleOptions++;
        if (option.nextDialogueId) stats.linkedOptions++;
        if (option.visibilityCondition && option.visibilityCondition.type !== 'always') {
          stats.conditionalOptions++;
        }
      });
    }

    return stats;
  }

  // Статистика для главы
  function getChapterStats(chapterId: string | null) {
    if (!data || !chapterId) return null;

    const chapterDialogues = data.dialogues.filter(d => d.chapterId === chapterId);
    const stats = {
      totalDialogues: chapterDialogues.length,
      totalOptions: 0,
      totalTransitions: 0,
      conditionalDialogues: 0
    };

    chapterDialogues.forEach(dialogue => {
      if (!dialogue) return;
      
      stats.totalOptions += dialogue.options?.length || 0;
      if (dialogue.nextDialogueId) stats.totalTransitions++;
      if (dialogue.options) {
        dialogue.options.forEach(option => {
          if (option.nextDialogueId) stats.totalTransitions++;
        });
      }
      // Диалог с условными опциями
      if (dialogue.options?.some(o => o.visibilityCondition && o.visibilityCondition.type !== 'always')) {
        stats.conditionalDialogues++;
      }
    });

    return stats;
  }

  // Иконки для типов диалогов
  function getDialogueIcon(dialogue: Dialogue | undefined): string {
    if (!dialogue) return '❓';
    if (!dialogue.options || dialogue.options.length === 0) return '🔚';
    if (dialogue.nextDialogueId) return '➡️';
    return '💬';
  }

  // Иконки для глав
  function getChapterIcon(chapterId: string | null): string {
    const stats = getChapterStats(chapterId);
    if (!stats) return '📖';
    
    if (stats.totalDialogues === 0) return '📕';
    if (stats.conditionalDialogues > 0) return '🎭';
    return '📘';
  }
</script>

<aside class="sidebar">
  <!-- Раздел глав -->
  <div class="sidebar-section">
    <div class="section-header">
      <div class="section-title">
        <h3>Главы</h3>
        <span class="section-count">{data?.chapters?.length || 0}</span>
      </div>
      <button onclick={storyActions.addChapter} class="btn-icon" title="Добавить главу">+</button>
    </div>
    <div class="chapter-list">
      {#each data?.chapters || [] as chapter (chapter.id)}
        {#if chapter}
          {@const stats = getChapterStats(chapter.id)}
          <div 
            class:active={selectedChapterId === chapter.id}
            class="chapter-item" 
            onclick={() => editorActions.setSelectedChapterId(chapter.id)}
            title={`${stats?.totalDialogues || 0} сцен, ${stats?.totalOptions || 0} опций, ${stats?.totalTransitions || 0} переходов`}
          >
            <div class="chapter-header">
              <span class="chapter-icon">{getChapterIcon(chapter.id)}</span>
              <span class="chapter-title">{chapter.title || 'Без названия'}</span>
            </div>
            {#if stats}
              <div class="chapter-stats">
                <span class="stat-item" title="Сцены">
                  <span class="stat-icon">🎬</span>
                  <span class="stat-value">{stats.totalDialogues}</span>
                </span>
                {#if stats.totalOptions > 0}
                  <span class="stat-item" title="Опции">
                    <span class="stat-icon">💬</span>
                    <span class="stat-value">{stats.totalOptions}</span>
                  </span>
                {/if}
                {#if stats.totalTransitions > 0}
                  <span class="stat-item" title="Переходы">
                    <span class="stat-icon">↪️</span>
                    <span class="stat-value">{stats.totalTransitions}</span>
                  </span>
                {/if}
                {#if stats.conditionalDialogues > 0}
                  <span class="stat-item conditional" title="Условные диалоги">
                    <span class="stat-icon">🎭</span>
                    <span class="stat-value">{stats.conditionalDialogues}</span>
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  </div>
  
  <!-- Раздел сцен -->
  <div class="sidebar-section flex-1">
    <div class="section-header">
      <div class="section-title">
        <h3>Сцены ({chapterDialogues().length})</h3>
        <span class="section-hint">
          {#if selectedChapterId()}
            {data?.chapters?.find(c => c.id === selectedChapterId())?.title || 'Глава'}
          {:else}
            Все сцены
          {/if}
        </span>
      </div>
      <button 
        onclick={storyActions.addDialogue}
        class="btn-icon" 
        disabled={!selectedChapterId()}
        title="Добавить сцену"
      >
        +
      </button>
    </div>
    <div class="dialogue-list">
      {#each chapterDialogues() as dialogue, index (dialogue?.id || index)}
        {#if dialogue}
          {@const stats = getDialogueStats(dialogue)}
          <div 
            class:active={selectedDialogueId() === dialogue.id}
            class:has-options={stats.totalOptions > 0}
            class:has-transition={stats.hasAutoTransition}
            class="dialogue-item" 
            onclick={() => editorActions.setSelectedDialogueId(dialogue.id)}
          >
            <div class="dialogue-header">
              <span class="dialogue-icon">{getDialogueIcon(dialogue)}</span>
              <div class="dialogue-info">
                <span class="id-badge">{dialogue.id || 'Без ID'}</span>
                <span class="preview-text" title={dialogue.text || 'Без текста'}>
                  {dialogue?.text ? dialogue.text.substring(0, 30) : 'Без текста'}{#if dialogue?.text && dialogue.text.length > 30}...{/if}
                </span>
              </div>
            </div>
            
            <div class="dialogue-stats">
              {#if stats.totalOptions > 0}
                <div class="stats-row">
                  <span class="stat-badge" title="Всего опций">
                    <span class="stat-label">О:</span>
                    <span class="stat-value">{stats.totalOptions}</span>
                  </span>
                  
                  {#if stats.enabledOptions !== stats.totalOptions}
                    <span class="stat-badge enabled" title="Активные опции">
                      <span class="stat-label">А:</span>
                      <span class="stat-value">{stats.enabledOptions}</span>
                    </span>
                  {/if}
                  
                  {#if stats.visibleOptions !== stats.totalOptions}
                    <span class="stat-badge visible" title="Видимые опции">
                      <span class="stat-label">В:</span>
                      <span class="stat-value">{stats.visibleOptions}</span>
                    </span>
                  {/if}
                  
                  {#if stats.linkedOptions > 0}
                    <span class="stat-badge linked" title="Опции с переходами">
                      <span class="stat-label">→</span>
                      <span class="stat-value">{stats.linkedOptions}</span>
                    </span>
                  {/if}
                  
                  {#if stats.conditionalOptions > 0}
                    <span class="stat-badge conditional" title="Условные опции">
                      <span class="stat-label">🎭</span>
                      <span class="stat-value">{stats.conditionalOptions}</span>
                    </span>
                  {/if}
                </div>
              {:else}
                <div class="stats-row">
                  <span class="stat-badge empty" title="Нет опций">
                    <span class="stat-label">—</span>
                  </span>
                  
                  {#if stats.hasAutoTransition}
                    <span class="stat-badge auto-transition" title="Авто-переход">
                      <span class="stat-label">➡️</span>
                    </span>
                  {/if}
                </div>
              {/if}
            </div>
            
            <!-- Дополнительная информация при наведении -->
            <div class="dialogue-tooltip">
              <div class="tooltip-content">
                <div class="tooltip-title">{dialogue.id || 'Без ID'}</div>
                <div class="tooltip-text">{dialogue.text || 'Без текста'}</div>
                <div class="tooltip-stats">
                  <div class="tooltip-stat">
                    <span class="tooltip-label">Опции:</span>
                    <span class="tooltip-value">{stats.totalOptions}</span>
                  </div>
                  {#if stats.totalOptions > 0}
                    <div class="tooltip-stat">
                      <span class="tooltip-label">• Активных:</span>
                      <span class="tooltip-value">{stats.enabledOptions}</span>
                    </div>
                    <div class="tooltip-stat">
                      <span class="tooltip-label">• Видимых:</span>
                      <span class="tooltip-value">{stats.visibleOptions}</span>
                    </div>
                    <div class="tooltip-stat">
                      <span class="tooltip-label">• С переходами:</span>
                      <span class="tooltip-value">{stats.linkedOptions}</span>
                    </div>
                    <div class="tooltip-stat">
                      <span class="tooltip-label">• Условных:</span>
                      <span class="tooltip-value">{stats.conditionalOptions}</span>
                    </div>
                  {/if}
                  <div class="tooltip-stat">
                    <span class="tooltip-label">Авто-переход:</span>
                    <span class="tooltip-value">{stats.hasAutoTransition ? 'Да' : 'Нет'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
  
  <!-- Общая статистика -->
  <div class="sidebar-section stats-summary">
    <div class="summary-header">
      <h4>📊 Статистика</h4>
    </div>
    <div class="summary-stats">
      {#if data}
        <div class="summary-row">
          <span class="summary-label">Всего сцен:</span>
          <span class="summary-value">{data.dialogues.length}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Всего опций:</span>
          <span class="summary-value">
            {data.dialogues.reduce((acc, d) => acc + (d?.options?.length || 0), 0)}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Авто-переходов:</span>
          <span class="summary-value">
            {data.dialogues.filter(d => d?.nextDialogueId).length}
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Условных опций:</span>
          <span class="summary-value">
            {data.dialogues.reduce((acc, d) => {
              if (!d?.options) return acc;
              return acc + d.options.filter(o => o?.visibilityCondition && o.visibilityCondition.type !== 'always').length;
            }, 0)}
          </span>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Статус -->
  <div class="status-box">
    {#if statusMessage.text}
      <div class:success={statusMessage.type === 'success'}
           class:error={statusMessage.type === 'error'}
           class:loading={statusMessage.type === 'loading'}
           class="alert">
        {statusMessage.text}
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
    padding: 10px;
    cursor: pointer;
    border-bottom: 1px solid #333;
    font-size: 13px;
  }
  
  .chapter-item:hover { background: #2a2d2e; }
  .chapter-item.active { 
    background: #37373d; 
    border-left: 3px solid #ff5555; 
  }
  
  .dialogue-list { flex: 1; overflow-y: auto; }
  
  .dialogue-item {
    padding: 8px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
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