<!-- src/components/layout/Header.svelte -->
<script lang="ts">
  import { currentStory } from '../../stores/storyStore.svelte'
  import { currentDialogue, gameState } from '../../stores/gameStore.svelte'

  const { currentView, onViewChange } = $props<{
    currentView: 'select' | 'editor' | 'game'
    onViewChange?: (view: 'select' | 'editor' | 'game') => void
  }>()

  // Навигация
  const navItems = $derived([
    { id: 'select', label: '📚 Библиотека', icon: '📚' },
    { id: 'editor', label: '✏️ Редактор', icon: '✏️', disabled: !currentStory() },
    { id: 'game', label: '🎮 Игра', icon: '🎮', disabled: !currentStory() }
  ])

  function handleNavClick(view: 'select' | 'editor' | 'game') {
    onViewChange?.(view)
  }
</script>

<header class="header">
  <div class="header-left">
    <div class="logo">
      <div class="logo-icon">📖</div>
      <h1 class="app-title">Novella Editor</h1>
    </div>

    <nav class="main-nav">
      {#each navItems as item}
        <button
          class:active={currentView === item.id}
          class="nav-btn"
          onclick={() => handleNavClick(item.id as 'select' | 'editor' | 'game')}
          disabled={item.disabled}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
        </button>
      {/each}
    </nav>
  </div>

  <div class="header-center">
    {#if currentStory() && currentView !== 'select'}
      <div class="current-story-info">
        <div class="story-title">
          {currentStory()?.name || 'Без названия'}
        </div>
      </div>
    {/if}
  </div>

  <div class="header-right">
    {#if currentView === 'game' && currentDialogue()}
      <div class="game-info">
        <div class="game-stats">
          <span class="stat-item">🧠 {gameState().player?.stats?.knowledge || 0}</span>
          <span class="stat-item">⚔️ {gameState().player?.stats?.courage || 0}</span>
          <span class="stat-item">💬 {gameState().player?.stats?.charisma || 0}</span>
        </div>
      </div>
    {/if}
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    height: 64px;
    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(26, 26, 38, 0.98));
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;
  }

  .header-right {
    justify-content: flex-end;
  }

  .header-center {
    flex: 2;
    display: flex;
    justify-content: center;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    font-size: 28px;
  }

  .app-title {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  .main-nav {
    display: flex;
    gap: 8px;
    margin-left: 20px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-btn.active {
    background: rgba(0, 122, 204, 0.2);
    border-color: rgba(0, 122, 204, 0.4);
    color: white;
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .current-story-info {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .story-title {
    color: white;
    font-weight: 600;
  }

  .game-info {
    display: flex;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .game-stats {
    display: flex;
    gap: 12px;
  }

  .stat-item {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
</style>
