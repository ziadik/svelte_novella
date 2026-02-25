<script lang="ts">
  import { onDestroy } from "svelte";
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

  const INGREDIENTS = [
    { id: 'frog', icon: '🐸', name: 'Лягушачья лапка' },
    { id: 'spider', icon: '🕷️', name: 'Паучий глаз' },
    { id: 'bat', icon: '🦇', name: 'Крыло летучей мыши' },
    { id: 'skull', icon: '💀', name: 'Прах скелета' },
    { id: 'mushroom', icon: '🍄', name: 'Ядовитый гриб' },
    { id: 'potion', icon: '🧪', name: 'База зелья' },
    { id: 'bone', icon: '🦴', name: 'Кость' },
    { id: 'web', icon: '🕸️', name: 'Паутина' },
  ];

  const RECIPES = [
    { name: 'Любовное зелье', ingredients: ['🐸', '🕷️', '🧪'] },
    { name: 'Зелье невидимости', ingredients: ['🦇', '🍄', '🧪'] },
    { name: 'Яд', ingredients: ['💀', '🕷️', '🍄'] },
    { name: 'Эликсир жизни', ingredients: ['🦇', '🦴', '🧪'] },
  ];

  const TIMEOUT = 1000;
  const WIN_SCORE = 20;
  const GAME_TIME = 60;

  let currentRecipe = $state<typeof RECIPES[0] | null>(null);
  let collectedIngredients = $state<string[]>([]);
  let score = $state(0);
  let timeLeft = $state(GAME_TIME);
  let gameActive = $state(false);
  let floatingItems = $state<Array<{ id: string; icon: string; x: number; y: number }>>([]);
  let timerInterval: ReturnType<typeof setInterval>;
  let spawnInterval: ReturnType<typeof setInterval>;
  let gameStarted = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function startGame() {
    gameActive = true;
    gameStarted = true;
    score = 0;
    timeLeft = GAME_TIME;
    collectedIngredients = [];
    selectNewRecipe();
    
    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
    
    spawnInterval = setInterval(() => {
      if (gameActive) {
        spawnIngredient();
      }
    }, 800);
  }

  function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(spawnInterval);
    
    if (score >= WIN_SCORE) {
      if (integrated) {
        showModal("🧪 Зелье сварено!", `Счёт: ${score}`, []);
        setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
      } else {
        showModal("🧪 Зелье сварено!", `Счёт: ${score}`, [
          { text: "Играть снова", action: startGame },
        ]);
      }
    } else {
      if (integrated) {
        showModal("💀 Котёл взорвался", `Счёт: ${score}`, []);
        setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
      } else {
        showModal("💀 Котёл взорвался", `Счёт: ${score}`, [
          { text: "Испытать снова", action: startGame },
        ]);
      }
    }
  }

  function selectNewRecipe() {
    const randomIndex = Math.floor(Math.random() * RECIPES.length);
    currentRecipe = RECIPES[randomIndex];
    collectedIngredients = [];
  }

  function spawnIngredient() {
    const randomIngredient = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
    const x = Math.random() * 80 + 10;
    const y = -10;
    
    const newItem = {
      id: `${randomIngredient.id}-${Date.now()}-${Math.random()}`,
      icon: randomIngredient.icon,
      x,
      y,
    };
    
    floatingItems = [...floatingItems, newItem];
    
    setTimeout(() => {
      floatingItems = floatingItems.filter(item => item.id !== newItem.id);
    }, 5000);
  }

  function collectIngredient(icon: string, itemId: string) {
    if (!gameActive || !currentRecipe) return;

    floatingItems = floatingItems.filter(item => item.id !== itemId);

    if (currentRecipe.ingredients.includes(icon) && !collectedIngredients.includes(icon)) {
      collectedIngredients = [...collectedIngredients, icon];
      score += 10;
      
      if (collectedIngredients.length === currentRecipe.ingredients.length) {
        score += 50;
        selectNewRecipe();
      }
    } else {
      score = Math.max(0, score - 5);
    }
  }

  function getRecipeProgress(): string {
    if (!currentRecipe) return '';
    return currentRecipe.ingredients.map(ing => 
      collectedIngredients.includes(ing) ? ing : '❓'
    ).join(' + ');
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Котёл ведьмы:

🎯 Цель: Набери {WIN_SCORE} очков за {GAME_TIME} секунд.

🧪 Собирай нужные ингредиенты для рецепта.

👆 Кликай на падающие ингредиенты.

✅ Правильный ингредиент: +10 очков.

✨ Полный рецепт: +50 очков.

❌ Неправильный ингредиент: -5 очков.`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  onDestroy(() => {
    clearInterval(timerInterval);
    clearInterval(spawnInterval);
  });
</script>

<BodyWrapper>
  <GameHeader
    onRestart={startGame}
    onGiveUp={integrated ? () => { gameActive = false; clearInterval(timerInterval); clearInterval(spawnInterval); showModal("💀 Сдаюсь", "Вы сдались...", []); setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT); } : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    {#if !gameStarted}
      <div class="start-screen">
        <h2>🧙 Котлы Ведьмы 🧙</h2>
        <p>Помоги ведьме собрать нужные ингредиенты!</p>
        <button type="button" class="start-btn" onclick={startGame}>Начать варить</button>
      </div>
    {:else if gameActive}
      <div class="game-header">
        <div class="score">✨ {score}</div>
        <div class="timer" class:danger={timeLeft <= 10}>⏳ {timeLeft}с</div>
      </div>
      
      {#if currentRecipe}
        <div class="current-recipe">
          <div class="recipe-name">{currentRecipe.name}</div>
          <div class="recipe-ingredients">
            {#each currentRecipe.ingredients as ing}
              <span class="ingredient-icon" class:collected={collectedIngredients.includes(ing)}>
                {collectedIngredients.includes(ing) ? ing : '❓'}
              </span>
            {/each}
          </div>
          <div class="recipe-progress">{getRecipeProgress()}</div>
        </div>
      {/if}

      <div class="game-area">
        <div class="cauldron">
          🧙‍♀️
          <div class="cauldron-fire">🔥</div>
        </div>
        
        <div class="floating-items">
          {#each floatingItems as item}
            <button
              type="button"
              class="floating-item"
              style="left: {item.x}%; top: {item.y}%;"
              onclick={() => collectIngredient(item.icon, item.id)}
            >
              {item.icon}
            </button>
          {/each}
        </div>
      </div>

      <div class="instructions">
        <p>Кликай на нужные ингредиенты!</p>
        <p>Лишние уменьшают счёт 👎</p>
      </div>
    {/if}
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="target-info">Цель: <strong>{WIN_SCORE}</strong> очков</span>
    </div>
  </GameFooter>

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  #game-container {
    background-color: rgba(0, 0, 0, 0.5);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-height: 500px;
    position: relative;
    overflow: hidden;
    margin-bottom: 15px;
  }

  .start-screen {
    text-align: center;
    padding: 40px 20px;
  }

  .start-screen h2 {
    color: #e94560;
    font-size: 2rem;
    margin-bottom: 20px;
    text-shadow: 0 0 10px rgba(233, 69, 96, 0.5);
  }

  .start-btn {
    padding: 15px 40px;
    background: linear-gradient(135deg, #e94560, #c0394d);
    border: none;
    border-radius: 30px;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 20px;
    box-shadow: 0 4px 0 #962d3a;
    font-family: inherit;
  }

  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 0 #962d3a;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: #2a2a40;
    border-radius: 10px;
    margin-bottom: 20px;
    font-size: 1.5rem;
  }

  .score {
    color: #ff9f43;
  }

  .timer {
    color: #e94560;
  }

  .timer.danger {
    animation: pulse-danger 0.5s ease-in-out infinite;
  }

  .current-recipe {
    text-align: center;
    padding: 15px;
    background: #3d3b5c;
    border-radius: 10px;
    margin-bottom: 20px;
    border: 2px solid #5e5c8a;
  }

  .recipe-name {
    color: #fdcb6e;
    font-size: 1.2rem;
    margin-bottom: 10px;
  }

  .recipe-ingredients {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 10px;
  }

  .ingredient-icon {
    font-size: 2rem;
    filter: grayscale(0.5);
    opacity: 0.7;
    transition: all 0.3s;
  }

  .ingredient-icon.collected {
    filter: none;
    opacity: 1;
    transform: scale(1.2);
    text-shadow: 0 0 10px #00b894;
  }

  .recipe-progress {
    color: #a0a0a0;
    font-size: 1.1rem;
  }

  .game-area {
    position: relative;
    height: 300px;
    background: #2a2a40;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 20px;
    border: 2px solid #5e5c8a;
  }

  .cauldron {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 5rem;
    z-index: 5;
  }

  .cauldron-fire {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 2rem;
    animation: flicker 0.3s ease-in-out infinite;
  }

  .floating-items {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .floating-item {
    position: absolute;
    font-size: 2rem;
    background: none;
    border: none;
    cursor: pointer;
    animation: fall 5s linear forwards;
    transition: transform 0.1s;
    padding: 0;
    font-family: inherit;
  }

  .floating-item:hover {
    transform: scale(1.3);
    filter: drop-shadow(0 0 10px #e94560);
  }

  .instructions {
    text-align: center;
    color: #a0a0a0;
    font-size: 0.9rem;
    padding: 10px;
    background: #2a2a40;
    border-radius: 5px;
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

  .target-info {
    font-size: 0.9rem;
    color: #ececec;
  }

  .target-info strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  @keyframes fall {
    from { transform: translateY(0); }
    to { transform: translateY(300px); }
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
    50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
  }

  @keyframes pulse-danger {
    0%, 100% { color: #e94560; }
    50% { color: #ff0000; }
  }
</style>