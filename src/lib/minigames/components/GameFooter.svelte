<script lang="ts">
  import RewardPanel from './RewardPanel.svelte';
  import type { Item } from '../types';
  import type { Snippet } from 'svelte';

  let {
    rewardItem = null,
    items = [],
    bucketName = "dracula",
    children,
  } = $props<{
    rewardItem?: string | { id?: string; icon?: string; name?: string } | null;
    items?: Item[];
    bucketName?: string;
    children?: Snippet;
  }>();
</script>

<div id="game-footer">
  <RewardPanel {rewardItem} {items} {bucketName} />

  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  #game-footer {
    width: 100%;
    max-width: 390px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
</style>
