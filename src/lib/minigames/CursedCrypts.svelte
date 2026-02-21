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

  const ROWS = 8;
  const COLS = 8;
  const MINES = 10;

  let board = $state<Array<{ isMine: boolean; revealed: boolean; flagged: boolean; adjacentMines: number }>>([]);
  let isGameOver = $state(false);
  let hasWon = $state(false);
  let firstClick = $state(true);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => initGame());

  let revealedCount = $derived(board.filter(cell => cell.revealed).length);
  let totalCells = ROWS * COLS;
  let isWin = $derived(hasWon || revealedCount === totalCells - MINES);

  function initGame(): void {
    board = Array(totalCells).fill(null).map(() => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    }));
    isGameOver = false;
    hasWon = false;
    firstClick = true;
    hideModal();
  }

  function placeMines(excludeIndex: number): void {
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const index = Math.floor(Math.random() * totalCells);
      if (index !== excludeIndex && !board[index].isMine) {
        board[index].isMine = true;
        minesPlaced++;
      }
    }

    for (let i = 0; i < totalCells; i++) {
      if (!board[i].isMine) {
        board[i].adjacentMines = countAdjacentMines(i);
      }
    }
  }

  function countAdjacentMines(index: number): number {
    const r = Math.floor(index / COLS);
    const c = index % COLS;
    let count = 0;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          const ni = nr * COLS + nc;
          if (board[ni].isMine) count++;
        }
      }
    }

    return count;
  }

  function handleCellClick(index: number): void {
    if (isGameOver || board[index].revealed || board[index].flagged) return;

    if (firstClick) {
      placeMines(index);
      firstClick = false;
    }

    if (board[index].isMine) {
      revealAllMines();
      isGameOver = true;
      hasWon = false;
      if (integrated) {
        onLose?.();
      } else {
        showModal("💥 БУМ!", "Вы наткнулись на проклятую мину!", [
          { text: "Попробовать снова", action: initGame },
        ]);
      }
      return;
    }

    revealCell(index);
    checkGameStatus();
  }

  function handleCellRightClick(index: number, event: MouseEvent): void {
    event.preventDefault();
    if (isGameOver || board[index].revealed) return;

    board[index].flagged = !board[index].flagged;
  }

  function revealCell(index: number): void {
    if (index < 0 || index >= totalCells) return;
    if (board[index].revealed || board[index].flagged) return;

    board[index].revealed = true;

    if (board[index].adjacentMines === 0 && !board[index].isMine) {
      const r = Math.floor(index / COLS);
      const c = index % COLS;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            revealCell(nr * COLS + nc);
          }
        }
      }
    }
  }

  function revealAllMines(): void {
    for (let i = 0; i < totalCells; i++) {
      if (board[i].isMine) {
        board[i].revealed = true;
      }
    }
  }

  function checkGameStatus(): void {
    if (isWin()) {
      hasWon = true;
      isGameOver = true;
      if (integrated) {
        onWin?.();
      } else {
        showModal("🎉 Победа!", "Вы нашли все проклятые мины!", [
          { text: "Играть снова", action: initGame },
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

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function getCellContent(cell: typeof board[0]): string {
    if (cell.revealed) {
      if (cell.isMine) return "💀";
      if (cell.adjacentMines === 0) return "";
      return cell.adjacentMines.toString();
    }
    if (cell.flagged) return "🚩";
    return "";
  }

  function getNumberColor(num: number): string {
    const colors = ["", "#00b894", "#0984e3", "#e94560", "#6c5ce7", "#fdcb6e", "#00cec9", "#d63031", "#2d3436"];
    return colors[num] || "#ececec";
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
  />

  <div id="game-container">
    <div id="grid" style="grid-template-columns: repeat({COLS}, 1fr);">
      {#each board as cell, index (index)}
        <div
          class="cell"
          class:revealed={cell.revealed}
          class:mine={cell.isMine && cell.revealed}
          class:flagged={cell.flagged}
          onclick={() => handleCellClick(index)}
          oncontextmenu={(e) => handleCellRightClick(index, e)}
          role="button"
          tabindex="0"
        >
          <span class="cell-content" style="color: {cell.revealed && !cell.isMine ? getNumberColor(cell.adjacentMines) : ''}">
            {getCellContent(cell)}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="mines-counter">💀 {MINES}</span>
      <span class="flag-counter">🚩 {board.filter(c => c.flagged).length}</span>
    </div>
  </GameFooter>

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
    gap: 3px;
  }

  .cell {
    width: 38px;
    height: 38px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.1s;
    border: 2px outset #5e5c8a;
    user-select: none;
  }

  @media (max-width: 400px) {
    .cell {
      width: 32px;
      height: 32px;
      font-size: 1rem;
    }
  }

  @media (max-width: 320px) {
    .cell {
      width: 28px;
      height: 28px;
      font-size: 0.9rem;
    }
  }

  .cell:hover:not(.revealed) {
    background: linear-gradient(135deg, #5e5c8a, #4e4c75);
  }

  .cell.revealed {
    background: #2a2a40;
    border: 1px solid #3d3b5c;
  }

  .cell.mine {
    background: #e94560;
    border-color: #c0394d;
  }

  .cell.flagged {
    background: linear-gradient(135deg, #fdcb6e, #f39c12);
    border-color: #f39c12;
  }

  .cell-content {
    pointer-events: none;
  }

  .footer-stats {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mines-counter,
  .flag-counter {
    font-size: 0.9rem;
    color: #ececec;
  }
</style>
