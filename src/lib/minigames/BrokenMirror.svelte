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
  const TIMEOUT = 1000;

  let board = $state<(number | null)[][]>([]);
  let moves = $state(0);
  let isGameOver = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => initGame());

  let isWin = $derived(() => {
    let expected = 1;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (r === SIZE - 1 && c === SIZE - 1) {
          if (board[r][c] !== null) return false;
        } else {
          if (board[r][c] !== expected) return false;
          expected++;
        }
      }
    }
    return true;
  });

  function initGame(): void {
    board = [];
    moves = 0;
    isGameOver = false;
    hideModal();

    let tiles: (number | null)[] = [];
    for (let i = 1; i < SIZE * SIZE; i++) {
      tiles.push(i);
    }
    tiles.push(null);

    do {
      tiles = tiles.sort(() => Math.random() - 0.5);
    } while (!isSolvable(tiles));

    let index = 0;
    for (let r = 0; r < SIZE; r++) {
      let row: (number | null)[] = [];
      for (let c = 0; c < SIZE; c++) {
        row.push(tiles[index++]);
      }
      board.push(row);
    }
  }

  function isSolvable(tiles: (number | null)[]): boolean {
    let inversions = 0;
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (tiles[i] && tiles[j] && tiles[i] > tiles[j]) {
          inversions++;
        }
      }
    }

    let emptyRow = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === null) {
        emptyRow = Math.floor(i / SIZE);
        break;
      }
    }

    if (SIZE % 2 === 0) {
      return (inversions % 2) === ((SIZE - emptyRow) % 2);
    } else {
      return inversions % 2 === 0;
    }
  }

  function findEmpty(): { r: number; c: number } | null {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === null) return { r, c };
      }
    }
    return null;
  }

  function handleTileClick(r: number, c: number): void {
    if (isGameOver) return;

    const empty = findEmpty();
    if (!empty) return;

    const dr = Math.abs(r - empty.r);
    const dc = Math.abs(c - empty.c);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      board[empty.r][empty.c] = board[r][c];
      board[r][c] = null;
      moves++;
      checkGameStatus();
    }
  }

  function checkGameStatus(): void {
    if (isWin()) {
      isGameOver = true;
      if (integrated) {
        showModal("🪞 Зеркало восстановлено!", `Вы собрали осколки за ${moves} ходов!`, []);
        setTimeout(() => {
          hideModal();
          onWin?.();
        }, TIMEOUT);
      } else {
        showModal("🪞 Зеркало восстановлено!", `Вы собрали осколки за ${moves} ходов!`, [
          { text: "Играть снова", action: initGame },
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
      }, TIMEOUT);
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
    showModal("📖 Правила", `Пятнашки (Осколки зеркала):

🎯 Цель: Собрать числа по порядку от 1 до 15.

🔄 Клик на плитку перемещает её на пустое место (рядом).

🧠 Подумай над ходами — плитки можно двигать только по одной!

🏆 Собери головоломку за меньшее количество ходов.`, [
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
        {#each row as tile, c (c)}
          <button
            type="button"
            class="cell"
            class:empty={tile === null}
            onclick={() => handleTileClick(r, c)}
            disabled={tile === null}
            aria-label={tile === null ? 'Пустая ячейка' : `Ячейка ${tile}`}
          >
            {tile}
          </button>
        {/each}
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="moves-counter">Ходов: <strong>{moves}</strong></span>
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
    gap: 5px;
  }

  .cell {
    width: 70px;
    height: 70px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
    color: #ececec;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    border: 2px solid #5e5c8a;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
    padding: 0;
    font-family: inherit;
  }

  .cell:focus-visible {
    outline: 2px solid #e94560;
    outline-offset: 2px;
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
      gap: 3px;
    }
  }

  .cell:hover:not(.empty) {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
  }

  .cell.empty {
    background: transparent;
    border: 2px dashed rgba(255, 255, 255, 0.1);
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.5;
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
