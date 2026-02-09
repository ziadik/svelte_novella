<!-- src/components/game/DialogueCard.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { gameState, gameActions } from '../../stores/gameStore'
  import { currentStory } from '../../stores/storyStore'
  import type { Dialogue, Option } from '../../types'
  
  const { dialogue, onOptionSelect } = $props<{
    dialogue: Dialogue
    onOptionSelect?: (optionIndex: number) => void
  }>()
  
  // Состояния для анимаций
  let isVisible = $state(false)
  let textRevealed = $state('')
  let isTyping = $state(false)
  let currentTypingIndex = $state(0)
  
  // Состояния для опций
  let optionsVisible = $state(false)
  let selectedOptionIndex = $state<number | null>(null)
  
  // Настройки
  let typingSpeed = $state(30) // символов в секунду
  let autoPlaySpeed = $state(3000) // мс между авто-переходами
  let autoPlayEnabled = $state(false)
  
  let autoPlayTimer: NodeJS.Timeout | null = null
  
  // При монтировании начинаем анимацию появления
  onMount(() => {
    isVisible = true
    
    // Начинаем печатать текст
    startTypingAnimation()
    
    // Выполняем действия onEnter
    if (dialogue.onEnter) {
      gameActions.runActions(dialogue.onEnter)
    }
    
    // Восстанавливаем настройки из localStorage
    const settings = localStorage.getItem('dialogue_settings')
    if (settings) {
      const parsed = JSON.parse(settings)
      typingSpeed = parsed.typingSpeed || 30
      autoPlaySpeed = parsed.autoPlaySpeed || 3000
      autoPlayEnabled = parsed.autoPlayEnabled || false
    }
    
    // Если включен авто-плей и есть авто-переход, запускаем таймер
    if (autoPlayEnabled && dialogue.nextDialogueId) {
      startAutoPlay()
    }
  })
  
  onDestroy(() => {
    stopAutoPlay()
    stopTyping()
  })
  
  // Анимация печати текста
  let typingInterval: NodeJS.Timeout | null = null
  
  function startTypingAnimation() {
    if (typingInterval) clearInterval(typingInterval)
    
    textRevealed = ''
    currentTypingIndex = 0
    isTyping = true
    
    typingInterval = setInterval(() => {
      if (currentTypingIndex < dialogue.text.length) {
        textRevealed += dialogue.text[currentTypingIndex]
        currentTypingIndex++
      } else {
        stopTyping()
        showOptions()
      }
    }, 1000 / typingSpeed)
  }
  
  function stopTyping() {
    if (typingInterval) {
      clearInterval(typingInterval)
      typingInterval = null
    }
    isTyping = false
    
    // Показываем полный текст если печать завершена
    if (textRevealed.length < dialogue.text.length) {
      textRevealed = dialogue.text
    }
    
    showOptions()
  }
  
  function skipTyping() {
    if (isTyping) {
      stopTyping()
    }
  }
  
  // Показ опций
  function showOptions() {
    optionsVisible = true
    
    // Если есть авто-переход и нет опций, показываем кнопку продолжения
    if ((!dialogue.options || dialogue.options.length === 0) && dialogue.nextDialogueId) {
      setTimeout(() => {
        // Автоматический переход через кнопку "Продолжить"
      }, 1000)
    }
  }
  
  // Авто-плей
  function startAutoPlay() {
    if (autoPlayTimer) clearTimeout(autoPlayTimer)
    
    autoPlayTimer = setTimeout(() => {
      if (dialogue.nextDialogueId) {
        // Автоматический переход
        gameActions.goToDialogue(dialogue.nextDialogueId)
      }
    }, autoPlaySpeed)
  }
  
  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer)
      autoPlayTimer = null
    }
  }
  
  function toggleAutoPlay() {
    autoPlayEnabled = !autoPlayEnabled
    
    if (autoPlayEnabled && dialogue.nextDialogueId) {
      startAutoPlay()
    } else {
      stopAutoPlay()
    }
    
    saveSettings()
  }
  
  function changeTypingSpeed(speed: number) {
    typingSpeed = speed
    saveSettings()
  }
  
  function saveSettings() {
    localStorage.setItem('dialogue_settings', JSON.stringify({
      typingSpeed,
      autoPlaySpeed,
      autoPlayEnabled
    }))
  }
  
  // Обработка выбора опции
  function handleOptionClick(index: number) {
    if (!optionsVisible || isTyping) return
    
    const option = dialogue.options?.[index]
    if (!option || !option.enabled) return
    
    selectedOptionIndex = index
    
    // Выполняем действия опции
    if (option.actions) {
      gameActions.runActions(option.actions)
    }
    
    // Анимация выбора опции
    setTimeout(() => {
      onOptionSelect?.(index)
      selectedOptionIndex = null
    }, 500)
  }
  
  // Продолжить (для диалогов без опций)
  function handleContinue() {
    if (dialogue.nextDialogueId) {
      gameActions.goToDialogue(dialogue.nextDialogueId)
    }
  }
  
  // Проверка видимости опции
  function isOptionVisible(option: Option): boolean {
    if (!option.visible) return false
    
    // Проверяем условие видимости
    if (option.visibilityCondition) {
      const condition = option.visibilityCondition
      
      switch (condition.type) {
        case 'has_item':
          return condition.itemId 
            ? gameActions.hasItem(condition.itemId)
            : true
        
        case 'stat_greater':
          if (condition.statName && condition.statValue !== undefined) {
            const statValue = $gameState.player.stats[condition.statName] || 0
            return statValue > condition.statValue
          }
          return true
        
        case 'flag_true':
          return condition.flagName 
            ? $gameState.player.flags?.[condition.flagName] === true
            : true
        
        case 'always':
        default:
          return true
      }
    }
    
    return true
  }
  
  // Получить URL изображения персонажа
  function getCharacterImageUrl(): string | null {
    if (dialogue.characterImage && $currentStory) {
      return `${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${$currentStory.bucket}/${dialogue.characterImage}`
    }
    return null
  }
  
  // Получить стиль для фона
  function getBackgroundStyle() {
    if (dialogue.backgroundImage && $currentStory) {
      return `url(${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${$currentStory.bucket}/${dialogue.backgroundImage})`
    }
    return 'none'
  }
  
  // Проверяем, есть ли у опций условия
  function hasConditionalOptions(): boolean {
    return dialogue.options?.some(opt => opt.visibilityCondition) || false
  }
