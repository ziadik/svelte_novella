<script lang="ts">
  import type { Option, Condition } from '../types';
  
  // Используем $props() вместо export let
  const { 
    option, 
    index, 
    dialogues, 
    availableItems, 
    conditionTypes 
  } = $props<{
    option: Option;
    index: number;
    dialogues: any[];
    availableItems: any[];
    conditionTypes: string[];
  }>();

  // Инициализация condition при необходимости
  function initConditionIfNeeded() {
    if (!option.visibilityCondition) {
      option.visibilityCondition = { type: 'always' };
    }
  }

  // Получаем текущий condition
  function getCondition(): Condition {
    initConditionIfNeeded();
    return option.visibilityCondition!;
  }

  // Обновляем поле condition
  function updateCondition(updates: Partial<Condition>) {
    initConditionIfNeeded();
    option.visibilityCondition = { ...option.visibilityCondition!, ...updates };
  }
</script>

<div class="option-details">
  <!-- Основные поля -->
  <div class="form-group">
    <label for="option-text-{index}">Текст кнопки</label>
    <input 
      type="text" 
      id="option-text-{index}"
      bind:value={option.text} 
      class="input" 
    />
  </div>

  <!-- Переход -->
  <div class="form-group">
    <label for="option-next-{index}">Переход</label>
    <select 
      id="option-next-{index}"
      bind:value={option.nextDialogueId} 
      class="input select"
    >
      <option value="">-- Конец ветки --</option>
      {#each dialogues as d}
        <option value={d.id}>
          {d.id}: {d.text.substring(0, 30)}...
        </option>
      {/each}
    </select>
  </div>

  <!-- Мини-игра -->
  <div class="minigame-section">
    <div class="section-header">
      <label class="checkbox-row">
        <input 
          type="checkbox" 
          bind:checked={option.miniGame} 
          onchange={(e) => {
            if (e.target.checked && !option.miniGame) {
              option.miniGame = {
                id: '',
                onWinDialogueId: '',
                onLoseDialogueId: ''
              };
            }
          }}
        /> 
        Запустить мини-игру
      </label>
    </div>

    {#if option.miniGame}
      <div class="minigame-details">
        <div class="form-group">
          <label for="option-mg-id-{index}">ID игры</label>
          <select 
            id="option-mg-id-{index}"
            bind:value={option.miniGame.id} 
            class="input select"
          >
            <option value="">-- Выберите игру --</option>
            <option value="onet_monsters">Onet: Monsters (поиск пар)</option>
            <option value="memo_monsters">Memo: Monsters (поиск пар)</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="option-mg-win-{index}">Диалог при победе</label>
            <select 
              id="option-mg-win-{index}"
              bind:value={option.miniGame.onWinDialogueId} 
              class="input select"
            >
              <option value="">-- Выберите --</option>
              {#each dialogues as d}
                <option value={d.id}>
                  {d.id}: {d.text.substring(0, 30)}...
                </option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="option-mg-lose-{index}">Диалог при поражении</label>
            <select 
              id="option-mg-lose-{index}"
              bind:value={option.miniGame.onLoseDialogueId} 
              class="input select"
            >
              <option value="">-- Выберите --</option>
              {#each dialogues as d}
                <option value={d.id}>
                  {d.id}: {d.text.substring(0, 30)}...
                </option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="option-mg-reward-{index}">Награда (предмет)</label>
          <select 
            id="option-mg-reward-{index}"
            bind:value={option.miniGame.rewardItem} 
            class="input select"
          >
            <option value="">-- Без награды --</option>
            {#each availableItems as item}
              <option value={item.id}>{item.name}</option>
            {/each}
          </select>
        </div>
      </div>
    {/if}
  </div>

  <!-- Настройки включения/видимости -->
  <div class="options-settings-grid">
    <div class="setting-col">
      <label class="checkbox-row">
        <input type="checkbox" bind:checked={option.enabled} /> 
        Включено (Enable)
      </label>
      <p class="setting-desc">
        Если выключено, кнопка серая и не кликабельна.
      </p>
    </div>
    
    <div class="setting-col">
      <label class="checkbox-row">
        <input type="checkbox" bind:checked={option.visible} /> 
        Видимо (Visible)
      </label>
      <p class="setting-desc">
        Если скрыто, кнопки нет в списке.
      </p>
    </div>
  </div>

  <!-- Условие видимости -->
  <div class="trigger-section">
    <h5>Условие видимости</h5>
    
    <div class="form-row">
      <div class="form-group">
        <label for="option-cond-type-{index}">Тип условия</label>
        <select 
          id="option-cond-type-{index}"
          value={getCondition().type}
          onchange={(e) => {
            const type = e.target.value as Condition['type'];
            updateCondition({ type });
          }}
          class="input select"
        >
          {#each conditionTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>
      
      {#if getCondition().type === 'has_item'}
        <div class="form-group full-width">
          <label for="option-cond-item-{index}">Предмет</label>
          <select 
            id="option-cond-item-{index}"
            value={getCondition().itemId || ''}
            onchange={(e) => updateCondition({ itemId: e.target.value })}
            class="input select"
          >
            <option value="">-- Выберите предмет --</option>
            {#each availableItems as item}
              <option value={item.id}>{item.name}</option>
            {/each}
          </select>
        </div>
      {/if}
      
      {#if getCondition().type === 'stat_greater'}
        <div class="form-group">
          <label for="option-cond-stat-{index}">Стата</label>
          <input 
            type="text" 
            id="option-cond-stat-{index}"
            value={getCondition().statName || ''}
            oninput={(e) => updateCondition({ statName: e.target.value })}
            class="input" 
            placeholder="knowledge" 
          />
        </div>
        <div class="form-group">
          <label for="option-cond-stat-val-{index}">Значение ></label>
          <input 
            type="number" 
            id="option-cond-stat-val-{index}"
            value={getCondition().statValue || ''}
            oninput={(e) => updateCondition({ statValue: parseInt(e.target.value) || 0 })}
            class="input" 
          />
        </div>
      {/if}

      {#if getCondition().type === 'flag_true'}
        <div class="form-group full-width">
          <label for="option-cond-flag-{index}">Имя флага</label>
          <input 
            type="text" 
            id="option-cond-flag-{index}"
            value={getCondition().flagName || ''}
            oninput={(e) => updateCondition({ flagName: e.target.value })}
            class="input" 
            placeholder="metDracula" 
          />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .option-details {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed #444;
  }

  .options-settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
    padding: 10px;
    background: #252526;
    border-radius: 4px;
  }

  .setting-col {
    display: flex;
    flex-direction: column;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin-bottom: 5px;
  }

  .setting-desc {
    font-size: 10px;
    color: #777;
    margin: 0;
    line-height: 1.2;
  }

  .trigger-section {
    padding: 10px;
    background: #222;
    border: 1px solid #444;
    border-radius: 4px;
  }

  .trigger-section h5 {
    margin: 0 0 10px 0;
    font-size: 12px;
    color: #ddd;
  }

  .form-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  .form-row .form-group {
    margin-bottom: 0;
    flex: 1;
  }

  .form-row .full-width {
    flex: 2;
  }

  .minigame-section {
    margin-top: 15px;
    padding: 10px;
    background: #1a1a2e;
    border: 1px solid #e94560;
    border-radius: 4px;
  }

  .minigame-section .section-header {
    margin-bottom: 10px;
  }

  .minigame-details {
    margin-top: 10px;
    padding: 10px;
    background: #16213e;
    border-radius: 4px;
    border: 1px dashed #e94560;
  }

  .minigame-details .form-group {
    margin-bottom: 10px;
  }

  .minigame-details .form-group:last-child {
    margin-bottom: 0;
  }
</style>