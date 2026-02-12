<!-- src/components/game/GameView.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import DialogueCard from './DialogueCard.svelte'
  import RivePlayer from './RivePlayer.svelte'
  import InventoryPanel from './InventoryPanel.svelte'
  import StatsPanel from './StatsPanel.svelte'
  import SaveLoadModal from './SaveLoadModal.svelte'
  import SettingsModal from './SettingsModal.svelte'
  
  import { currentStory } from '../../stores/storyStore.svelte'
  import { gameState, gameActions, currentDialogue } from '../../stores/gameStore.svelte'
  import type { GameSession } from '../../types'
  
  const { onback } = $props<{
    onback?: () => void
  }>()

  // Показывать ли инвентарь и статистику
  let showInventory = $state(false)
  let showStats = $state(false)
  
  // Модальные окна
  let showSaveModal = $state(false)
  let showLoadModal = $state(false)
  let showSettings = $state(false)
  
  // Состояния UI
  let isFullscreen = $state(false)
  let isMuted = $state(false)
  let currentVolume = $state(0.7)
  
  // Эффекты при монтировании
  onMount(async () => {
    const story = currentStory()
    if (story) {
      await gameActions.loadStory(story.bucket, story.defaultFile)
      
      // Восстанавливаем последнюю сессию
      const savedSession = localStorage.getItem(`game_session_${story.id}`)
      if (savedSession) {
        const session = JSON.parse(savedSession) as GameSession
        gameActions.loadSession(session)
      }
      
      // Запускаем автосохранение
      startAutoSave()
      
      // Настраиваем обработчики клавиш
      setupKeyboardShortcuts()
    }
    
    // Восстанавливаем настройки
    const savedSettings = localStorage.getItem('game_settings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      isMuted = settings.isMuted || false
      currentVolume = settings.volume || 0.7
    }
  })
  
  onDestroy(() => {
    // Сохраняем перед выходом
    saveCurrentSession()
    
    // Очищаем таймеры
    stopAutoSave()
  })
  
  // Автосохранение
  let autoSaveInterval: NodeJS.Timeout | null = null
  
  function startAutoSave() {
    autoSaveInterval = setInterval(() => {
      saveCurrentSession()
    }, 60000) // Каждую минуту
  }
  
  function stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval)
      autoSaveInterval = null
    }
  }
  
  // Сохранение текущей сессии
  function saveCurrentSession() {
    const story = currentStory()
    if (story && gameState.storyData) {
      const session: GameSession = {
        id: `session_${Date.now()}`,
        storyId: story.id,
        playerState: gameState.player,
        createdAt: new Date(),
        lastPlayed: new Date(),
        currentDialogueId: gameState.currentDialogueId
      }
      
      localStorage.setItem(`game_session_${story.id}`, JSON.stringify(session))
      localStorage.setItem(`last_session_${story.id}`, JSON.stringify(session))
    }
  }
  
  // Горячие клавиши
  function setupKeyboardShortcuts() {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем, если в фокусе инпут
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      switch (e.key.toLowerCase()) {
        case 'i':
          if (!e.ctrlKey) {
            showInventory = !showInventory
            e.preventDefault()
          }
          break
        
        case 's':
          if (e.ctrlKey) {
            showSaveModal = true
            e.preventDefault()
          }
          break
        
        case 'l':
          if (e.ctrlKey) {
            showLoadModal = true
            e.preventDefault()
          }
          break
        
        case 'f11':
          toggleFullscreen()
          e.preventDefault()
          break
        
        case 'escape':
          if (showInventory) showInventory = false
          if (showStats) showStats = false
          break
        
        case ' ':
          // Пропуск диалога/автоматическое продолжение
          const dialog = currentDialogue()
          if (dialog?.nextDialogueId) {
            gameActions.goToDialogue(dialog.nextDialogueId)
            e.preventDefault()
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => window.removeEventListener('keydown', handleKeyDown)
  }
  
  // Полноэкранный режим
  function toggleFullscreen() {
    if (!isFullscreen) {
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        elem.requestFullscreen()
      }
      isFullscreen = true
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      isFullscreen = false
    }
  }
  
  // Переключение звука
  function toggleMute() {
    isMuted = !isMuted
    saveSettings()
  }
  
  // Изменение громкости
  function changeVolume(value: number) {
    currentVolume = value
    if (currentVolume > 0) {
      isMuted = false
    }
    saveSettings()
  }
  
  // Сохранение настроек
  function saveSettings() {
    localStorage.setItem('game_settings', JSON.stringify({
      isMuted,
      volume: currentVolume
    }))
  }
  
  // Обработчик выбора опции
  function handleOptionSelect(optionIndex: number) {
    const dialog = currentDialogue()
    if (!dialog?.options?.[optionIndex]) return

    const option = dialog.options[optionIndex]
    
    // Выполняем действия опции
    if (option.actions) {
      gameActions.runActions(option.actions)
    }
    
    // Переходим к следующему диалогу
    if (option.nextDialogueId) {
      gameActions.goToDialogue(option.nextDialogueId)
    }
    
    // Сохраняем после выбора
    saveCurrentSession()
  }
  
  // Быстрое сохранение
  function quickSave() {
    const story = currentStory()
    if (!story) return

    const session: GameSession = {
      id: `quicksave_${Date.now()}`,
      storyId: story.id,
      playerState: gameState.player,
      createdAt: new Date(),
      lastPlayed: new Date(),
      currentDialogueId: gameState.currentDialogueId,
      isQuickSave: true
    }
    
    localStorage.setItem('quicksave', JSON.stringify(session))
    
    // Показываем уведомление
    showNotification('Игра сохранена!')
  }
  
  // Быстрая загрузка
  function quickLoad() {
    const saved = localStorage.getItem('quicksave')
    if (saved) {
      const session = JSON.parse(saved) as GameSession
      gameActions.loadSession(session)
      showNotification('Игра загружена!')
    }
  }
  
  // Уведомления
  let notificationText = $state('')
  let notificationVisible = $state(false)
  
  function showNotification(text: string, duration: number = 2000) {
    notificationText = text
    notificationVisible = true
    
    setTimeout(() => {
      notificationVisible = false
    }, duration)
  }
  
  // Получить текущий фон
  function getBackgroundImage() {
    const dialog = currentDialogue()
    const story = currentStory()
    if (dialog?.backgroundImage && story) {
      return `url(${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${story.bucket}/${dialog.backgroundImage})`
    }
    return 'none'
  }
  
  // Получить текущий Rive файл
  function getCurrentRiveFile() {
    const dialog = currentDialogue()
    return dialog?.stateMachineCharacterRive || dialog?.smTriggerBackgroundRive
  }
</script>

<!-- Основной контейнер игры -->
<div 
  class="game-view" 
  class:fullscreen={isFullscreen}
  style="background-image: {getBackgroundImage()};"
>
  <!-- Rive анимация (фон или персонаж) -->
  {#if getCurrentRiveFile()}
    <div class="rive-container">
      <RivePlayer 
        fileName={getCurrentRiveFile()!}
        bucket={currentStory?.bucket || ''}
        autoplay={true}
        class="rive-animation"
      />
    </div>
  {/if}
  
  <!-- Верхняя панель инструментов -->
  <div class="game-toolbar">
    <div class="toolbar-left">
      <!-- Кнопка назад -->
      <button 
        class="btn-icon back-btn"
        onclick={onback}
        title="Назад к выбору истории"
      >
        ←
      </button>
      
      <!-- Кнопка меню -->
      <button 
        class="btn-icon menu-btn"
        onclick={() => showSettings = true}
        title="Меню"
      >
        ☰
      </button>

      <!-- Название истории -->
      <div class="story-title">
        {currentStory()?.name || 'История не выбрана'}
      </div>
    </div>
    
    <div class="toolbar-center">
      <!-- Прогресс -->
      <div class="progress-info">
        {#if gameState.storyData}
          <span class="progress-text">
            Диалог {gameState.currentDialogueId} / {gameState.storyData.dialogues.length}
          </span>
        {/if}
      </div>
    </div>
    
    <div class="toolbar-right">
      <!-- Быстрое сохранение/загрузка -->
      <div class="quick-actions">
        <button 
          class="btn-icon quick-save"
          onclick={quickSave}
          title="Быстрое сохранение (Ctrl+S)"
          disabled={!currentStory()}
        >
          💾
        </button>
        <button 
          class="btn-icon quick-load"
          onclick={quickLoad}
          title="Быстрая загрузка (Ctrl+L)"
          disabled={!localStorage.getItem('quicksave')}
        >
          📂
        </button>
      </div>
      
      <!-- Звук -->
      <div class="audio-controls">
        <button 
          class="btn-icon volume-btn"
          onclick={toggleMute}
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {#if isMuted}
            🔇
          {:else if currentVolume > 0.5}
            🔊
          {:else if currentVolume > 0}
            🔉
          {:else}
            🔈
          {/if}
        </button>
        
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={currentVolume}
          oninput={(e) => changeVolume(parseFloat((e.target as HTMLInputElement).value))}
          class="volume-slider"
          title="Громкость"
        />
      </div>
      
      <!-- Полноэкранный режим -->
      <button 
        class="btn-icon fullscreen-btn"
        onclick={toggleFullscreen}
        title={isFullscreen ? 'Выйти из полноэкранного режима (F11)' : 'Полноэкранный режим (F11)'}
      >
        {#if isFullscreen}
          📉
        {:else}
          📈
        {/if}
      </button>
    </div>
  </div>
  
  <!-- Основной игровой контент -->
  <div class="game-content">
    <!-- Левая панель: Инвентарь -->
    {#if showInventory}
      <div class="inventory-panel">
        <InventoryPanel />
      </div>
    {/if}
    
    <!-- Центральная часть: Диалоги -->
    <div class="dialogue-container">
      {#if gameState.isLoading}
        <div class="loading-screen">
          <div class="loading-spinner"></div>
          <p>Загрузка истории...</p>
        </div>
      
      {:else if gameState.error}
        <div class="error-screen">
          <div class="error-icon">⚠️</div>
          <h3>Ошибка загрузки</h3>
          <p>{gameState.error}</p>
          <button 
            class="btn primary"
            onclick={() => location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      
      {:else if gameState.storyData && currentDialogue}
        <DialogueCard 
          dialogue={currentDialogue!}
          on:option-select={handleOptionSelect}
        />
      {/if}
    </div>
    
    <!-- Правая панель: Статистика -->
    {#if showStats}
      <div class="stats-panel">
        <StatsPanel />
      </div>
    {/if}
  </div>
  
  <!-- Нижняя панель навигации -->
  <div class="game-navigation">
    <div class="nav-left">
      <button 
        class="btn nav-btn"
        onclick={() => showInventory = !showInventory}
        title="Инвентарь (I)"
        class:active={showInventory}
      >
        🎒 Инвентарь
      </button>
      
      <button 
        class="btn nav-btn"
        onclick={() => showStats = !showStats}
        title="Характеристики"
        class:active={showStats}
      >
        📊 Статистика
      </button>
    </div>
    
    <div class="nav-center">
      <!-- Номер текущего диалога -->
      <div class="current-dialogue-info">
        {#if currentDialogue()}
          <span class="dialogue-id">#{currentDialogue()!.id}</span>
          {#if currentDialogue()!.chapterId}
            <span class="chapter-badge">
              Глава {gameState.storyData?.chapters?.find(c => c.id === currentDialogue()!.chapterId)?.title || currentDialogue()!.chapterId}
            </span>
          {/if}
        {/if}
      </div>
    </div>
    
    <div class="nav-right">
      <button 
        class="btn nav-btn"
        onclick={() => showSaveModal = true}
        disabled={!currentStory}
      >
        💾 Сохранить
      </button>
      
      <button 
        class="btn nav-btn"
        onclick={() => showLoadModal = true}
        disabled={!currentStory}
      >
        📂 Загрузить
      </button>
      
      <button 
        class="btn nav-btn"
        onclick={() => showSettings = true}
      >
        ⚙️ Настройки
      </button>
    </div>
  </div>
  
  <!-- Уведомления -->
  {#if notificationVisible}
    <div class="notification" class:show={notificationVisible}>
      {notificationText}
    </div>
  {/if}
  
  <!-- Модальные окна -->
  {#if showSaveModal}
    <SaveLoadModal 
      mode="save"
      on:close={() => showSaveModal = false}
      on:saved={saveCurrentSession}
    />
  {/if}
  
  {#if showLoadModal}
    <SaveLoadModal 
      mode="load"
      on:close={() => showLoadModal = false}
      on:loaded={saveCurrentSession}
    />
  {/if}
  
  {#if showSettings}
    <SettingsModal 
      on:close={() => showSettings = false}
      on:volume-change={changeVolume}
      on:mute-toggle={toggleMute}
      {isMuted}
      {currentVolume}
    />
  {/if}
</div>

<style>
  .game-view {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #1a1a1a;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: background-image 0.5s ease-in-out;
    display: flex;
    flex-direction: column;
    color: white;
    overflow: hidden;
  }
  
  .game-view.fullscreen {
    background-color: black;
  }
  
  /* Rive контейнер */
  .rive-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1;
  }
  
  .rive-animation {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  /* Верхняя панель */
  .game-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: linear-gradient(to bottom, 
      rgba(0, 0, 0, 0.9), 
      rgba(0, 0, 0, 0.7));
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 10;
    height: 60px;
    flex-shrink: 0;
  }
  
  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
  }
  
  .toolbar-right {
    justify-content: flex-end;
  }
  
  .toolbar-center {
    flex: 2;
    text-align: center;
  }
  
  .btn-icon {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    font-size: 18px;
    transition: all 0.2s;
  }
  
  .btn-icon:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
  
  .btn-icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .story-title {
    font-size: 18px;
    font-weight: 600;
    color: white;
    margin-left: 10px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  .progress-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  
  .progress-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.3);
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .quick-actions {
    display: flex;
    gap: 8px;
  }
  
  .audio-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .volume-slider:hover {
    opacity: 1;
  }
  
  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
  }
  
  .volume-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: none;
  }
  
  /* Основной контент */
  .game-content {
    flex: 1;
    display: flex;
    position: relative;
    z-index: 2;
    overflow: hidden;
  }
  
  /* Панели (инвентарь и статистика) */
  .inventory-panel,
  .stats-panel {
    width: 300px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    height: 100%;
    overflow-y: auto;
    animation: slideInLeft 0.3s ease-out;
    flex-shrink: 0;
  }
  
  .stats-panel {
    border-right: none;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideInRight 0.3s ease-out;
  }
  
  /* Контейнер диалогов */
  .dialogue-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  
  /* Экран загрузки */
  .loading-screen {
    text-align: center;
    padding: 40px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: fadeIn 0.5s ease-out;
  }
  
  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  .loading-screen p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  /* Экран ошибки */
  .error-screen {
    text-align: center;
    padding: 40px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(244, 67, 54, 0.3);
    animation: fadeIn 0.5s ease-out;
    max-width: 500px;
  }
  
  .error-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }
  
  .error-screen h3 {
    color: #ff6b6b;
    margin-bottom: 10px;
    font-size: 24px;
  }
  
  .error-screen p {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 20px;
    line-height: 1.5;
  }
  
  /* Нижняя панель навигации */
  .game-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: linear-gradient(to top, 
      rgba(0, 0, 0, 0.9), 
      rgba(0, 0, 0, 0.7));
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 10;
    height: 70px;
    flex-shrink: 0;
  }
  
  .nav-left,
  .nav-center,
  .nav-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  
  .nav-center {
    justify-content: center;
  }
  
  .nav-right {
    justify-content: flex-end;
  }
  
  .nav-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  
  .nav-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
  
  .nav-btn.active {
    background: rgba(0, 122, 204, 0.3);
    border: 1px solid rgba(0, 122, 204, 0.5);
  }
  
  .nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .current-dialogue-info {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  
  .dialogue-id {
    background: rgba(0, 122, 204, 0.2);
    color: #4db6ac;
    padding: 6px 12px;
    border-radius: 20px;
    font-family: monospace;
    font-weight: bold;
    font-size: 14px;
    border: 1px solid rgba(0, 122, 204, 0.3);
  }
  
  .chapter-badge {
    background: rgba(156, 39, 176, 0.2);
    color: #ba68c8;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    border: 1px solid rgba(156, 39, 176, 0.3);
  }
  
  /* Уведомления */
  .notification {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 10px;
    font-weight: 500;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .notification.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  
  /* Кнопка меню (только на мобильных) */
  .menu-btn {
    display: none;
  }
  
  /* Анимации */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Адаптивность */
  @media (max-width: 1200px) {
    .inventory-panel,
    .stats-panel {
      width: 250px;
    }
    
    .dialogue-container {
      padding: 20px;
    }
  }
  
  @media (max-width: 992px) {
    .inventory-panel,
    .stats-panel {
      position: absolute;
      top: 60px;
      bottom: 70px;
      z-index: 100;
    }
    
    .inventory-panel {
      left: 0;
    }
    
    .stats-panel {
      right: 0;
    }
    
    .nav-btn span {
      display: none;
    }
    
    .nav-btn {
      padding: 12px;
      justify-content: center;
    }
  }
  
  @media (max-width: 768px) {
    .game-toolbar {
      padding: 10px;
      height: 50px;
    }
    
    .game-navigation {
      padding: 10px;
      height: 60px;
    }
    
    .story-title {
      font-size: 16px;
    }
    
    .progress-text {
      display: none;
    }
    
    .volume-slider {
      display: none;
    }
    
    .menu-btn {
      display: flex;
    }
    
    .toolbar-center {
      display: none;
    }
    
    .nav-center {
      display: none;
    }
  }
  
  @media (max-width: 480px) {
    .dialogue-container {
      padding: 10px;
    }
    
    .quick-actions {
      display: none;
    }
  }
</style>