<script lang="ts">
  import StoryCard from './StoryCard.svelte'
  import CreateStoryModal from './CreateStoryModal.svelte'
  
  import { stories, currentStory, setCurrentStory } from '../../stores/storyStore'
  
  let showCreateModal = $state(false)
  
  function handleSelectStory(story: any) {
    setCurrentStory(story)
    dispatch('open-editor')
  }
</script>

<div class="story-selector">
  <div class="header">
    <h1>Выберите историю</h1>
    <button on:click={() => showCreateModal = true} class="btn primary">
      + Новая история
    </button>
  </div>
  
  <div class="stories-grid">
    {#each $stories as story}
      <StoryCard 
        {story} 
        isSelected={$currentStory?.id === story.id}
        on:select={() => handleSelectStory(story)}
      />
    {/each}
  </div>
</div>

{#if showCreateModal}
  <CreateStoryModal on:close={() => showCreateModal = false} />
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