<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gameState } from "../store/gameStore.svelte";
  import Rive from "./Rive.svelte";
  import MinigameLauncher from "./MinigameLauncher.svelte";
  import { bucketName as defaultBucketName, supabaseUrlFile } from "../store/store.svelte";

  let { index, dialogue: propDialogue, bucketName = defaultBucketName }: { index?: number; dialogue?: any; bucketName?: string } = $props(); // bucketName может быть передан из редактора
console.log(bucketName);
// Если пропс dialogue не передан, берем из стора (режим игры)
const currentDialogue = $derived(propDialogue || gameState.findDialogue(gameState.currentDialogueId));

  // Состояние мини-игры
  let activeMinigame = $state<{
    gameId: string;
    onWinDialogueId: string;
    onLoseDialogueId: string;
    rewardItem?: string;
  } | null>(null);

  // Обработка входа в диалог (выполнение actions)
  $effect(() => {
    // currentDialogue здесь уже является реактивным значением
    if (currentDialogue?.onEnter) {
      gameState.runActions(currentDialogue.onEnter);
    }
  });

  function handleNext() {
    // Если есть обычный переход
    if (currentDialogue?.nextDialogueId) {
      gameState.goToDialogue(currentDialogue.nextDialogueId);
    }
  }

  function handleOptionSelect(option: any) {
    // Выполняем действия при выборе
    if (option.actions) {
      gameState.runActions(option.actions);
    }

    // Если это запуск мини-игры
    if (option.miniGame) {
      console.log("Запуск мини-игры:", option.miniGame.id);
      activeMinigame = {
        gameId: option.miniGame.id,
        onWinDialogueId: option.miniGame.onWinDialogueId,
        onLoseDialogueId: option.miniGame.onLoseDialogueId,
        rewardItem: option.miniGame.rewardItem
      };
      return;
    }

    // Обычный переход
    if (option.nextDialogueId) {
      gameState.goToDialogue(option.nextDialogueId);
    }
  }

  function handleMinigameWin() {
    console.log('[DialogueCard] Mini-game won!');
    if (activeMinigame?.rewardItem) {
      gameState.addItem(activeMinigame.rewardItem);
    }
    if (activeMinigame?.onWinDialogueId) {
      gameState.goToDialogue(activeMinigame.onWinDialogueId);
    }
    activeMinigame = null;
  }

  function handleMinigameLose() {
    console.log('[DialogueCard] Mini-game lost!');
    if (activeMinigame?.onLoseDialogueId) {
      gameState.goToDialogue(activeMinigame.onLoseDialogueId);
    }
    activeMinigame = null;
  }

  // Вспомогательная функция проверки условий
  function isOptionVisible(option: any): boolean {
    // Проверка visible флага
    if (option.visible === false) return false;

    // Проверка условий видимости
    return gameState.checkVisibilityCondition(option);
  }

  // Проверка enabled флага
  function isOptionEnabled(option: any): boolean {
    return option.enabled !== false;
  }
</script>

{#if currentDialogue}
  <div class="dialogue-container">
    <!-- Мини-игра (показывается поверх диалога) -->
    {#if activeMinigame}
      <MinigameLauncher
        gameId={activeMinigame.gameId}
        onWin={handleMinigameWin}
        onLose={handleMinigameLose}
        rewardItem={activeMinigame.rewardItem}
        items={gameState.storyData?.items}
        bucketName={bucketName} 
      />
    {/if}
    <!-- Фон -->
    {#if currentDialogue.backgroundImage}
      <div class="background-media">
        {#if currentDialogue.backgroundImage.endsWith(".riv")}
          {#key currentDialogue.backgroundImage}
            <Rive fileName={currentDialogue.backgroundImage} {bucketName} />
          {/key}
        {:else}
          <img 
            src={`${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${currentDialogue.backgroundImage}`} 
            alt="BG" 
            class="background-image" 
          />
        {/if}
      </div>
    {/if}

    <!-- Персонаж -->
    {#if currentDialogue.characterImage}
      <div class="character-media">
        {#if currentDialogue.characterImage.endsWith(".riv")}
          {#key currentDialogue.characterImage}
            <Rive fileName={currentDialogue.characterImage} {bucketName} />
          {/key}
        {:else}
           <img 
            src={`${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${currentDialogue.characterImage}`} 
            alt="Char" 
            class="character-image" 
          />
        {/if}
      </div>
    {/if}

    <!-- Контент -->
    <div class="dialogue-content">
      <div class="dialogue-text">
        {currentDialogue.text}
      </div>

      <!-- Опции -->
      {#if currentDialogue.options && currentDialogue.options.length > 0}
        <div class="options-container">
          {#each currentDialogue.options as option (option.text)}
            {#if isOptionVisible(option)}
              <button 
                class="option-button" 
                class:disabled={!isOptionEnabled(option)}
                onclick={() => handleOptionSelect(option)}
                disabled={!isOptionEnabled(option)}
              >
                {option.text}
              </button>
            {/if}
          {/each}
        </div>
      {:else if currentDialogue.nextDialogueId}
        <!-- Кнопка "Далее", если нет опций -->
        <div class="next-container">
           <button class="next-button" onclick={handleNext}>Далее...</button>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <p>Диалог не найден (ID: {gameState.currentDialogueId})</p>
{/if}

<style>
  .dialogue-container {
    position: relative;
    width: 100%;
    height: 600px; /* Фиксированная высота для примера */
    border-radius: 16px;
    overflow: hidden;
    background: #2a2a2a;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  .background-media {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: 1;
  }
  .background-image {
    width: 100%; height: 100%; object-fit: cover; opacity: 0.6;
  }

  .character-media {
    position: absolute;
    bottom: 0; left: 50%; transform: translateX(-50%);
    z-index: 2;
    max-height: 90%;
    display: flex; align-items: flex-end; justify-content: center;
  }
  .character-image {
    max-height: 100%; object-fit: contain;
  }

  .dialogue-content {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    z-index: 3;
    background: linear-gradient(rgba(29, 43, 56, 1), rgba(0,0,0,0.65));

    padding: 5px;
    min-height: 150px;
    box-sizing: border-box;
  }

  .dialogue-text {
    font-size: 18px;
    color: #fff;
    margin-bottom: 20px;
    line-height: 1.5;
    font-style: italic;
  }

  .options-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .option-button, .next-button {
    background: rgba(139, 0, 0, 0.7);
    color: white;
    border: 1px solid rgba(255,255,255,0.2);
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: 0.2s;
    text-align: left;
  }
  
  .option-button:hover, .next-button:hover {
    background: rgba(200, 0, 0, 0.8);
  }

  .option-button.disabled {
    background: rgba(100, 100, 100, 0.5);
    opacity: 0.6;
    cursor: not-allowed;
  }

  .option-button.disabled:hover {
    background: rgba(100, 100, 100, 0.5);
  }

  .next-container {
    text-align: right;
  }
</style>