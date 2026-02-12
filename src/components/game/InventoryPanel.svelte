<!-- src/components/game/InventoryPanel.svelte -->
<script lang="ts">
  import { gameState } from '../../stores/gameStore.svelte'
  import type { Item } from '../../types'
  
  let selectedItem = $state<Item | null>(null)
  
  // Получаем предметы из инвентаря
  function getInventoryItems() {
    if (!$gameState.storyData?.items || !$gameState.player.inventory) {
      return []
    }
    
    return $gameState.player.inventory
      .map(itemId => $gameState.storyData!.items!.find(item => item.id === itemId))
      .filter(Boolean) as Item[]
  }
</script>

<div class="inventory-panel">
  <div class="panel-header">
    <h3 class="panel-title">🎒 Инвентарь</h3>
    <span class="item-count">{getInventoryItems().length}</span>
  </div>
  
  <div class="inventory-grid">
    {#each getInventoryItems() as item}
      <div 
        class:selected={selectedItem?.id === item.id}
        class="inventory-item"
        on:click={() => selectedItem = item}
        title={`${item.name}: ${item.description}`}
      >
        <div class="item-icon">
          {#if item.icon}
            <img 
              src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${globalThis.$currentStory?.bucket}/${item.icon}`} 
              alt={item.name}
              class="item-image"
            />
          {:else}
            <div class="icon-placeholder">
              {item.type === 'key' ? '🔑' : 
               item.type === 'tool' ? '🛠️' : 
               item.type === 'consumable' ? '🍶' : 
               item.type === 'quest' ? '📜' : '📦'}
            </div>
          {/if}
        </div>
        
        <div class="item-info">
          <div class="item-name">{item.name}</div>
          <div class="item-type">{item.type}</div>
        </div>
      </div>
    {:else}
      <div class="empty-inventory">
        <div class="empty-icon">📭</div>
        <div class="empty-text">Инвентарь пуст</div>
      </div>
    {/each}
  </div>
  
  <!-- Детали выбранного предмета -->
  {#if selectedItem}
    <div class="item-details">
      <h4 class="details-title">{selectedItem.name}</h4>
      <p class="item-description">{selectedItem.description}</p>
      
      <div class="item-meta">
        <div class="meta-row">
          <span class="meta-label">Тип:</span>
          <span class="meta-value">{selectedItem.type}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">ID:</span>
          <span class="meta-value code">{selectedItem.id}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .inventory-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(30, 30, 30, 0.95);
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.3);
  }
  
  .panel-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
  }
  
  .item-count {
    background: rgba(0, 122, 204, 0.3);
    color: #4db6ac;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }
  
  .inventory-grid {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
  }
  
  .inventory-item {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  
  .inventory-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  .inventory-item.selected {
    background: rgba(0, 122, 204, 0.15);
    border-color: rgba(0, 122, 204, 0.5);
    box-shadow: 0 4px 12px rgba(0, 122, 204, 0.2);
  }
  
  .item-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .item-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .icon-placeholder {
    font-size: 32px;
    opacity: 0.8;
  }
  
  .item-info {
    text-align: center;
    width: 100%;
  }
  
  .item-name {
    font-weight: 600;
    color: white;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .item-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    margin-top: 2px;
  }
  
  .empty-inventory {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 16px;
    text-align: center;
  }
  
  .item-details {
    padding: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.3);
    animation: fadeIn 0.3s ease-out;
  }
  
  .details-title {
    margin: 0 0 10px 0;
    font-size: 18px;
    color: white;
  }
  
  .item-description {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
    margin-bottom: 15px;
    font-size: 14px;
  }
  
  .item-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .meta-label {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
  }
  
  .meta-value {
    color: white;
    font-size: 13px;
    font-weight: 500;
  }
  
  .meta-value.code {
    font-family: monospace;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>