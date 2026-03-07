<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import * as Y from 'yjs';
  import { YjsSupabaseProvider } from '../../lib/yjsSupabaseProvider';
  import { supabase } from '../../lib/supabaseClient';
  import { userKeyStore } from '../../lib/store/userKeyStore';
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

  const SIZE = 3;
  const TIMEOUT = 1000;
  const PLAYERS = ['❌', '⭕'] as const;
  const YJS_SYMBOLS = ['X', 'O'] as const; // Символы для Yjs
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
  let roomName = $state(''); // Имя комнаты для отображения
  let playerSymbol: Player | null = $state(null);
  let isConnected = $state(false);
  let waitingForOpponent = $state(false); // Ожидание второго игрока
  let opponentJoined = $state(false); // Второй игрок присоединился
  
  // Храним текущего игрока из Yjs для реактивного отображения
  let yCurrentPlayerValue = $state<Player | null>(null);

  // Yjs
  let doc: Y.Doc | null = null;
  let provider: YjsSupabaseProvider | null = null;
  // Храним доску и текущего игрока в одной структуре - тогда они синхронизируются вместе
  let yGameState: Y.Map<any> | null = null;

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  // Деструктивная функция для очистки
  async function cleanup() {
    // Останавливаем ожидание оппонента
    stopWaitingForOpponent();
    
   // Останавливаем таймер приглашения
    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      inviteTimeout = null;
    }
    isWaitingForAccept = false;
    
    // Очищаем интервал сохранения
    if (provider && (provider as any).saveInterval) {
      clearInterval((provider as any).saveInterval);
    }
    
    // Сохраняем最后一次 состояние перед выходом
    if (provider) {
      await provider.saveState();
    }
    
    // Удаляем игрока из комнаты по user_key
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
    yGameState = null;
    
    roomId = '';
    roomName = '';
    playerSymbol = null;
    isConnected = false;
    waitingForOpponent = false;
    opponentJoined = false;
  }

  onDestroy(() => {
    // Останавливаем ожидание оппонента
    stopWaitingForOpponent();
    
    // Останавливаем таймер приглашения
    if (inviteTimeout) {
      clearTimeout(inviteTimeout);
      inviteTimeout = null;
    }
    
    // Очищаем интервал сохранения
    if (provider && (provider as any).saveInterval) {
      clearInterval((provider as any).saveInterval);
    }
    
    // Синхронная очистка без await
    if (provider) {
      provider.destroy();
      provider = null;
    }
    if (doc) {
      doc.destroy();
      doc = null;
    }
    yGameState = null;
    // Асинхронную очистку игроков можно опустить при размонтировании
  });

  // ===== ОНЛАЙН РЕЖИМ =====

  function showOnlineMenu() {
    gameMode = 'online_menu';
    loadRooms();
  }

  // Очистка старых комнат (старше 1 часа)
  async function cleanupOldRooms() {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      
      // Получаем старые комнаты
      const { data: oldRooms } = await supabase
        .from('game_rooms')
        .select('room_id')
        .eq('game_type', 'tic_tac_toe')
        .lt('created_at', oneHourAgo);
      
      if (oldRooms && oldRooms.length > 0) {
        const oldRoomIds = oldRooms.map(r => r.room_id);
        
        // Удаляем игроков из старых комнат
        await supabase
          .from('game_players')
          .delete()
          .in('room_id', oldRoomIds);
        
        // Удаляем старые комнаты
        await supabase
          .from('game_rooms')
          .delete()
          .in('room_id', oldRoomIds);
        
        console.log(`[TicTacToe] Удалено ${oldRoomIds.length} старых комнат`);
      }
    } catch (e) {
      console.error('[TicTacToe] Ошибка очистки старых комнат:', e);
    }
  }

  async function loadRooms() {
    isLoadingRooms = true;
    
    // Очищаем старые комнаты при каждой загрузке
    await cleanupOldRooms();
    
    try {
      // Получаем список комнат с количеством игроков
      // Supabase RPC требует имена параметров, совпадающие с определением функции
      const { data, error } = await supabase
        .rpc('get_active_rooms', { p_game_type: 'tic_tac_toe' });
      
      if (error) {
        console.error('Error loading rooms:', error);
        // Если RPC не работает - пробуем получить комнаты напрямую из таблицы
        await loadRoomsFromTable();
      } else {
        rooms = data || [];
      }
    } catch (e) {
      console.error('Error loading rooms:', e);
      // Пробуем получить комнаты напрямую из таблицы
      await loadRoomsFromTable();
    }
    isLoadingRooms = false;
  }

  // Альтернативный способ загрузки комнат - напрямую из таблицы
  async function loadRoomsFromTable() {
    try {
      // Получаем комнаты
      const { data: roomsData, error: roomsError } = await supabase
        .from('game_rooms')
        .select('room_id, room_name, created_at')
        .eq('game_type', 'tic_tac_toe')
        .gt('created_at', new Date(Date.now() - 3600000).toISOString()) // последний час
        .order('created_at', { ascending: false });

      if (roomsError) {
        console.error('Error loading rooms from table:', roomsError);
        rooms = [];
        return;
      }

      // Для каждой комнаты получаем количество игроков
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

      // Фильтруем комнаты с менее чем 2 игроками
      rooms = roomsWithPlayers.filter(r => r.player_count < 2);
    } catch (e) {
      console.error('Error in loadRoomsFromTable:', e);
      rooms = [];
    }
  }

  function generateRoomId(): string {
    return `ttt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  function generateRoomName(): string {
    // Формат: UserName userkey{3}24H
    const userKey = userKeyStore.getCurrentKey() || '';
    const key3 = userKey.slice(-3); // последние 3 символа userKey
    
    // Получаем текущее время в формате 24H (час)
    const now = new Date();
    const hour = now.getHours().toString().padStart(2, '0');
    
    // Пробуем получить имя из Telegram
    let username = 'Player';
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
      const tgUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
      username = tgUser.first_name || tgUser.username || 'Player';
      // Ограничиваем длину имени
      if (username.length > 10) {
        username = username.slice(0, 10);
      }
    }
    
    return `${username} ${key3}${hour}`;
  }

  async function createRoom() {
    roomName = newRoomName.trim() || generateRoomName();
    const newRoomId = generateRoomId();
    
    console.log('[TicTacToe] Создание комнаты:', newRoomId);
    
    // Создаем комнату в game_rooms
    const userKey = userKeyStore.getCurrentKey();
    const { error } = await supabase.from('game_rooms').insert({
      room_id: newRoomId,
      room_name: roomName,
      game_type: 'tic_tac_toe',
      created_by: userKey || `guest_${Date.now()}`,
    });

    if (error) {
      console.error('[TicTacToe] Error creating room:', error);
      // Пробуем создать таблицу если её нет
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

    console.log('[TicTacToe] Комната создана:', newRoomId);
    newRoomName = '';
    roomId = newRoomId;
    await joinOnlineRoom();
  }

  async function joinRoom(selectedRoomId: string) {
    roomId = selectedRoomId;
    await joinOnlineRoom();
  }

  // Проверка и создание таблиц
  async function ensureTableExists(): Promise<boolean> {
    try {
      // Проверяем game_rooms
      const { error: roomsError } = await supabase
        .from('game_rooms')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      if (roomsError) {
        console.error('[TicTacToe] Таблица game_rooms не существует:', roomsError);
      }
      
      // Проверяем game_players
      const { error: playersError } = await supabase
        .from('game_players')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      
      if (playersError) {
        console.error('[TicTacToe] Таблица game_players не существует:', playersError);
      }
      
      // Если хотя бы одна таблица не существует
      if ((roomsError && roomsError.message.includes('does not exist')) || 
          (playersError && playersError.message.includes('does not exist'))) {
        console.error('[TicTacToe] Таблицы БД не настроены');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('[TicTacToe] Error checking tables:', e);
      return false;
    }
  }

  async function joinOnlineRoom() {
    if (!roomId.trim()) return;

    // Получаем имя комнаты из БД
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('room_name')
      .eq('room_id', roomId)
      .single();
    
    if (roomData?.room_name) {
      roomName = roomData.room_name;
    }

    // Проверяем/создаем таблицу
    const tableReady = await ensureTableExists();
    if (!tableReady) {
      showModal("⚠️ Ошибка", "Не удалось подключиться. Проверьте интернет.", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    // Проверяем количество игроков в комнате
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
      playerSymbol = PLAYERS[0]; // ❌
      waitingForOpponent = true; // Первый игрок ждёт второго
      opponentJoined = false;
    } else if (players.length === 1) {
      playerSymbol = PLAYERS[1]; // ⭕
      // Второй игрок присоединяется - игра начинается
      waitingForOpponent = false;
      opponentJoined = true;
    } else {
      showModal("🚫 Комната заполнена", "В этой комнате уже два игрока", [
        { text: "OK", action: hideModal }
      ]);
      return;
    }

    // Регистрируем игрока (сохраняем X/O в БД)
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

    // Инициализируем Yjs - используем единую структуру для доски и текущего игрока
    doc = new Y.Doc();
    yGameState = doc.getMap<any>('gameState');

    // Инициализируем состояние если его нет
    if (!yGameState.has('board')) {
      // Создаём пустой board
      const initialBoard = Array.from({length: SIZE * SIZE}, (_, i) => ({position: i, value: null}));
      yGameState.set('board', initialBoard);
      yGameState.set('currentPlayer', PLAYERS[0]); // ❌ ходит первым
      console.log('[TicTacToe] Игра инициализирована');
    }

    // Инициализируем реактивную переменную для отображения
    const initialPlayer = yGameState.get('currentPlayer') as Player;
    yCurrentPlayerValue = initialPlayer || PLAYERS[0];
    currentPlayer = yCurrentPlayerValue;

    // Наблюдатель за изменениями - вся игра в одной структуре
    yGameState.observe((event) => {
      // Получаем свежее состояние
      const freshBoard = yGameState!.get('board') as {position: number, value: string | null}[] | undefined;
      const freshPlayer = yGameState!.get('currentPlayer') as Player | undefined;
      
      // Обновляем текущего игрока
      if (freshPlayer && freshPlayer !== currentPlayer) {
        currentPlayer = freshPlayer;
        yCurrentPlayerValue = freshPlayer;
      }

      if (!freshBoard) return;
      
      // Конвертируем Yjs символы в отображаемые
      const sorted = [...freshBoard].sort((a, b) => a.position - b.position);
      
      // Проверяем, изменилась ли доска
      const newBoard = sorted.map(item => fromYjsSymbol(item.value));
      let boardChanged = false;
      for (let i = 0; i < newBoard.length; i++) {
        if (board[i] !== newBoard[i]) {
          boardChanged = true;
          break;
        }
      }

      if (!boardChanged) return; // Если доска не изменилась, выходим

      board = newBoard;
      
      console.log('[TicTacToe] Наблюдатель сработал, board:', JSON.stringify(board), 'currentPlayer:', currentPlayer);
      winner = checkWinner(board);
      
      // Ничья - только если все 9 ячеек заполнены (не null) и нет победителя
      const hasAnyMove = board.some(cell => cell !== null);
      if (winner || (hasAnyMove && board.length == 9 && board.every(cell => cell))) {
        endGameOnline(winner);
      }
    });

    // Подключаем провайдер с колбэками
    provider = new YjsSupabaseProvider(
      doc, 
      roomId, 
      () => {
        // Колбэк после загрузки начального состояния
        console.log('[TicTacToe] Колбэк: начальное состояние загружено');
        
        // Синхронизируем board
        syncBoardFromYjs();
      },
      () => {
        // ВСЕГДА синхронизируем board из Yjs для надёжности
        syncBoardFromYjs();
      }
    );
    isConnected = true;
    gameMode = 'online';
    
    // Если оба игрока на месте - сразу синхронизируем
    if (opponentJoined) {
      syncBoardFromYjs();
    }

    // Сохраняем состояние ТОЛЬКО после хода игрока (не по таймеру)
    // Интервал убран - состояние сохраняется в handleOnlineClick
    
    // Если ждём оппонента - запускаем проверку
    if (waitingForOpponent) {
      startWaitingForOpponent();
    }
  }

  // Синхронизировать локальный board из Yjs
  function syncBoardFromYjs() {
    if (!doc || !yGameState) return;
    
    // Получаем состояние из единой структуры
    const yjsBoard = yGameState.get('board') as {position: number, value: string | null}[] | undefined;
    if (!yjsBoard) return;
    
    // Сортируем по position и извлекаем value
    const sorted = [...yjsBoard].sort((a, b) => a.position - b.position);
    board = sorted.map(item => fromYjsSymbol(item.value));
    
    // Получаем текущего игрока
    const yPlayer = yGameState.get('currentPlayer') as Player | undefined;
    if (yPlayer && (yPlayer === PLAYERS[0] || yPlayer === PLAYERS[1])) {
      if (currentPlayer !== yPlayer) {
        currentPlayer = yPlayer;
        yCurrentPlayerValue = yPlayer;
      }
    }
    
    console.log('[TicTacToe] Синхронизация:', { currentPlayer });
    winner = checkWinner(board);
    console.log('[TicTacToe] Board синхронизирован:', JSON.stringify(board));
  }

  // Ожидание второго игрока с периодической проверкой
  let checkOpponentInterval: ReturnType<typeof setInterval> | null = null;
  
  function startWaitingForOpponent() {
    checkOpponentInterval = setInterval(async () => {
      if (!roomId || !waitingForOpponent) {
        stopWaitingForOpponent();
        return;
      }
      
      // Проверяем количество игроков
      const { data: players, error } = await supabase
        .from('game_players')
        .select('symbol')
        .eq('room_id', roomId);
      
      if (!error && players && players.length >= 2) {
        // Второй игрок присоединился!
        stopWaitingForOpponent();
        opponentJoined = true;
        waitingForOpponent = false;
        
        // Уведомляем первого игрока
        showModal("🎉 Соперник найден!", "Игра началась! Вы играете за ❌", [
          { text: "Начать игру", action: hideModal }
        ]);
      }
    }, 2000); // Проверяем каждые 2 секунды
  }

  function stopWaitingForOpponent() {
    if (checkOpponentInterval) {
      clearInterval(checkOpponentInterval);
      checkOpponentInterval = null;
    }
  }

  function handleOnlineClick(index: number) {
    console.log('[TicTacToe] ХОД игрока:', playerSymbol, 'на позицию:', index);
    
    // Нельзя ходить если ждём соперника или игра не началась
    if (!isConnected || !yGameState || gameOver || !opponentJoined) {
      console.log('[TicTacToe] ❌ Ход заблокирован:', { isConnected, yGameState: !!yGameState, gameOver, opponentJoined });
      return;
    }
    if (board[index] !== null) {
      console.log('[TicTacToe] ❌ Ячейка занята');
      return;
    }
    if (currentPlayer !== playerSymbol) {
      console.log('[TicTacToe] ❌ Не ваш ход, сейчас:', currentPlayer, 'вы:', playerSymbol);
      return;
    }

    // Конвертируем ❌/⭕ в X/O для Yjs
    const yjsSymbol = toYjsSymbol(playerSymbol!);
    console.log('[TicTacToe] Вставляем:', {position: index, value: yjsSymbol});
    
    // Обновляем доску в единой структуре
    const currentBoard = [...(yGameState.get('board') as any[])];
    const itemToUpdate = currentBoard.find(item => item.position === index);
    if (itemToUpdate) {
      const idx = currentBoard.indexOf(itemToUpdate);
      currentBoard[idx] = {position: index, value: yjsSymbol};
      yGameState.set('board', currentBoard);
      console.log('[TicTacToe] Ход выполнен, board после:', JSON.stringify(currentBoard));
    }

    // Переключаем текущего игрока в той же транзакции
    const nextPlayer = playerSymbol === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
    yGameState.set('currentPlayer', nextPlayer);

    // Сохраняем состояние после хода
    if (provider) {
      console.log('[TicTacToe] Сохраняем состояние...');
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
        const winnerName = winnerPlayer === PLAYERS[0] ? '❌' : '⭕';
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
    if (!yGameState) return;
    
    console.log('[TicTacToe] Сброс игры...');
    
    // Устанавливаем флаг сброса - игнорируем проверку на ничью в наблюдателе
    isResetting = true;
    
    // Сбрасываем доску и текущего игрока в единой структуре
    const resetBoard = Array.from({length: SIZE * SIZE}, (_, i) => ({position: i, value: null}));
    yGameState.set('board', resetBoard);
    yGameState.set('currentPlayer', PLAYERS[0]);
    
    console.log('[TicTacToe] Yjs state после сброса');
    
    // Сбрасываем локальное состояние
    board = Array(SIZE * SIZE).fill(null);
    currentPlayer = PLAYERS[0]; // Первый игрок всегда начинает
    yCurrentPlayerValue = PLAYERS[0];
    gameOver = false;
    winner = null;
    
    // Снимаем флаг сброса после небольшой задержки
    setTimeout(() => {
      isResetting = false;
    }, 100);
    
    // Синхронизируем с другим игроком
    if (provider) {
      console.log('[TicTacToe] Сохраняем состояние после сброса...');
      provider.saveState();
    }
    
    hideModal();
    console.log('[TicTacToe] Игра сброшена');
  }

  // Таймер для ожидания приглашения
  let inviteTimeout: ReturnType<typeof setTimeout> | null = null;
  let isWaitingForAccept = $state(false);
  let isResetting = $state(false); // Флаг сброса игры

  async function resetAndInvite() {
    // Сбрасываем игру
    await resetOnlineGame();
    
    // Если игрок - первый (X), он приглашает
    if (playerSymbol === PLAYERS[0]) {
      isWaitingForAccept = true;
      
      // Показываем модалку с приглашением
      showModal("🎮 Приглашение отправлено", `Поделитесь названием комнаты с другом:

📋 ${roomName || roomId}

Ожидание подтверждения... (30 сек)`, [
        { text: "Отмена", action: async () => { await cancelInviteAndExit(); } }
      ]);
      
      // Таймер 30 секунд
      inviteTimeout = setTimeout(async () => {
        console.log('[TicTacToe] Время ожидания истекло, выходим из комнаты');
        isWaitingForAccept = false;
        showModal("⏰ Время вышло", "Второй игрок не подтвердил приглашение", [
          { text: "В меню", action: async () => { hideModal(); await cleanup(); gameMode = 'menu'; } }
        ]);
      }, 30000);
    } else {
      // Второй игрок (O) - он не может приглашать, просто играет снова
      hideModal();
      showModal("🔄 Игра сброшена", "Доска очищена. Ход игрока ❌", [
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
    // Выходим из комнаты
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

    if (checkWinner(currentPlayer)) {
      endGame(currentPlayer);
      return;
    }

    if (board.every(cell => cell)) {
      endGame(null);
      return;
    }

    currentPlayer = currentPlayer === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];

    // Ход компьютера
    if (gameMode === 'computer' && currentPlayer === PLAYERS[1] && !gameOver) {
      setTimeout(computerMove, 500);
    }
  }

  function computerMove() {
    if (gameOver) return;

    const emptyIndices = board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);
    if (emptyIndices.length === 0) return;

    // Может ли выиграть?
    for (const idx of emptyIndices) {
      board[idx] = PLAYERS[1];
      if (checkWin(PLAYERS[1])) {
        endGame(PLAYERS[1]);
        return;
      }
      board[idx] = null;
    }

    // Блокировать игрока?
    for (const idx of emptyIndices) {
      board[idx] = PLAYERS[0];
      if (checkWin(PLAYERS[0])) {
        board[idx] = PLAYERS[1];
        if (checkWin(PLAYERS[1])) {
          endGame(PLAYERS[1]);
        } else if (board.every(cell => cell)) {
          endGame(null);
        } else {
          currentPlayer = PLAYERS[0];
        }
        return;
      }
      board[idx] = null;
    }

    // Случайный ход
    const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    board[randomIndex] = PLAYERS[1];

    if (checkWin(PLAYERS[1])) {
      endGame(PLAYERS[1]);
      return;
    }

    if (board.every(cell => cell)) {
      endGame(null);
      return;
    }

    currentPlayer = PLAYERS[0];
  }

  // ===== ОБЩИЕ ФУНКЦИИ =====

  // Для офлайн-режима - проверка победы конкретного игрока
  function checkWin(player: Player): boolean {
    return checkWinner(board) === player;
  }

  function checkWinner(b: (Player | null)[]): Player | null {
    const winPatterns = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    for (const pattern of winPatterns) {
      const [a, bIdx, c] = pattern;
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return b[a];
      }
    }
    return null;
  }

  function endGame(winnerPlayer: Player | null) {
    gameOver = true;
    winner = winnerPlayer;

    if (winnerPlayer) {
      const winnerName = winnerPlayer === PLAYERS[0] ? '❌' : '⭕';
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
    const winnerName = winnerPlayer === PLAYERS[0] ? '❌' : '⭕';
    
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
    showModal("📖 Правила", `Крестики-нолики:

🎯 Цель: Первым выстроить 3 своих символа в ряд (по горизонтали, вертикали или диагонали).

❌ Игрок 1: ❌
⭕ Игрок 2: ⭕

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
      <h2 class="menu-title">Выберите режим</h2>
      
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
      <h2 class="menu-title">Онлайн</h2>
      
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
          
          <div class="board">
            {#each board as cell, i}
              <button
                type="button"
                class="cell"
                class:x-cell={cell === PLAYERS[0]}
                class:o-cell={cell === PLAYERS[1]}
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
        
        <div class="board">
          {#each board as cell, i}
            <button
              type="button"
              class="cell"
              class:x-cell={cell === PLAYERS[0]}
              class:o-cell={cell === PLAYERS[1]}
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

  .online-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
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
    overflow: hidden;
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

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .cell {
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
    border-radius: 12px;
    color: white;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }

  .cell:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
    border-color: #e94560;
  }

  .cell:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  }

  .cell:disabled {
    cursor: not-allowed;
    opacity: 0.9;
  }

  .cell.x-cell {
    color: #e94560;
  }

  .cell.o-cell {
    color: #00cec9;
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
    .cell {
      width: 65px;
      height: 65px;
      font-size: 2rem;
    }
  }

  @media (max-width: 400px) {
    .cell {
      width: 55px;
      height: 55px;
      font-size: 1.6rem;
    }
  }

  @media (max-width: 380px) {
    .footer-stats {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
  }
</style>