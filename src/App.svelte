<script lang="ts">
  import Editor from './lib/editor/Editor.svelte';
  import Main from './lib/novella/Main.svelte';
  import { editor, editorActions } from './lib/editor/stores/editorStore.svelte';
</script>

{#if editor.showEditor}
  <button 
    onclick={editorActions.toggleEditor}
    style="position:fixed; top:10px; right:500px; z-index:9999;"
  >
    Закрыть редактор
  </button>
  <Editor />
{:else}
  
<button 
    onclick={editorActions.toggleEditor}
    id="content"
    style="position:fixed; bottom:10px; right:10px; z-index:9999;"
  >
    Редактор
  </button>
  <Main />
{/if}
<style>
  @media (max-width: 768px) { #content { display: none; } }
</style>