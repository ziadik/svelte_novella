<script lang="ts">
  import { editor } from '../stores/editorStore.svelte';
  import { resourceActions } from '../stores/resourceStore';
  import type { Item } from '../types';
  
  const itemTypes = [
    { value: 'tool', label: 'Инструмент' },
    { value: 'key', label: 'Ключ' },
    { value: 'consumable', label: 'Расходуемый' },
    { value: 'quest', label: 'Квестовый' },
    { value: 'misc', label: 'Разное' }
  ];
  
  function addItem() {
    if (!editor.data) return;
    if (!editor.data.items) editor.data.items = [];
    
    const newItem: Item = {
      id: `item_${Date.now()}`,
      name: 'Новый предмет',
      description: 'Описание предмета',
      icon: 'icon_default.png',
      type: 'misc'
    };
    
    editor.data.items.push(newItem);
    editor.editingItemIndex = editor.data.items.length - 1;
  }
  
  function editItem(index: number) {
    if (editor.editingItemIndex === index) {
      editor.editingItemIndex = null;
    } else {
      editor.editingItemIndex = index;
    }
  }
  
  function deleteItem(index: number) {
    if (!confirm('Удалить предмет?')) return;
    if (!editor.data?.items) return;
    
    editor.data.items.splice(index, 1);
    editor.editingItemIndex = null;
  }
  
  function duplicateItem(index: number) {
    if (!editor.data?.items) return;
    
    const original = editor.data.items[index];
    const duplicate: Item = {
      ...original,
      id: `${original.id}_copy_${Date.now()}`,
      name: `${original.name} (копия)`
    };
    
    editor.data.items.splice(index + 1, 0, duplicate);
    editor.editingItemIndex = index + 1;
  }
  
  function getItemTypeLabel(type: string) {
    return itemTypes.find(t => t.value === type)?.label || type;
  }
</script>

