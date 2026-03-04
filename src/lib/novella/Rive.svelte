<script lang="ts">
  import { onMount } from "svelte";
  import * as rive from "@rive-app/canvas";
  import { bucketName as defaultBucketName, supabaseUrlFile } from '../store/store.svelte';
  import { gameModeState } from '../store/gameModeStore.svelte';

  let { fileName, bucketName = defaultBucketName } = $props();
  let canvas = $state<HTMLCanvasElement | null>(null);

  /**
   * Получить URL для Rive файла
   */
  function getRiveUrl(): string {
    // В игровом режиме используем локальные assets
    if (gameModeState.isGame) {
      const basePath = import.meta.env.BASE_URL || '/';
      return `${basePath}stories/${bucketName}/${fileName}`;
    }
    // В редакторе используем Supabase
    return `${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${fileName}`;
  }

  onMount(() => {
    if (!canvas) return;

    const riveUrl = getRiveUrl();
    console.log('[Rive] Загрузка из:', riveUrl);

    const riveInstance = new rive.Rive({
      src: riveUrl,
      canvas,
      autoplay: true,
      stateMachines: "SM1", // Можно сделать динамическим через props, если нужно
    });

    return () => {
      riveInstance.cleanup();
    };
  });
</script>

<div class="rive-wrapper">
  <canvas bind:this={canvas} width="250" height="500"></canvas>
</div>

<style>
  .rive-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>