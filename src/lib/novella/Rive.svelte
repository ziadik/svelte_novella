<script lang="ts">
  import { onMount } from "svelte";
  import * as rive from "@rive-app/canvas";
  import { bucketName as defaultBucketName, supabaseUrlFile } from '../store/store.svelte';
  import { gameModeState } from '../store/gameModeStore.svelte';

  let { fileName, bucketName = defaultBucketName } = $props();
  let canvas = $state<HTMLCanvasElement | null>(null);
  let riveInstance = $state<rive.Rive | null>(null);

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

  /**
   * Запустить trigger T1 (для background)
   */
  export function triggerT1() {
    if (riveInstance) {
      try {
        const inputs = riveInstance.stateMachineInputs("SM1");
        const trigger = inputs.find(i => i.name === 'T1');       
        if (trigger) {
          (trigger as any).fire();
        }
      } catch (e) {
        console.error('[Rive] Trigger error:', e);
      }
    }
  }

  onMount(() => {
    if (!canvas) return;

    const riveUrl = getRiveUrl();

    riveInstance = new rive.Rive({
      src: riveUrl,
      canvas,
      autoplay: true,
      stateMachines: "SM1", // SM1 содержит trigger T1
    });

    return () => {
      riveInstance?.cleanup();
    };
  });
</script>

<div class="rive-wrapper">
  <canvas 
    bind:this={canvas} 
    width="250" 
    height="500"
  ></canvas>
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