<div class="items-manager">
  <button
    type="button"
    class="section-header" 
    onclick={() => editor.showItems = !editor.showItems}
    title={editor.showItems ? 'Скрыть предметы' : 'Показать предметы'}
    aria-expanded={editor.showItems}
    aria-controls="items-container"
  >
    <h4>
      <span class="icon">📦</span>
      Предметы ({editor.data?.items?.length || 0})
    </h4>
    <span class="toggle-icon">
      {editor.showItems ? '▼' : '▶'}
    </span>
  </button>
  
  {#if editor.showItems}
    <div id="items-container" class="items-container">
      {#if editor.data?.items?.length}
        <div class="items-list">
          {#each editor.data.items as item, index (item.id)}
            <div class:editing={editor.editingItemIndex === index} class="item-row">
              <!-- Информация о предмете -->
              <button
                type="button"
                class="item-info"
                onclick={() => editItem(index)}
                aria-label="Редактировать предмет {item.name}"
              >
                <div class="item-header">
                  <div class="item-icon">
                    {#if item.icon}
                      <img 
                        src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/${editor.bucketName}/${item.icon}`} 
                        alt={item.name}
                        class="icon-preview"
                       
                      />
                    {:else}
                      <div class="icon-placeholder">📦</div>
                    {/if}
                  </div>
                  
                  <div class="item-details">
                    <div class="item-name">{item.name}</div>
                    <div class="item-meta">
                      <span class="item-id">{item.id}</span>
                      <span class:tool={item.type === 'tool'}
                            class:key={item.type === 'key'}
                            class:consumable={item.type === 'consumable'}
                            class:quest={item.type === 'quest'}
                            class:misc={item.type === 'misc'}
                            class="item-type-badge">
                        {getItemTypeLabel(item.type)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="item-description">
                  {item.description} || <em>Нет описания</em>
                </div>
              </button>
              
              <!-- Кнопки действий -->
              <div class="item-actions">
                <button 
                  onclick={() => duplicateItem(index)} 
                  class="btn-icon" 
                  title="Дублировать"
                >
                  ⎘
                </button>
                <button 
                  onclick={() => editItem(index)} 
                  class="btn-icon" 
                  title="Редактировать"
                >
                  ✎️
                </button>
                <button 
                  onclick={() => deleteItem(index)} 
                  class="btn-icon danger" 
                  title="Удалить"
                >
                  ×
                </button>
              </div>
              
              <!-- Форма редактирования -->
              {#if editor.editingItemIndex === index}
                <div class="item-edit-form">
                  <div class="edit-grid">
                    <!-- ID -->
                    <div class="form-group full-width-edit">
                      <label for="item-id-{index}">ID предмета</label>
                      <input 
                        type="text" 
                        id="item-id-{index}"
                        bind:value={item.id} 
                        class="input" 
                        placeholder="item_unique_id"
                      />
                    </div>
                    
                    <!-- Название -->
                    <div class="form-group full-width-edit">
                      <label for="item-name-{index}">Название</label>
                      <input 
                        type="text" 
                        id="item-name-{index}"
                        bind:value={item.name} 
                        class="input" 
                        placeholder="Название предмета"
                      />
                    </div>
                    
                    <!-- Описание -->
                    <div class="form-group full-width-edit">
                      <label for="item-desc-{index}">Описание</label>
                      <textarea 
                        id="item-desc-{index}"
                        bind:value={item.description} 
                        class="textarea" 
                        rows="2"
                        placeholder="Описание предмета..."
                      ></textarea>
                    </div>
                    
                    <!-- Иконка -->
                    <div class="form-group full-width-edit">
                      <label for="item-icon-{index}">Иконка</label>
                      <div class="input-group">
                        <input 
                          type="text" 
                          id="item-icon-{index}"
                          bind:value={item.icon} 
                          class="input" 
                          placeholder="icon.png"
                        />
                        <select 
                          onchange={(e) => item.icon = e.target.value} 
                          class="input select"
                        >
                          <option value="">-- Выбрать из загруженных --</option>
                          {#each editor.storedFiles.filter(f => 
                            f.name.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)) as img}
                            <option value={img.name}>{img.name}</option>
                          {/each}
                        </select>
                        <label class="btn-file">
                          Загрузить 
                          <input 
                            type="file" 
                            accept="image/*" 
                            onchange={resourceActions.uploadNewFile} 
                            hidden 
                          />
                        </label>
                      </div>
                      {#if item.icon}
                        <div class="icon-preview-small">
                          <img 
                            src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/${editor.bucketName}/${item.icon}`} 
                            alt="Preview"
                            class="preview-image"
                           
                          />
                          <span class="preview-name">{item.icon}</span>
                        </div>
                      {/if}
                    </div>
                    
                    <!-- Тип -->
                    <div class="form-group">
                      <label for="item-type-{index}">Тип</label>
                      <select id="item-type-{index}" bind:value={item.type} class="item-type-select">
                        {#each itemTypes as typeOption}
                          <option value={typeOption.value}>
                            {typeOption.label}
                          </option>
                        {/each}
                      </select>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-items">
          <div class="empty-icon">📦</div>
          <div class="empty-text">Нет предметов</div>
          <div class="empty-subtext">
            Добавьте предметы для использования в условиях
          </div>
        </div>
      {/if}
      
      <button onclick={addItem} class="btn primary full-width">
        + Добавить предмет
      </button>
    </div>
  {/if}
</div>

<style>
  .items-manager {
    margin-bottom: 20px;
    background: #252526;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .items-manager .section-header {
    width: 100%;
    padding: 12px 15px;
    cursor: pointer;
    background: #2d2d2d;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    transition: background 0.2s;
    border: none;
    text-align: left;
    color: inherit;
  }
  
  .items-manager .section-header:hover {
    background: #383838;
  }
  
  .items-manager h4 {
    margin: 0;
    font-size: 13px;
    color: #ddd;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .items-manager .icon {
    font-size: 16px;
  }
  
  .toggle-icon {
    color: #888;
    font-size: 12px;
    transition: transform 0.2s;
  }
  
  .items-container {
    padding: 15px;
    background: #1e1e1e;
  }
  
  .items-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .item-row {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    background: #252526;
    padding: 12px;
    border-radius: 6px;
    border-left: 3px solid #444;
    transition: all 0.2s;
  }
  
  .item-row:hover {
    background: #2a2d2e;
    border-left-color: #555;
  }
  
  .item-row.editing {
    border-left: 3px solid #ff5555;
    background: #2a2d2e;
    box-shadow: 0 0 8px rgba(255, 85, 85, 0.1);
    flex-direction: column;
  }
  
  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    color: inherit;
    padding: 0;
  }
  
  .item-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .item-icon {
    width: 40px;
    height: 40px;
    background: #2d2d2d;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid #444;
  }
  
  .icon-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .icon-placeholder {
    font-size: 20px;
    color: #666;
  }
  
  .item-details {
    flex: 1;
  }
  
  .item-name {
    font-weight: bold;
    color: #ddd;
    font-size: 14px;
    margin-bottom: 2px;
  }
  
  .item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .item-id {
    font-family: monospace;
    font-size: 11px;
    color: #888;
    background: #1e1e1e;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .item-type-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: bold;
  }
  
  .item-type-badge.tool { background: #1565c0; color: white; }
  .item-type-badge.key { background: #f57c00; color: white; }
  .item-type-badge.consumable { background: #c62828; color: white; }
  .item-type-badge.quest { background: #2e7d32; color: white; }
  .item-type-badge.misc { background: #5d4037; color: white; }
  
  .item-description {
    font-size: 12px;
    color: #aaa;
    line-height: 1.4;
  }
  
  .item-actions {
    display: flex;
    gap: 5px;
  }
  
  .btn-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3c3c3c;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    color: #ddd;
    font-size: 14px;
  }
  
  .btn-icon:hover {
    background: #444;
  }
  
  .btn-icon.danger {
    background: #b71c1c;
  }
  
  .btn-icon.danger:hover {
    background: #c62828;
  }
  
  .item-edit-form {
    width: 100%;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed #444;
  }
  
  .edit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .full-width-edit {
    grid-column: span 2;
  }
  
  .form-group {
    margin-bottom: 10px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 11px;
    color: #aaa;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  .input, .textarea, .select {
    width: 100%;
    background: #2d2d2d;
    border: 1px solid #444;
    color: white;
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
  }
  
  .input:focus, .textarea:focus, .select:focus {
    border-color: #ff5555;
    outline: none;
  }
  
  .textarea {
    min-height: 60px;
    resize: vertical;
  }
  
  .input-group {
    display: flex;
    gap: 8px;
  }
  
  .input-group .input {
    flex: 1;
  }
  
  .input-group .select {
    max-width: 200px;
  }
  
  .btn-file {
    background: #444;
    color: white;
    padding: 0 12px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }
  
  .btn-file:hover {
    background: #555;
  }
  
  .icon-preview-small {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    padding: 8px;
    background: #2d2d2d;
    border-radius: 4px;
  }
  
  .preview-image {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid #444;
  }
  
  .preview-name {
    font-size: 11px;
    color: #888;
    font-family: monospace;
  }
  
  .item-type-select {
    background: #2d2d2d;
    color: white;
    border: 1px solid #444;
    padding: 8px;
    border-radius: 4px;
    width: 100%;
  }
  
  .empty-items {
    text-align: center;
    padding: 30px 20px;
    color: #666;
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 10px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 5px;
  }
  
  .empty-subtext {
    font-size: 12px;
    max-width: 250px;
    margin: 0 auto;
    line-height: 1.4;
  }
  
  .btn.primary {
    background: #0e639c;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.2s;
  }
  
  .btn.primary:hover {
    background: #1177bb;
  }
  
  .btn.full-width {
    width: 100%;
  }
</style>