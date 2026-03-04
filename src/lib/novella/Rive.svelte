<script lang="ts">
  import { onMount } from "svelte";
  import * as rive from "@rive-app/canvas";
  import { bucketName as defaultBucketName, supabaseUrlFile } from '../store/store.svelte';
  import { gameModeState } from '../store/gameModeStore.svelte';

  let { fileName, bucketName = defaultBucketName, isBackground = false } = $props();
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
        // Ищем trigger с именем T1
        const trigger = inputs.find(i => i.name === 'T1' && i.type === 'trigger');
        if (trigger) {
          (trigger as any).fire();
          console.log('[Rive] Trigger T1 fired');
        } else {
          // Если T1 не найден, запускаем первый попавшийся trigger
          for (const input of inputs) {
            if (input.type === 'trigger') {
              (input as any).fire();
              console.log('[Rive] Trigger fired');
              break;
            }
          }
        }
      } catch (e) {
        console.log('[Rive] Trigger error:', e);
      }
    }
  }

  onMount(() => {
    if (!canvas) return;

    const riveUrl = getRiveUrl();
    console.log('[Rive] Загрузка из:', riveUrl);

    riveInstance = new rive.Rive({
      src: riveUrl,
      canvas,
      autoplay: true,
      stateMachines: "SM1", // SM1 содержит trigger T1
      onStateChange: (event) => {
        console.log('[Rive] State changed:', event);
      },
    });

    return () => {
      riveInstance?.cleanup();
    };
  });

  // Запускать trigger T1 только для background при клике
  function handleCanvasClick() {
    if (isBackground) {
      triggerT1();
    }
  }
</script>

<div class="rive-wrapper">
  <canvas 
    bind:this={canvas} 
    width="250" 
    height="500"
    onclick={handleCanvasClick}
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