<!-- src/components/game/SaveLoadModal.svelte -->
<script lang="ts">
  import type { GameSession } from '../../types'
  
  const { mode = 'save' } = $props<{
    mode: 'save' | 'load'
    onClose?: () => void
    onSaved?: () => void
    onLoaded?: (session: GameSession) => void
  }>()
  
  // Слоты для сохранений
  let saveSlots = $state<GameSession[]>([])
  let selectedSlot = $state<number | null>(null)
  let saveName = $state('')
  let isSaving = $state(false)
  
  // Загружаем сохранения
  $effect(() => {
    loadSaveSlots()
  })
  
  function loadSaveSlots() {
    const slots: GameSession[] = []
    
    // Загружаем из localStorage
    for (let i = 0; i < 10; i++) {
      const key = `save_slot_${i}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const session = JSON.parse(saved)
        slots[i] = session
      }
    }
    
    saveSlots = slots
  }
  
  // Сохранить в слот
  function saveToSlot(slotIndex: number) {
    if (mode !== 'save' || !saveName.trim()) return
    
    isSaving = true
    
    // Создаем сессию (в реальности нужно получать из gameState)
    const session: GameSession = {
      id: `save_${Date.now()}`,
      storyId: 'current_story',
      playerState: {
        inventory: [],
        stats: { knowledge: 10, courage: 5, charisma: 8 },
        flags: {},
        progress: {
          currentChapter: 'ch1',
          completedDialogues: ['start'],
          score: 100
        }
      },
      createdAt: new Date(),
      lastPlayed: new Date(),
      name: saveName,
      slot: slotIndex
    }
    
    // Сохраняем
    localStorage.setItem(`save_slot_${slotIndex}`, JSON.stringify(session))
    
    // Обновляем список
    loadSaveSlots()
    
    // Уведомляем родителя
    onSaved?.()
    
    // Сбрасываем
    selectedSlot = null
    saveName = ''
    isSaving = false
  }
  
  // Загрузить из слота
  function loadFromSlot(slotIndex: number) {
    if (mode !== 'load') return
    
    const session = saveSlots[slotIndex]
    if (session) {
      onLoaded?.(session)
      onClose?.()
    }
  }
  
  // Удалить слот
  function deleteSlot(slotIndex: number) {
    if (confirm('Удалить это сохранение?')) {
      localStorage.removeItem(`save_slot_${slotIndex}`)
      loadSaveSlots()
    }
  }
  
  // Форматирование даты
  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
</script>

<div class="modal-overlay" on:click={() => onClose?.()}>
  <div class="modal" on:click|stopPropagation>
    <div class="modal-header">
      <h2 class="modal-title">
        {mode === 'save' ? '💾 Сохранить игру' : '📂 Загрузить игру'}
      </h2>
      <button class="close-btn" on:click={() => onClose?.()}>×</button>
    </div>
    
    <div class="modal-body">
      {#if mode === 'save'}
        <!-- Форма сохранения -->
        <div class="save-form">
          <div class="form-group">
            <label for="save-name">Название сохранения</label>
            <input
              id="save-name"
              type="text"
              bind:value={saveName}
              placeholder="Мое сохранение"
              class="input"
              maxlength={50}
            />
          </div>
        </div>
      {/if}
      
      <!-- Слоты сохранений -->
      <div class="save-slots">
        {#each Array(10).fill(0) as _, index}
          {@const session = saveSlots[index]}
          <div 
            class:selected={selectedSlot === index}
            class:empty={!session}
            class="save-slot"
            on:click={() => {
              if (mode === 'save') {
                selectedSlot = index
              } else if (session) {
                loadFromSlot(index)
              }
            }}
          >
            {#if session}
              <!-- Заполненный слот -->
              <div class="slot-content">
                <div class="slot-header">
                  <h4 class="slot-name">{session.name || `Сохранение ${index + 1}`}</h4>
                  <span class="slot-date">
                    {formatDate(session.createdAt as any)}
                  </span>
                </div>
                
                <div class="slot-info">
                  <div class="info-row">
                    <span class="info-label">Прогресс:</span>
                    <span class="info-value">
                      {session.playerState.progress?.completedDialogues?.length || 0} диалогов
                    </span>
                  </div>
                  
                  <div class="info-row">
                    <span class="info-label">Предметы:</span>
                    <span class="info-value">
                      {session.playerState.inventory?.length || 0}
                    </span>
                  </div>
                </div>
                
                <div class="slot-actions">
                  {#if mode === 'save'}
                    <button 
                      class="btn small"
                      on:click|stopPropagation={() => deleteSlot(index)}
                    >
                      Удалить
                    </button>
                  {:else}
                    <button 
                      class="btn primary small"
                      on:click|stopPropagation={() => loadFromSlot(index)}
                    >
                      Загрузить
                    </button>
                  {/if}
                </div>
              </div>
              
            {:else}
              <!-- Пустой слот -->
              <div class="slot-empty">
                <div class="empty-icon">
                  {mode === 'save' ? '💾' : '📂'}
                </div>
                <div class="empty-text">
                  {mode === 'save' ? 'Сохранить' : 'Пусто'}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="modal-footer">
      {#if mode === 'save'}
        <button 
          class="btn primary"
          on:click={() => {
            if (selectedSlot !== null && saveName.trim()) {
              saveToSlot(selectedSlot)
            }
          }}
          disabled={selectedSlot === null || !saveName.trim() || isSaving}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      {/if}
      
      <button class="btn" on:click={() => onClose?.()}>
        Отмена
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }
  
  .modal {
    background: #1e1e1e;
    border-radius: 16px;
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .modal-title {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: white;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 28px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  
  .save-form {
    margin-bottom: 30px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }
  
  .form-group {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: white;
    font-weight: 500;
  }
  
  .input {
    width: 100%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 12px 16px;
    color: white;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .input:focus {
    outline: none;
    border-color: #007acc;
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  }
  
  .save-slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }
  
  .save-slot {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    overflow: hidden;
    height: 180px;
  }
  
  .save-slot:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  .save-slot.selected {
    border-color: #007acc;
    background: rgba(0, 122, 204, 0.1);
  }
  
  .save-slot.empty {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .slot-content {
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .slot-header {
    margin-bottom: 12px;
  }
  
  .slot-name {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .slot-date {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .slot-info {
    flex: 1;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 13px;
  }
  
  .info-label {
    color: rgba(255, 255, 255, 0.6);
  }
  
  .info-value {
    color: white;
    font-weight: 500;
  }
  
  .slot-actions {
    margin-top: 12px;
  }
  
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn.small {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .btn.primary {
    background: #007acc;
    color: white;
  }
  
  .btn.primary:hover:not(:disabled) {
    background: #0098ff;
  }
  
  .slot-empty {
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .empty-icon {
    font-size: 36px;
    margin-bottom: 8px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 14px;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>