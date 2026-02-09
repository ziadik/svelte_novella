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
    <label>Текст кнопки</label>
    <input 
      type="text" 
      bind:value={option.text} 
      class="input" 
    />
  </div>

  <!-- Переход -->
  <div class="form-group">
    <label>Переход</label>
    <select 
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
        <label>Тип условия</label>
        <select 
          value={getCondition().type}
          on:change={(e) => {
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
          <label>Предмет</label>
          <select 
            value={getCondition().itemId || ''}
            on:change={(e) => updateCondition({ itemId: e.target.value })}
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
          <label>Стата</label>
          <input 
            type="text" 
            value={getCondition().statName || ''}
            on:input={(e) => updateCondition({ statName: e.target.value })}
            class="input" 
            placeholder="knowledge" 
          />
        </div>
        <div class="form-group">
          <label>Значение ></label>
          <input 
            type="number" 
            value={getCondition().statValue || ''}
            on:input={(e) => updateCondition({ statValue: parseInt(e.target.value) || 0 })}
            class="input" 
          />
        </div>
      {/if}

      {#if getCondition().type === 'flag_true'}
        <div class="form-group full-width">
          <label>Имя флага</label>
          <input 
            type="text" 
            value={getCondition().flagName || ''}
            on:input={(e) => updateCondition({ flagName: e.target.value })}
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
</style>