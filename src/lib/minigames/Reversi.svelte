<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as Y from "yjs";
  import { YjsSupabaseProvider } from "../../lib/yjsSupabaseProvider";
  import { supabase } from "../../lib/supabaseClient";
  import { userKeyStore } from "../../lib/store/userKeyStore";
  import BodyWrapper from "./components/BodyWrapper.svelte";
  import GameHeader from "./components/GameHeader.svelte";
  import GameFooter from "./components/GameFooter.svelte";
  import MinigameModal from "./components/MinigameModal.svelte";
  import type { ModalState } from "./types";
  import type { MinigameProps } from "./types";

  // Очищаем просроченные комнаты при загрузке
  onMount(() => {
    cleanupOldRooms();
    // Запускаем периодическую очистку каждый час
    const interval = setInterval(cleanupOldRooms, 60 * 60 * 1000);
    return () => clearInterval(interval);
  });

  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props<MinigameProps>();

  // ===== НАСТРОЙКИ РЕВЕРСИ =====
  const SIZE = 8; // Поле 8x8 для Реверси
  const TIMEOUT = 1000;
  const PLAYERS = ["⚫", "⚪"] as const; // Черные и белые
  const YJS_SYMBOLS = ["X", "O"] as const; // X = Black (черные), O = White (белые)

  type Player = (typeof PLAYERS)[number];

  // Конвертация Yjs символ -> отображаемый символ
  function fromYjsSymbol(s: string | null): Player | null {
    if (s === YJS_SYMBOLS[0]) return PLAYERS[0];
    if (s === YJS_SYMBOLS[1]) return PLAYERS[1];
    return null;
  }

  // Конвертация отображаемый символ -> Yjs символ
  function toYjsSymbol(p: Player): string {
    return p === PLAYERS[0] ? YJS_SYMBOLS[0] : YJS_SYMBOLS[1];
  }

  // Режимы игры
  type GameMode = "menu" | "computer" | "local" | "online" | "online_menu";
  let gameMode = $state<GameMode>("menu");

  // Список комнат
  interface RoomInfo {
    room_id: string;
    room_name: string;
    player_count: number;
    created_at: string;
    created_by_user_key?: string;
    expires_at?: string;
    is_user_in_room?: boolean;
    user_symbol?: string;
    other_player_symbol?: string;
  }
  let rooms = $state<RoomInfo[]>([]);
  let newRoomName = $state("");
  let isLoadingRooms = $state(false);

  // Офлайн-состояние
  let board = $state<(Player | null)[]>(Array(SIZE * SIZE).fill(null));
  let currentPlayer = $state<Player>(PLAYERS[0]);
  let gameOver = $state(false);
  let winner = $state<Player | null>(null);

  // Для Реверси нужно знать счет
  let blackCount = $state(2);
  let whiteCount = $state(2);
  let validMoves = $state<number[]>([]); // Доступные ходы для текущего игрока

  // Онлайн-состояние
  let roomId = $state("");
  let roomName = $state("");
  let playerSymbol: Player | null = $state(null);
  let isConnected = $state(false);
  let waitingForOpponent = $state(false);
  let opponentJoined = $state(false);

  // Новые поля для комнаты
  let roomCreator = $state<string | null>(null); // Кто создал комнату
  let roomExpiresAt = $state<string | null>(null); // Время истечения комнаты

  // Yjs
  let doc: Y.Doc | null = null;
  let provider: YjsSupabaseProvider | null = null;
  let yBoard: Y.Array<{ position: number; value: string | null }> | null = null;
  let yCurrentPlayer: Y.Map<string> | null = null;

  let modal = $state<ModalState>({
    show: false,
    title: "",
    text: "",
    actions: [],
  });

  // ===== ОЧИСТКА =====
  async function cleanup() {
    stopWaitingForOpponent();

    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      inviteTimeout = null;
    }
    isWaitingForAccept = false;

    if (provider && (provider as any).saveInterval) {
      clearInterval((provider as any).saveInterval);
    }

    if (provider) {
      await provider.saveState();
    }

    // НЕ удаляем игрока из комнаты при выходе, чтобы он мог вернуться
    // Только если это не создатель, закрывающий комнату

    if (provider) {
      provider.destroy();
      provider = null;
    }
    if (doc) {
      doc.destroy();
      doc = null;
    }
    yBoard = null;
    yCurrentPlayer = null;

    roomId = "";
    roomName = "";
    playerSymbol = null;
    isConnected = false;
    waitingForOpponent = false;
    opponentJoined = false;
    roomCreator = null;
    roomExpiresAt = null;
  }

  onDestroy(() => {
    stopWaitingForOpponent();

    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      inviteTimeout = null;
    }

    if (provider && (provider as any).saveInterval) {
      clearInterval((provider as any).saveInterval);
    }

    if (provider) {
      provider.destroy();
      provider = null;
    }
    if (doc) {
      doc.destroy();
      doc = null;
    }
    yBoard = null;
  });

  // ===== ОНЛАЙН РЕЖИМ =====
  function showOnlineMenu() {
    gameMode = "online_menu";
    loadRooms();
  }

  async function cleanupOldRooms() {
    try {
      // Пытаемся использовать RPC функцию для очистки
      await supabase.rpc('cleanup_expired_rooms');
    } catch (e) {
      // Если RPC недоступна, используем старый метод
      try {
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        const { data: oldRooms } = await supabase
          .from("game_rooms")
          .select("room_id")
          .eq("game_type", "reversi")
          .lt("created_at", oneHourAgo);

        if (oldRooms && oldRooms.length > 0) {
          const oldRoomIds = oldRooms.map((r) => r.room_id);

          await supabase.from("game_players").delete().in("room_id", oldRoomIds);

          await supabase.from("game_rooms").delete().in("room_id", oldRoomIds);
        }
      } catch (e2) {
        console.error("[Reversi] Ошибка очистки старых комнат:", e2);
      }
    }
  }

  // Функция для ручного закрытия комнаты (только для создателя)
  async function closeRoomManually() {
    const userKey = userKeyStore.getCurrentKey();

    // Проверяем, является ли пользователь создателем
    if (userKey !== roomCreator) {
      showModal("🚫 Доступ запрещен", "Только создатель комнаты может закрыть её", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    showModal("❌ Закрыть комнату?", "Все игроки будут удалены из комнаты. Это действие нельзя отменить.", [
      { 
        text: "Закрыть", 
        action: async () => {
          await performCloseRoom();
        },
        class: "danger-btn"
      },
      { text: "Отмена", action: hideModal }
    ]);
  }

  async function performCloseRoom() {
    try {
      // Удаляем игроков
      await supabase
        .from("game_players")
        .delete()
        .eq("room_id", roomId);

      // Удаляем состояние игры
      await supabase
        .from("game_state")
        .delete()
        .eq("room_id", roomId);

      // Удаляем комнату
      await supabase
        .from("game_rooms")
        .delete()
        .eq("room_id", roomId);

      showModal("✅ Комната закрыта", "Комната успешно удалена", [
        { text: "OK", action: async () => { 
          hideModal();
          await cleanup(); 
          gameMode = 'online_menu'; 
          loadRooms(); 
        }}
      ]);
    } catch (e) {
      console.error('[Reversi] Ошибка при закрытии комнаты:', e);
      showModal("⚠️ Ошибка", "Не удалось закрыть комнату", [
        { text: "OK", action: hideModal }
      ]);
    }
  }

  async function loadRooms() {
    isLoadingRooms = true;
    await cleanupOldRooms();

    const userKey = userKeyStore.getCurrentKey();

    try {
      const { data, error } = await supabase.rpc("get_active_rooms", {
        p_game_type: "reversi",
        p_user_key: userKey,
      });

      if (error) {
        console.error("Error loading rooms:", error);
        await loadRoomsFromTable();
      } else {
        rooms = data || [];
      }
    } catch (e) {
      console.error("Error loading rooms:", e);
      await loadRoomsFromTable();
    }
    isLoadingRooms = false;
  }

  async function loadRoomsFromTable() {
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from("game_rooms")
        .select("room_id, room_name, created_at, created_by_user_key, expires_at")
        .eq("game_type", "reversi")
        .gt("created_at", new Date(Date.now() - 3600000).toISOString())
        .order("created_at", { ascending: false });

      if (roomsError) {
        console.error("Error loading rooms from table:", roomsError);
        rooms = [];
        return;
      }

      // Фильтруем просроченные комнаты
      const now = new Date();
      const validRooms = (roomsData || []).filter(room => {
        if (!room.expires_at) return true; // Если нет expires_at, считаем валидной
        return new Date(room.expires_at) > now;
      });

      const roomsWithPlayers = await Promise.all(
        validRooms.map(async (room) => {
          const { count } = await supabase
            .from("game_players")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.room_id);

          return {
            room_id: room.room_id,
            room_name: room.room_name,
            player_count: count || 0,
            created_at: room.created_at,
            created_by_user_key: room.created_by_user_key,
            expires_at: room.expires_at,
          };
        }),
      );

      rooms = roomsWithPlayers.filter((r) => r.player_count < 2);
    } catch (e) {
      console.error("Error in loadRoomsFromTable:", e);
      rooms = [];
    }
  }

  function generateRoomId(): string {
    return `reversi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  function generateRoomName(): string {
    const userKey = userKeyStore.getCurrentKey() || "";
    const key3 = userKey.slice(-3);
    const now = new Date();
    const hour = now.getHours().toString().padStart(2, "0");

    let username = "Player";
    if (
      typeof window !== "undefined" &&
      (window as any).Telegram?.WebApp?.initDataUnsafe?.user
    ) {
      const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
      username = tgUser.first_name || tgUser.username || "Player";
      if (username.length > 10) {
        username = username.slice(0, 10);
      }
    }

    return `${username} ${key3}${hour}`;
  }

  async function createRoom() {
    roomName = newRoomName.trim() || generateRoomName();
    const newRoomId = generateRoomId();

    const userKey = userKeyStore.getCurrentKey();
    if (!userKey) {
      showModal("⚠️ Ошибка", "Не удалось идентифицировать пользователя", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    // Рассчитываем время истечения (24 часа)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("game_rooms").insert({
      room_id: newRoomId,
      room_name: roomName,
      game_type: "reversi",
      created_by: userKey,
      created_by_user_key: userKey,
      expires_at: expiresAt
    });

    if (error) {
      console.error("[Reversi] Error creating room:", error);
      if (error.message.includes("relation") || error.code === "42P01") {
        showModal(
          "⚠️ Ошибка",
          "Таблица комнат не настроена. Обратитесь к администратору.",
          [{ text: "OK", action: hideModal }],
        );
      } else {
        showModal("⚠️ Ошибка", `Не удалось создать комнату: ${error.message}`, [
          { text: "OK", action: hideModal },
        ]);
      }
      return;
    }

    newRoomName = "";
    roomId = newRoomId;
    roomCreator = userKey;
    roomExpiresAt = expiresAt;
    await joinOnlineRoom();
  }

  async function joinRoom(selectedRoomId: string) {
    roomId = selectedRoomId;
    await joinOnlineRoom();
  }

  async function ensureTableExists(): Promise<boolean> {
    try {
      const { error: roomsError } = await supabase
        .from("game_rooms")
        .select("id", { count: "exact", head: true })
        .limit(1);

      const { error: playersError } = await supabase
        .from("game_players")
        .select("id", { count: "exact", head: true })
        .limit(1);

      if (
        (roomsError && roomsError.message.includes("does not exist")) ||
        (playersError && playersError.message.includes("does not exist"))
      ) {
        return false;
      }

      return true;
    } catch (e) {
      console.error("[Reversi] Error checking tables:", e);
      return false;
    }
  }

  async function joinOnlineRoom() {
    if (!roomId.trim()) return;

    const userKey = userKeyStore.getCurrentKey();
    if (!userKey) {
      showModal("⚠️ Ошибка", "Не удалось идентифицировать пользователя", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    // Получаем информацию о комнате
    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .select("room_name, created_by_user_key, expires_at")
      .eq("room_id", roomId)
      .single();

    if (roomError || !roomData) {
      showModal("⚠️ Ошибка", "Комната не найдена", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    // Проверяем, не истекла ли комната
    if (new Date(roomData.expires_at) < new Date()) {
      showModal("⏰ Комната истекла", "Срок жизни комнаты (24 часа) истек", [
        { text: "OK", action: () => { gameMode = 'online_menu'; loadRooms(); } }
      ]);
      return;
    }

    roomName = roomData.room_name;
    roomCreator = roomData.created_by_user_key;
    roomExpiresAt = roomData.expires_at;

    const tableReady = await ensureTableExists();
    if (!tableReady) {
      showModal("⚠️ Ошибка", "Не удалось подключиться. Проверьте интернет.", [
        { text: "OK", action: hideModal },
      ]);
      return;
    }

    // Проверяем, есть ли уже игрок в этой комнате
    const { data: existingPlayer } = await supabase
      .from("game_players")
      .select("symbol")
      .eq("room_id", roomId)
      .eq("user_key", userKey)
      .maybeSingle();

    if (existingPlayer) {
      // Игрок уже был в комнате, восстанавливаем его
      playerSymbol = existingPlayer.symbol === YJS_SYMBOLS[0] ? PLAYERS[0] : PLAYERS[1];

      // Получаем остальных игроков
      const { data: otherPlayers } = await supabase
        .from("game_players")
        .select("symbol")
        .eq("room_id", roomId)
        .neq("user_key", userKey);

      waitingForOpponent = !otherPlayers || otherPlayers.length === 0;
      opponentJoined = otherPlayers !== null && otherPlayers.length > 0;
    } else {
      // Новый игрок
      const { data: players, error: playersError } = await supabase
        .from("game_players")
        .select("symbol")
        .eq("room_id", roomId);

      if (playersError) {
        console.error("Error fetching players:", playersError);
        showModal("⚠️ Ошибка", "Не удалось подключиться к комнате.", [
          { text: "OK", action: hideModal },
        ]);
        return;
      }

      if (!players || players.length === 0) {
        playerSymbol = PLAYERS[0]; // ⚫ (черные ходят первыми)
        waitingForOpponent = true;
        opponentJoined = false;
      } else if (players.length === 1) {
        playerSymbol = PLAYERS[1]; // ⚪
        waitingForOpponent = false;
        opponentJoined = true;
      } else {
        showModal("🚫 Комната заполнена", "В этой комнате уже два игрока", [
          { text: "OK", action: hideModal },
        ]);
        return;
      }

      const symbolForDb =
        playerSymbol === PLAYERS[0] ? YJS_SYMBOLS[0] : YJS_SYMBOLS[1];
      const { error: insertError } = await supabase.from("game_players").insert({
        room_id: roomId,
        user_key: userKey,
        symbol: symbolForDb,
      });

      if (insertError) {
        console.error("Error inserting player:", insertError);
        showModal("⚠️ Ошибка", "Не удалось присоединиться к комнате.", [
          { text: "OK", action: hideModal },
        ]);
        return;
      }
    }

    // Инициализируем Yjs
    doc = new Y.Doc();
    yBoard = doc.getArray<{ position: number; value: string | null }>("board");
    yCurrentPlayer = doc.getMap<string>("currentPlayer");

    if (yBoard.length !== SIZE * SIZE) {
      if (yBoard.length > 0) {
        yBoard.delete(0, yBoard.length);
      }

      // Начальная расстановка для Реверси
      const initialBoard = Array.from({ length: SIZE * SIZE }, (_, i) => ({
        position: i,
        value: null,
      }));

      // Ставим 4 центральные фишки
      const center1 = (SIZE / 2 - 1) * SIZE + (SIZE / 2 - 1);
      const center2 = (SIZE / 2 - 1) * SIZE + SIZE / 2;
      const center3 = (SIZE / 2) * SIZE + (SIZE / 2 - 1);
      const center4 = (SIZE / 2) * SIZE + SIZE / 2;

      initialBoard[center1].value = YJS_SYMBOLS[1]; // ⚪
      initialBoard[center2].value = YJS_SYMBOLS[0]; // ⚫
      initialBoard[center3].value = YJS_SYMBOLS[0]; // ⚫
      initialBoard[center4].value = YJS_SYMBOLS[1]; // ⚪

      yBoard.insert(0, initialBoard);
    }

    // Инициализируем текущего игрока в Yjs если не установлен
    if (!yCurrentPlayer.has("player")) {
      yCurrentPlayer.set("player", PLAYERS[0]); // ⚫ ходит первым
    }

    // Наблюдатель за изменениями
    yBoard.observe((event) => {
      // Сбрасываем флаг блокировки при получении обновления от другого игрока
      isResetting = false;

      const freshYBoard = doc!.getArray<{
        position: number;
        value: string | null;
      }>("board");
      if (!freshYBoard) return;

      const yjsBoard = freshYBoard.toArray();
      const sorted = yjsBoard.sort((a, b) => a.position - b.position);

      // Преобразуем в массив игровых символов
      const newBoard = sorted.map((item) => fromYjsSymbol(item.value));

      // Проверяем, изменилась ли доска
      let boardChanged = false;
      for (let i = 0; i < newBoard.length; i++) {
        if (board[i] !== newBoard[i]) {
          boardChanged = true;
          break;
        }
      }

      if (!boardChanged) return; // Если доска не изменилась, ничего не делаем

      board = newBoard;
      updateCounts();

      // Получаем текущего игрока из Yjs
      const yPlayer = yCurrentPlayer.get("player");
      if (yPlayer) {
        const newCurrentPlayer = yPlayer as Player;
        if (currentPlayer !== newCurrentPlayer) {
          currentPlayer = newCurrentPlayer;
        }
      }

      // Проверяем, не закончилась ли игра
      const totalMoves = board.filter((cell) => cell !== null).length;
      if (totalMoves === SIZE * SIZE) {
        endGameOnline(determineWinner());
        return;
      }

      // Проверяем, есть ли ходы у текущего игрока
      const moves = getValidMoves(board, currentPlayer);

      if (moves.length === 0) {
        // Если нет ходов, переключаем игрока
        const nextPlayer =
          currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
        const nextMoves = getValidMoves(board, nextPlayer);

        if (nextMoves.length === 0) {
          // Если у обоих нет ходов - игра окончена
          endGameOnline(determineWinner());
        } else {
          currentPlayer = nextPlayer;
          validMoves = nextMoves;
        }
      } else {
        validMoves = moves;
      }

      winner = determineWinner();
    });

    // Наблюдатель за изменениями текущего игрока
    yCurrentPlayer.observe((event) => {
      const newPlayer = yCurrentPlayer.get("player");
      if (newPlayer && newPlayer !== currentPlayer) {
        console.log("[Reversi] Смена игрока через Yjs:", currentPlayer, "->", newPlayer);
        currentPlayer = newPlayer;
        validMoves = getValidMoves(board, currentPlayer);
      }
    });

    provider = new YjsSupabaseProvider(
      doc,
      roomId,
      () => {
        isResetting = false;
        // Сбрасываем состояние игры перед синхронизацией
        gameOver = false;
        winner = null;
        syncBoardFromYjs();
      },
      (boardData?: (string | null)[] | null) => {
        console.log("[Reversi] onRemoteUpdate вызван, boardData:", boardData);
        isResetting = false;
        // Сбрасываем состояние игры перед синхронизацией
        gameOver = false;
        winner = null;

        // ВСЕГДА синхронизируем board из Yjs для надёжности
        // Это гарантирует что мы получаем актуальное состояние
        console.log("[Reversi] Вызываем syncBoardFromYjs() для синхронизации");
        syncBoardFromYjs();
        return;
      },
    );
    isConnected = true;
    gameMode = "online";

    if (opponentJoined) {
      syncBoardFromYjs();
    }

    if (waitingForOpponent) {
      startWaitingForOpponent();
    }
  }

  function syncBoardFromYjs() {
    console.log("[Reversi] syncBoardFromYjs начал работу");
    if (!doc) {
      console.log("[Reversi] doc = null, выходим");
      return;
    }

    const currentYBoard = doc.getArray<{
      position: number;
      value: string | null;
    }>("board");
    if (!currentYBoard) {
      console.log("[Reversi] currentYBoard = null, выходим");
      return;
    }

    const yjsBoard = currentYBoard.toArray();
    // Защита: ограничиваем до 64 элементов (8x8 доска)
    const limitedBoard = yjsBoard.slice(0, SIZE * SIZE);
    const sorted = limitedBoard.sort((a, b) => a.position - b.position);
    console.log("[Reversi] Данные из Yjs:", JSON.stringify(sorted));
    board = sorted.map((item) => fromYjsSymbol(item.value));
    console.log("[Reversi] board обновлен:", board);

    updateCounts();

    // Получаем текущего игрока из Yjs
    if (yCurrentPlayer) {
      const yPlayer = yCurrentPlayer.get("player");
      console.log("[Reversi] syncBoardFromYjs - yPlayer:", yPlayer);
      if (yPlayer && (yPlayer === PLAYERS[0] || yPlayer === PLAYERS[1])) {
        const newCurrentPlayer = yPlayer as Player;
        if (currentPlayer !== newCurrentPlayer) {
          console.log("[Reversi] syncBoardFromYjs - смена игрока:", currentPlayer, "->", newCurrentPlayer);
          currentPlayer = newCurrentPlayer;
        }
      }
    }

    // Обновляем доступные ходы
    validMoves = getValidMoves(board, currentPlayer);

    // Проверяем, нужно ли пропустить ход
    if (validMoves.length === 0 && !gameOver) {
      const nextPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
      const nextMoves = getValidMoves(board, nextPlayer);

      if (nextMoves.length > 0) {
        currentPlayer = nextPlayer;
        validMoves = nextMoves;
      }
    }
    console.log("[Reversi] syncBoardFromYjs завершен");
  }

  let checkOpponentInterval: ReturnType<typeof setInterval> | null = null;

  function startWaitingForOpponent() {
    checkOpponentInterval = setInterval(async () => {
      if (!roomId || !waitingForOpponent) {
        stopWaitingForOpponent();
        return;
      }

      const { data: players, error } = await supabase
        .from("game_players")
        .select("symbol")
        .eq("room_id", roomId);

      if (!error && players && players.length >= 2) {
        stopWaitingForOpponent();
        opponentJoined = true;
        waitingForOpponent = false;

        showModal(
          "🎉 Соперник найден!",
          "Игра началась! Вы играете за ⚫ (черные)",
          [{ text: "Начать игру", action: hideModal }],
        );
      }
    }, 2000);
  }

  function stopWaitingForOpponent() {
    if (checkOpponentInterval) {
      clearInterval(checkOpponentInterval);
      checkOpponentInterval = null;
    }
  }

  // ===== ОСНОВНАЯ ЛОГИКА РЕВЕРСИ =====

  /**
   * Проверка валидности хода для Реверси
   */
  function isValidMove(
    board: (Player | null)[],
    row: number,
    col: number,
    player: Player,
  ): boolean {
    // Проверка границ
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return false;

    const index = row * SIZE + col;

    // Клетка должна быть пустой
    if (board[index] !== null) return false;

    const opponent = player === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];

    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      let foundOpponent = false;

      while (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        const cell = board[x * SIZE + y];

        if (cell === null) break;

        if (cell === opponent) {
          foundOpponent = true;
        } else if (cell === player) {
          if (foundOpponent) return true;
          break;
        } else {
          break;
        }

        x += dx;
        y += dy;
      }
    }

    return false;
  }

  /**
   * Получение всех валидных ходов для игрока
   */
  function getValidMoves(board: (Player | null)[], player: Player): number[] {
    const moves: number[] = [];

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (isValidMove(board, row, col, player)) {
          moves.push(row * SIZE + col);
        }
      }
    }

    return moves;
  }

  /**
   * Применение хода и переворот фишек
   */
  function applyMove(
    board: (Player | null)[],
    row: number,
    col: number,
    player: Player,
  ): (Player | null)[] {
    const newBoard = [...board];
    const index = row * SIZE + col;
    newBoard[index] = player;

    const opponent = player === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];

    const directions = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const [dx, dy] of directions) {
      let x = row + dx;
      let y = col + dy;
      const toFlip: number[] = [];

      while (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
        const cell = newBoard[x * SIZE + y];

        if (cell === null) break;

        if (cell === opponent) {
          toFlip.push(x * SIZE + y);
        } else if (cell === player) {
          // Переворачиваем все фишки между
          for (const flipIndex of toFlip) {
            newBoard[flipIndex] = player;
          }
          break;
        } else {
          break;
        }

        x += dx;
        y += dy;
      }
    }

    return newBoard;
  }

  /**
   * Обновление счетчиков
   */
  function updateCounts() {
    blackCount = board.filter((cell) => cell === PLAYERS[0]).length;
    whiteCount = board.filter((cell) => cell === PLAYERS[1]).length;
  }

  /**
   * Определение победителя
   */
  function determineWinner(): Player | null {
    if (blackCount > whiteCount) return PLAYERS[0];
    if (whiteCount > blackCount) return PLAYERS[1];
    return null; // Ничья
  }

  function handleOnlineClick(index: number) {
    console.log("[Reversi] handleOnlineClick вызван, currentPlayer:", currentPlayer, "playerSymbol:", playerSymbol);
    if (!isConnected || !yBoard || gameOver || !opponentJoined) return;
    if (board[index] !== null) return;
    if (currentPlayer !== playerSymbol) {
      console.log("[Reversi] Ход невозможен - не ваш ход!");
      return;
    }

    const row = Math.floor(index / SIZE);
    const col = index % SIZE;

    // Проверяем валидность хода
    if (!isValidMove(board, row, col, playerSymbol!)) return;

    // Применяем ход с переворотами
    const newBoard = applyMove(board, row, col, playerSymbol!);
    console.log("[Reversi] Новый board после хода:", newBoard);

    // Отправляем ПОЛНЫЙ board в Yjs - это гарантирует синхронизацию
    const fullBoardData = newBoard.map((cell, index) => ({
      position: index,
      value: cell ? toYjsSymbol(cell) : null,
    }));

    // Вычисляем следующего игрока
    const nextPlayerSymbol = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    console.log("[Reversi] Устанавливаю nextPlayerSymbol в Yjs:", nextPlayerSymbol);
    
    // Используем транзакцию для атомарного обновления board и currentPlayer
    doc.transact(() => {
      yBoard.delete(0, yBoard.length);
      yBoard.insert(0, fullBoardData);
      
      // Обновляем текущего игрока в Yjs
      yCurrentPlayer.set("player", nextPlayerSymbol);
    });
    console.log("[Reversi] Отправлен полный board в Yjs:", fullBoardData.filter(x => x.value).length, "фишек, nextPlayer:", nextPlayerSymbol);

    // Обновляем локальный board сразу для UI
    board = newBoard;
    updateCounts();

    // Проверяем окончание игры
    const totalMoves = board.filter((cell) => cell !== null).length;
    if (totalMoves === SIZE * SIZE) {
      endGameOnline(determineWinner());
      return;
    }

    // Проверяем, есть ли ходы у следующего игрока
    const nextPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    const nextMoves = getValidMoves(board, nextPlayer);

    if (nextMoves.length > 0) {
      currentPlayer = nextPlayer;
      validMoves = nextMoves;
    } else {
      // Если у следующего нет ходов, проверяем текущего
      const currentMoves = getValidMoves(board, currentPlayer);
      if (currentMoves.length === 0) {
        endGameOnline(determineWinner());
        return;
      }
      // Пропускаем ход
      validMoves = currentMoves;
    }

    if (provider) {
      provider.saveState();
    }
  }

  function endGameOnline(winnerPlayer: Player | null) {
    if (gameOver) return;

    // Обновляем счетчики перед определением победителя
    updateCounts();
    gameOver = true;
    winner = winnerPlayer;

    const blackScore = blackCount;
    const whiteScore = whiteCount;

    if (winnerPlayer) {
      const isMyWin = winnerPlayer === playerSymbol;
      if (integrated) {
        const msg = isMyWin
          ? `🎉 Ты победил! ${blackScore}:${whiteScore}`
          : `💀 Ты проиграл! ${blackScore}:${whiteScore}`;
        showModal(isMyWin ? "🎉 Победа!" : "💀 Поражение", msg, []);
        setTimeout(() => {
          hideModal();
          isMyWin ? onWin?.() : onLose?.();
        }, TIMEOUT);
      } else {
        const winnerName = winnerPlayer === PLAYERS[0] ? "⚫" : "⚪";
        const isMyWin = winnerPlayer === playerSymbol;
        showModal(
          isMyWin ? "🎉 Ты победил!" : "💀 Ты проиграл",
          `Победил ${winnerName}\nСчет: ${blackScore}:${whiteScore}`,
          [
            { text: "Играть снова", action: () => resetAndInvite() },
            {
              text: "В меню",
              action: async () => {
                hideModal();
                await cleanup();
                gameMode = "menu";
              },
            },
          ],
        );
      }
    } else {
      if (integrated) {
        showModal("🤝 Ничья!", `Ничья! ${blackScore}:${whiteScore}`, []);
        setTimeout(() => {
          hideModal();
          onLose?.();
        }, TIMEOUT);
      } else {
        showModal("🤝 Ничья!", `Ничья!\nСчет: ${blackScore}:${whiteScore}`, [
          { text: "Играть снова", action: () => resetAndInvite() },
          {
            text: "В меню",
            action: async () => {
              hideModal();
              await cleanup();
              gameMode = "menu";
            },
          },
        ]);
      }
    }
  }

  async function resetOnlineGame() {
    if (!yBoard || !provider || isResetting) return;

    // Предотвращаем множественные сбросы
    isResetting = true;

    try {
      // Создаем начальную расстановку
      const resetBoard = Array.from({ length: SIZE * SIZE }, (_, i) => ({
        position: i,
        value: null,
      }));

      const center1 = (SIZE / 2 - 1) * SIZE + (SIZE / 2 - 1);
      const center2 = (SIZE / 2 - 1) * SIZE + SIZE / 2;
      const center3 = (SIZE / 2) * SIZE + (SIZE / 2 - 1);
      const center4 = (SIZE / 2) * SIZE + SIZE / 2;

      resetBoard[center1].value = YJS_SYMBOLS[1]; // ⚪
      resetBoard[center2].value = YJS_SYMBOLS[0]; // ⚫
      resetBoard[center3].value = YJS_SYMBOLS[0]; // ⚫
      resetBoard[center4].value = YJS_SYMBOLS[1]; // ⚪

      // Используем специальный метод провайдера для сброса
      await provider.resetGame(resetBoard);

      // Обновляем локальное состояние
      board = Array(SIZE * SIZE).fill(null);
      board[center1] = PLAYERS[1];
      board[center2] = PLAYERS[0];
      board[center3] = PLAYERS[0];
      board[center4] = PLAYERS[1];

      currentPlayer = PLAYERS[0];
      gameOver = false;
      winner = null;
      blackCount = 2;
      whiteCount = 2;
      validMoves = getValidMoves(board, currentPlayer);

      // Если это первый игрок, показываем диалог приглашения
      if (playerSymbol === PLAYERS[0] && !integrated) {
        showResetInviteDialog();
      } else {
        hideModal();
      }
    } catch (e) {
      console.error("[Reversi] Ошибка при сбросе игры:", e);
    } finally {
      // Сбрасываем флаг через некоторое время
      setTimeout(() => {
        isResetting = false;
      }, 500);
    }
  }

  function showResetInviteDialog() {
    isWaitingForAccept = true;

    showModal(
      "🎮 Игра сброшена",
      `Доска очищена. Ход игрока ⚫

Ожидание подтверждения от соперника... (30 сек)`,
      [
        {
          text: "Отмена",
          action: async () => {
            await cancelInviteAndExit();
          },
        },
      ],
    );

    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
    }

    inviteTimeout = setTimeout(async () => {
      isWaitingForAccept = false;
      showModal("⏰ Время вышло", "Второй игрок не подтвердил перезапуск", [
        {
          text: "В меню",
          action: async () => {
            hideModal();
            await cleanup();
            gameMode = "menu";
          },
        },
      ]);
    }, 30000);
  }

  let inviteTimeout: ReturnType<typeof setTimeout> | null = null;
  let isWaitingForAccept = $state(false);
  let isResetting = $state(false); // Блокировка повторного сброса

  async function resetAndInvite() {
    if (isResetting) return;
    await resetOnlineGame();
  }

  async function cancelInviteAndExit() {
    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      inviteTimeout = null;
    }
    isWaitingForAccept = false;
    hideModal();
    await cleanup();
    gameMode = "online_menu";
    loadRooms();
  }

  // ===== ОФЛАЙН РЕЖИМ =====

  function startComputerMode() {
    gameMode = "computer";
    initGame();
  }

  function startLocalMode() {
    gameMode = "local";
    initGame();
  }

  function handleOfflineClick(index: number) {
    if (gameOver || board[index] !== null) return;

    const row = Math.floor(index / SIZE);
    const col = index % SIZE;

    // Проверяем валидность хода
    if (!isValidMove(board, row, col, currentPlayer)) return;

    // Применяем ход
    board = applyMove(board, row, col, currentPlayer);
    updateCounts();

    // Проверяем окончание игры
    const totalMoves = board.filter((cell) => cell !== null).length;
    if (totalMoves === SIZE * SIZE) {
      endGame(determineWinner());
      return;
    }

    // Переключаем игрока
    const nextPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    const nextMoves = getValidMoves(board, nextPlayer);

    if (nextMoves.length > 0) {
      currentPlayer = nextPlayer;
      validMoves = nextMoves;
    } else {
      // Если у следующего игрока нет ходов, проверяем текущего
      const currentMoves = getValidMoves(board, currentPlayer);
      if (currentMoves.length === 0) {
        // Если ни у кого нет ходов - игра окончена
        endGame(determineWinner());
      } else {
        // Пропускаем ход, показываем сообщение
        showModal(
          "⏭️ Ход пропущен",
          `У игрока ${nextPlayer === PLAYERS[0] ? "⚫" : "⚪"} нет доступных ходов.`,
          [{ text: "OK", action: hideModal }],
        );
        // Остаемся с текущим игроком
      }
    }

    // Ход компьютера
    if (gameMode === "computer" && currentPlayer === PLAYERS[1] && !gameOver) {
      setTimeout(computerMove, 500);
    }
  }

  function computerMove() {
    if (gameOver) return;

    const moves = getValidMoves(board, PLAYERS[1]);
    if (moves.length === 0) {
      // Если у компьютера нет ходов, переключаем на игрока
      const playerMoves = getValidMoves(board, PLAYERS[0]);
      if (playerMoves.length === 0) {
        endGame(determineWinner());
      } else {
        currentPlayer = PLAYERS[0];
        validMoves = playerMoves;
      }
      return;
    }

    // Простая стратегия: выбирать угол или край, если есть
    let bestMove = moves[0];
    let bestScore = -1;

    for (const move of moves) {
      const row = Math.floor(move / SIZE);
      const col = move % SIZE;

      // Приоритет углов
      if ((row === 0 || row === SIZE - 1) && (col === 0 || col === SIZE - 1)) {
        bestMove = move;
        break;
      }

      // Приоритет краев
      if (row === 0 || row === SIZE - 1 || col === 0 || col === SIZE - 1) {
        if (bestScore < 2) {
          bestMove = move;
          bestScore = 2;
        }
      }

      // Иначе оцениваем количество переворачиваемых фишек
      const testBoard = applyMove(board, row, col, PLAYERS[1]);
      const newBlackCount = testBoard.filter(
        (cell) => cell === PLAYERS[1],
      ).length;

      if (newBlackCount > bestScore) {
        bestScore = newBlackCount;
        bestMove = move;
      }
    }

    const row = Math.floor(bestMove / SIZE);
    const col = bestMove % SIZE;

    board = applyMove(board, row, col, PLAYERS[1]);
    updateCounts();

    // Проверяем окончание игры
    const totalMoves = board.filter((cell) => cell !== null).length;
    if (totalMoves === SIZE * SIZE) {
      endGame(determineWinner());
      return;
    }

    // Переключаем на игрока
    const playerMoves = getValidMoves(board, PLAYERS[0]);
    if (playerMoves.length > 0) {
      currentPlayer = PLAYERS[0];
      validMoves = playerMoves;
    } else {
      // Если у игрока нет ходов, компьютер ходит еще раз
      const computerMoves = getValidMoves(board, PLAYERS[1]);
      if (computerMoves.length > 0) {
        showModal(
          "⏭️ Ход пропущен",
          "У вас нет доступных ходов. Компьютер ходит снова.",
          [{ text: "OK", action: hideModal }],
        );
        setTimeout(computerMove, 500);
      } else {
        endGame(determineWinner());
      }
    }
  }

  // ===== ОБЩИЕ ФУНКЦИИ =====

  function endGame(winnerPlayer: Player | null) {
    if (gameOver) return;

    // Обновляем счетчики перед определением победителя
    updateCounts();
    gameOver = true;
    winner = winnerPlayer;

    const blackScore = blackCount;
    const whiteScore = whiteCount;

    if (winnerPlayer) {
      const winnerName = winnerPlayer === PLAYERS[0] ? "⚫" : "⚪";
      if (integrated) {
        const isPlayer1Win = winnerPlayer === PLAYERS[0];
        showModal(
          isPlayer1Win ? "🎉 Победа!" : "💀 Поражение",
          `Победил ${winnerName}!\nСчет: ${blackScore}:${whiteScore}`,
          [],
        );
        setTimeout(() => {
          hideModal();
          isPlayer1Win ? onWin?.() : onLose?.();
        }, TIMEOUT);
      } else {
        showModal(
          "🎉 Победа!",
          `Победил ${winnerName}!\nСчет: ${blackScore}:${whiteScore}`,
          [{ text: "Играть снова", action: initGame }],
        );
      }
    } else {
      if (integrated) {
        showModal("🤝 Ничья!", `Ничья! ${blackScore}:${whiteScore}`, []);
        setTimeout(() => {
          hideModal();
          onLose?.();
        }, TIMEOUT);
      } else {
        showModal("🤝 Ничья!", `Ничья!\nСчет: ${blackScore}:${whiteScore}`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  function initGame(): void {
    // Начальная расстановка для Реверси
    board = Array(SIZE * SIZE).fill(null);

    const center1 = (SIZE / 2 - 1) * SIZE + (SIZE / 2 - 1);
    const center2 = (SIZE / 2 - 1) * SIZE + SIZE / 2;
    const center3 = (SIZE / 2) * SIZE + (SIZE / 2 - 1);
    const center4 = (SIZE / 2) * SIZE + SIZE / 2;

    board[center1] = PLAYERS[1];
    board[center2] = PLAYERS[0];
    board[center3] = PLAYERS[0];
    board[center4] = PLAYERS[1];

    currentPlayer = PLAYERS[0];
    gameOver = false;
    winner = null;

    updateCounts();
    validMoves = getValidMoves(board, currentPlayer);

    hideModal();
  }

  function handleGiveUp(): void {
    gameOver = true;
    const winnerPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    const winnerName = winnerPlayer === PLAYERS[0] ? "⚫" : "⚪";

    if (integrated) {
      showModal("💀 Сдаюсь", `Победил ${winnerName}!`, []);
      setTimeout(() => {
        hideModal();
        onLose?.();
      }, TIMEOUT);
    } else {
      showModal("Конец", `Победил ${winnerName}! Попробуйте ещё раз!`, [
        { text: "Новая игра", action: initGame },
      ]);
    }
  }

  function showModal(
    title: string,
    text: string,
    actions: Array<{ text: string; action: () => void; class?: string }>,
  ): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal(
      "📖 Правила Реверси",
      `Отелло (Reversi) на поле 8x8:

🎯 Цель: К концу игры иметь больше своих фишек на доске.

⚫ Черные ходят первыми
⚪ Белые ходят вторыми

📋 Правила хода:
• Фишка ставится рядом с фишкой противника
• По горизонтали, вертикали или диагонали должен быть непрерывный ряд фишек противника между новой и вашей старой фишкой
• Все фишки противника в этом ряду переворачиваются на ваш цвет

⏭️ Если у игрока нет ходов, он пропускает ход

🤖 Компьютер — игра против AI
👥 На одном — два игрока на одном устройстве
🌐 Онлайн — игра по сети с другом`,
      [{ text: "Понятно", action: hideModal }],
    );
  }

  function backToMenu(): void {
    if (gameMode === "online") {
      cleanup();
    }
    gameMode = "menu";
    initGame();
  }

  function backToOnlineMenu(): void {
    if (gameMode === "online") {
      cleanup();
    }
    gameMode = "online_menu";
    loadRooms();
  }
</script>

<BodyWrapper>
  {#if gameMode === "menu"}
    <!-- МЕНЮ ВЫБОРА РЕЖИМА -->
    <GameHeader onRestart={() => {}} onShowRules={showRules} />

    <div id="game-container">
      <h2 class="menu-title">Реверси (Отелло)</h2>

      <button type="button" class="menu-btn" onclick={startComputerMode}>
        <span class="menu-icon">🤖</span>
        <span>Против компьютера</span>
      </button>

      <button type="button" class="menu-btn" onclick={startLocalMode}>
        <span class="menu-icon">👥</span>
        <span>На одном устройстве</span>
      </button>

      <button
        type="button"
        class="menu-btn online-btn"
        onclick={showOnlineMenu}
      >
        <span class="menu-icon">🌐</span>
        <span>Играть онлайн</span>
      </button>
    </div>

    <GameFooter {rewardItem} {items} {bucketName} />
  {:else if gameMode === "online_menu"}
    <!-- ОНЛАЙН МЕНЮ -->
    <GameHeader
      onRestart={() => {}}
      onShowRules={showRules}
      onBack={backToMenu}
    />

    <div id="game-container">
      <h2 class="menu-title">Онлайн Реверси</h2>

      <!-- Создание комнаты -->
      <div class="create-room-section">
        <input
          type="text"
          class="room-input"
          bind:value={newRoomName}
          placeholder="Название комнаты (необязательно)"
        />
        <button type="button" class="menu-btn create-btn" onclick={createRoom}>
          <span class="menu-icon">➕</span>
          <span>Создать комнату</span>
        </button>
      </div>

      <div class="divider">
        <span>или</span>
      </div>

      <!-- Список комнат -->
      <div class="rooms-section">
        <h3 class="rooms-title">Доступные комнаты</h3>

        {#if isLoadingRooms}
          <div class="loading">Загрузка...</div>
        {:else if rooms.length === 0}
          <div class="no-rooms">Нет доступных комнат</div>
        {:else}
          <div class="rooms-list">
            {#each rooms as room}
              <button
                type="button"
                class="room-item"
                class:user-in-room={room.is_user_in_room}
                onclick={() => joinRoom(room.room_id)}
                disabled={room.player_count >= 2 && !room.is_user_in_room}
              >
                <div class="room-info">
                  <span class="room-name">
                    {room.room_name}
                    {#if room.is_user_in_room}
                      <span class="user-badge">(Вы {room.user_symbol === YJS_SYMBOLS[0] ? '⚫' : '⚪'})</span>
                    {/if}
                  </span>
                  <span class="room-players">
                    {#if room.player_count === 0}
                      🟢 Пустая
                    {:else if room.player_count === 1}
                      {#if room.is_user_in_room}
                        🟡 Ожидание соперника
                      {:else}
                        🟡 1/2 игроков
                      {/if}
                    {:else}
                      🔴 Полная
                    {/if}
                  </span>
                </div>
                <div class="room-meta">
                  <span class="room-creator">
                    👑 {room.created_by_user_key === userKeyStore.getCurrentKey() ? 'Вы' : 'Создатель'}
                  </span>
                  <span class="room-expiry">
                    ⏳ до {new Date(room.expires_at).toLocaleTimeString()}
                  </span>
                </div>
                {#if room.other_player_symbol}
                  <div class="room-opponent">
                    Соперник: {room.other_player_symbol === YJS_SYMBOLS[0] ? '⚫' : '⚪'}
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Ручной ввод ID -->
      <div class="manual-join">
        <input
          type="text"
          class="room-input"
          bind:value={roomId}
          placeholder="ID комнаты"
        />
        <button
          type="button"
          class="menu-btn join-btn"
          onclick={() => joinOnlineRoom()}
        >
          Присоединиться
        </button>
      </div>
    </div>

    <GameFooter {rewardItem} {items} {bucketName} />
  {:else}
    <!-- ИГРА -->
    <GameHeader
      onRestart={gameMode === "online" ? resetOnlineGame : initGame}
      onGiveUp={integrated ? handleGiveUp : undefined}
      showGiveUp={integrated}
      onShowRules={showRules}
    />

    <div id="game-container">
      {#if gameMode === "online"}
        <div class="online-info">
          <span class="room-id">Комната: {roomName || roomId}</span>
          <span class="player-symbol">Вы играете за: {playerSymbol}</span>
          {#if roomCreator === userKeyStore.getCurrentKey()}
            <button
              type="button"
              class="close-room-btn"
              onclick={closeRoomManually}
              title="Закрыть комнату"
            >
              ❌
            </button>
          {/if}
        </div>

        {#if roomExpiresAt}
          <div class="room-expiry">
            ⏳ Комната активна до: {new Date(roomExpiresAt).toLocaleString()}
          </div>
        {/if}

        {#if waitingForOpponent}
          <div class="waiting-message">
            <div class="waiting-spinner">⏳</div>
            <p>Ожидание соперника...</p>
            <p class="waiting-hint">Поделитесь названием комнаты</p>
            <p class="room-id-copy">{roomName || roomId}</p>
          </div>
        {:else}
          <div class="score-board">
            <div class="score black-score">⚫ {blackCount}</div>
            <div class="score white-score">⚪ {whiteCount}</div>
          </div>

          <div class="status">
            {#if gameOver && winner}
              Победил: <span class="winner"
                >{winner} ({winner === PLAYERS[0]
                  ? blackCount
                  : whiteCount})</span
              >
            {:else if gameOver}
              Ничья ({blackCount}:{whiteCount})
            {:else}
              Ход: <span class="current-player">{currentPlayer}</span>
              {#if validMoves.length === 0}
                <span class="no-moves-warning"> (нет ходов)</span>
              {/if}
            {/if}
          </div>

          <div class="board board-8x8">
            {#each board as cell, i}
              <button
                type="button"
                class="cell cell-8x8"
                class:black-cell={cell === PLAYERS[0]}
                class:white-cell={cell === PLAYERS[1]}
                class:valid-move={!cell &&
                  !gameOver &&
                  currentPlayer === playerSymbol &&
                  validMoves.includes(i)}
                onclick={() => handleOnlineClick(i)}
                disabled={!!cell ||
                  gameOver ||
                  currentPlayer !== playerSymbol ||
                  !validMoves.includes(i)}
              >
                {cell ?? ""}
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="score-board">
          <div class="score black-score">⚫ {blackCount}</div>
          <div class="score white-score">⚪ {whiteCount}</div>
        </div>

        <div class="status">
          {#if gameOver && winner}
            Победил: <span class="winner"
              >{winner} ({winner === PLAYERS[0]
                ? blackCount
                : whiteCount})</span
            >
          {:else if gameOver}
            Ничья ({blackCount}:{whiteCount})
          {:else}
            Ход: <span class="current-player">{currentPlayer}</span>
            {#if validMoves.length === 0}
              <span class="no-moves-warning"> (нет ходов)</span>
            {/if}
          {/if}
        </div>

        <div class="board board-8x8">
          {#each board as cell, i}
            <button
              type="button"
              class="cell cell-8x8"
              class:black-cell={cell === PLAYERS[0]}
              class:white-cell={cell === PLAYERS[1]}
              class:valid-move={!cell &&
                !gameOver &&
                (gameMode !== "computer" || currentPlayer === PLAYERS[0]) &&
                validMoves.includes(i)}
              onclick={() => handleOfflineClick(i)}
              disabled={!!cell ||
                gameOver ||
                (gameMode === "computer" && currentPlayer === PLAYERS[1]) ||
                !validMoves.includes(i)}
            >
              {cell ?? ""}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <GameFooter {rewardItem} {items} {bucketName}>
      <div class="footer-stats">
        <span class="player-info">
          {#if gameMode === "online"}
            Вы: {playerSymbol} |
          {/if}
          Счет: ⚫ {blackCount} : {whiteCount} ⚪
        </span>
      </div>
    </GameFooter>
  {/if}

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  .menu-title {
    color: #ececec;
    text-align: center;
    margin-bottom: 20px;
    font-size: 1.3rem;
  }

  .menu-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 15px 20px;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .menu-btn:hover {
    transform: translateY(-2px);
    border-color: #e94560;
    box-shadow: 0 4px 15px rgba(233, 69, 96, 0.3);
  }

  .menu-icon {
    font-size: 1.5rem;
  }

  .create-room-section {
    width: 100%;
    margin-bottom: 15px;
  }

  .create-btn {
    background: linear-gradient(135deg, #00b894, #00a085);
  }

  .divider {
    display: flex;
    align-items: center;
    width: 100%;
    margin: 15px 0;
    color: #888;
    font-size: 0.85rem;
  }

  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  .divider span {
    padding: 0 10px;
  }

  .rooms-section {
    width: 100%;
    margin-bottom: 15px;
  }

  .rooms-title {
    color: #ececec;
    font-size: 0.95rem;
    margin-bottom: 10px;
    text-align: center;
  }

  .loading,
  .no-rooms {
    text-align: center;
    color: #888;
    padding: 15px;
    font-size: 0.9rem;
  }

  .rooms-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 150px;
    overflow-y: auto;
  }

  .room-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 12px 15px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .room-item:hover {
    border-color: #00b894;
    transform: translateY(-2px);
  }

  .room-item.user-in-room {
    border-color: #00b894;
    background: linear-gradient(135deg, #2d5a4a, #1d4a3a);
  }

  .room-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .your-room-badge {
    display: inline-block;
    font-size: 0.65rem;
    background: #00b894;
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    margin-left: 6px;
    vertical-align: middle;
  }

  .room-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .room-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-top: 6px;
    font-size: 0.75rem;
    color: #aaa;
  }

  .user-badge {
    font-size: 0.7rem;
    background: #00b894;
    color: white;
    padding: 2px 6px;
    border-radius: 8px;
    margin-left: 6px;
  }

  .room-opponent {
    font-size: 0.75rem;
    color: #ff6b6b;
    margin-top: 4px;
    width: 100%;
  }

  .room-name {
    font-weight: 500;
  }

  .room-players {
    font-size: 0.8rem;
    color: #00cec9;
  }

  .manual-join {
    width: 100%;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .join-btn {
    background: linear-gradient(135deg, #6c5ce7, #5b4cdb);
    margin-top: 8px;
  }

  .room-input {
    width: 100%;
    padding: 12px 15px;
    margin-bottom: 12px;
    background: #2a2a40;
    border: 2px solid #5e5c8a;
    border-radius: 10px;
    color: white;
    font-size: 1rem;
    font-family: inherit;
    box-sizing: border-box;
  }

  .room-input::placeholder {
    color: #888;
  }

  .room-input:focus {
    outline: none;
    border-color: #e94560;
  }

  .online-btn {
    background: linear-gradient(135deg, #6c5ce7, #5b4cdb);
  }

  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 15px;
    border-radius: 15px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 100%;
    overflow-x: auto;
    margin-bottom: 15px;
  }

  .online-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 10px;
    font-size: 0.85rem;
    color: #aaa;
  }

  .room-id {
    color: #00cec9;
  }

  .player-symbol {
    color: #ff9f43;
    font-weight: bold;
  }

  .close-room-btn {
    background: none;
    border: none;
    color: #e94560;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 5px;
    transition: transform 0.2s;
  }

  .close-room-btn:hover {
    transform: scale(1.2);
  }

  .room-expiry {
    font-size: 0.8rem;
    color: #888;
    text-align: center;
    margin-bottom: 5px;
  }

  .waiting-message {
    text-align: center;
    padding: 30px 20px;
  }

  .waiting-spinner {
    font-size: 3rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  .waiting-message p {
    color: #ececec;
    margin: 10px 0;
    font-size: 1.1rem;
  }

  .waiting-hint {
    color: #888 !important;
    font-size: 0.9rem !important;
  }

  .room-id-copy {
    background: #2a2a40;
    padding: 10px 20px;
    border-radius: 8px;
    color: #00cec9 !important;
    font-family: monospace;
    font-size: 1rem !important;
    margin-top: 15px !important;
    border: 1px solid #5e5c8a;
  }

  .score-board {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 300px;
    margin-bottom: 10px;
    padding: 8px 15px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .score {
    font-size: 1.2rem;
    font-weight: bold;
  }

  .black-score {
    color: #666;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
  }

  .white-score {
    color: #fff;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
  }

  .status {
    text-align: center;
    font-size: 1rem;
    color: #ececec;
    margin-bottom: 10px;
  }

  .current-player {
    color: #ff9f43;
    font-weight: bold;
  }

  .winner {
    color: #00b894;
    font-weight: bold;
  }

  .no-moves-warning {
    color: #e94560;
    font-size: 0.9rem;
  }

  /* Стили для поля 8x8 */
  .board-8x8 {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    background: #2a2a40;
    padding: 5px;
    border-radius: 10px;
  }

  .cell-8x8 {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 1px solid #5e5c8a;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    padding: 0;
  }

  .cell-8x8:hover:not(:disabled) {
    transform: scale(1.1);
    border-color: #e94560;
    z-index: 2;
  }

  .cell-8x8:disabled {
    cursor: not-allowed;
    opacity: 0.9;
  }

  .black-cell {
    background: radial-gradient(circle at 30% 30%, #666, #222);
    color: #333;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
    border: 1px solid #444;
  }

  .white-cell {
    background: radial-gradient(circle at 30% 30%, #fff, #aaa);
    color: #fff;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    border: 1px solid #ccc;
  }

  .valid-move {
    position: relative;
  }

  .valid-move::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background-color: rgba(233, 69, 96, 0.5);
    border-radius: 50%;
    pointer-events: none;
  }

  .footer-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .player-info {
    font-size: 0.9rem;
    color: #ececec;
  }

  .player-info strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  @media (max-width: 600px) {
    .cell-8x8 {
      width: 40px;
      height: 40px;
      font-size: 1.2rem;
    }
  }

  @media (max-width: 450px) {
    .cell-8x8 {
      width: 35px;
      height: 35px;
      font-size: 1rem;
    }

    .score-board {
      max-width: 250px;
    }

    .score {
      font-size: 1rem;
    }
  }
</style>
