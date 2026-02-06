<script lang="ts">
  import { onMount } from "svelte";
  import * as rive from "@rive-app/canvas";
  import { bucketName, supabaseUrlFile } from '../store/store.svelte';

  let { fileName } = $props();
  let canvas = $state();

  onMount(() => {
    if (!canvas) return;

    const riveInstance = new rive.Rive({
      src: `${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${fileName}`,
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