import * as Y from "yjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

const GAME_STATE_TABLE = 'game_state';

interface StoredState {
  room_id: string;
  state_data: string;
  updated_at: string;
}

export class YjsSupabaseProvider {
  private channel: RealtimeChannel;
  private isDestroyed = false;
  private isInitialSync = true;
  private isApplyingFullState = false; // Флаг: применяем полное состояние
  private onStateLoaded: (() => void) | null = null;
  private onRemoteUpdate: (() => void) | null = null; // Колбэк при удалённом обновлении
  private lastSavedTimestamp: number = 0; // Timestamp последнего сохранения

  // Получить текущее состояние board из Yjs
  private getBoardState(): {position: number, value: string | null}[] {
    try {
      const yBoard = this.doc.getArray<{position: number, value: string | null}>('board');
      return yBoard.toArray();
    } catch (e) {
      console.error('[Yjs] Ошибка получения board:', e);
      return [];
    }
  }

  // Логировать состояние board
  private logBoard(label: string) {
    const board = this.getBoardState();
    // Сортируем по position для читаемости
    const sorted = [...board].sort((a, b) => a.position - b.position);
    console.log(`[Yjs] ${label} Board:`, JSON.stringify(sorted));
  }

  constructor(
    public doc: Y.Doc,
    public roomId: string,
    onStateLoaded?: () => void,
    onRemoteUpdate?: () => void,
  ) {
    this.onStateLoaded = onStateLoaded || null;
    this.onRemoteUpdate = onRemoteUpdate || null;
    
    const channelId = `tictactoe:${this.roomId}`;
    console.log('[Yjs] Создание канала:', channelId);
    this.channel = supabase.channel(channelId);

    // Подписываемся на сообщения
    this.channel
      .on("broadcast", { event: "yjs-update" }, (payload) => {
        console.log('[Yjs] 📡 Получено broadcast event! Payload keys:', payload ? Object.keys(payload) : 'null');
        
        if (this.isDestroyed) return;
        
        try {
          // Логируем board ДО получения обновления
          this.logBoard('<<< ПОЛУЧЕНИЕ - ДО');
          
          // Пробуем получить payload разными способами
          const payloadData = (payload as any).payload || (payload as any);
          console.log('[Yjs] >>> Получено broadcast, isFullState:', payloadData.isFullState);
          
          if (!payloadData || !payloadData.update) {
            console.error('[Yjs] ❌ НЕТ update в payload!', payloadData);
            return;
          }
          
          const update = new Uint8Array(payloadData.update);
          console.log('[Yjs] Получено обновление, размер:', update.length, 'bytes');
          
          // Если это полное состояние - полностью заменяем board
          let simpleBoard: (string | null)[] = [];
          
          if (payloadData.isFullState) {
            console.log('[Yjs] Это полное состояние - полная замена board');
            this.isApplyingFullState = true;
            
            // Получаем board из update напрямую (декодируем)
            // Но проще - извлечь из Yjs doc после применения
            Y.applyUpdate(this.doc, update, 'remote');
            
            // Теперь извлекаем данные из doc
            const yBoard = this.doc.getArray<{position: number, value: string | null}>('board');
            const boardArray = yBoard.toArray();
            
            // Сортируем и извлекаем values
            const sorted = boardArray.sort((a, b) => a.position - b.position);
            simpleBoard = sorted.map(item => item.value);
            
            console.log('[Yjs] Board после полной замены:', JSON.stringify(simpleBoard));
            
            // Удаляем дубликаты если есть
            if (yBoard.length > 9) {
              console.log('[Yjs] Удаляем дубликаты, было:', yBoard.length);
              yBoard.delete(0, yBoard.length);
              // Вставляем только уникальные по position
              const uniqueMap = new Map<number, string | null>();
              for (const item of sorted) {
                uniqueMap.set(item.position, item.value);
              }
              const unique = Array.from({length: 9}, (_, i) => ({position: i, value: uniqueMap.get(i) ?? null}));
              yBoard.insert(0, unique);
              simpleBoard = unique.map(item => item.value);
              console.log('[Yjs] После удаления дубликатов:', JSON.stringify(simpleBoard));
            }
            
            setTimeout(() => { this.isApplyingFullState = false; }, 100);
          } else {
            // Инкрементальное обновление - применяем как раньше
            Y.applyUpdate(this.doc, update, 'remote');
            
            const yBoardAfter = this.doc.getArray<{position: number, value: string | null}>('board');
            const boardArray = yBoardAfter.toArray();
            const sorted = boardArray.sort((a, b) => a.position - b.position);
            simpleBoard = sorted.map(item => item.value);
          }
          
          // Вызываем колбэк
          setTimeout(() => {
            if (this.onRemoteUpdate) {
              (this.onRemoteUpdate as any)(simpleBoard);
            }
          }, 50);
          
          // Логируем board ПОСЛЕ применения обновления
          this.logBoard('<<< ПОЛУЧЕНИЕ - ПОСЛЕ');
          
          // Вызываем колбэк с небольшой задержкой чтобы убедиться, что applyUpdate завершён
          setTimeout(() => {
            if (this.onRemoteUpdate) {
              this.onRemoteUpdate();
            }
          }, 50);
          
        } catch (e) {
          console.error('[Yjs] Error applying update:', e);
        }
      })
      .subscribe((status, err) => {
        console.log(`[Yjs] Статус подписки: ${status}`, err ? err.message : '');
        
        switch (status) {
          case 'SUBSCRIBED':
            console.log('[Yjs] ✅ Успешно подключено к каналу:', channelId);
            this.loadInitialState();
            break;
          case 'CHANNEL_ERROR':
            console.error('[Yjs] ❌ Ошибка канала:', err?.message || 'Неизвестная ошибка');
            break;
          case 'TIMED_OUT':
            console.error('[Yjs] ⏱️ Таймаут подключения');
            break;
          case 'CLOSED':
            console.log('[Yjs] 🔒 Канал закрыт');
            break;
          case 'awaiting':
            console.log('[Yjs] ⏳ Ожидание ответа от сервера...');
            break;
          case 'closing':
            console.log('[Yjs] 🔄 Закрытие канала...');
            break;
          default:
            console.log('[Yjs] ❓ Неизвестный статус:', status);
        }
      });

    // Отправляем локальные изменения
    this.doc.on("update", (update: Uint8Array, origin: any) => {
      if (this.isDestroyed) return;
      
      // Не отправляем обновления из сети, при начальной синхронизации или при применении полного состояния
      if (origin === 'remote' || this.isInitialSync || this.isApplyingFullState) {
        console.log('[Yjs] ⚠️ Пропускаем отправку:', { origin, isInitialSync: this.isInitialSync, isApplyingFullState: this.isApplyingFullState });
        return;
      }

      console.log('[Yjs] ✅ Разрешена отправка, origin:', origin);

      // Логируем board ПЕРЕД отправкой
      this.logBoard('>>> ОТПРАВКА - ДО');
      
      // ОТПРАВЛЯЕМ ПОЛНОЕ СОСТОЯНИЕ вместо инкрементального update!
      const fullState = Y.encodeStateAsUpdate(this.doc);
      const updateArray = Array.from(fullState);
      console.log('[Yjs] <<< Отправляем ПОЛНОЕ состояние, размер:', fullState.length, 'bytes');
      console.log('[Yjs] <<< Payload (полное) первые 20 элементов:', updateArray.slice(0, 20));
      
      this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: updateArray, isFullState: true },
      }).then(() => {
        // Логируем board ПОСЛЕ отправки
        this.logBoard('>>> ОТПРАВКА - ПОСЛЕ');
        console.log('[Yjs] Сообщение отправлено');
      }).catch((err) => {
        console.error('[Yjs] Ошибка отправки:', err);
      });
    });
  }

  // Загрузить начальное состояние с проверкой версии
  private async loadInitialState() {
    try {
      // Получаем текущее состояние из БД
      const { data, error } = await supabase
        .from(GAME_STATE_TABLE)
        .select('state_data, updated_at')
        .eq('room_id', this.roomId)
        .maybeSingle();

      if (error) {
        console.log('[Yjs] Ошибка загрузки:', error.message);
        this.finishInitialSync();
        return;
      }

      // Если есть сохраненное состояние - применяем его
      if (data?.state_data && data?.updated_at) {
        const remoteTimestamp = new Date(data.updated_at).getTime();
        
        try {
          const stateData = atob(data.state_data);
          const stateArray = new Uint8Array(stateData.length);
          for (let i = 0; i < stateArray.length; i++) {
            stateArray[i] = stateData.charCodeAt(i);
          }
          
          // Применяем состояние если оно есть
          this.isInitialSync = true;
          Y.applyUpdate(this.doc, stateArray);
          this.lastSavedTimestamp = remoteTimestamp;
          console.log('[Yjs] Загружено состояние из БД, timestamp:', remoteTimestamp);
          this.logBoard('📥 ЗАГРУЗКА ИЗ БД');
        } catch (e) {
          console.error('[Yjs] Ошибка декодирования:', e);
        }
      } else {
        console.log('[Yjs] Нет сохраненного состояния (новая комната)');
      }
      
      this.finishInitialSync();
    } catch (e) {
      console.error('[Yjs] Ошибка загрузки:', e);
      this.finishInitialSync();
    }
  }

  // Сохранить состояние только если оно новее чем в БД
  async saveState() {
    if (this.isDestroyed) return;
    
    console.log('[Yjs] saveState вызвано, lastSavedTimestamp:', this.lastSavedTimestamp);
    this.logBoard('>>> saveState');
    
    try {
      // Получаем текущий timestamp из БД
      const { data: existing, error: fetchError } = await supabase
        .from(GAME_STATE_TABLE)
        .select('updated_at')
        .eq('room_id', this.roomId)
        .maybeSingle();

      if (fetchError) {
        console.error('[Yjs] Ошибка проверки версии:', fetchError);
        return;
      }

      const remoteTimestamp = existing?.updated_at 
        ? new Date(existing.updated_at).getTime() 
        : 0;

      console.log('[Yjs] remoteTimestamp:', remoteTimestamp);

      // Проверяем что локальное состояние новее
      if (this.lastSavedTimestamp > 0 && this.lastSavedTimestamp < remoteTimestamp) {
        console.log('[Yjs] ⚠️ Удаленное состояние новее, пропускаем сохранение');
        // Но всё равно отправляем broadcast!
        this.forceBroadcast();
        return;
      }

      // Кодируем текущее состояние
      const stateVector = Y.encodeStateAsUpdate(this.doc);
      const stateBase64 = btoa(String.fromCharCode(...stateVector));
      const now = new Date().toISOString();
      
      console.log('[Yjs] Сохраняем в БД, размер state:', stateVector.length);
      
      // Сохраняем
      const { error: upsertError } = await supabase
        .from(GAME_STATE_TABLE)
        .upsert({
          room_id: this.roomId,
          state_data: stateBase64,
          updated_at: now
        }, { onConflict: 'room_id' });

      if (upsertError) {
        console.error('[Yjs] Ошибка сохранения:', upsertError);
      } else {
        this.lastSavedTimestamp = new Date(now).getTime();
        console.log('[Yjs] ✅ Состояние сохранено, timestamp:', this.lastSavedTimestamp);
        
        // Принудительно отправляем broadcast после сохранения
        this.forceBroadcast();
      }
    } catch (e) {
      console.error('[Yjs] Ошибка сохранения:', e);
    }
  }

  // Принудительно отправить broadcast
  private forceBroadcast() {
    console.log('[Yjs] Принудительная отправка broadcast...');
    const stateVector = Y.encodeStateAsUpdate(this.doc);
    const updateArray = Array.from(stateVector);
    
    this.channel.send({
      type: "broadcast",
      event: "yjs-update",
      payload: { update: updateArray, isFullState: true },
    }).then(() => {
      console.log('[Yjs] ✅ Broadcast отправлен');
    }).catch((err) => {
      console.error('[Yjs] ❌ Ошибка broadcast:', err);
    });
  }

  private finishInitialSync() {
    setTimeout(() => {
      this.isInitialSync = false;
      console.log('[Yjs] Начальная синхронизация завершена');
      if (this.onStateLoaded) {
        this.onStateLoaded();
      }
    }, 500);
  }

  destroy() {
    this.isDestroyed = true;
    this.doc.off("update", () => {});
    this.channel.unsubscribe();
  }
}
