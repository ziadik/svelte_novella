<script lang="ts">
  let { children } = $props<{ children: any }>();
</script>

<div class="body-wrapper">
  {@render children()}
</div>

<style>
  /* Общие стили для body-обёртки вместо :global(body) */
  .body-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    height: 100%;
    user-select: none;
    padding: 10px;
    box-sizing: border-box;
    overflow-y: auto;
    background-color: #120f1a;
    background-image: radial-gradient(circle at center, #2a2a40 0%, #120f1a 100%);
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #ececec;
  }

  @media (max-width: 380px) {
    .body-wrapper {
      align-items: stretch;
      padding: 5px;
    }
  }
</style>
