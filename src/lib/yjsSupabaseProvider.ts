import * as Y from "yjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

const GAME_STATE_TABLE = 'game_state';

export class YjsSupabaseProvider {
  private channel: RealtimeChannel;
  private isDestroyed = false;

  constructor(
    public doc: Y.Doc,
    public roomId: string,
  ) {
    // Создаём уникальный канал для комнаты
    const channelId = `tictactoe:${roomId}:${Date.now()}`;
    this.channel = supabase.channel(channelId);

    // Подписываемся на сообщения типа 'yjs-update'
    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        if (this.isDestroyed) return;
        // Применяем полученное обновление к локальному документу
        try {
          const update = new Uint8Array(payload.update);
          Y.applyUpdate(this.doc, update);
        } catch (e) {
          console.error('[Yjs] Error applying update:', e);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Yjs] Подписка на канал:', channelId);
          // После подписки загружаем начальное состояние
          this.loadInitialState();
        }
      });

    // Отправляем локальные изменения всем подписчикам
    this.doc.on("update", (update: Uint8Array, origin: any) => {
      if (this.isDestroyed) return;
      // Не отправляем обновления, которые пришли из сети
      if (origin === 'remote') return;
      
      this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: Array.from(update) },
      });
    });
  }

  // Загрузить начальное состояние из БД
  private async loadInitialState() {
    try {
      // Пробуем получить сохраненное состояние из таблицы game_state
      const { data, error } = await supabase
        .from(GAME_STATE_TABLE)
        .select('state_data')
        .eq('room_id', this.roomId)
        .single();

      if (error) {
        console.log('[Yjs] Нет сохраненного состояния или ошибка:', error.message);
        return;
      }

      if (data?.state_data) {
        // Декодируем base64 и применяем к документу
        try {
          const stateData = atob(data.state_data);
          const stateArray = new Uint8Array(stateData.length);
          for (let i = 0; i < stateArray.length; i++) {
            stateArray[i] = stateData.charCodeAt(i);
          }
          Y.applyUpdate(this.doc, stateArray);
          console.log('[Yjs] Загружено начальное состояние');
        } catch (e) {
          console.error('[Yjs] Ошибка декодирования состояния:', e);
        }
      }
    } catch (e) {
      console.error('[Yjs] Ошибка загрузки начального состояния:', e);
    }
  }

  // Сохранить состояние в БД (для новых игроков)
  async saveState() {
    if (this.isDestroyed) return;
    
    try {
      const stateVector = Y.encodeStateAsUpdate(this.doc);
      const stateBase64 = btoa(String.fromCharCode(...stateVector));
      
      await supabase
        .from(GAME_STATE_TABLE)
        .upsert({
          room_id: this.roomId,
          state_data: stateBase64,
          updated_at: new Date().toISOString()
        }, { onConflict: 'room_id' });
    } catch (e) {
      console.error('[Yjs] Ошибка сохранения состояния:', e);
    }
  }

  destroy() {
    this.isDestroyed = true;
    // Не уничтожаем doc здесь - это делает вызывающий код
    this.doc.off("update", () => {});
    this.channel.unsubscribe();
  }
}
