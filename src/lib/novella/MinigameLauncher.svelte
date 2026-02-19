<script lang="ts">
  import OnetMonsters from '../minigames/OnetMonsters.svelte';

  interface Props {
    gameId: string;
    onWin: () => void;
    onLose: () => void;
    rewardItem?: any;
    items?: any[];
  }

  let { gameId, onWin, onLose, rewardItem, items }: Props = $props();

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
  {#if gameId === 'onet_monsters'}
    <OnetMonsters
      onWin={handleWin}
      onLose={handleLose}
      integrated={true}
      rewardItem={rewardItem}
      items={items}
      bucketName="minigames"
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

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.5rem;
    color: #888;
  }
</style>