</script>

<div 
  class:visible={isVisible}
  class="dialogue-card"
  style="background-image: {getBackgroundStyle()};"
>
  <!-- Затемнение фона -->
  <div class="background-overlay"></div>
  
  <!-- Контейнер содержимого -->
  <div class="content-container">
    <!-- Изображение персонажа -->
    {#if getCharacterImageUrl()}
      <div class="character-container">
        <img 
          src={getCharacterImageUrl()!} 
          alt="Персонаж"
          class="character-image"
          class:visible={!isTyping}
        />
      </div>
    {/if}
    
    <!-- Текст диалога -->
    <div class="text-container">
      <!-- Заголовок (если есть ID персонажа) -->
      {#if dialogue.id && dialogue.id !== 'start'}
        <div class="dialogue-header">
          <span class="dialogue-id">{dialogue.id}</span>
          {#if dialogue.chapterId}
            <span class="chapter-badge">
              Глава {$gameState.storyData?.chapters?.find(c => c.id === dialogue.chapterId)?.title || dialogue.chapterId}
            </span>
          {/if}
        </div>
      {/if}
      
      <!-- Текст -->
      <div 
        class="dialogue-text"
        on:click={skipTyping}
        title={isTyping ? "Кликните для пропуска" : ""}
      >
        <p>{textRevealed}</p>
        
        <!-- Курсор печати -->
        {#if isTyping}
          <span class="typing-cursor">|</span>
        {/if}
      </div>
      
      <!-- Панель управления -->
      <div class="controls-panel">
        <!-- Кнопка пропуска -->
        {#if isTyping}
          <button 
            class="btn control-btn skip-btn"
            on:click={skipTyping}
            title="Пропустить печать (Пробел)"
          >
            ⏩ Пропустить
          </button>
        {/if}
        
        <!-- Скорость печати -->
        <div class="speed-controls">
          <span class="speed-label">Скорость:</span>
          <div class="speed-buttons">
            <button 
              class:active={typingSpeed === 10}
              class="btn speed-btn"
              on:click={() => changeTypingSpeed(10)}
            >
              Медленно
            </button>
            <button 
              class:active={typingSpeed === 30}
              class="btn speed-btn"
              on:click={() => changeTypingSpeed(30)}
            >
              Нормально
            </button>
            <button 
              class:active={typingSpeed === 60}
              class="btn speed-btn"
              on:click={() => changeTypingSpeed(60)}
            >
              Быстро
            </button>
          </div>
        </div>
        
        <!-- Авто-плей -->
        {#if dialogue.nextDialogueId}
          <button 
            class:active={autoPlayEnabled}
            class="btn control-btn autoplay-btn"
            on:click={toggleAutoPlay}
            title="Автоматическое продолжение"
          >
            {#if autoPlayEnabled}
              ⏸️ Авто-плей
            {:else}
              ▶️ Авто-плей
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Опции выбора -->
  <div 
    class:visible={optionsVisible}
    class="options-container"
  >
    {#if dialogue.options && dialogue.options.length > 0}
      <!-- Обычные опции -->
      <div class="options-list">
        {#each dialogue.options as option, index}
          {#if isOptionVisible(option)}
            <div 
              class:selected={selectedOptionIndex === index}
              class:disabled={!option.enabled}
              class="option-item"
              on:click={() => handleOptionClick(index)}
              title={!option.enabled ? 'Опция недоступна' : ''}
            >
              <!-- Иконка опции -->
              <div class="option-icon">
                {#if !option.enabled}
                  🔒
                {:else if option.visibilityCondition && option.visibilityCondition.type !== 'always'}
                  👁️
                {:else}
                  {index + 1}
                {/if}
              </div>
              
              <!-- Текст опции -->
              <div class="option-text">
                {option.text}
                
                <!-- Индикаторы условий -->
                {#if option.visibilityCondition && option.visibilityCondition.type !== 'always'}
                  <div class="condition-indicator">
                    {#if option.visibilityCondition.type === 'has_item'}
                      <span class="condition-icon">📦</span>
                      <span class="condition-text">
                        Требуется предмет
                      </span>
                    {:else if option.visibilityCondition.type === 'stat_greater'}
                      <span class="condition-icon">📊</span>
                      <span class="condition-text">
                        {option.visibilityCondition.statName} > {option.visibilityCondition.statValue}
                      </span>
                    {:else if option.visibilityCondition.type === 'flag_true'}
                      <span class="condition-icon">🚩</span>
                      <span class="condition-text">
                        Требуется флаг
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <!-- Стрелка выбора -->
              <div class="option-arrow">→</div>
            </div>
          {/if}
        {/each}
      </div>
      
    {:else if dialogue.nextDialogueId}
      <!-- Кнопка продолжения (когда нет опций) -->
      <div class="continue-container">
        <button 
          class="btn continue-btn"
          on:click={handleContinue}
        >
          Продолжить →
        </button>
      </div>
    {:else}
      <!-- Конец ветки -->
      <div class="end-container">
        <div class="end-icon">🏁</div>
        <div class="end-text">Конец этой ветки диалога</div>
        <button 
          class="btn"
          on:click={() => gameActions.goToDialogue('start')}
        >
          Вернуться к началу
        </button>
      </div>
    {/if}
  </div>
  
  <!-- Индикатор прогресса (если есть опции с условиями) -->
  {#if hasConditionalOptions()}
    <div class="conditions-indicator">
      <span class="indicator-icon">👁️</span>
      <span class="indicator-text">Некоторые опции могут быть скрыты</span>
    </div>
  {/if}
  
  <!-- Индикатор опций (внизу экрана) -->
  <div class="options-indicator">
    {#if optionsVisible && dialogue.options && dialogue.options.length > 0}
      <div class="indicator-text">
        Выберите вариант ответа {#each Array(dialogue.options.length).fill(0) as _, i}({i + 1}){/each}
      </div>
    {:else if optionsVisible && dialogue.nextDialogueId}
      <div class="indicator-text">
        Нажмите "Продолжить" или подождите {autoPlaySpeed / 1000} сек.
      </div>
    {/if}
  </div>
</div>

<style>
  .dialogue-card {
    position: relative;
    width: 100%;
    max-width: 800px;
    background-color: rgba(30, 30, 40, 0.9);
    background-size: cover;
    background-position: center;
    border-radius: 20px;
    overflow: hidden;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.5),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    margin: 0 auto;
    min-height: 500px;
    display: flex;
    flex-direction: column;
  }
  
  .dialogue-card.visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  .background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.6),
      rgba(0, 0, 0, 0.4) 20%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.4) 80%,
      rgba(0, 0, 0, 0.6)
    );
    z-index: 1;
  }
  
  .content-container {
    position: relative;
    z-index: 2;
    flex: 1;
    display: flex;
    padding: 30px;
    gap: 30px;
    min-height: 0;
  }
  
  /* Изображение персонажа */
  .character-container {
    flex: 0 0 250px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  
  .character-image {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
    opacity: 0;
    transform: translateX(-20px);
    transition: all 0.6s ease-out;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
  }
  
  .character-image.visible {
    opacity: 1;
    transform: translateX(0);
  }
  
  /* Контейнер текста */
  .text-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }
  
  .dialogue-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dialogue-id {
    background: rgba(0, 122, 204, 0.2);
    color: #4db6ac;
    padding: 6px 12px;
    border-radius: 12px;
    font-family: monospace;
    font-weight: bold;
    font-size: 14px;
    border: 1px solid rgba(0, 122, 204, 0.3);
  }
  
  .chapter-badge {
    background: rgba(156, 39, 176, 0.2);
    color: #ba68c8;
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid rgba(156, 39, 176, 0.3);
  }
  
  .dialogue-text {
    flex: 1;
    font-size: 20px;
    line-height: 1.6;
    color: white;
    margin-bottom: 30px;
    position: relative;
    cursor: pointer;
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-height: 200px;
    display: flex;
    align-items: center;
  }
  
  .dialogue-text p {
    margin: 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  .typing-cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: white;
    margin-left: 4px;
    animation: blink 1s infinite;
    vertical-align: middle;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  /* Панель управления */
  .controls-panel {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 15px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    flex-wrap: wrap;
  }
  
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  
  .btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn.active {
    background: rgba(0, 122, 204, 0.3);
    border: 1px solid rgba(0, 122, 204, 0.5);
  }
  
  .control-btn {
    padding: 12px 24px;
    font-size: 15px;
  }
  
  .speed-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .speed-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
  }
  
  .speed-buttons {
    display: flex;
    gap: 8px;
  }
  
  .speed-btn {
    padding: 8px 16px;
    font-size: 13px;
  }
  
  .autoplay-btn {
    margin-left: auto;
  }
  
  /* Контейнер опций */
  .options-container {
    position: relative;
    z-index: 3;
    padding: 30px;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.9),
      rgba(0, 0, 0, 0.7)
    );
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;
  }
  
  .options-container.visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Список опций */
  .options-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
  }
  
  .option-item {
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid transparent;
    border-radius: 15px;
    padding: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 15px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .option-item:hover:not(.disabled):not(.selected) {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .option-item.selected {
    background: linear-gradient(135deg, 
      rgba(0, 122, 204, 0.3), 
      rgba(0, 122, 204, 0.15)
    );
    border-color: rgba(0, 122, 204, 0.5);
    box-shadow: 
      0 8px 25px rgba(0, 122, 204, 0.3),
      inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    transform: scale(1.02);
  }
  
  .option-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .option-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-weight: bold;
    font-size: 16px;
    flex-shrink: 0;
  }
  
  .option-item.selected .option-icon {
    background: rgba(0, 122, 204, 0.3);
  }
  
  .option-text {
    flex: 1;
    font-size: 16px;
    color: white;
    line-height: 1.4;
    min-width: 0;
  }
  
  .condition-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .condition-icon {
    font-size: 14px;
  }
  
  .option-arrow {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.3);
    transition: all 0.3s;
  }
  
  .option-item:hover:not(.disabled) .option-arrow {
    color: white;
    transform: translateX(5px);
  }
  
  .option-item.selected .option-arrow {
    color: #4db6ac;
    transform: translateX(10px);
  }
  
  /* Контейнер продолжения */
  .continue-container {
    text-align: center;
    padding: 30px;
  }
  
  .continue-btn {
    padding: 20px 50px;
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    transition: all 0.3s;
  }
  
  .continue-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.6);
  }
  
  /* Контейнер конца ветки */
  .end-container {
    text-align: center;
    padding: 40px;
  }
  
  .end-icon {
    font-size: 60px;
    margin-bottom: 20px;
    opacity: 0.8;
  }
  
  .end-text {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 30px;
  }
  
  /* Индикаторы */
  .conditions-indicator {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 193, 7, 0.15);
    color: #ffc107;
    padding: 8px 15px;
    border-radius: 20px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(255, 193, 7, 0.3);
    backdrop-filter: blur(5px);
    z-index: 4;
  }
  
  .options-indicator {
    position: absolute;
    bottom: 15px;
    left: 0;
    right: 0;
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    z-index: 4;
    pointer-events: none;
  }
  
  .indicator-text {
    background: rgba(0, 0, 0, 0.5);
    padding: 8px 20px;
    border-radius: 20px;
    display: inline-block;
    backdrop-filter: blur(5px);
  }
  
  /* Адаптивность */
  @media (max-width: 768px) {
    .content-container {
      flex-direction: column;
      padding: 20px;
      gap: 20px;
    }
    
    .character-container {
      flex: 0 0 auto;
      max-height: 200px;
    }
    
    .character-image {
      max-height: 180px;
    }
    
    .dialogue-text {
      font-size: 18px;
      padding: 15px;
      min-height: 150px;
    }
    
    .options-container {
      padding: 20px;
    }
    
    .options-list {
      grid-template-columns: 1fr;
    }
    
    .option-item {
      padding: 15px;
    }
    
    .controls-panel {
      flex-direction: column;
      align-items: stretch;
      gap: 15px;
    }
    
    .autoplay-btn {
      margin-left: 0;
    }
    
    .speed-controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .speed-buttons {
      justify-content: center;
    }
  }
  
  @media (max-width: 480px) {
    .dialogue-card {
      border-radius: 0;
      margin: -10px;
      min-height: 100vh;
    }
    
    .dialogue-text {
      font-size: 16px;
    }
    
    .control-btn {
      padding: 10px 15px;
      font-size: 14px;
    }
    
    .continue-btn {
      padding: 15px 30px;
      font-size: 16px;
    }
  }
</style>