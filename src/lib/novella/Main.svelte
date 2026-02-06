<script lang="ts">
  import { onMount } from "svelte";
  import DialogueCard from "./DialogueCard.svelte";
  import { gameState } from "../store/gameStore.svelte";
  import { bucketName, supabaseUrlFile, storyName } from "../store/store.svelte";

  // Ссылка на JSON
  let dialogLink = `${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${storyName}`;

  onMount(async () => {
    console.log("Загружаем историю из:", dialogLink); // Для отладки
    await gameState.loadStory(dialogLink);
  });
</script>

<div class="app">
  {#if gameState.isLoading}
    <div class="loading">
      <p>🔄 Загрузка истории...</p>
    </div>
  {:else if gameState.error}
    <div class="error">
      ⚠️ {gameState.error}
    </div>
  {:else}
    <div class="dialogues-container">
      {#if gameState.storyData}
        <DialogueCard />
      {/if}
    </div>
  {/if}
</div>

<style>
  .app {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #1a1a1a;
    color: white;
    padding: 20px;
    font-family: sans-serif;
  }
  .loading, .error {
    text-align: center;
  }
  .dialogues-container {
    width: 100%;
    max-width: 500px;
  }
</style>