<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from './lib/editor/Editor.svelte';
  import Main from './lib/novella/Main.svelte';
  import UserMenu from './lib/components/UserMenu.svelte';
  import { editor, editorActions } from './lib/editor/stores/editorStore.svelte';
  import { initAuth, authDerivedState } from './lib/store/authStore.svelte';

  let initialized = $state(false);

  onMount(async () => {
    await initAuth();
    initialized = true;
  });
</script>

{#if !initialized}
  <div class="loading-screen">
    <div class="loader"></div>
    <p>Загрузка...</p>
  </div>
{:else if editor.showEditor}
  <button 
    onclick={editorActions.toggleEditor}
    style="position:fixed; top:10px; right:500px; z-index:9999;"
  >
    ← Назад к игре
  </button>
  <Editor />
{:else}
  <UserMenu />
  <Main />
{/if}

<style>
  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: #ececec;
    gap: 20px;
  }

  .loader {
    width: 50px;
    height: 50px;
    border: 4px solid #3c3c3c;
    border-top-color: #e94560;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>