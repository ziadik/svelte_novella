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
  private onStateLoaded: (() => void) | null = null;
  private onRemoteUpdate: (() => void) | null = null; // Колбэк при удалённом обновлении
  private lastSavedTimestamp: number = 0; // Timestamp последнего сохранения

  // Получить текущее состояние board из Yjs
  private getBoardState(): (string | null)[] {
    try {
      const yBoard = this.doc.getArray<string | null>('board');
      return yBoard.toArray();
    } catch (e) {
      console.error('[Yjs] Ошибка получения board:', e);
      return [];
    }
  }

  // Логировать состояние board
  private logBoard(label: string) {
    const board = this.getBoardState();
    console.log(`[Yjs] ${label} Board:`, JSON.stringify(board));
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
        console.log('[Yjs] 📡 Payload:', JSON.stringify(payload));
        
        if (this.isDestroyed) return;
        
        try {
          // Логируем board ДО получения обновления
          this.logBoard('<<< ПОЛУЧЕНИЕ - ДО');
          
          // Пробуем получить payload разными способами
          const payloadData = (payload as any).payload || (payload as any);
          console.log('[Yjs] >>> Получено broadcast, payloadData:', payloadData);
          
          if (!payloadData || !payloadData.update) {
            console.error('[Yjs] ❌ НЕТ update в payload!', payloadData);
            return;
          }
          
          const update = new Uint8Array(payloadData.update);
          console.log('[Yjs] Получено обновление, размер:', update.length, 'bytes');
          
          // Проверяем состояние doc ДО применения
          const yBoardBefore = this.doc.getArray<string | null>('board');
          console.log('[Yjs] Doc board ДО applyUpdate:', JSON.stringify(yBoardBefore.toArray()));
          
          // Применяем обновление с пометкой 'remote'
          Y.applyUpdate(this.doc, update, 'remote');
          console.log('[Yjs] Обновление применено к doc');
          
          // Проверяем состояние doc ПОСЛЕ применения
          const yBoardAfter = this.doc.getArray<string | null>('board');
          console.log('[Yjs] Doc board ПОСЛЕ applyUpdate:', JSON.stringify(yBoardAfter.toArray()));
          
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
      
      // Не отправляем обновления из сети или при начальной синхронизации
      if (origin === 'remote' || this.isInitialSync) {
        // console.log('[Yjs] Пропускаем отправку, origin:', origin);
        return;
      }

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

      // Проверяем что локальное состояние новее
      if (this.lastSavedTimestamp > 0 && this.lastSavedTimestamp < remoteTimestamp) {
        console.log('[Yjs] Удаленное состояние новее, пропускаем сохранение');
        return;
      }

      // Кодируем текущее состояние
      const stateVector = Y.encodeStateAsUpdate(this.doc);
      const stateBase64 = btoa(String.fromCharCode(...stateVector));
      const now = new Date().toISOString();
      
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
        console.log('[Yjs] Состояние сохранено, timestamp:', this.lastSavedTimestamp);
      }
    } catch (e) {
      console.error('[Yjs] Ошибка сохранения:', e);
    }
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
