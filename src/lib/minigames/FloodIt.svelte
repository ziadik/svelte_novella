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

  const SIZE = 12;
  const MAX_MOVES = 25;

  const COLORS = [
    { name: "unicorn", value: "#e94560", icon: "🦄" },
    { name: "wizard", value: "#6c5ce7", icon: "🧙" },
    { name: "ghost", value: "#0984e3", icon: "👻" },
    { name: "skull", value: "#00b894", icon: "💀" },
    { name: "fire", value: "#fdcb6e", icon: "🔥" },
    { name: "spider", value: "#ffeaa7", icon: "🕷️" },
  ];

  let board = $state<number[][]>([]);
  let moves = $state(0);
  let isGameOver = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => initGame());

  let isWin = $derived(() => {
    const firstColor = board[0][0];
    return board.every(row => row.every(cell => cell === firstColor));
  });

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

  function checkGameStatus(): void {
    if (isWin()) {
      isGameOver = true;
      if (integrated) {
        showModal("🎉 Победа!", `Вы захватили мир за ${moves} ходов!`, []);
        setTimeout(() => {
          hideModal();
          onWin?.();
        }, 3000);
      } else {
        showModal("🎉 Победа!", `Вы захватили мир за ${moves} ходов!`, [
          { text: "Играть снова", action: initGame },
        ]);
      } 
    } else if (moves >= MAX_MOVES) {
      isGameOver = true;
      if (integrated) {
        showModal("💀 Поражение", "Ходы закончились!", []);
        setTimeout(() => {
          hideModal();
          onLose?.();
        }, 3000);
      } else {
        showModal("💀 Поражение", "Ходы закончились!", [
          { text: "Заново", action: initGame },
        ]);
      } 
    }
  }

  function handleGiveUp(): void {
    if (integrated) {
      showModal("💀 Сдаюсь", "Вы сдались...", []);
      setTimeout(() => {
        hideModal();
        onLose?.();
      }, 3000);
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
    showModal("📖 Правила", `Заливка мира:

🎯 Цель: Залить всё поле одним цветом.

🔴 Нажми на цвет внизу — он начнёт заливать поле с левого верхнего угла.

🔗 Цвет распространяется по соседним клеткам того же цвета.

⏰ У тебя есть всего 25 ходов!

💡 Планируй заранее — выбирай цтобы захватить как можно больше клеток.`, [
      { text: "Понятно", action: hideModal },
    ]);
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    <div id="grid" style="grid-template-columns: repeat({SIZE}, 1fr);">
      {#each board as row, r (r)}
        {#each row as color, c (c)}
          <div
            class="cell"
            style="background-color: {COLORS[color].value};"
          >
            {COLORS[color].icon}
          </div>
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

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="moves-counter">Ходов: <strong>{moves}</strong> / {MAX_MOVES}</span>
    </div>
  </GameFooter>

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
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  @media (max-width: 400px) {
    .cell {
      width: 20px;
      height: 20px;
      font-size: 12px;
    }
  }

  @media (max-width: 320px) {
    .cell {
      width: 18px;
      height: 18px;
      font-size: 10px;
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
