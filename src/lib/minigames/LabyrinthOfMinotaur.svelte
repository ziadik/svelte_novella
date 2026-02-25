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

  const WALL = '🧱';
  const PLAYER = '🧙';
  const EXIT = '🚪';
  const EMPTY = '·';
  const TIMEOUT = 1000;
  const MAZE_SIZE = 7;
  
  let maze = $state<string[][]>([]);
  let playerPos = $state({ x: 1, y: 1 });
  let exitPos = $state({ x: 5, y: 5 });
  let gameWon = $state(false);
  let gameStarted = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function generateMaze(size: number = MAZE_SIZE) {
    const newMaze = Array(size).fill(null).map(() => Array(size).fill(WALL));
    
    const carve = (x: number, y: number) => {
      const dirs = [[0,1],[1,0],[0,-1],[-1,0]].sort(() => Math.random() - 0.5);
      for (let [dx, dy] of dirs) {
        const nx = x + dx*2, ny = y + dy*2;
        if (nx > 0 && nx < size-1 && ny > 0 && ny < size-1 && newMaze[ny][nx] === WALL) {
          newMaze[y+dy][x+dx] = EMPTY;
          newMaze[ny][nx] = EMPTY;
          carve(nx, ny);
        }
      }
    }
    
    newMaze[1][1] = EMPTY;
    carve(1, 1);
    newMaze[exitPos.y][exitPos.x] = EXIT;
    return newMaze;
  }

  function initGame() {
    playerPos = { x: 1, y: 1 };
    exitPos = { x: MAZE_SIZE - 2, y: MAZE_SIZE - 2 };
    maze = generateMaze(MAZE_SIZE);
    gameWon = false;
    gameStarted = false;
    hideModal();
  }

  function startGame() {
    gameStarted = true;
    initGame();
  }

  function move(dx: number, dy: number) {
    if (gameWon || !gameStarted) return;
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    if (maze[newY]?.[newX] === EMPTY || maze[newY]?.[newX] === EXIT) {
      playerPos = { x: newX, y: newY };
    }
    if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
      handleWin();
    }
  }

  function handleWin() {
    gameWon = true;
    if (integrated) {
      showModal("🎉 Победа!", "Вы нашли выход из лабиринта!", []);
      setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
    } else {
      showModal("🎉 Победа!", "Вы нашли выход из лабиринта!", [
        { text: "Играть снова", action: initGame },
      ]);
    }
  }

  function handleGiveUp(): void {
    if (!gameStarted) return;
    gameWon = true;
    if (integrated) {
      showModal("💀 Сдаюсь", "Вы сдались...", []);
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
    showModal("📖 Правила", `Лабиринт Минотавра:

🎯 Цель: Найди выход из лабиринта.

🧙‍♂️ Управляй магом с помощью кнопок.

🚪 Дойди до двери, чтобы выиграть.

⚠️ Избегай стен!`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!gameStarted || gameWon) return;
    switch(e.key) {
      case 'ArrowUp': case 'w': move(0, -1); break;
      case 'ArrowDown': case 's': move(0, 1); break;
      case 'ArrowLeft': case 'a': move(-1, 0); break;
      case 'ArrowRight': case 'd': move(1, 0); break;
    }
  }

  onMount(() => {
    initGame();
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated && gameStarted}
    onShowRules={showRules}
  />

  <div id="game-container">
    {#if !gameStarted}
      <div class="start-screen">
        <div class="title">🌀 Лабиринт Минотавра</div>
        <div class="description">Найди выход из лабиринта</div>
        <button type="button" class="start-btn" onclick={startGame}>
          Начать испытание
        </button>
      </div>
    {:else}
      <div class="maze-container">
        <div class="maze">
          {#each maze as row, y}
            <div class="row">
              {#each row as cell, x}
                <span class="cell" class:wall={cell === WALL} class:exit={cell === EXIT}>
                  {#if playerPos.x === x && playerPos.y === y}
                    {PLAYER}
                  {:else}
                    {cell}
                  {/if}
                </span>
              {/each}
            </div>
          {/each}
        </div>
        <div class="controls">
          <button type="button" class="control-btn" onclick={() => move(0, -1)}>⬆️</button>
          <div class="controls-row">
            <button type="button" class="control-btn" onclick={() => move(-1, 0)}>⬅️</button>
            <button type="button" class="control-btn" onclick={() => move(1, 0)}>➡️</button>
          </div>
          <button type="button" class="control-btn" onclick={() => move(0, 1)}>⬇️</button>
        </div>
      </div>
    {/if}
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="status-text">
        {gameWon ? '🎉 Победа!' : gameStarted ? 'Играет...' : 'Готов'}
      </span>
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
    min-height: 200px;
  }

  .start-screen {
    text-align: center;
  }

  .title {
    font-size: 1.6rem;
    color: #e94560;
    margin-bottom: 10px;
  }

  .description {
    color: #a0a0a0;
    margin-bottom: 20px;
  }

  .start-btn {
    padding: 12px 24px;
    font-size: 1.1rem;
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.2s, filter 0.2s;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
    font-family: inherit;
  }

  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 12px rgba(233, 69, 96, 0.6);
    filter: brightness(1.1);
  }

  .maze-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .maze {
    font-family: monospace;
    font-size: 1.4rem;
    line-height: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row {
    display: flex;
    gap: 2px;
  }

  .cell {
    display: inline-block;
    width: 1.8rem;
    height: 1.8rem;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cell.wall {
    opacity: 0.7;
  }

  .cell.exit {
    color: #00b894;
  }

  .controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .controls-row {
    display: flex;
    gap: 4px;
  }

  .control-btn {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .control-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
    border-color: #e94560;
  }

  .control-btn:active {
    transform: translateY(0);
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

  .status-text {
    font-size: 0.9rem;
    color: #ececec;
  }

  @media (max-width: 400px) {
    .maze {
      font-size: 1rem;
    }
    .cell {
      width: 1.4rem;
      height: 1.4rem;
    }
    .control-btn {
      width: 45px;
      height: 45px;
      font-size: 1.2rem;
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
