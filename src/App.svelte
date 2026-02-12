<script lang="ts">
  import Header from './components/layout/Header.svelte'
  import StorySelector from './components/story-selector/StorySelector.svelte'
  import Editor from './components/editor/Editor.svelte'
  import Game from './components/game/GameView.svelte'
  
  import { showEditor } from './stores/editorStore.svelte'
  import { currentStory } from './stores/storyStore.svelte'
  
  type View = 'select' | 'editor' | 'game'
  
  // Восстанавливаем состояние из localStorage при инициализации
  const savedView = localStorage.getItem('currentView') as View
  let currentView = $state<View>(savedView || 'select')

  // Сохраняем состояние при изменении
  $effect(() => {
    localStorage.setItem('currentView', currentView)
  })
  
  function handleViewChange(view: View) {
    currentView = view
  }
</script>

<Header {currentView} onViewChange={handleViewChange} />

<main class="main-content">
  {#if currentView === 'select'}
    <StorySelector openEditor={() => currentView = 'editor'} />
  {:else if currentView === 'editor'}
    <Editor onback={() => currentView = 'select'} />
  {:else if currentView === 'game'}
    <Game onback={() => currentView = 'select'} />
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