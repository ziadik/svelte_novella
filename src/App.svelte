<script lang="ts">
    // import { isAppleClient } from "./lib/client_utils";
    import Main from "./lib/novella/Main.svelte";
    // import TelegramApp from "./lib/novella_telegram/TelegramApp.svelte";
    // import { ifUseTelegram } from "./lib/telegram";
    import Editor from './lib/editor/Editor.svelte';

   let showEditor = $state(false);
  // if (ifUseTelegram()) {
  //   console.log("Запущено в Telegram Mini App");
  // } else {
  //   console.log("Обычный браузер");
  // }

</script>
{#if showEditor}
  <button on:click={() => showEditor = false} style="position:fixed; top:10px; right:500px; z-index:9999;">Закрыть редактор</button>
  <Editor />
{:else}
  <button on:click={() => showEditor = true} style="position:fixed; bottom:10px; right:10px; z-index:9999;">Редактор</button>
  <Main />
{/if}
<!-- {#if ifUseTelegram()}
  <TelegramApp></TelegramApp>
{:else if isAppleClient()}
  <Main/>
{:else}
  <Main/>
  <p>Ты кто такой с*ка? Чтоб это сделать</p>
  <p>Мне бы очень не хотелось переходить на личности, вы уж извините, но хватает ли вашего уровня компетенции для работы в данном заведении?</p>
{/if} -->
