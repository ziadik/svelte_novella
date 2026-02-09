<!-- src/components/game/RivePlayer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import * as rive from '@rive-app/canvas'
  
  // Пропсы компонента
  const { 
    fileName, 
    bucket, 
    autoplay = true,
    loop = true,
    stateMachine = "SM1",
    artboard = "New Artboard",
    width = "250",
    height = "500",
    fit = "contain",
    alignment = "center",
    showControls = false,
    showInfo = false
  } = $props<{
    fileName: string
    bucket?: string
    autoplay?: boolean
    loop?: boolean
    stateMachine?: string
    artboard?: string
    width?: string | number
    height?: string | number
    alignment?: 'center' | 'top' | 'bottom' | 'left' | 'right'
    fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
    showControls?: boolean
    showInfo?: boolean
  }>()
  
  // Локальные переменные
  let canvas: HTMLCanvasElement | undefined
  let riveInstance: rive.Rive | null = null
  
  // Состояния
  let isLoaded = $state(false)
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let isPlaying = $state(autoplay)
  
  // Публичные методы (доступны через bind:this)
  const rivePlayer = {
    get instance() {
      return riveInstance
    },
    
    play() {
      if (riveInstance) {
        riveInstance.play()
        isPlaying = true
      }
    },
    
    pause() {
      if (riveInstance) {
        riveInstance.pause()
        isPlaying = false
      }
    },
    
    stop() {
      if (riveInstance) {
        riveInstance.stop()
        isPlaying = false
      }
    },
    
    restart() {
      if (riveInstance) {
        riveInstance.stop()
        riveInstance.play()
        isPlaying = true
      }
    },
    
    // Триггер для state machine
    triggerInput(inputName: string) {
      if (riveInstance) {
        try {
          riveInstance.fireState(stateMachine, inputName)
          console.log(`Triggered input: ${inputName}`)
        } catch (err) {
          console.warn(`Input "${inputName}" not found in state machine "${stateMachine}"`)
        }
      }
    },
    
    // Установить значение входа
    setInputValue(inputName: string, value: number | boolean) {
      if (riveInstance) {
        try {
          riveInstance.setInputValue(stateMachine, inputName, value)
        } catch (err) {
          console.warn(`Failed to set input "${inputName}" to ${value}`)
        }
      }
    },
    
    // Получить значение входа
    getInputValue(inputName: string): number | boolean | null {
      if (!riveInstance) return null
      try {
        return riveInstance.getInputValue(stateMachine, inputName)
      } catch {
        return null
      }
    },
    
    // Список доступных входов state machine
    listInputs(): string[] {
      if (!riveInstance) return []
      try {
        return riveInstance.stateMachineInputs(stateMachine)
      } catch {
        return []
      }
    },
    
    // Получить список state machines
    listStateMachines(): string[] {
      if (!riveInstance) return []
      try {
        return riveInstance.stateMachineNames
      } catch {
        return []
      }
    },
    
    // Получить список artboards
    listArtboards(): string[] {
      if (!riveInstance) return []
      try {
        return riveInstance.artboardNames
      } catch {
        return []
      }
    },
    
    // Переключить state machine
    switchStateMachine(newStateMachine: string) {
      if (riveInstance) {
        try {
          riveInstance.stop()
          riveInstance.play([newStateMachine])
          console.log(`Switched to state machine: ${newStateMachine}`)
        } catch (err) {
          console.error(`Failed to switch to state machine "${newStateMachine}":`, err)
        }
      }
    },
    
    // Изменить скорость воспроизведения
    setSpeed(speed: number) {
      if (riveInstance) {
        riveInstance.speed = speed
      }
    },
    
    // Публичные геттеры
    get isLoaded() {
      return isLoaded
    },
    
    get isPlaying() {
      return isPlaying
    },
    
    get hasError() {
      return error !== null
    }
  }
  
  // Получить URL для Rive файла
  function getRiveUrl(): string {
    if (!fileName) {
      throw new Error('FileName is required')
    }
    
    // Если бакет не указан, используем текущую историю
    const currentBucket = bucket || $currentStory?.bucket || 'dracula'
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL_FILE
    
    return `${supabaseUrl}/storage/v1/object/public/${currentBucket}/${fileName}`
  }
  
  // Инициализация Rive
  onMount(() => {
    if (!canvas) {
      console.error('Canvas element not found')
      return
    }
    
    isLoading = true
    error = null
    
    try {
      const url = getRiveUrl()
      console.log('Loading Rive animation from:', url)
      
      // Опции для Rive
      const riveOptions: rive.RiveParameters = {
        src: url,
        canvas: canvas,
        autoplay: autoplay,
        onLoad: () => {
          console.log('✅ Rive animation loaded successfully')
          isLoaded = true
          isLoading = false
          isPlaying = autoplay
          
          // Логируем информацию о загруженной анимации
          if (riveInstance) {
            console.log('Artboards:', riveInstance.artboardNames)
            console.log('State Machines:', riveInstance.stateMachineNames)
            
            if (stateMachine && riveInstance.stateMachineNames.includes(stateMachine)) {
              console.log('Inputs for', stateMachine, ':', riveInstance.stateMachineInputs(stateMachine))
            }
          }
          
          // Делимся событиями
          dispatch('loaded', { detail: { instance: riveInstance } })
        },
        onLoadError: (err: Error) => {
          console.error('❌ Failed to load Rive animation:', err)
          error = `Ошибка загрузки анимации: ${err.message}`
          isLoading = false
          dispatch('error', { detail: { error: err } })
        }
      }
      
      // Добавляем опциональные параметры
      if (stateMachine) {
        riveOptions.stateMachines = stateMachine
      }
      
      if (artboard) {
        riveOptions.artboard = artboard
      }
      
      // Создаем экземпляр Rive
      riveInstance = new rive.Rive(riveOptions)
      
      // Добавляем обработчики событий
      if (riveInstance) {
        // Используем EventEmitter API Rive
        const riveAny = riveInstance as any
        
        if (riveAny.on) {
          riveAny.on('play', () => {
            isPlaying = true
            dispatch('play')
          })
          
          riveAny.on('pause', () => {
            isPlaying = false
            dispatch('pause')
          })
          
          riveAny.on('stop', () => {
            isPlaying = false
            dispatch('stop')
          })
          
          riveAny.on('loop', () => {
            dispatch('loop')
          })
        }
      }
      
    } catch (err: any) {
      console.error('❌ Error initializing Rive:', err)
      error = `Ошибка инициализации: ${err.message}`
      isLoading = false
    }
    
    // Возвращаем функцию очистки
    return () => {
      if (riveInstance) {
        console.log('Cleaning up Rive instance')
        riveInstance.cleanup()
        riveInstance = null
      }
    }
  })
  
  // Обработчики UI
  function handlePlay() {
    rivePlayer.play()
  }
  
  function handlePause() {
    rivePlayer.pause()
  }
  
  function handleStop() {
    rivePlayer.stop()
  }
  
  function handleRestart() {
    rivePlayer.restart()
  }
  
  function handleRetry() {
    error = null
    isLoading = true
    isLoaded = false
    
    // Пересоздаем canvas для полной перезагрузки
    setTimeout(() => {
      if (riveInstance) {
        riveInstance.cleanup()
        riveInstance = null
      }
      
      // Инициализируем заново
      onMount()
    }, 100)
  }
  
  // Получить стили для canvas
  function getCanvasStyle() {
    return {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      objectFit: fit,
      objectPosition: alignment
    }
  }
  
  // Экспортируем rivePlayer для использования с bind:this
  $effect(() => {
    // Это обеспечивает реактивность при изменении состояния
    const player = rivePlayer
    return player
  })
