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
    rewardItem,
    items = [],
    bucketName = "dracula",
  }: MinigameProps = $props();

  // Настройки
  const ROWS = 6;
  const COLS = 6;
  const HINT_COOLDOWN_TIME = 5;

  const ICONS = ["🦄", "🧙", "👻", "💀", "🔥", "🕷️", "🕸️", "🧟", "⚰️", "🐸", "🦴", "🔮", "🧪", "👹", "🌜", "🍭", "💗"];

  // State
  let board = $state<(string | null)[][]>([]);
  let selectedCell = $state<{ r: number; c: number } | null>(null);
  let matchedCells = $state<Array<{ r: number; c: number }>>([]);
  let hintCells = $state<Array<{ r: number; c: number }>>([]);
  let isProcessing = $state(false);
  let isGameOver = $state(false);
  let hintCooldown = $state(0);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => initGame());

  function getRemainingCount(): number {
    let count = 0;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (board[r]?.[c]) count++;
      }
    }
    return count;
  }

  let remainingCount = $derived(getRemainingCount());
  let isHintAvailable = $derived(hintCooldown < 1);

  function initGame(): void {
    board = [];
    selectedCell = null;
    matchedCells = [];
    hintCells = [];
    isProcessing = false;
    isGameOver = false;
    hintCooldown = 0;
    hideModal();

    let uniqueIcons = [...new Set(ICONS)];
    while (uniqueIcons.length < (ROWS * COLS) / 2) {
      uniqueIcons = [...uniqueIcons, ...uniqueIcons];
    }

    let selectedIcons = uniqueIcons.sort(() => 0.5 - Math.random()).slice(0, (ROWS * COLS) / 2);
    let deck: string[] = [];
    selectedIcons.forEach((icon) => deck.push(icon, icon));
    deck.sort(() => Math.random() - 0.5);

    for (let r = 0; r < ROWS + 2; r++) {
      let row: (string | null)[] = [];
      for (let c = 0; c < COLS + 2; c++) {
        if (r === 0 || r === ROWS + 1 || c === 0 || c === COLS + 1) {
          row.push(null);
        } else {
          row.push(deck.shift() || null);
        }
      }
      board.push(row);
    }
  }

  function handleCellClick(r: number, c: number): void {
    if (isProcessing || isGameOver) return;
    if (!board[r]?.[c]) return;
    if (hintCells.length > 0) hintCells = [];

    if (!selectedCell) {
      selectedCell = { r, c };
    } else {
      const { r: sr, c: sc } = selectedCell;
      if (sr === r && sc === c) {
        selectedCell = null;
        return;
      }

      if (board[sr][sc] === board[r][c] && canConnect(sr, sc, r, c)) {
        isProcessing = true;
        matchedCells = [{ r: sr, c: sc }, { r, c }];
        setTimeout(() => {
          board[sr][sc] = null;
          board[r][c] = null;
          selectedCell = null;
          matchedCells = [];
          isProcessing = false;
          startHintCooldown();
          checkGameStatus();
        }, 300);
      } else {
        selectedCell = { r, c };
      }
    }
  }

  function canConnect(r1: number, c1: number, r2: number, c2: number): boolean {
    return findPath(r1, c1, r2, c2) !== null;
  }

  function findPath(r1: number, c1: number, r2: number, c2: number): Array<{ r: number; c: number }> | null {
    if (r1 === r2) {
      let minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
      for (let c = minC + 1; c < maxC; c++) if (board[r1][c]) return null;
      return [{ r: r1, c: c1 }, { r: r2, c: c2 }];
    }
    if (c1 === c2) {
      let minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
      for (let r = minR + 1; r < maxR; r++) if (board[r][c1]) return null;
      return [{ r: r1, c: c1 }, { r: r2, c: c2 }];
    }
    return null;
  }

  function startHintCooldown(): void {
    hintCooldown = HINT_COOLDOWN_TIME;
    const timer = setInterval(() => {
      hintCooldown--;
      if (hintCooldown <= 0) clearInterval(timer);
    }, 1000);
  }

  function showHint(): void {
    if (isProcessing || isGameOver || !isHintAvailable) return;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 1; c <= COLS; c++) {
        if (!board[r][c]) continue;
        for (let r2 = 1; r2 <= ROWS; r2++) {
          for (let c2 = 1; c2 <= COLS; c2++) {
            if (r === r2 && c === c2) continue;
            if (!board[r2][c2]) continue;
            if (board[r][c] === board[r2][c2] && canConnect(r, c, r2, c2)) {
              hintCells = [{ r, c }, { r: r2, c: c2 }];
              setTimeout(() => (hintCells = []), 1500);
              return;
            }
          }
        }
      }
    }
  }

  function checkGameStatus(): void {
    if (remainingCount === 0) {
      isGameOver = true;
      if (integrated) {
        onWin?.();
      } else {
        showModal("🎉 Победа!", "Все монстры соединены!", [{ text: "Играть снова", action: initGame }]);
      }
    }
  }

  function handleGiveUp(): void {
    if (integrated) {
      onLose?.();
    } else {
      showModal("Конец", "Попробуйте ещё раз!", [{ text: "Новая игра", action: initGame }]);
    }
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }
</script>

