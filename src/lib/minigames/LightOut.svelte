<script lang="ts">
  import { onMount } from "svelte";
  import BodyWrapper from './components/BodyWrapper.svelte';
  import GameHeader from './components/GameHeader.svelte';
  import GameFooter from './components/GameFooter.svelte';
  import MinigameModal from './components/MinigameModal.svelte';
  import type { MinigameProps, ModalState } from './types';

  // --- Props ---
  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props<MinigameProps>();

  // --- Настройки ---
  const ROWS = 5;
  const COLS = 5;
  const SHUFFLE_MOVES = 15;

  // --- State ---
  let board = $state<boolean[][]>([]);
  let moves = $state(0);
  let isGameOver = $state(false);

  let modal = $state<ModalState>({
    show: false,
    title: "",
    text: "",
    actions: [],
  });

  onMount(() => {
    initGame();
  });

  let isWin = $derived(board.flat().every((cell) => !cell));

  // --- Инициализация ---
  function initGame(): void {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
    moves = 0;
    isGameOver = false;
    hideModal();

    for (let i = 0; i < SHUFFLE_MOVES; i++) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      toggleCell(r, c, true);
    }
  }

  function toggleCell(r: number, c: number, silent = false): void {
    board[r][c] = !board[r][c];
    if (r > 0) board[r - 1][c] = !board[r - 1][c];
    if (r < ROWS - 1) board[r + 1][c] = !board[r + 1][c];
    if (c > 0) board[r][c - 1] = !board[r][c - 1];
    if (c < COLS - 1) board[r][c + 1] = !board[r][c + 1];

    if (!silent) {
      moves++;
      checkGameStatus();
    }
  }

  function handleCellClick(r: number, c: number): void {
    if (isGameOver) return;
    toggleCell(r, c);
  }

  // --- Статус игры ---
  function checkGameStatus(): void {
    if (isWin) {
      isGameOver = true;
      if (integrated) {
        onWin?.();
      } else {
        showModal("🕯️ Тьма наступила", `Вы погасили все свечи за ${moves} ходов!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  function handleGiveUp(): void {
    if (integrated) {
      onLose?.();
    } else {
      showModal("Сдаемся?", "Тьма оказалась сильнее...", [
        { text: "Заново", action: initGame },
      ]);
    }
  }

  // --- Modal Helpers ---
  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
  />

  <div id="game-container">
    <div id="grid" style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);">
      {#each board as row, r (r)}
        {#each row as lit, c (c)}
          <div
            class="cell"
            class:lit={lit}
            onclick={() => handleCellClick(r, c)}
            role="button"
            tabindex="0"
          >
            <div class="candle">
              {#if lit}
                <div class="flame"></div>
              {/if}
            </div>
          </div>
        {/each}
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName} 
    <div class="footer-stats">
      <span class="moves-counter">Ходов: <strong>{moves}</strong></span>
    </div>
  >} />

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 15px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 15px;
  }

  #grid {
    display: grid;
    gap: 8px;
  }

  .cell {
    width: 60px;
    height: 60px;
    background-color: #2a2a40;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid #3d3b5c;
  }

  @media (max-width: 400px) {
    .cell {
      width: 50px;
      height: 50px;
    }
  }

  @media (max-width: 320px) {
    .cell {
      width: 40px;
      height: 40px;
    }

    #grid {
      gap: 5px;
    }
  }

  .cell:hover {
    transform: scale(1.05);
    border-color: #5e5c8a;
  }

  .cell.lit {
    background-color: #5e1e2e;
    border-color: #e94560;
    box-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
  }

  .candle {
    width: 30px;
    height: 40px;
    background: linear-gradient(to top, #8B4513, #A0522D);
    border-radius: 4px 4px 2px 2px;
    position: relative;
  }

  @media (max-width: 400px) {
    .candle {
      width: 25px;
      height: 35px;
    }
  }

  .flame {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 24px;
    background: linear-gradient(to top, #ff9f43, #ffd700);
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    animation: flicker 0.5s infinite alternate;
    box-shadow: 0 0 10px #ff9f43, 0 0 20px #ffd700;
  }

  @keyframes flicker {
    0% {
      transform: translateX(-50%) scale(1) rotate(-2deg);
      opacity: 1;
    }
    100% {
      transform: translateX(-50%) scale(1.1) rotate(2deg);
      opacity: 0.8;
    }
  }

  .footer-stats {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .moves-counter {
    font-size: 0.9rem;
    color: #ececec;
  }

  .moves-counter strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }
</style>

<script lang="ts">
  // Default export для совместимости с MinigameLauncher
  export default {};
</script>
