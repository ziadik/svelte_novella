<script lang="ts">
  import { onMount } from 'svelte';
  import OnetMonsters from '../minigames/OnetMonsters.svelte';

  interface Props {
    gameId: string;
    onWin: () => void;
    onLose: () => void;
  }

  let { gameId, onWin, onLose }: Props = $props();

  let activeComponent: any = $state(null);
  let container: HTMLElement;

  onMount(() => {
    loadGame();
  });

  function loadGame() {
    console.log(gameId);
    switch (gameId) {
      case 'onet_monsters':
        activeComponent = OnetMonsters;
        break;
      default:
        console.error(`Unknown game ID: ${gameId}`);
        onLose();
    }
  }

  function handleWin() {
    console.log('[MinigameLauncher] Game won!');
    onWin();
  }

  function handleLose() {
    console.log('[MinigameLauncher] Game lost!');
    onLose();
  }

  function handleExit() {
    // Выход из игры без результата (например, нажали "назад")
    onLose();
  }
</script>

<div class="minigame-container" bind:this={container}>
  <!-- Кнопка выхода -->
  <button class="exit-btn" onclick={handleExit}>✕ Выйти из игры</button>

  <!-- Загрузка игры -->
  {#if activeComponent}
    <svelte:component 
      this={activeComponent} 
      onwin={handleWin}
      onlose={handleLose}
    />
  {:else}
    <div class="loading">Загрузка игры...</div>
  {/if}
</div>

<style>
  .minigame-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #120f1a;
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  .exit-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 8px 16px;
    background: rgba(233, 69, 96, 0.9);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
    z-index: 1001;
    transition: transform 0.2s, background 0.2s;
  }

  .exit-btn:hover {
    transform: scale(1.05);
    background: rgba(233, 69, 96, 1);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.5rem;
    color: #888;
  }
</style>