<BodyWrapper>
  <GameHeader onRestart={initGame} onGiveUp={integrated ? handleGiveUp : undefined} showGiveUp={integrated} />
  <div id="game-container">
    <div id="grid" style="grid-template-columns: repeat({COLS + 2}, 1fr); grid-template-rows: repeat({ROWS + 2}, 1fr);">
      {#each board as row, r (r)}
        {#each row as icon, c (c)}
          {#if icon}
            <div
              class="cell"
              class:selected={selectedCell?.r === r && selectedCell?.c === c}
              class:matched={matchedCells.some(m => m.r === r && m.c === c)}
              class:hint-glow={hintCells.some(h => h.r === r && h.c === c)}
              onclick={() => handleCellClick(r, c)}
              role="button"
              tabindex="0"
            >{icon}</div>
          {:else}
            <div class="cell empty"></div>
          {/if}
        {/each}
      {/each}
    </div>
  </div>
  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="tiles-counter">Осталось: <strong>{remainingCount}</strong></span>
      <button class="btn btn-secondary" class:disabled={!isHintAvailable} onclick={showHint} disabled={!isHintAvailable}>
        💡
      </button>
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
    margin-bottom: 15px;
  }
  #grid {
    display: grid;
    gap: 3px;
  }
  .cell {
    width: 45px;
    height: 45px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid #5e5c8a;
  }
  .cell.empty { background: transparent; border: none; cursor: default; }
  .cell:hover:not(.empty) { transform: scale(1.1); box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); }
  .cell.selected { background: linear-gradient(135deg, #e94560, #c0394d); border-color: #ff9f43; box-shadow: 0 0 15px rgba(233, 69, 96, 0.8); }
  .cell.matched { opacity: 0.5; transform: scale(0.8); }
  .cell.hint-glow { animation: pulse-hint 1s infinite; box-shadow: 0 0 15px #ffd700; border: 1px solid #ffd700; }
  @keyframes pulse-hint { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
  .footer-stats { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 10px; background: rgba(255, 255, 255, 0.05); border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.1); }
  .tiles-counter { font-size: 0.9rem; color: #ececec; }
  .tiles-counter strong { color: #ff9f43; font-size: 1.1rem; }
  .btn { padding: 6px 12px; font-size: 1rem; background: linear-gradient(135deg, #e94560, #c0394d); color: white; border: none; border-radius: 12px; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s, filter 0.2s; box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4); white-space: nowrap; min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 12px rgba(233, 69, 96, 0.6); filter: brightness(1.1); }
  .btn:active { transform: translateY(1px); }
  .btn-secondary { background: linear-gradient(135deg, #4e4c75, #3d3b5c); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); }
  .btn.disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; filter: grayscale(0.5); }
</style>
