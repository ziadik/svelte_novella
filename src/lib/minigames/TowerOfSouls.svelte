<script lang="ts">
  import { onMount } from "svelte";
  import BodyWrapper from './components/BodyWrapper.svelte';
  import GameHeader from './components/GameHeader.svelte';
  import GameFooter from './components/GameFooter.svelte';
  import MinigameModal from './components/MinigameModal.svelte';
  import type { MinigameProps, ModalState } from './types';

  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props<MinigameProps>();

  type Card = {
    suit: "hearts" | "diamonds" | "clubs" | "spades";
    rank: number;
    faceUp: boolean;
  };

  type Pile = Card[];

  const SUITS: Array<"hearts" | "diamonds" | "clubs" | "spades"> = ["hearts", "diamonds", "clubs", "spades"];
  const SUIT_ICONS: Record<string, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
  };
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const RANK_NAMES: Record<number, string> = {
    1: "A",
    11: "J",
    12: "Q",
    13: "K",
  };

  let stock = $state<Pile>([]);
  let waste = $state<Pile>([]);
  let foundations = $state<Pile[]>([[], [], [], []]);
  let tableaus = $state<Pile[]>([[], [], [], [], [], [], []]);
  let selectedCard = $state<{ pile: number; index: number } | null>(null);

  let isGameOver = $state(false);
  let moves = $state(0);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => initGame());

  let isWin = $derived(foundations.every((f) => f.length === 13));

  function initGame(): void {
    let deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, faceUp: false });
      }
    }
    deck = deck.sort(() => Math.random() - 0.5);

    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableaus = [[], [], [], [], [], [], []];

    let cardIndex = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = deck[cardIndex++];
        card.faceUp = (i === j);
        tableaus[j].push(card);
      }
    }

    while (cardIndex < deck.length) {
      stock.push(deck[cardIndex++]);
    }

    selectedCard = null;
    moves = 0;
    isGameOver = false;
    hideModal();
  }

  function handleStockClick(): void {
    if (stock.length > 0) {
      const card = stock.pop()!;
      card.faceUp = true;
      waste.push(card);
    } else if (waste.length > 0) {
      stock = waste.reverse().map(c => ({ ...c, faceUp: false }));
      waste = [];
    }
    moves++;
  }

  function handleWasteClick(): void {
    if (waste.length === 0) return;
    selectedCard = { pile: -2, index: waste.length - 1 };
  }

  function handleTableauClick(tableauIndex: number, cardIndex: number): void {
    const tableau = tableaus[tableauIndex];

    if (selectedCard) {
      const { pile: sourcePile, index: sourceIndex } = selectedCard;
      let sourceCards: Card[];

      if (sourcePile === -2) {
        sourceCards = [waste[sourceIndex]];
      } else {
        sourceCards = tableaus[sourcePile].slice(sourceIndex);
      }

      const cardToMove = sourceCards[0];

      if (tableau.length === 0) {
        if (cardToMove.rank === 13) {
          moveCards(sourcePile, sourceIndex, tableauIndex, -1);
          selectedCard = null;
          return;
        }
      } else {
        const topCard = tableau[tableau.length - 1];
        const isOppositeColor = (cardToMove.suit === "hearts" || cardToMove.suit === "diamonds") !==
                               (topCard.suit === "hearts" || topCard.suit === "diamonds");
        if (isOppositeColor && cardToMove.rank === topCard.rank - 1) {
          moveCards(sourcePile, sourceIndex, tableauIndex, -1);
          selectedCard = null;
          return;
        }
      }

      if (sourceCards.length === 1) {
        for (let f = 0; f < 4; f++) {
          const foundation = foundations[f];
          if (foundation.length === 0) {
            if (cardToMove.rank === 1) {
              moveCards(sourcePile, sourceIndex, -1, f);
              selectedCard = null;
              return;
            }
          } else {
            const topCard = foundation[foundation.length - 1];
            if (cardToMove.suit === topCard.suit && cardToMove.rank === topCard.rank + 1) {
              moveCards(sourcePile, sourceIndex, -1, f);
              selectedCard = null;
              return;
            }
          }
        }
      }

      selectedCard = null;
    } else {
      if (cardIndex >= 0 && tableau[cardIndex]?.faceUp) {
        selectedCard = { pile: tableauIndex, index: cardIndex };
      }
    }
  }

  function handleFoundationClick(foundationIndex: number): void {
    if (!selectedCard) return;

    const { pile: sourcePile, index: sourceIndex } = selectedCard;
    let cardToMove: Card;

    if (sourcePile === -2) {
      cardToMove = waste[sourceIndex];
    } else {
      cardToMove = tableaus[sourcePile][sourceIndex];
    }

    const foundation = foundations[foundationIndex];

    if (foundation.length === 0) {
      if (cardToMove.rank === 1 && sourcePile >= -1) {
        const sourceCards = sourcePile === -2 ? [waste[sourceIndex]] : tableaus[sourcePile].slice(sourceIndex);
        if (sourceCards.length === 1) {
          moveCards(sourcePile, sourceIndex, -1, foundationIndex);
        }
      }
    } else {
      const topCard = foundation[foundation.length - 1];
      if (cardToMove.suit === topCard.suit && cardToMove.rank === topCard.rank + 1) {
        const sourceCards = sourcePile === -2 ? [waste[sourceIndex]] : tableaus[sourcePile].slice(sourceIndex);
        if (sourceCards.length === 1) {
          moveCards(sourcePile, sourceIndex, -1, foundationIndex);
        }
      }
    }

    selectedCard = null;
  }

  function moveCards(sourcePile: number, sourceIndex: number, targetTableau: number, targetFoundation: number): void {
    let cardsToMove: Card[];

    if (sourcePile === -2) {
      cardsToMove = [waste.pop()!];
    } else {
      cardsToMove = tableaus[sourcePile].splice(sourceIndex);
      if (tableaus[sourcePile].length > 0) {
        tableaus[sourcePile][tableaus[sourcePile].length - 1].faceUp = true;
      }
    }

    if (targetTableau >= 0) {
      tableaus[targetTableau].push(...cardsToMove);
    } else if (targetFoundation >= 0) {
      foundations[targetFoundation].push(...cardsToMove);
    }

    moves++;
    checkGameStatus();
  }

  function checkGameStatus(): void {
    if (isWin) {
      isGameOver = true;
      if (integrated) {
        showModal("🎉 Победа!", `Вы собрали все души за ${moves} ходов!`, []);
        setTimeout(() => {
          hideModal();
          onWin?.();
        }, 3000);
      } else {
        showModal("🎉 Победа!", `Вы собрали все души за ${moves} ходов!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  function handleGiveUp(): void {
    if (integrated) {
      showModal("💀 Сдаюсь", "Вы сдались...", []);
      setTimeout(() => {
        hideModal();
        onLose?.();
      }, 3000);
    } else {
      showModal("Конец", "Попробуйте ещё раз!", [
        { text: "Новая игра", action: initGame },
      ]);
    }
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    // if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function getRankDisplay(rank: number): string {
    return RANK_NAMES[rank] || rank.toString();
  }

  function getCardColor(suit: string): string {
    return (suit === "hearts" || suit === "diamonds") ? "#e94560" : "#ececec";
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
  />

  <div id="game-container">
    <div class="top-row">
      <div class="pile stock" onclick={handleStockClick}>
        {#if stock.length > 0}
          <div class="card back"></div>
        {:else}
          <div class="card empty">🔄</div>
        {/if}
      </div>

      <div class="pile waste" onclick={handleWasteClick}>
        {#if waste.length > 0}
          <div class="card front" class:selected={selectedCard?.pile === -2}>
            <span class="rank">{getRankDisplay(waste[waste.length - 1].rank)}</span>
            <span class="suit" style="color: {getCardColor(waste[waste.length - 1].suit)}">
              {SUIT_ICONS[waste[waste.length - 1].suit]}
            </span>
          </div>
        {/if}
      </div>

      <div class="foundations">
        {#each foundations as foundation, f (f)}
          <div class="pile foundation" onclick={() => handleFoundationClick(f)}>
            {#if foundation.length > 0}
              <div class="card front">
                <span class="rank">{getRankDisplay(foundation[foundation.length - 1].rank)}</span>
                <span class="suit" style="color: {getCardColor(foundation[foundation.length - 1].suit)}">
                  {SUIT_ICONS[foundation[foundation.length - 1].suit]}
                </span>
              </div>
            {:else}
              <div class="card empty">👻</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="tableaus">
      {#each tableaus as tableau, t (t)}
        <div class="tableau" onclick={() => handleTableauClick(t, -1)}>
          {#each tableau as card, c (c)}
            <div
              class="card"
              class:front={card.faceUp}
              class:back={!card.faceUp}
              class:selected={selectedCard?.pile === t && selectedCard?.index === c}
              onclick={(e) => {
                e.stopPropagation();
                handleTableauClick(t, c);
              }}
              style="margin-top: {c > 0 ? '-80%' : '0'}; z-index: {c};"
            >
              {#if card.faceUp}
                <span class="rank">{getRankDisplay(card.rank)}</span>
                <span class="suit" style="color: {getCardColor(card.suit)}">
                  {SUIT_ICONS[card.suit]}
                </span>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="moves-counter">Ходов: <strong>{moves}</strong></span>
    </div>
  </GameFooter>

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 15px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 15px;
  }

  .top-row {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .pile {
    width: 50px;
    height: 70px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px dashed rgba(255, 255, 255, 0.2);
  }

  .foundations {
    display: flex;
    gap: 5px;
    margin-left: auto;
  }

  .tableaus {
    display: flex;
    gap: 8px;
  }

  .tableau {
    width: 50px;
    min-height: 250px;
    cursor: pointer;
  }

  .card {
    width: 50px;
    height: 70px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    transition: transform 0.1s;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  }

  .card.front {
    background-color: #3d3b5c;
    color: #ececec;
    border: 1px solid #5e5c8a;
  }

  .card.back {
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 1px solid #5e5c8a;
  }

  .card.empty {
    background-color: transparent;
    border: 2px dashed rgba(255, 255, 255, 0.1);
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.2);
  }

  .card.selected {
    transform: translateY(-10px);
    box-shadow: 0 0 15px #ff9f43;
    border-color: #ff9f43;
  }

  .rank {
    font-size: 1rem;
  }

  .suit {
    font-size: 1.2rem;
  }

  @media (max-width: 400px) {
    .pile,
    .card,
    .tableau {
      width: 40px;
    }

    .card,
    .pile {
      height: 55px;
    }

    .tableau {
      min-height: 200px;
    }

    .rank {
      font-size: 0.8rem;
    }

    .suit {
      font-size: 1rem;
    }
  }

  .footer-stats {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .moves-counter {
    font-size: 0.9rem;
    color: #ececec;
  }

  .moves-counter strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }
</style>
