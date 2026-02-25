<script lang="ts">
  import type { Item, RewardItem } from '../types';

  let {
    rewardItem = null,
    items = [],
    bucketName = "dracula",
    label = "Награда",
  } = $props<{
    rewardItem?: string | RewardItem | null;
    items?: Item[];
    bucketName?: string;
    label?: string;
  }>();

  // Получение данных о награде
  function getRewardItemData(): Item | null {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem?.id;
    if (!itemId) return null;
    return items.find((item: Item) => item.id === itemId) || null;
  }

  let rewardItemData = $derived(getRewardItemData());
  let hasReward = $derived(!!rewardItemData);

  // Fallback данные если rewardItem передан как объект без описания
  let fallbackName = $derived(
    typeof rewardItem === "object" && rewardItem?.name ? rewardItem.name : null
  );

  function handleImageError(e: Event): void {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  }
</script>

{#if rewardItemData || fallbackName}
  <div id="reward-panel">
    {#if rewardItemData?.icon || (typeof rewardItem === "object" && rewardItem.icon)}
      <div class="item-icon reward-glow">
        <img
          src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData?.icon || (typeof rewardItem === "object" ? rewardItem.icon : "")}`}
          alt={rewardItemData?.name || fallbackName || "Награда"}
          class="icon-preview"
          height="64px"
          onerror={handleImageError}
        />
      </div>
    {/if}
    <div class="reward-info">
      <div class="reward-label">{label}:</div>
      <div class="reward-name">{rewardItemData?.name || fallbackName || "Неизвестный предмет"}</div>
    </div>
  </div>
{/if}

<style>
  #reward-panel {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(255, 215, 0, 0.05);
    border-radius: 15px;
  }

  .item-icon {
    width: 36px;
    height: 36px;
    background: #2d2d2d;
    border-radius: 8px;
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

  .reward-glow {
    animation: icon-glow 2s ease-in-out infinite;
    border-color: rgba(255, 215, 0, 0.5);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }

  @keyframes icon-glow {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      border-color: rgba(255, 215, 0, 0.4);
    }
    50% {
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      border-color: rgba(255, 215, 0, 0.7);
    }
  }

  .reward-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .reward-label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .reward-name {
    font-size: 0.85rem;
    color: #ffd700;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
  }

  @media (max-width: 340px) {
    .reward-label {
      display: none;
    }
  }
</style>
