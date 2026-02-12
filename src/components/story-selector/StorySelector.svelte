<script lang="ts">
  import StoryCard from './StoryCard.svelte'
  import CreateStoryModal from './CreateStoryModal.svelte'
  
  import { storiesList } from '../../stores/editorStore.svelte'
  import { storyActions } from '../../stores/storyStore.svelte'

  let showCreateModal = $state(false)

  const { openEditor } = $props<{
    openEditor?: () => void
  }>()

  async function handleSelectStory(storyName: string) {
    await storyActions.loadStory(storyName)
    openEditor?.()
  }
</script>

<div class="story-selector">
  <div class="header">
    <h1>Выберите историю</h1>
    <button onclick={() => showCreateModal = true} class="btn primary">
      + Новая история
    </button>
  </div>
  
  <div class="stories-grid">
    {#each storiesList() as storyName}
      <StoryCard 
        storyName={storyName}
        onselect={() => handleSelectStory(storyName)}
      />
    {/each}
  </div>
</div>

{#if showCreateModal}
  <CreateStoryModal onclose={() => showCreateModal = false} />
{/if}

<style>
  .story-selector {
    padding: var(--space-lg);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
  }
  
  .header h1 {
    font-size: 2rem;
    font-weight: 600;
  }
  
  .stories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-lg);
  }
  
  .btn {
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    background: var(--primary);
    color: white;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }
  
  .btn:hover {
    background: var(--primary-hover);
  }
  
  .btn.primary {
    background: var(--primary);
  }
</style>