<script lang="ts">
  import Header from './components/layout/Header.svelte'
  import StorySelector from './components/story-selector/StorySelector.svelte'
  import Editor from './components/editor/Editor.svelte'
  import Game from './components/game/GameView.svelte'
  
  import { showEditor } from './stores/editorStore'
  import { currentStory } from './stores/storyStore'
  
  type View = 'select' | 'editor' | 'game'
  
  let currentView = $state<View>('select')
  
  // Восстанавливаем состояние из localStorage
  $effect(() => {
    const savedView = localStorage.getItem('currentView') as View
    if (savedView) {
      currentView = savedView
    }
  })
  
  // Сохраняем состояние при изменении
  $effect(() => {
    localStorage.setItem('currentView', currentView)
  })
  
  function handleViewChange(view: View) {
    currentView = view
  }
</script>

<Header {currentView} on:view-change={handleViewChange} />

<main class="main-content">
  {#if currentView === 'select'}
    <StorySelector on:open-editor={() => currentView = 'editor'} />
  {:else if currentView === 'editor'}
    <Editor on:back={() => currentView = 'select'} />
  {:else if currentView === 'game'}
    <Game on:back={() => currentView = 'select'} />
  {/if}
</main>

<style>
  .main-content {
    padding: var(--space-md);
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    min-height: calc(100vh - 60px); /* Вычитаем высоту хедера */
  }
</style>