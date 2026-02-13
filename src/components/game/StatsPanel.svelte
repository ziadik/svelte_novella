<!-- src/components/game/StatsPanel.svelte -->
<script lang="ts">
  import { gameState } from '../../stores/gameStore.svelte'
  
  // Основные характеристики игрока
  const stats = $derived(gameState().player.stats)

  // Дополнительные метрики
  const metrics = $derived({
    dialoguesCompleted: gameState().player.progress?.completedDialogues?.length || 0,
    totalDialogues: gameState().storyData?.dialogues.length || 0,
    itemsCollected: gameState().player.inventory.length,
    playTime: calculatePlayTime(),
    currentChapter: getCurrentChapter()
  })
  
  function calculatePlayTime() {
    // Здесь можно добавить логику расчета времени игры
    return "15 мин"
  }
  
  function getCurrentChapter() {
    const state = gameState()
    const dialogue = state.currentDialogue
    if (!dialogue?.chapterId || !state.storyData?.chapters) return null

    return state.storyData.chapters.find(c => c.id === dialogue.chapterId)
  }
</script>

<div class="stats-panel">
  <div class="panel-header">
    <h3 class="panel-title">📊 Характеристики</h3>
  </div>
  
  <div class="stats-content">
    <!-- Прогресс игры -->
    <div class="stats-section">
      <h4 class="section-title">📈 Прогресс</h4>
      
      <div class="progress-item">
        <span class="progress-label">Прогресс истории</span>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style="width: {metrics.totalDialogues > 0 ? (metrics.dialoguesCompleted / metrics.totalDialogues * 100) : 0}%"
          ></div>
        </div>
        <span class="progress-value">
          {metrics.dialoguesCompleted} / {metrics.totalDialogues}
        </span>
      </div>
      
      <div class="progress-item">
        <span class="progress-label">Собрано предметов</span>
        <span class="progress-value">{metrics.itemsCollected}</span>
      </div>
      
      <div class="progress-item">
        <span class="progress-label">Время игры</span>
        <span class="progress-value">{metrics.playTime}</span>
      </div>
      
      {#if metrics.currentChapter}
        <div class="current-chapter">
          <span class="chapter-label">Текущая глава:</span>
          <span class="chapter-title">{metrics.currentChapter.title}</span>
        </div>
      {/if}
    </div>
    
    <!-- Основные характеристики -->
    <div class="stats-section">
      <h4 class="section-title">⚔️ Характеристики</h4>
      
      <div class="stats-grid">
        {#each Object.entries(stats) as [stat, value]}
          <div class="stat-item">
            <div class="stat-header">
              <span class="stat-name">{getStatLabel(stat)}</span>
              <span class="stat-value">{value}</span>
            </div>
            <div class="stat-bar">
              <div 
                class="stat-fill"
                style="width: {Math.min(value, 100)}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Флаги (достижения) -->
    {#if gameState().player.flags && Object.keys(gameState().player.flags).length > 0}
      <div class="stats-section">
        <h4 class="section-title">🏆 Достижения</h4>
        
        <div class="flags-grid">
          {#each Object.entries(gameState().player.flags) as [flag, isActive]}
            {#if isActive}
              <div class="flag-item">
                <span class="flag-icon">✅</span>
                <span class="flag-name">{getFlagLabel(flag)}</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .stats-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(30, 30, 30, 0.95);
  }
  
  .panel-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.3);
  }
  
  .panel-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
  }
  
  .stats-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .stats-section {
    margin-bottom: 30px;
  }
  
  .stats-section:last-child {
    margin-bottom: 0;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: white;
    margin: 0 0 15px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .progress-item {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 12px;
  }
  
  .progress-item:last-child {
    margin-bottom: 0;
  }
  
  .progress-label {
    flex: 1;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    min-width: 120px;
  }
  
  .progress-bar {
    flex: 2;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #8bc34a);
    border-radius: 4px;
    transition: width 0.5s ease-out;
  }
  
  .progress-value {
    font-size: 14px;
    font-weight: 600;
    color: white;
    min-width: 60px;
    text-align: right;
  }
  
  .current-chapter {
    margin-top: 20px;
    padding: 15px;
    background: rgba(156, 39, 176, 0.1);
    border: 1px solid rgba(156, 39, 176, 0.3);
    border-radius: 10px;
  }
  
  .chapter-label {
    display: block;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 5px;
    text-transform: uppercase;
  }
  
  .chapter-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #ba68c8;
  }
  
  .stats-grid {
    display: grid;
    gap: 15px;
  }
  
  .stat-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    padding: 15px;
  }
  
  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .stat-name {
    font-size: 14px;
    font-weight: 500;
    color: white;
    text-transform: capitalize;
  }
  
  .stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #4db6ac;
  }
  
  .stat-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .stat-fill {
    height: 100%;
    background: linear-gradient(90deg, #2196f3, #03a9f4);
    border-radius: 3px;
    transition: width 0.3s ease-out;
  }
  
  .flags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .flag-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }
  
  .flag-icon {
    font-size: 16px;
    color: #4caf50;
  }
  
  .flag-name {
    font-size: 13px;
    color: white;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

<script lang="ts" module>
  // Вспомогательные функции для локализации
  export function getStatLabel(stat: string): string {
    const labels: Record<string, string> = {
      knowledge: 'Знания',
      courage: 'Храбрость',
      charisma: 'Харизма',
      health: 'Здоровье',
      strength: 'Сила',
      agility: 'Ловкость',
      intelligence: 'Интеллект',
      wisdom: 'Мудрость'
    }
    return labels[stat] || stat
  }
  
  export function getFlagLabel(flag: string): string {
    const labels: Record<string, string> = {
      metDracula: 'Встретил Дракулу',
      foundKey: 'Нашел ключ',
      solvedMystery: 'Раскрыл тайну',
      savedCharacter: 'Спас персонажа'
    }
    return labels[flag] || flag
  }
</script>