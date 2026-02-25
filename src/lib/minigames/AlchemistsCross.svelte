<script lang="ts">
  import { onMount } from "svelte";
  import BodyWrapper from './components/BodyWrapper.svelte';
  import GameHeader from './components/GameHeader.svelte';
  import GameFooter from './components/GameFooter.svelte';
  import MinigameModal from './components/MinigameModal.svelte';
  import type { MinigameProps, ModalState } from './types';

  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props<MinigameProps>();

  const SIZE = 3;
  const TIMEOUT = 1000;
  const PLAYERS = ['🧪', '🗡️'] as const;
  type Player = typeof PLAYERS[number];
  
  let board = $state<(Player | null)[]>(Array(SIZE * SIZE).fill(null));
  let currentPlayer = $state<Player>(PLAYERS[0]);
  let gameOver = $state(false);
  let winner = $state<Player | null>(null);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function handleClick(index: number) {
    if (gameOver || board[index]) return;

    board[index] = currentPlayer;
    
    if (checkWin(currentPlayer)) {
      endGame(currentPlayer);
      return;
    }
    
    if (board.every(cell => cell)) {
      endGame(null);
      return;
    }

    currentPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
  }

  function checkWin(player: Player): boolean {
    const winPatterns = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    return winPatterns.some(pattern => 
      pattern.every(idx => board[idx] === player)
    );
  }

  function endGame(winnerPlayer: Player | null) {
    gameOver = true;
    winner = winnerPlayer;

    if (winnerPlayer) {
      if (integrated) {
        showModal("🎉 Победа!", `Победил ${winnerPlayer}!`, []);
        setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
      } else {
        showModal("🎉 Победа!", `Победил ${winnerPlayer}!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    } else {
      if (integrated) {
        showModal("🤝 Ничья!", "Ничья!", []);
        setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
      } else {
        showModal("🤝 Ничья!", "Ничья!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  function initGame() {
    board = Array(SIZE * SIZE).fill(null);
    currentPlayer = PLAYERS[0];
    gameOver = false;
    winner = null;
    hideModal();
  }

  function handleGiveUp(): void {
    gameOver = true;
    const loser = currentPlayer;
    if (integrated) {
      showModal("💀 Сдаюсь", `${loser} сдался!`, []);
      setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
    } else {
      showModal("Конец", "Попробуйте ещё раз!", [
        { text: "Новая игра", action: initGame },
      ]);
    }
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Алхимический крестик:

🎯 Цель: Первым выстроить 3 своих символа в ряд (по горизонтали, вертикали или диагонали).

🧪 Игрок 1: 🧪
🗡️ Игрок 2: 🗡️

⚠️ Игроки ходят по очереди.`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  onMount(() => { initGame(); });
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    <div class="status">
      Ход: <span class="current-player">{currentPlayer}</span>
    </div>
    <div class="board">
      {#each board as cell, i}
        <button
          type="button"
          class="cell"
          onclick={() => handleClick(i)}
          disabled={!!cell || gameOver}
        >
          {cell ?? ''}
        </button>
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="player-info">Ход: <strong>{currentPlayer}</strong></span>
    </div>
  </GameFooter>

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 5px;
    border-radius: 15px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    margin-bottom: 15px;
  }

  .status {
    position: absolute;
    top: 10px;
    text-align: center;
    font-size: 1rem;
    color: #ececec;
    z-index: 10;
  }

  .current-player {
    color: #ff9f43;
    font-weight: bold;
  }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .cell {
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
    border-radius: 12px;
    color: white;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }

  .cell:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
    border-color: #e94560;
  }

  .cell:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  }

  .cell:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  .footer-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .player-info {
    font-size: 0.9rem;
    color: #ececec;
  }

  .player-info strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  @media (max-width: 800px) {
    .cell {
      width: 65px;
      height: 65px;
      font-size: 2rem;
    }
  }

  @media (max-width: 400px) {
    .cell {
      width: 55px;
      height: 55px;
      font-size: 1.6rem;
    }
  }

  @media (max-width: 380px) {
    .footer-stats {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
  }
</style>