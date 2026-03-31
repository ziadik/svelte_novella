<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as Y from 'yjs';
  import { YjsSupabaseProvider } from '../yjsSupabaseProvider';
  import { supabase } from '../supabaseClient';
  import { userKeyStore } from '../store/userKeyStore';
  import BodyWrapper from './components/BodyWrapper.svelte';
  import GameHeader from './components/GameHeader.svelte';
  import GameFooter from './components/GameFooter.svelte';
  import MinigameModal from './components/MinigameModal.svelte';
  import type { ModalState } from './types';
  import type { MinigameProps } from './types';

  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props<MinigameProps>();

  // ===== НАСТРОЙКИ РЭНДЗЮ =====
  const SIZE = 15; // Поле 15x15 как вы просили
  const WIN_COUNT = 5; // Для победы нужно 5 в ряд
  const TIMEOUT = 1000;
  const PLAYERS = ['⚫', '⚪'] as const; // Черные и белые камни
  const YJS_SYMBOLS = ['X', 'O'] as const; // X = Black (черные), O = White (белые)

  type Player = typeof PLAYERS[number];

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
  type GameMode = 'menu' | 'computer' | 'local' | 'online' | 'online_menu';
  let gameMode = $state<GameMode>('menu');
  
  // Список комнат
  interface RoomInfo {
    room_id: string;
    room_name: string;
    player_count: number;
    created_at: string;
  }
  let rooms = $state<RoomInfo[]>([]);
  let newRoomName = $state('');
  let isLoadingRooms = $state(false);
  
  // Офлайн-состояние
  let board = $state<(Player | null)[]>(Array(SIZE * SIZE).fill(null));
  let currentPlayer = $state<Player>(PLAYERS[0]);
  let gameOver = $state(false);
  let winner = $state<Player | null>(null);

  // Онлайн-состояние
  let roomId = $state('');
  let roomName = $state('');
  let playerSymbol: Player | null = $state(null);
  let isConnected = $state(false);
  let waitingForOpponent = $state(false);
  let opponentJoined = $state(false);
  
  // Храним текущего игрока из Yjs для реактивного отображения
  let yCurrentPlayerValue = $state<Player | null>(null);

  // Yjs
  let doc: Y.Doc | null = null;
  let provider: YjsSupabaseProvider | null = null;
  let yBoard: Y.Array<{ position: number; value: string | null }> | null = null;
  let yCurrentPlayer: Y.Map<string> | null = null;

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

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
    
    if (roomId) {
      const userKey = userKeyStore.getCurrentKey();
      if (userKey) {
        await supabase
          .from('game_players')
          .delete()
          .eq('room_id', roomId)
          .eq('user_key', userKey);
      }
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
    yCurrentPlayer = null;
    
    roomId = '';
    roomName = '';
    playerSymbol = null;
    isConnected = false;
    waitingForOpponent = false;
    opponentJoined = false;
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
    yCurrentPlayer = null;
  });

  // ===== ОНЛАЙН РЕЖИМ =====
  function showOnlineMenu() {
    gameMode = 'online_menu';
    loadRooms();
  }

  async function cleanupOldRooms() {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      
      const { data: oldRooms } = await supabase
        .from('game_rooms')
        .select('room_id')
        .eq('game_type', 'renju') // Изменил game_type
        .lt('created_at', oneHourAgo);
      
      if (oldRooms && oldRooms.length > 0) {
        const oldRoomIds = oldRooms.map(r => r.room_id);
        
        await supabase
          .from('game_players')
          .delete()
          .in('room_id', oldRoomIds);
        
        await supabase
          .from('game_rooms')
          .delete()
          .in('room_id', oldRoomIds);
      }
    } catch (e) {
      console.error('[Renju] Ошибка очистки старых комнат:', e);
    }
  }

  async function loadRooms() {
    isLoadingRooms = true;
    await cleanupOldRooms();
    
    try {
      const { data, error } = await supabase
        .rpc('get_active_rooms', { p_game_type: 'renju' });
      
      if (error) {
        console.error('Error loading rooms:', error);
        await loadRoomsFromTable();
      } else {
        rooms = data || [];
      }
    } catch (e) {
      console.error('Error loading rooms:', e);
      await loadRoomsFromTable();
    }
    isLoadingRooms = false;
  }

  async function loadRoomsFromTable() {
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from('game_rooms')
        .select('room_id, room_name, created_at')
        .eq('game_type', 'renju')
        .gt('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false });

      if (roomsError) {
        console.error('Error loading rooms from table:', roomsError);
        rooms = [];
        return;
      }

      const roomsWithPlayers = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { count } = await supabase
            .from('game_players')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.room_id);
          
          return {
            room_id: room.room_id,
            room_name: room.room_name,
            player_count: count || 0,
            created_at: room.created_at
          };
        })
      );

      rooms = roomsWithPlayers.filter(r => r.player_count < 2);
    } catch (e) {
      console.error('Error in loadRoomsFromTable:', e);
      rooms = [];
    }
  }

  function generateRoomId(): string {
    return `renju_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  function generateRoomName(): string {
    const userKey = userKeyStore.getCurrentKey() || '';
    const key3 = userKey.slice(-3);
    const now = new Date();
    const hour = now.getHours().toString().padStart(2, '0');
    
    // =============================================================================
    // Получение имени из Telegram - ОТКЛЮЧЕНО
    // =============================================================================
    let username = 'Player';
    // if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
    //   const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
    //   username = tgUser.first_name || tgUser.username || 'Player';
    //   if (username.length > 10) {
    //     username = username.slice(0, 10);
    //   }
    // }
    
    return `${username} ${key3}${hour}`;
  }

  async function createRoom() {
    roomName = newRoomName.trim() || generateRoomName();
    const newRoomId = generateRoomId();
    
    const userKey = userKeyStore.getCurrentKey();
    const { error } = await supabase.from('game_rooms').insert({
      room_id: newRoomId,
      room_name: roomName,
      game_type: 'renju',
      created_by: userKey || `guest_${Date.now()}`,
    });

    if (error) {
      console.error('[Renju] Error creating room:', error);
      if (error.message.includes('relation') || error.code === '42P01') {
        showModal("⚠️ Ошибка", "Таблица комнат не настроена. Обратитесь к администратору.", [
          { text: "OK", action: hideModal }
        ]);
      } else {
        showModal("⚠️ Ошибка", `Не удалось создать комнату: ${error.message}`, [
          { text: "OK", action: hideModal }
        ]);
      }
      return;
    }

    newRoomName = '';
    roomId = newRoomId;
    await joinOnlineRoom();
  }

  async function joinRoom(selectedRoomId: string) {
    roomId = selectedRoomId;
    await joinOnlineRoom();
  }

  async function ensureTableExists(): Promise<boolean> {
    try {
      const { error: roomsError } = await supabase
        .from('game_rooms')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      const { error: playersError } = await supabase
        .from('game_players')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      if ((roomsError && roomsError.message.includes('does not exist')) || 
          (playersError && playersError.message.includes('does not exist'))) {
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('[Renju] Error checking tables:', e);
      return false;
    }
  }

  async function joinOnlineRoom() {
    if (!roomId.trim()) return;

    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('room_name')
      .eq('room_id', roomId)
      .single();
    
    if (roomData?.room_name) {
      roomName = roomData.room_name;
    }

    const tableReady = await ensureTableExists();
    if (!tableReady) {
      showModal("⚠️ Ошибка", "Не удалось подключиться. Проверьте интернет.", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('symbol')
      .eq('room_id', roomId);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      showModal("⚠️ Ошибка", "Не удалось подключиться к комнате.", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    if (!players || players.length === 0) {
      playerSymbol = PLAYERS[0]; // ⚫ (черные ходят первыми в рэндзю)
      waitingForOpponent = true;
      opponentJoined = false;
    } else if (players.length === 1) {
      playerSymbol = PLAYERS[1]; // ⚪
      waitingForOpponent = false;
      opponentJoined = true;
    } else {
      showModal("🚫 Комната заполнена", "В этой комнате уже два игрока", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    const symbolForDb = playerSymbol === PLAYERS[0] ? YJS_SYMBOLS[0] : YJS_SYMBOLS[1];
    const userKey = userKeyStore.getCurrentKey();
    const { error: insertError } = await supabase.from('game_players').insert({
      room_id: roomId,
      user_key: userKey || `guest_${Date.now()}`,
      symbol: symbolForDb,
    });

    if (insertError) {
      console.error('Error inserting player:', insertError);
      showModal("⚠️ Ошибка", "Не удалось присоединиться к комнате.", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    // Инициализируем Yjs
    doc = new Y.Doc();
    yBoard = doc.getArray<{ position: number; value: string | null }>('board');
    yCurrentPlayer = doc.getMap<string>('currentPlayer');

    if (yBoard.length !== SIZE * SIZE) {
      if (yBoard.length > 0) {
        yBoard.delete(0, yBoard.length);
      }
      const initialBoard = Array.from({ length: SIZE * SIZE }, (_, i) => ({ position: i, value: null }));
      yBoard.insert(0, initialBoard);
    }

    // Инициализируем текущего игрока в Yjs если не установлен
    if (!yCurrentPlayer.has('player')) {
      yCurrentPlayer.set('player', PLAYERS[0]); // ⚫ ходит первым
    }

    // Инициализируем реактивную переменную для отображения
    const initialPlayer = yCurrentPlayer.get('player') as Player;
    yCurrentPlayerValue = initialPlayer || PLAYERS[0];
    currentPlayer = yCurrentPlayerValue;

    // Наблюдатель за изменениями
    yBoard.observe((event) => {
      // ВСЕГДА обновляем currentPlayer из Yjs при любом изменении
      const yPlayer = yCurrentPlayer!.get('player');
      if (yPlayer) {
        const newCurrentPlayer = yPlayer as Player;
        if (currentPlayer !== newCurrentPlayer) {
          currentPlayer = newCurrentPlayer;
        }
        // Также обновляем реактивную переменную для шаблона
        yCurrentPlayerValue = newCurrentPlayer;
      }

      const freshYBoard = doc!.getArray<{ position: number; value: string | null }>('board');
      if (!freshYBoard) return;
      
      const yjsBoard = freshYBoard.toArray();
      const sorted = yjsBoard.sort((a, b) => a.position - b.position);

      // Проверяем, изменилась ли доска
      const newBoard = sorted.map(item => fromYjsSymbol(item.value));
      let boardChanged = false;
      for (let i = 0; i < newBoard.length; i++) {
        if (board[i] !== newBoard[i]) {
          boardChanged = true;
          break;
        }
      }

      if (!boardChanged) return; // Если доска не изменилась, выходим после обновления игрока

      board = newBoard;
      
      winner = checkWinner(board);
      
      // Проверка на ничью (все клетки заполнены)
      const hasAnyMove = board.some(cell => cell !== null);
      if (winner || (hasAnyMove && board.every(cell => cell !== null))) {
        endGameOnline(winner);
      }
    });

    // Наблюдатель за изменениями текущего игрока
    yCurrentPlayer.observe((event) => {
      const newPlayer = yCurrentPlayer!.get('player') as Player | undefined;
      if (newPlayer && newPlayer !== currentPlayer) {
        currentPlayer = newPlayer;
        yCurrentPlayerValue = newPlayer;
      }
    });

    provider = new YjsSupabaseProvider(
      doc, 
      roomId, 
      () => {
        syncBoardFromYjs();
      },
      (boardData?: (string | null)[] | null) => {
        // ВСЕГДА синхронизируем board из Yjs для надёжности
        syncBoardFromYjs();
      }
    );
    isConnected = true;
    gameMode = 'online';
    
    if (opponentJoined) {
      syncBoardFromYjs();
    }

    if (waitingForOpponent) {
      startWaitingForOpponent();
    }
  }

  function syncBoardFromYjs() {
    if (!doc) return;
    
    const currentYBoard = doc.getArray<{ position: number; value: string | null }>('board');
    if (!currentYBoard) return;
    
    const yjsBoard = currentYBoard.toArray();
    const sorted = yjsBoard.sort((a, b) => a.position - b.position);
    board = sorted.map(item => fromYjsSymbol(item.value));
    
    // Получаем текущего игрока из Yjs
    if (yCurrentPlayer) {
      const yPlayer = yCurrentPlayer.get('player');
      if (yPlayer && (yPlayer === PLAYERS[0] || yPlayer === PLAYERS[1])) {
        const newCurrentPlayer = yPlayer as Player;
        if (currentPlayer !== newCurrentPlayer) {
          currentPlayer = newCurrentPlayer;
          yCurrentPlayerValue = newCurrentPlayer;
        }
      }
    }
    
    winner = checkWinner(board);
  }

  let checkOpponentInterval: ReturnType<typeof setInterval> | null = null;
  
  function startWaitingForOpponent() {
    checkOpponentInterval = setInterval(async () => {
      if (!roomId || !waitingForOpponent) {
        stopWaitingForOpponent();
        return;
      }
      
      const { data: players, error } = await supabase
        .from('game_players')
        .select('symbol')
        .eq('room_id', roomId);
      
      if (!error && players && players.length >= 2) {
        stopWaitingForOpponent();
        opponentJoined = true;
        waitingForOpponent = false;
        
        showModal("🎉 Соперник найден!", "Игра началась! Вы играете за ⚫ (черные)", [
          { text: "Начать игру", action: hideModal }
        ]);
      }
    }, 2000);
  }

  function stopWaitingForOpponent() {
    if (checkOpponentInterval) {
      clearInterval(checkOpponentInterval);
      checkOpponentInterval = null;
    }
  }

  // ===== ОСНОВНАЯ ЛОГИКА РЭНДЗЮ =====
  
  /**
   * Проверка на 5 в ряд для рэндзю
   * @param board - игровое поле
   * @returns победитель или null
   */
  function checkWinner(b: (Player | null)[]): Player | null {
    // Направления для проверки: горизонталь, вертикаль, диагонали
    const directions = [
      [0, 1],   // горизонталь (вправо)
      [1, 0],   // вертикаль (вниз)
      [1, 1],   // диагональ вниз-вправо
      [1, -1]   // диагональ вниз-влево
    ];
    
    // Проходим по всем клеткам
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const index = row * SIZE + col;
        const cell = b[index];
        
        if (!cell) continue; // Пустая клетка
        
        // Проверяем все направления
        for (const [dx, dy] of directions) {
          let count = 1;
          
          // Проверяем в положительном направлении
          for (let step = 1; step < WIN_COUNT; step++) {
            const newRow = row + dx * step;
            const newCol = col + dy * step;
            
            // Выход за границы
            if (newRow < 0 || newRow >= SIZE || newCol < 0 || newCol >= SIZE) break;
            
            const newIndex = newRow * SIZE + newCol;
            if (b[newIndex] === cell) {
              count++;
            } else {
              break;
            }
          }
          
          // Проверяем в отрицательном направлении (для учета линии в обе стороны)
          for (let step = 1; step < WIN_COUNT; step++) {
            const newRow = row - dx * step;
            const newCol = col - dy * step;
            
            if (newRow < 0 || newRow >= SIZE || newCol < 0 || newCol >= SIZE) break;
            
            const newIndex = newRow * SIZE + newCol;
            if (b[newIndex] === cell) {
              count++;
            } else {
              break;
            }
          }
          
          // Если нашли 5 в ряд - победа
          if (count >= WIN_COUNT) {
            return cell;
          }
        }
      }
    }
    
    return null;
  }

  function handleOnlineClick(index: number) {
    if (!isConnected || !yBoard || gameOver || !opponentJoined) return;
    if (board[index] !== null) return;
    if (currentPlayer !== playerSymbol) return;

    const yjsSymbol = toYjsSymbol(playerSymbol!);
    
    const current = yBoard.toArray();
    const itemToUpdate = current.find(item => item.position === index);
    
    if (itemToUpdate) {
      const idx = current.indexOf(itemToUpdate);
      yBoard.delete(idx, 1);
      yBoard.insert(idx, [{ position: index, value: yjsSymbol }]);
    }

    // Переключаем текущего игрока в Yjs
    const nextPlayer = playerSymbol === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    yCurrentPlayer?.set('player', nextPlayer);

    if (provider) {
      provider.saveState();
    }
  }

  function endGameOnline(winnerPlayer: Player | null) {
    gameOver = true;
    winner = winnerPlayer;

    if (winnerPlayer) {
      const isMyWin = winnerPlayer === playerSymbol;
      if (integrated) {
        const msg = isMyWin ? "🎉 Ты победил!" : "💀 Ты проиграл!";
        showModal(isMyWin ? "🎉 Победа!" : "💀 Поражение", msg, []);
        setTimeout(() => { hideModal(); isMyWin ? onWin?.() : onLose?.(); }, TIMEOUT);
      } else {
        const winnerName = winnerPlayer === PLAYERS[0] ? '⚫' : '⚪';
        const isMyWin = winnerPlayer === playerSymbol;
        showModal(isMyWin ? "🎉 Ты победил!" : "💀 Ты проиграл", `Победил ${winnerName}`, [
          { text: "Играть снова", action: () => resetAndInvite() },
          { text: "В меню", action: async () => { hideModal(); await cleanup(); gameMode = 'menu'; } }
        ]);
      }
    } else {
      if (integrated) {
        showModal("🤝 Ничья!", "Ничья!", []);
        setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
      } else {
        showModal("🤝 Ничья!", "Ничья!", [
          { text: "Играть снова", action: () => resetAndInvite() },
          { text: "В меню", action: async () => { hideModal(); await cleanup(); gameMode = 'menu'; } }
        ]);
      }
    }
  }

  async function resetOnlineGame() {
    if (!yBoard) return;
    
    const resetBoard = Array.from({ length: SIZE * SIZE }, (_, i) => ({ position: i, value: null }));
    yBoard.delete(0, yBoard.length);
    yBoard.insert(0, resetBoard);
    
    // Сбрасываем текущего игрока в Yjs
    yCurrentPlayer?.set('player', PLAYERS[0]);
    
    board = Array(SIZE * SIZE).fill(null);
    currentPlayer = PLAYERS[0];
    yCurrentPlayerValue = PLAYERS[0];
    gameOver = false;
    winner = null;
    
    if (provider) {
      provider.saveState();
    }
    
    hideModal();
  }

  let inviteTimeout: ReturnType<typeof setTimeout> | null = null;
  let isWaitingForAccept = $state(false);

  async function resetAndInvite() {
    await resetOnlineGame();
    
    if (playerSymbol === PLAYERS[0]) {
      isWaitingForAccept = true;
      
      showModal("🎮 Приглашение отправлено", `Поделитесь названием комнаты с другом:

📋 ${roomName || roomId}

Ожидание подтверждения... (30 сек)`, [
        { text: "Отмена", action: async () => { await cancelInviteAndExit(); } }
      ]);
      
      inviteTimeout = setTimeout(async () => {
        isWaitingForAccept = false;
        showModal("⏰ Время вышло", "Второй игрок не подтвердил приглашение", [
          { text: "В меню", action: async () => { hideModal(); await cleanup(); gameMode = 'menu'; } }
        ]);
      }, 30000);
    } else {
      hideModal();
      showModal("🔄 Игра сброшена", "Доска очищена. Ход игрока ⚫", [
        { text: "OK", action: hideModal }
      ]);
    }
  }

  async function cancelInviteAndExit() {
    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      inviteTimeout = null;
    }
    isWaitingForAccept = false;
    hideModal();
    await cleanup();
    gameMode = 'online_menu';
    loadRooms();
  }

  // ===== ОФЛАЙН РЕЖИМ =====

  function startComputerMode() {
    gameMode = 'computer';
    initGame();
  }

  function startLocalMode() {
    gameMode = 'local';
    initGame();
  }

  function handleOfflineClick(index: number) {
    if (gameOver || board[index]) return;

    board[index] = currentPlayer;

    if (checkWinner(board) === currentPlayer) {
      endGame(currentPlayer);
      return;
    }

    // Ничья - только если есть хотя бы один ход и поле заполнено
    const hasAnyMove = board.some(cell => cell !== null);
    if (hasAnyMove && board.every(cell => cell !== null)) {
      endGame(null);
      return;
    }

    currentPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];

    if (gameMode === 'computer' && currentPlayer === PLAYERS[1] && !gameOver) {
      setTimeout(computerMove, 500);
    }
  }

  function computerMove() {
    if (gameOver) return;

    const emptyIndices = board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);
    if (emptyIndices.length === 0) return;

    // Простая стратегия для компьютера
    // 1. Проверить может ли компьютер выиграть
    for (const idx of emptyIndices) {
      board[idx] = PLAYERS[1];
      if (checkWinner(board) === PLAYERS[1]) {
        endGame(PLAYERS[1]);
        return;
      }
      board[idx] = null;
    }

    // 2. Заблокировать игрока
    for (const idx of emptyIndices) {
      board[idx] = PLAYERS[0];
      if (checkWinner(board) === PLAYERS[0]) {
        board[idx] = PLAYERS[1];
        if (checkWinner(board) === PLAYERS[1]) {
          endGame(PLAYERS[1]);
        } else if (board.some(cell => cell !== null) && board.every(cell => cell !== null)) {
          endGame(null);
        } else {
          currentPlayer = PLAYERS[0];
        }
        return;
      }
      board[idx] = null;
    }

    // 3. Случайный ход
    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    board[randomIndex] = PLAYERS[1];

    if (checkWinner(board) === PLAYERS[1]) {
      endGame(PLAYERS[1]);
      return;
    }

    // Ничья - только если есть хотя бы один ход и поле заполнено
    const hasAnyMoveAfter = board.some(cell => cell !== null);
    if (hasAnyMoveAfter && board.every(cell => cell !== null)) {
      endGame(null);
      return;
    }

    currentPlayer = PLAYERS[0];
  }

  // ===== ОБЩИЕ ФУНКЦИИ =====

  function endGame(winnerPlayer: Player | null) {
    gameOver = true;
    winner = winnerPlayer;

    if (winnerPlayer) {
      const winnerName = winnerPlayer === PLAYERS[0] ? '⚫' : '⚪';
      if (integrated) {
        const isPlayer1Win = winnerPlayer === PLAYERS[0];
        showModal(isPlayer1Win ? "🎉 Победа!" : "💀 Поражение", `Победил ${winnerName}!`, []);
        setTimeout(() => { hideModal(); isPlayer1Win ? onWin?.() : onLose?.(); }, TIMEOUT);
      } else {
        showModal("🎉 Победа!", `Победил ${winnerName}!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    } else {
      if (integrated) {
        showModal("🤝 Ничья!", "Ничья!", []);
        setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
      } else {
        showModal("🤝 Ничья!", "Ничья!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  function initGame(): void {
    board = Array(SIZE * SIZE).fill(null);
    currentPlayer = PLAYERS[0];
    gameOver = false;
    winner = null;
    hideModal();
  }

  function handleGiveUp(): void {
    gameOver = true;
    const winnerPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    const winnerName = winnerPlayer === PLAYERS[0] ? '⚫' : '⚪';
    
    if (integrated) {
      showModal("💀 Сдаюсь", `Победил ${winnerName}!`, []);
      setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
    } else {
      showModal("Конец", `Победил ${winnerName}! Попробуйте ещё раз!`, [
        { text: "Новая игра", action: initGame },
      ]);
    }
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила Рэндзю", `Гомоку (5 в ряд) на поле 15x15:

🎯 Цель: Первым выстроить 5 своих камней в ряд (по горизонтали, вертикали или диагонали).

⚫ Черные ходят первыми
⚪ Белые ходят вторыми

Режимы:
🤖 Компьютер — игра против AI
👥 На одном — два игрока на одном устройстве
🌐 Онлайн — игра по сети с другом`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  function backToMenu(): void {
    if (gameMode === 'online') {
      cleanup();
    }
    gameMode = 'menu';
    initGame();
  }

  function backToOnlineMenu(): void {
    if (gameMode === 'online') {
      cleanup();
    }
    gameMode = 'online_menu';
    loadRooms();
  }
</script>

<BodyWrapper>
  {#if gameMode === 'menu'}
    <!-- МЕНЮ ВЫБОРА РЕЖИМА -->
    <GameHeader
      onRestart={() => {}}
      onShowRules={showRules}
    />

    <div id="game-container">
      <h2 class="menu-title">Рэндзю (5 в ряд)</h2>
      
      <button type="button" class="menu-btn" onclick={startComputerMode}>
        <span class="menu-icon">🤖</span>
        <span>Против компьютера</span>
      </button>
      
      <button type="button" class="menu-btn" onclick={startLocalMode}>
        <span class="menu-icon">👥</span>
        <span>На одном устройстве</span>
      </button>
      
      <button type="button" class="menu-btn online-btn" onclick={showOnlineMenu}>
        <span class="menu-icon">🌐</span>
        <span>Играть онлайн</span>
      </button>
    </div>

    <GameFooter {rewardItem} {items} {bucketName} />

  {:else if gameMode === 'online_menu'}
    <!-- ОНЛАЙН МЕНЮ -->
    <GameHeader
      onRestart={() => {}}
      onShowRules={showRules}
      onBack={backToMenu}
    />

    <div id="game-container">
      <h2 class="menu-title">Онлайн Рэндзю</h2>
      
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
              <button type="button" class="room-item" onclick={() => joinRoom(room.room_id)}>
                <span class="room-name">{room.room_name}</span>
                <span class="room-players">{room.player_count}/2 игроков</span>
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
        <button type="button" class="menu-btn join-btn" onclick={() => joinOnlineRoom()}>
          Присоединиться
        </button>
      </div>
    </div>

    <GameFooter {rewardItem} {items} {bucketName} />

  {:else}
    <!-- ИГРА -->
    <GameHeader
      onRestart={gameMode === 'online' ? resetOnlineGame : initGame}
      onGiveUp={integrated ? handleGiveUp : undefined}
      showGiveUp={integrated}
      onShowRules={showRules}
    />

    <div id="game-container">
      {#if gameMode === 'online'}
        <div class="online-info">
          <span class="room-id">Комната: {roomName || roomId}</span>
          <span class="player-symbol">Вы играете за: {playerSymbol}</span>
        </div>
        
        {#if waitingForOpponent}
          <div class="waiting-message">
            <div class="waiting-spinner">⏳</div>
            <p>Ожидание соперника...</p>
            <p class="waiting-hint">Поделитесь названием комнаты</p>
            <p class="room-id-copy">{roomName || roomId}</p>
          </div>
        {:else}
          <div class="status">
            {#if gameOver && winner}
              Победил: <span class="winner">{winner}</span>
            {:else if gameOver}
              Ничья
            {:else}
              {#if yCurrentPlayerValue === playerSymbol}
                <span class="your-turn">Ваш ход</span>
              {:else}
                Ход: <span class="current-player">{currentPlayer}</span>
              {/if}
            {/if}
          </div>
          
          <div class="board board-15x15">
            {#each board as cell, i}
              <button
                type="button"
                class="cell cell-15x15"
                class:black-cell={cell === PLAYERS[0]}
                class:white-cell={cell === PLAYERS[1]}
                onclick={() => handleOnlineClick(i)}
                disabled={!!cell || gameOver || yCurrentPlayerValue !== playerSymbol}
              >
                {cell ?? ''}
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="status">
          {#if gameOver && winner}
            Победил: <span class="winner">{winner}</span>
          {:else if gameOver}
            Ничья
          {:else}
            Ход: <span class="current-player">{currentPlayer}</span>
          {/if}
        </div>
        
        <div class="board board-15x15">
          {#each board as cell, i}
            <button
              type="button"
              class="cell cell-15x15"
              class:black-cell={cell === PLAYERS[0]}
              class:white-cell={cell === PLAYERS[1]}
              onclick={() => handleOfflineClick(i)}
              disabled={!!cell || gameOver || (gameMode === 'computer' && currentPlayer === PLAYERS[1])}
            >
              {cell ?? ''}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <GameFooter {rewardItem} {items} {bucketName}>
      <div class="footer-stats">
        <span class="player-info">
          {#if gameMode === 'online'}
            Вы: {playerSymbol} | 
          {/if}
          Ход: <strong>{currentPlayer}</strong>
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
    content: '';
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

  .loading, .no-rooms {
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

  .waiting-message {
    text-align: center;
    padding: 30px 20px;
  }

  .waiting-spinner {
    font-size: 3rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
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

  .your-turn {
    color: #00b894;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .winner {
    color: #00b894;
    font-weight: bold;
  }

  /* Стили для поля 15x15 */
  .board-15x15 {
    display: grid;
    grid-template-columns: repeat(15, 1fr);
    gap: 2px;
    background: #2a2a40;
    padding: 5px;
    border-radius: 10px;
  }

  .cell-15x15 {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 1px solid #5e5c8a;
    border-radius: 4px;
    color: white;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    padding: 0;
  }

  .cell-15x15:hover:not(:disabled) {
    transform: scale(1.1);
    border-color: #e94560;
    z-index: 2;
  }

  .cell-15x15:disabled {
    cursor: not-allowed;
    opacity: 0.9;
  }

.black-cell {
  background: radial-gradient(circle at 30% 30%, #666, #222);
  color: #333;
  text-shadow: 0 0 5px rgba(255,255,255,0.5);
  border: 1px solid #444;
}

.white-cell {
  background: radial-gradient(circle at 30% 30%, #fff, #aaa);
  color: #fff;
  text-shadow: 0 0 5px rgba(0,0,0,0.5);
  border: 1px solid #ccc;
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

  @media (max-width: 800px) {
    .cell-15x15 {
      width: 30px;
      height: 30px;
      font-size: 1rem;
    }
  }

  @media (max-width: 500px) {
    .cell-15x15 {
      width: 22px;
      height: 22px;
      font-size: 0.8rem;
    }
    
    #game-container {
      padding: 10px 5px;
    }
  }
</style>