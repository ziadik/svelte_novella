<script lang="ts">
  import type { ModalState } from '../types';

  let { modal } = $props<{ modal: ModalState }>();

  function hideModal() {
    modal.show = false;
  }
</script>

{#if modal.show}
  <div id="modal-overlay" class:active={modal.show}>
    <div class="modal-content">
      <div class="modal-title">{modal.title}</div>
      <div class="modal-text">{modal.text}</div>
      <div class="modal-buttons">
        {#each modal.actions as action (action.text)}
          <button
            class="btn"
            class:btn-secondary={action.class === "btn-secondary"}
            onclick={action.action}
          >
            {action.text}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  #modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  #modal-overlay.active {
    opacity: 1;
    pointer-events: all;
  }

  .modal-content {
    background: #252338;
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid #5e5c8a;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
    max-width: 90%;
    width: 340px;
    transform: scale(0.8);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
  }

  #modal-overlay.active .modal-content {
    transform: scale(1);
  }

  .modal-title {
    font-size: 1.8rem;
    margin-bottom: 10px;
    color: #ff9f43;
  }

  .modal-text {
    margin-bottom: 30px;
    font-size: 1rem;
    line-height: 1.5;
    color: #ccc;
  }

  .modal-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }

  @media (max-width: 400px) {
    .modal-content {
      padding: 25px;
      width: 95%;
    }

    .modal-title {
      font-size: 1.5rem;
    }

    .modal-text {
      font-size: 0.9rem;
      margin-bottom: 20px;
    }

    .modal-buttons {
      gap: 10px;
    }
  }
</style>
