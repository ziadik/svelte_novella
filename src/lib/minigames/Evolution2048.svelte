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

  const SIZE = 4;
  const WIN_TARGET = 2048;

  const EVOLUTION: Record<number, string> = {
    2: "🦇",
    4: "👻",
    8: "💀",
    16: "🧟",
    32: "🧛",
    64: "🧙",
    128: "👹",
    256: "🐉",
    512: "🔥",
    1024: "⚡",
    2048: "👑",
  };

  const COLORS: Record<number, string> = {
    2: "#3d3b5c",
    4: "#4e4c75",
    8: "#e94560",
    16: "#6c5ce7",
    32: "#a29bfe",
    64: "#fdcb6e",
    128: "#00b894",
    256: "#e17055",
    512: "#fd79a8",
    1024: "#00cec9",
    2048: "#ffd700",
  };

  let board = $state<number[][]>([]);
  let score = $state(0);
  let isGameOver = $state(false);
  let hasWon = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => {
    initGame();
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  let isWin = $derived(board.flat().every((cell) => cell >= WIN_TARGET));

  function initGame(): void {
    board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
    score = 0;
    isGameOver = false;
    hasWon = false;
    hideModal();
    addNewTile();
    addNewTile();
  }

  function addNewTile(): void {
    let emptyCells: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (isGameOver) return;

    let moved = false;
    switch (e.key) {
      case "ArrowUp":
        moved = moveUp();
        break;
      case "ArrowDown":
        moved = moveDown();
        break;
      case "ArrowLeft":
        moved = moveLeft();
        break;
      case "ArrowRight":
        moved = moveRight();
        break;
    }

    if (moved) {
      e.preventDefault();
      addNewTile();
      checkGameStatus();
    }
  }

  function slideRow(row: number[]): { newRow: number[]; moved: boolean } {
    let newRow = row.filter((val) => val !== 0);
    let moved = false;
    for (let i = 0; i < newRow.length - 1; i++) {
      if (newRow[i] === newRow[i + 1]) {
        newRow[i] *= 2;
        score += newRow[i];
        newRow.splice(i + 1, 1);
        moved = true;
      }
    }
    while (newRow.length < SIZE) newRow.push(0);
    return { newRow, moved: moved || row.join(",") !== newRow.join(",") };
  }

  function moveLeft(): boolean {
    let moved = false;
    for (let r = 0; r < SIZE; r++) {
      const { newRow, moved: rowMoved } = slideRow(board[r]);
      board[r] = newRow;
      if (rowMoved) moved = true;
    }
    return moved;
  }

  function moveRight(): boolean {
    let moved = false;
    for (let r = 0; r < SIZE; r++) {
      const { newRow, moved: rowMoved } = slideRow([...board[r]].reverse());
      board[r] = newRow.reverse();
      if (rowMoved) moved = true;
    }
    return moved;
  }

  function moveUp(): boolean {
    let moved = false;
    for (let c = 0; c < SIZE; c++) {
      let col = [];
      for (let r = 0; r < SIZE; r++) col.push(board[r][c]);
      const { newRow, moved: colMoved } = slideRow(col);
      for (let r = 0; r < SIZE; r++) board[r][c] = newRow[r];
      if (colMoved) moved = true;
    }
    return moved;
  }

  function moveDown(): boolean {
    let moved = false;
    for (let c = 0; c < SIZE; c++) {
      let col = [];
      for (let r = 0; r < SIZE; r++) col.push(board[r][c]);
      const { newRow, moved: colMoved } = slideRow(col.reverse());
      col = newRow.reverse();
      for (let r = 0; r < SIZE; r++) board[r][c] = col[r];
      if (colMoved) moved = true;
    }
    return moved;
  }

  let touchStartX = $state(0);
  let touchStartY = $state(0);

  function handleTouchStart(e: TouchEvent): void {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent): void {
    if (isGameOver) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    let moved = false;
    if (Math.abs(dx) > Math.abs(dy)) {
      moved = dx > 0 ? moveRight() : moveLeft();
    } else {
      moved = dy > 0 ? moveDown() : moveUp();
    }

    if (moved) {
      e.preventDefault();
      addNewTile();
      checkGameStatus();
    }
  }

  function checkGameStatus(): void {
    if (!hasWon) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c] >= WIN_TARGET) {
            hasWon = true;
            if (integrated) {
              showModal("👑 Победа!", "Вы создали короля монстров!", []);
              setTimeout(() => {
                hideModal();
                onWin?.();
              }, 3000);
            } else {
              showModal("👑 Победа!", "Вы создали короля монстров!", [
                { text: "Продолжить", action: hideModal },
                { text: "Новая игра", action: initGame, class: "btn-secondary" },
              ]);
            }
            return;
          }
        }
      }
    }

    if (isBoardFull() && !hasAvailableMoves()) {
      isGameOver = true;
      if (integrated) {
        showModal("💀 Конец", `Игра окончена. Очки: ${score}`, []);
        setTimeout(() => {
          hideModal();
          onLose?.();
        }, 3000);
      } else {
        showModal("💀 Конец", `Игра окончена. Очки: ${score}`, [
          { text: "Новая игра", action: initGame },
        ]);
      }
    }
  }

  function isBoardFull(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return false;
      }
    }
    return true;
  }

  function hasAvailableMoves(): boolean {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
        if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
      }
    }
    return false;
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
    // if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Эволюция 2048:

🎯 Цель: Создать существо уровня 2048 (Король).

⬅️➡️⬆️⬇️ Свайп или стрелки перемещают всех существ в одну сторону.

🔗 Одинаковые существа эволюционируют при столкновении:
🦇→👻→💀→🧟→🧛→🧙→👹→🐉→🔥→⚡→👑

💥 Новое существо появляется после каждого хода.

🏆 Победишь, когда получишь короля!`, [
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

  <div id="game-container" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
    <div id="grid">
      {#each board as row, r (r)}
        {#each row as cell, c (c)}
          <div
            class="cell"
            class:cell-{cell}
            style="background-color: {COLORS[cell] || '#2a2a40'};"
          >
            {cell > 0 ? EVOLUTION[cell] || cell : ""}
          </div>
        {/each}
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="score-counter">Очки: <strong>{score}</strong></span>
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
    touch-action: none;
  }

  #grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .cell {
    width: 70px;
    height: 70px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
    color: white;
    transition: transform 0.15s, background-color 0.2s;
  }

  @media (max-width: 400px) {
    .cell {
      width: 60px;
      height: 60px;
      font-size: 1.5rem;
    }
  }

  @media (max-width: 320px) {
    .cell {
      width: 50px;
      height: 50px;
      font-size: 1.2rem;
    }

    #grid {
      gap: 5px;
    }
  }

  .cell:hover {
    transform: scale(1.05);
  }

  @keyframes pulse-winner {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
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

  .score-counter {
    font-size: 0.9rem;
    color: #ececec;
  }

  .score-counter strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }
</style>
