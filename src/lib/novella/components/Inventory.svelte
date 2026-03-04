<script lang="ts">
  import { gameState } from '../../store/gameStore.svelte';
  import { gameModeState } from '../../store/gameModeStore.svelte';
  import { supabaseUrlFile } from '../../store/store.svelte';

  let isOpen = $state(false);

  // Получаем предметы инвентаря
  const inventoryItems = $derived(gameState.getInventoryItems());

  // Статы игрока
  const stats = $derived(gameState.player.stats);

  // Bucket для загрузки ресурсов
  const bucket = $derived(gameState.selectedStoryData?.bucket || 'stories');

  /**
   * Получить URL для иконки предмета
   */
  function getItemIconUrl(iconName: string): string {
    // В игровом режиме используем локальные assets
    if (gameModeState.isGame) {
      const basePath = import.meta.env.BASE_URL || '/';
      return `${basePath}stories/${bucket}/${iconName}`;
    }
    // В редакторе используем Supabase
    return `${supabaseUrlFile}/storage/v1/object/public/${bucket}/${iconName}`;
  }

  function toggleInventory() {
    isOpen = !isOpen;
  }

  function handleItemClick(item: any) {
    // Можно добавить функциональность использования предмета
    console.log('Выбран предмет:', item.name);
  }
</script>

<div class="inventory-wrapper">
  <!-- Кнопка инвентаря -->
  <button
    class="inventory-button"
    onclick={toggleInventory}
    title="Инвентарь ({inventoryItems.length})"
  >
    🎒
    {#if inventoryItems.length > 0}
      <span class="inventory-badge">{inventoryItems.length}</span>
    {/if}
  </button>

  <!-- Модальное окно инвентаря -->
  {#if isOpen}
    <div class="inventory-overlay" role="dialog" tabindex="-1" onclick={toggleInventory} onkeydown={(e) => e.key === 'Escape' && toggleInventory()}>
      <div class="inventory-modal" role="dialog" aria-label="Окно инвентаря" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <div class="inventory-header">
          <h2>Инвентарь</h2>
          <button class="close-button" onclick={toggleInventory}>✕</button>
        </div>

        <!-- Статы -->
        <div class="stats-section">
          <h3>Характеристики</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-icon">📚</span>
              <div class="stat-info">
                <span class="stat-name">Знания</span>
                <span class="stat-value">{stats.knowledge}</span>
              </div>
            </div>
            <div class="stat-item">
              <span class="stat-icon">💪</span>
              <div class="stat-info">
                <span class="stat-name">Смелость</span>
                <span class="stat-value">{stats.courage}</span>
              </div>
            </div>
            <div class="stat-item">
              <span class="stat-icon">✨</span>
              <div class="stat-info">
                <span class="stat-name">Харизма</span>
                <span class="stat-value">{stats.charisma}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Предметы -->
        <div class="items-section">
          <h3>Предметы ({inventoryItems.length})</h3>
          {#if inventoryItems.length > 0}
            <div class="items-grid">
              {#each inventoryItems as item (item.id)}
                <button
                  type="button"
                  class="item-card"
                  onclick={() => handleItemClick(item)}
                  aria-label={`Предмет: ${item.name}`}
                >
                  <div class="item-icon">
                    {#if item.icon}
                      <img
                        src={getItemIconUrl(item.icon)}
                        alt={item.icon}
                        class="icon-preview"
                        height="64px"
                      />
                    {:else}
                      <span class="fallback-icon">📦</span>
                    {/if}
                  </div>
                  <div class="item-info">
                    <span class="item-name">{item.name}</span>
                    <span class="item-type">{item.type}</span>
                  </div>
                </button>
              {/each}
            </div>
          {:else}
            <div class="empty-inventory">
              <span class="empty-icon">🎒</span>
              <p>Инвентарь пуст</p>
              <p class="empty-hint">Получайте предметы в ходе игры</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  .inventory-wrapper {
    position: fixed;
    z-index: 1001;
  }

  /* Кнопка инвентаря */
  .inventory-button {
    position: fixed;
    top: calc(16px + var(--safe-area-top));
    left: calc(16px + var(--safe-area-left));
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inventory-button:hover {
    background: rgba(233, 69, 96, 0.8);
    transform: scale(1.1);
  }

  .inventory-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #e94560;
    color: white;
    font-size: 12px;
    font-weight: bold;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* Оверлей */
  .inventory-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1002;
    padding: 20px;
    padding-top: calc(20px + var(--safe-area-top));
    padding-bottom: calc(20px + var(--safe-area-bottom));
    backdrop-filter: blur(5px);
  }

  /* Модальное окно */
  .inventory-modal {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    width: 100%;
    max-width: 450px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
  }

  /* Заголовок */
  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .inventory-header h2 {
    margin: 0;
    font-size: 24px;
    color: #fff;
    font-weight: 600;
  }

  .close-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 24px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: rgba(233, 69, 96, 0.8);
    transform: rotate(90deg);
  }

  /* Контент */
  .inventory-modal {
    overflow-y: auto;
  }

  .inventory-modal::-webkit-scrollbar {
    width: 6px;
  }

  .inventory-modal::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  .inventory-modal::-webkit-scrollbar-thumb {
    background: rgba(233, 69, 96, 0.5);
    border-radius: 3px;
  }

  /* Секции */
  .stats-section,
  .items-section {
    padding: 20px;
  }

  .stats-section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stats-section h3,
  .items-section h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #e94560;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Сетка статов */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stat-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
  }

  .stat-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 24px;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-name {
    font-size: 11px;
    color: #888;
    margin-bottom: 2px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
  }

  /* Сетка предметов */
  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .item-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    font-family: inherit;
  }

  .item-card:hover {
    background: rgba(233, 69, 96, 0.2);
    border-color: rgba(233, 69, 96, 0.5);
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(233, 69, 96, 0.3);
  }

  .item-card:focus-visible {
    outline: 2px solid #e94560;
    outline-offset: 2px;
  }

  .item-icon {
    font-size: 40px;
  }

  .item-info {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .item-name {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    word-wrap: break-word;
  }

  .item-type {
    font-size: 10px;
    color: #888;
    text-transform: capitalize;
  }

  /* Пустой инвентарь */
  .empty-inventory {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-inventory p {
    margin: 0;
    font-size: 14px;
  }

  .empty-hint {
    font-size: 12px;
    margin-top: 8px;
    opacity: 0.7;
  }
</style>
