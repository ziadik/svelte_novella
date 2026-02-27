<script lang="ts">
  import { onMount } from 'svelte';
  import { userKeyStore } from '../../store/userKeyStore';
  import { getGameById } from '../../minigames/gamesList';

  interface GameStats {
    gameId: string;
    gameTitle: string;
    totalPlays: number;
    wins: number;
    losses: number;
    winRate: number;
  }

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let loading = $state(true);
  let gameStats = $state<GameStats[]>([]);

  onMount(async () => {
    gameStats = await userKeyStore.getGameStats();
    loading = false;
  });

  function getGameIcon(gameId: string): string {
    const game = getGameById(gameId);
    return game?.icon || '🎮';
  }

  function getGameName(gameId: string, fallbackTitle: string): string {
    const game = getGameById(gameId);
    return game?.name || fallbackTitle;
  }

  function handleGameClick(gameId: string) {
    window.dispatchEvent(new CustomEvent('open-minigame', { detail: { gameId } }));
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-overlay" onclick={handleOverlayClick}>
  <div class="trophies-modal">
    <div class="trophies-header">
      <button class="btn-close" onclick={onClose} aria-label="Закрыть">
        ✕
      </button>
      <h1>🏆 Трофеи</h1>
      <p class="subtitle">Ваши победы в мини-играх</p>
    </div>

    {#if loading}
      <div class="loading">Загрузка...</div>
    {:else if gameStats.length === 0}
      <div class="empty-state">
        <span class="empty-icon">🎮</span>
        <p>У вас пока нет трофеев</p>
        <p class="hint">Выиграйте в мини-игру, чтобы получить первый трофей!</p>
      </div>
    {:else}
      <div class="trophies-list">
        {#each gameStats as stats (stats.gameId)}
          <button 
            class="trophy-card"
            onclick={() => handleGameClick(stats.gameId)}
          >
            <div class="trophy-icon">{getGameIcon(stats.gameId)}</div>
            <div class="trophy-info">
              <h3>{getGameName(stats.gameId, stats.gameTitle)}</h3>
              <div class="trophy-stats">
                <span class="stat wins">🎯 {stats.wins} побед</span>
              </div>
            </div>
            <div class="trophy-rate">
              <span class="rate-value">{stats.winRate}%</span>
              <span class="rate-label">побед</span>
            </div>
          </button>
        {/each}
      </div>

      <div class="trophies-summary">
        <div class="summary-item">
          <span class="summary-value">{gameStats.reduce((sum, g) => sum + g.wins, 0)}</span>
          <span class="summary-label">Всего побед</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{gameStats.length}</span>
          <span class="summary-label">Игр выиграно</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
    padding-top: calc(20px + var(--safe-area-top));
    padding-bottom: calc(20px + var(--safe-area-bottom));
    padding-left: calc(20px + var(--safe-area-left));
    padding-right: calc(20px + var(--safe-area-right));
    backdrop-filter: blur(10px);
  }

  .trophies-modal {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border-radius: 20px;
    border: 1px solid rgba(255, 215, 0, 0.3);
    width: 100%;
    max-width: 400px;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .trophies-header {
    text-align: center;
    padding: 20px 20px 16px;
    position: relative;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-close:hover {
    background: rgba(233, 69, 96, 0.8);
    transform: rotate(90deg);
  }

  .trophies-header h1 {
    font-size: 24px;
    margin: 0 0 6px 0;
    background: linear-gradient(90deg, #ffd700, #ffaa00);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 13px;
    color: #aaa;
    margin: 0;
  }

  .loading {
    text-align: center;
    padding: 40px;
    color: #aaa;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .empty-icon {
    font-size: 56px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 8px 0;
    color: #aaa;
  }

  .hint {
    font-size: 13px;
    color: #666;
  }

  .trophies-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }

  .trophy-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    color: white;
    font-family: inherit;
  }

  .trophy-card:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 215, 0, 0.5);
    transform: translateY(-2px);
  }

  .trophy-icon {
    font-size: 32px;
    flex-shrink: 0;
  }

  .trophy-info {
    flex: 1;
    min-width: 0;
  }

  .trophy-info h3 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trophy-stats {
    display: flex;
    gap: 12px;
    font-size: 12px;
  }

  .stat.wins {
    color: #4ade80;
  }

  .stat.losses {
    color: #f87171;
  }

  .trophy-rate {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 45px;
  }

  .rate-value {
    font-size: 22px;
    font-weight: 700;
    color: #ffd700;
  }

  .rate-label {
    font-size: 10px;
    color: #888;
  }

  .trophies-summary {
    display: flex;
    justify-content: center;
    gap: 30px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .summary-value {
    font-size: 24px;
    font-weight: 700;
    color: #ffd700;
  }

  .summary-label {
    font-size: 11px;
    color: #aaa;
  }

  @media (max-width: 400px) {
    .trophies-modal {
      max-height: 90vh;
      border-radius: 16px;
    }

    .trophies-header h1 {
      font-size: 20px;
    }

    .trophy-card {
      padding: 10px;
    }

    .trophy-icon {
      font-size: 26px;
    }

    .trophy-info h3 {
      font-size: 13px;
    }

    .rate-value {
      font-size: 18px;
    }
  }
</style>