</script>

<!-- Основной контейнер -->
<div 
  class="rive-player"
  class:loading={isLoading}
  class:loaded={isLoaded}
  class:error={!!error}
  style="width: {typeof width === 'number' ? width + 'px' : width}; height: {typeof height === 'number' ? height + 'px' : height};"
>
  <!-- Canvas для Rive -->
  <canvas 
    bind:this={canvas}
    style={getCanvasStyle()}
    class="rive-canvas"
  />
  
  <!-- Состояние загрузки -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Загрузка анимации...</div>
    </div>
  {/if}
  
  <!-- Состояние ошибки -->
  {#if error && !isLoading}
    <div class="error-overlay">
      <div class="error-icon">⚠️</div>
      <div class="error-message">{error}</div>
      <button 
        class="btn retry-btn"
        on:click={handleRetry}
      >
        Повторить попытку
      </button>
    </div>
  {/if}
  
  <!-- Элементы управления -->
  {#if showControls && isLoaded}
    <div class="controls-overlay">
      <div class="controls-bar">
        <!-- Кнопки управления воспроизведением -->
        <div class="playback-controls">
          <button 
            class="btn-icon"
            on:click={handlePlay}
            disabled={isPlaying}
            title="Воспроизвести"
          >
            ▶️
          </button>
          <button 
            class="btn-icon"
            on:click={handlePause}
            disabled={!isPlaying}
            title="Пауза"
          >
            ⏸️
          </button>
          <button 
            class="btn-icon"
            on:click={handleStop}
            title="Стоп"
          >
            ⏹️
          </button>
          <button 
            class="btn-icon"
            on:click={handleRestart}
            title="Перезапустить"
          >
            🔄
          </button>
        </div>
        
        <!-- Информация о состоянии -->
        <div class="status-info">
          <span class="status-label">
            {isPlaying ? 'Воспроизводится' : 'На паузе'}
          </span>
        </div>
      </div>
      
      <!-- Дополнительные элементы управления -->
      {#if rivePlayer.listInputs().length > 0}
        <div class="inputs-control">
          <select 
            class="inputs-select"
            on:change={(e) => {
              const inputName = e.target.value
              if (inputName) {
                rivePlayer.triggerInput(inputName)
              }
            }}
          >
            <option value="">-- Trigger Input --</option>
            {#each rivePlayer.listInputs() as input}
              <option value={input}>{input}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Информация об анимации -->
  {#if showInfo && isLoaded}
    <div class="info-overlay">
      <div class="info-badge" title="Информация об анимации">
        🎬 Rive
      </div>
      <div class="info-tooltip">
        <div class="info-content">
          <div class="info-row">
            <strong>Файл:</strong> {fileName}
          </div>
          <div class="info-row">
            <strong>Состояние:</strong> {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
          </div>
          {#if riveInstance}
            <div class="info-row">
              <strong>Artboards:</strong> {riveInstance.artboardNames?.join(', ')}
            </div>
            <div class="info-row">
              <strong>State Machines:</strong> {riveInstance.stateMachineNames?.join(', ')}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .rive-player {
    position: relative;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .rive-canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: transparent;
  }
  
  /* Состояния */
  .rive-player.loading {
    background: rgba(0, 0, 0, 0.1);
  }
  
  .rive-player.error {
    background: rgba(244, 67, 54, 0.1);
    border: 2px dashed rgba(244, 67, 54, 0.3);
  }
  
  .rive-player.loaded:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  /* Оверлей загрузки */
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(30, 30, 30, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 10;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #4db6ac;
    animation: spin 1s linear infinite;
  }
  
  .loading-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
  }
  
  /* Оверлей ошибки */
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(30, 30, 30, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 10;
    padding: 20px;
    text-align: center;
  }
  
  .error-icon {
    font-size: 48px;
    color: #ff6b6b;
  }
  
  .error-message {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    line-height: 1.4;
    max-width: 80%;
  }
  
  .retry-btn {
    margin-top: 16px;
    padding: 8px 24px;
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid rgba(255, 107, 107, 0.4);
    color: #ff6b6b;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .retry-btn:hover {
    background: rgba(255, 107, 107, 0.3);
    transform: translateY(-1px);
  }
  
  /* Элементы управления */
  .controls-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, 
      rgba(0, 0, 0, 0.8), 
      rgba(0, 0, 0, 0.4));
    padding: 12px 16px;
    z-index: 5;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .rive-player:hover .controls-overlay {
    opacity: 1;
  }
  
  .controls-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  
  .playback-controls {
    display: flex;
    gap: 8px;
  }
  
  .btn-icon {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .btn-icon:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .btn-icon:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .status-info {
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
  }
  
  .inputs-control {
    margin-top: 12px;
  }
  
  .inputs-select {
    width: 100%;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: white;
    font-size: 14px;
  }
  
  .inputs-select:focus {
    outline: none;
    border-color: #4db6ac;
  }
  
  /* Информационный оверлей */
  .info-overlay {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 5;
  }
  
  .info-badge {
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: help;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
  }
  
  .info-tooltip {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: rgba(30, 30, 40, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 12px;
    min-width: 200px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    z-index: 100;
  }
  
  .info-overlay:hover .info-tooltip {
    opacity: 1;
    visibility: visible;
  }
  
  .info-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .info-row {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.4;
  }
  
  .info-row strong {
    color: white;
    font-weight: 600;
  }
  
  /* Анимации */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  /* Адаптивность */
  @media (max-width: 768px) {
    .controls-overlay {
      opacity: 1;
      background: rgba(0, 0, 0, 0.7);
    }
    
    .info-overlay {
      top: 8px;
      right: 8px;
    }
    
    .info-badge {
      font-size: 10px;
      padding: 4px 8px;
    }
  }
</style>