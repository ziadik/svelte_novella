<script lang="ts">
  import { gamesList, categoryNames, type GameInfo } from './gamesList';
  import { userKeyStore } from '../store/userKeyStore';
  import MemoMonsters from './MemoMonsters.svelte';
  import OnetMonsters144 from './OnetMonsters144.svelte';
  import OnetMonsters from './OnetMonsters.svelte';
  import Evolution2048 from './Evolution2048.svelte';
  import WhisperOfSpiders from './WhisperOfSpiders.svelte';
  import TowerOfSouls from './TowerOfSouls.svelte';
  import SoulCycle from './SoulCycle.svelte';
  import LabyrinthOfMinotaur from './LabyrinthOfMinotaur.svelte';
  import CursedCrypts from './CursedCrypts.svelte';
  import BrokenMirror from './BrokenMirror.svelte';
  import AlchemistsCross from './AlchemistsCross.svelte';
  import LightOut from './LightOut.svelte';
  import FloodIt from './FloodIt.svelte';
  import Bones421 from './Bones421.svelte';
  import CrystalsOfTime from './CrystalsOfTime.svelte';
  import RunesOfFate from './RunesOfFate.svelte';
  import WitchesCauldrons from './WitchesCauldrons.svelte';
  import AlchemicalCalculator from './AlchemicalCalculator.svelte';
  
  const gameComponents: Record<string, any> = {
    'memo-monsters': MemoMonsters,
    'onet-monsters': OnetMonsters,
    'onet-monsters-144': OnetMonsters144,
    'evolution-2048': Evolution2048,
    'whisper-of-spiders': WhisperOfSpiders,
    'tower-of-souls': TowerOfSouls,
    'soul-cycle': SoulCycle,
    'labyrinth-of-minotaur': LabyrinthOfMinotaur,
    'cursed-crypts': CursedCrypts,
    'broken-mirror': BrokenMirror,
    'alchemists-cross': AlchemistsCross,
    'light-out': LightOut,
    'flood-it': FloodIt,
    'bones-421': Bones421,
    'crystals-of-time': CrystalsOfTime,
    'runes-of-fate': RunesOfFate,
    'witches-cauldrons': WitchesCauldrons,
    'alchemical-calculator': AlchemicalCalculator,
  };

  let { onBack, onSelectGame }: { 
    onBack: () => void; 
    onSelectGame: (game: GameInfo) => void 
  } = $props();

  let selectedCategory = $state<GameInfo['category'] | 'all'>('all');
  let activeGame = $state<GameInfo | null>(null);

  const filteredGames = $derived(
    selectedCategory === 'all' 
      ? gamesList 
      : gamesList.filter(g => g.category === selectedCategory)
  );

  const categories: Array<GameInfo['category'] | 'all'> = ['all', 'puzzle', 'memory', 'logic', 'arcade', 'board'];

  function handleGameClick(game: GameInfo) {
    // Аналитика: запуск игры из списка
    userKeyStore.trackGameStart(game.id, game.name);
    activeGame = game;
  }

  function handleGameBack() {
    activeGame = null;
  }

  async function handleGameEnd() {
    if (activeGame) {
      // Аналитика: игра завершена (по умолчанию считаем как "не победила" для свободного режима)
      // В свободном режиме нет четкого результата, поэтому записываем как game_start для завершения сессии игры
      await userKeyStore.trackEvent('session_time', {
        game_id: activeGame.id,
        game_title: activeGame.name,
      });
    }
    activeGame = null;
  }

  const ActiveGameComponent = $derived(activeGame ? gameComponents[activeGame.id] : null);
</script>

{#if activeGame && ActiveGameComponent}
  <div class="game-container">
    <button type="button" class="back-btn" onclick={handleGameBack}>
      ← К списку игр
    </button>
    <svelte:component 
      this={ActiveGameComponent} 
      integrated={false}
      onWin={() => {
        if (activeGame) {
          userKeyStore.trackGameResult(activeGame.id, activeGame.name, true);
        }
        handleGameEnd();
      }}
      onLose={() => {
        if (activeGame) {
          userKeyStore.trackGameResult(activeGame.id, activeGame.name, false);
        }
        handleGameEnd();
      }}
      rewardItem={null}
      items={[]}
      bucketName="dracula"
    />
  </div>
{:else}
  <div class="all-games">
    <div class="header">
      <button type="button" class="back-btn" onclick={onBack}>
        ← Назад
      </button>
      <h1>🎮 Мини-игры</h1>
      <p>Выберите игру для прохождения</p>
    </div>

    <div class="categories">
      {#each categories as cat}
        <button
          type="button"
          class="category-btn"
          class:active={selectedCategory === cat}
          onclick={() => selectedCategory = cat}
        >
          {cat === 'all' ? 'Все' : categoryNames[cat]}
        </button>
      {/each}
    </div>

    <div class="games-scroll">
      <div class="games-grid">
        {#each filteredGames as game (game.id)}
          <button
            type="button"
            class="game-card"
            onclick={() => handleGameClick(game)}
          >
            <div class="game-icon">{game.icon}</div>
            <div class="game-info">
              <h3 class="game-name">{game.name}</h3>
              <p class="game-description">{game.description}</p>
            </div>
            <div class="game-arrow">→</div>
          </button>
        {/each}
      </div>
    </div>

    {#if filteredGames.length === 0}
      <div class="empty">
        <p>Игр в этой категории пока нет</p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .all-games {
    min-height: 100vh;
    padding: 6px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: white;
    font-family: sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 10px;
  }

  .header h1 {
    font-size: 18px;
    margin: 5px 0 5px;
    background: linear-gradient(90deg, #e94560, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header p {
    font-size: 14px;
    color: #aaa;
    margin: 0;
  }

  .back-btn {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .back-btn:hover {
    background: rgba(233, 69, 96, 0.3);
    border-color: #e94560;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-bottom: 16px;
  }

  .games-scroll {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    padding-bottom: 20px;
    scrollbar-width: thin;
    scrollbar-color: #e94560 rgba(255, 255, 255, 0.1);
  }

  .games-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .games-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  .games-scroll::-webkit-scrollbar-thumb {
    background: #e94560;
    border-radius: 3px;
  }

  .games-scroll::-webkit-scrollbar-thumb:hover {
    background: #ff6b6b;
  }

  .category-btn {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    color: #aaa;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .category-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .category-btn.active {
    background: #e94560;
    border-color: #e94560;
    color: white;
  }

  .games-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 500px;
    margin: 0 auto;
  }

  .game-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
    color: inherit;
  }

  .game-card:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #e94560;
    transform: translateX(4px);
  }

  .game-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .game-info {
    flex: 1;
  }

  .game-name {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px;
    color: #fff;
  }

  .game-description {
    font-size: 12px;
    color: #888;
    margin: 0;
    line-height: 1.3;
  }

  .game-arrow {
    font-size: 18px;
    color: #e94560;
    opacity: 0;
    transition: all 0.2s ease;
  }

  .game-card:hover .game-arrow {
    opacity: 1;
    transform: translateX(4px);
  }

  .empty {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .game-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    z-index: 100;
    padding: 16px;
    box-sizing: border-box;
  }

  .game-container .back-btn {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 101;
  }

  @media (max-width: 600px) {
    .header h1 {
      font-size: 12px;
    }

    .games-grid {
      gap: 10px;
    }

    .game-card {
      padding: 12px;
    }

    .game-icon {
      font-size: 24px;
    }

    .game-name {
      font-size: 14px;
    }
  }
</style>
