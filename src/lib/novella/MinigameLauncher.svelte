<script lang="ts">
  import { gameComponents, getGameById } from '../minigames/gamesList';

  interface Props {
    gameId: string;
    onWin: () => void;
    onLose: () => void;
    rewardItem?: any;
    items?: any[];
    bucketName?: string;
  }

  let { gameId, onWin, onLose, rewardItem, items, bucketName = "dracula" }: Props = $props();

  const GameComponent = $derived(gameComponents[gameId] || null);
  const gameInfo = $derived(getGameById(gameId));

  function handleWin() {
    console.log('[MinigameLauncher] Game won!');
    onWin();
  }

  function handleLose() {
    console.log('[MinigameLauncher] Game lost!');
    onLose();
  }
</script>

<div class="minigame-container">
  {#if GameComponent}
    <svelte:component 
      this={GameComponent}
      onWin={handleWin}
      onLose={handleLose}
      integrated={true}
      rewardItem={rewardItem}
      items={items}
      bucketName={bucketName}
    />
  {:else}
    <div class="loading">
      <p>Игра не найдена: {gameId}</p>
      {#if gameInfo}
        <p class="game-name">{gameInfo.name}</p>
      {/if}
    </div>
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

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.5rem;
    color: #888;
  }
</style>
