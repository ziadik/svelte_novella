<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props();

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

  let currentRecipe = $state<typeof RECIPES[0] | null>(null);
  let collectedIngredients = $state<string[]>([]);
  let score = $state(0);
  let timeLeft = $state(60);
  let gameActive = $state(false);
  let floatingItems = $state<Array<{ id: string; icon: string; x: number; y: number }>>([]);
  let timerInterval: NodeJS.Timeout;
  let spawnInterval: NodeJS.Timeout;

  function startGame() {
    gameActive = true;
    score = 0;
    timeLeft = 60;
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
    
    if (integrated) {
      if (score >= 20) {
        setTimeout(() => onWin?.(), 500);
      } else {
        setTimeout(() => onLose?.(), 500);
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
    const x = Math.random() * 80 + 10; // % от ширины контейнера
    const y = -10; // Начинаем сверху
    
    floatingItems = [
      ...floatingItems,
      {
        id: `${randomIngredient.id}-${Date.now()}-${Math.random()}`,
        icon: randomIngredient.icon,
        x,
        y,
      }
    ];
    
    // Удаляем старые предметы
    setTimeout(() => {
      floatingItems = floatingItems.filter(item => item.id !== floatingItems[floatingItems.length - 1]?.id);
    }, 5000);
  }

  function collectIngredient(icon: string, itemId: string) {
    if (!gameActive || !currentRecipe) return;

    // Удаляем предмет
    floatingItems = floatingItems.filter(item => item.id !== itemId);

    // Проверяем, нужен ли ингредиент
    if (currentRecipe.ingredients.includes(icon) && !collectedIngredients.includes(icon)) {
      collectedIngredients = [...collectedIngredients, icon];
      score += 10;
      
      // Проверяем, собран ли весь рецепт
      if (collectedIngredients.length === currentRecipe.ingredients.length) {
        score += 50; // Бонус за рецепт
        selectNewRecipe();
      }
    } else {
      // Неправильный ингредиент - штраф
      score = Math.max(0, score - 5);
    }
  }

  function getRecipeProgress(): string {
    if (!currentRecipe) return '';
    return currentRecipe.ingredients.map(ing => 
      collectedIngredients.includes(ing) ? ing : '❓'
    ).join(' + ');
  }

  onDestroy(() => {
    clearInterval(timerInterval);
    clearInterval(spawnInterval);
  });
</script>

<div id="game-container">
  {#if !gameActive && timeLeft === 60}
    <div class="start-screen">
      <h2>🧙 Котлы Ведьмы 🧙</h2>
      <p>Помоги ведьме собрать нужные ингредиенты!</p>
      <button class="start-btn" onclick={startGame}>Начать варить</button>
    </div>
  {:else if gameActive}
    <div class="game-header">
      <div class="score">✨ {score}</div>
      <div class="timer">⏳ {timeLeft}с</div>
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
            class="floating-item"
            style="left: {item.x}%; top: {item.y}px;"
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
  {:else}
    <div class="game-over">
      <h2>{score >= 20 ? '🧪 Зелье сварено! 🧪' : '💀 Котёл взорвался... 💀'}</h2>
      <div class="final-score">Счёт: {score}</div>
      <button class="restart-btn" onclick={startGame}>Испытать снова</button>
    </div>
  {/if}
</div>

<style>
  #game-container {
    background-color: rgba(0, 0, 0, 0.5);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-height: 500px;
    position: relative;
    overflow: hidden;
  }

  .start-screen, .game-over {
    text-align: center;
    padding: 40px 20px;
  }

  .start-screen h2, .game-over h2 {
    color: #e94560;
    font-size: 2rem;
    margin-bottom: 20px;
    text-shadow: 0 0 10px rgba(233, 69, 96, 0.5);
  }

  .start-btn, .restart-btn {
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
  }

  .start-btn:hover, .restart-btn:hover {
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
    animation: fall linear forwards;
    animation-duration: 5s;
    transition: transform 0.1s;
    padding: 0;
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

  .final-score {
    font-size: 3rem;
    color: #ff9f43;
    margin: 20px 0;
  }

  @keyframes fall {
    from { transform: translateY(0); }
    to { transform: translateY(300px); }
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
    50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
  }
</style>