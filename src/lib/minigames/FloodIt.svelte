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
  const SIZE = 12;
  const MAX_MOVES = 25;

  const COLORS = [
    { name: "crimson", value: "#e94560", icon: "🔴" },
    { name: "purple", value: "#6c5ce7", icon: "🟣" },
    { name: "blue", value: "#0984e3", icon: "🔵" },
    { name: "green", value: "#00b894", icon: "🟢" },
    { name: "orange", value: "#fdcb6e", icon: "🟠" },
    { name: "yellow", value: "#ffeaa7", icon: "🟡" },
  ];

  // --- State ---
  let board = $state<number[][]>([]);
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

  // Проверка победы (все клетки одного цвета)
  let isWin = $derived(() => {
    const firstColor = board[0][0];
    return board.every(row => row.every(cell => cell === firstColor));
  });

  // --- Инициализация ---
  function initGame(): void {
    board = [];
    moves = 0;
    isGameOver = false;
    hideModal();

    for (let r = 0; r < SIZE; r++) {
      let row: number[] = [];
      for (let c = 0; c < SIZE; c++) {
        row.push(Math.floor(Math.random() * COLORS.length));
      }
      board.push(row);
    }
  }

  // --- Логика игры ---
  function floodFill(startR: number, startC: number, oldColor: number, newColor: number): void {
    if (startR < 0 || startR >= SIZE || startC < 0 || startC >= SIZE) return;
    if (board[startR][startC] !== oldColor) return;

    board[startR][startC] = newColor;

    floodFill(startR - 1, startC, oldColor, newColor);
    floodFill(startR + 1, startC, oldColor, newColor);
    floodFill(startR, startC - 1, oldColor, newColor);
    floodFill(startR, startC + 1, oldColor, newColor);
  }

  function handleColorClick(colorIndex: number): void {
    if (isGameOver || moves >= MAX_MOVES) return;

    const oldColor = board[0][0];
    if (colorIndex === oldColor) return;

    floodFill(0, 0, oldColor, colorIndex);
    moves++;
    checkGameStatus();
  }

  // --- Статус игры ---
  function checkGameStatus(): void {
    if (isWin()) {
      isGameOver = true;
      if (integrated) {
        onWin?.();
      } else {
        showModal("🎉 Победа!", `Вы захватили мир за ${moves} ходов!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    } else if (moves >= MAX_MOVES) {
      isGameOver = true;
      if (integrated) {
        onLose?.();
      } else {
        showModal("💀 Поражение", "Ходы закончились!", [
          { text: "Заново", action: initGame },
        ]);
      }
    }
  }

  function handleGiveUp(): void {
    if (integrated) {
      onLose?.();
    } else {
      showModal("Конец", "Попробуйте ещё раз!", [
        { text: "Новая игра", action: initGame },
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
    <div id="grid" style="grid-template-columns: repeat({SIZE}, 1fr);">
      {#each board as row, r (r)}
        {#each row as color, c (c)}
          <div
            class="cell"
            style="background-color: {COLORS[color].value};"
          ></div>
        {/each}
      {/each}
    </div>
  </div>

  <div class="color-picker">
    {#each COLORS as color, i (i)}
      <button
        class="color-btn"
        style="background-color: {color.value};"
        onclick={() => handleColorClick(i)}
        disabled={isGameOver || moves >= MAX_MOVES}
      >
        {color.icon}
      </button>
    {/each}
  </div>

  <GameFooter {rewardItem} {items} {bucketName} 
    <div class="footer-stats">
      <span class="moves-counter">Ходов: <strong>{moves}</strong> / {MAX_MOVES}</span>
    </div>
  >} />

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 8px;
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
    gap: 1px;
  }

  .cell {
    width: 25px;
    height: 25px;
    transition: background-color 0.2s;
  }

  @media (max-width: 400px) {
    .cell {
      width: 20px;
      height: 20px;
    }
  }

  @media (max-width: 320px) {
    .cell {
      width: 18px;
      height: 18px;
    }
  }

  .color-picker {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 10px;
  }

  .color-btn {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    font-size: 1.5rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .color-btn:hover:not(:disabled) {
    transform: scale(1.15);
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  }

  .color-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 400px) {
    .color-btn {
      width: 38px;
      height: 38px;
      font-size: 1.2rem;
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
