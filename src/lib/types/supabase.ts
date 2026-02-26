// types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_keys: {
        Row: {
          id: number;
          user_key: string;
          created_at: string;
          last_visit: string;
          visit_count: number;
          user_agent: string | null;
          referrer: string | null;
          country: string | null;
        };
        Insert: {
          id?: number;
          user_key: string;
          created_at?: string;
          last_visit?: string;
          visit_count?: number;
          user_agent?: string | null;
          referrer?: string | null;
          country?: string | null;
        };
        Update: {
          id?: number;
          user_key?: string;
          created_at?: string;
          last_visit?: string;
          visit_count?: number;
          user_agent?: string | null;
          referrer?: string | null;
          country?: string | null;
        };
      };
      user_events: {
        Row: {
          id: number;
          user_key: string;
          event_type: string;
          page_url: string | null;
          event_data: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_key: string;
          event_type: string;
          page_url?: string | null;
          event_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_key?: string;
          event_type?: string;
          page_url?: string | null;
          event_data?: Json;
          created_at?: string;
        };
      };
      user_visits?: {
        Row: {
          id: number;
          user_key: string;
          visit_date: string;
          visit_count: number;
        };
        Insert: {
          id?: number;
          user_key: string;
          visit_date?: string;
          visit_count?: number;
        };
        Update: {
          id?: number;
          user_key?: string;
          visit_date?: string;
          visit_count?: number;
        };
      };
    };
  };
}

// Типы событий аналитики
export type AnalyticsEventType = 
  | 'story_start' 
  | 'story_complete' 
  | 'game_start' 
  | 'game_win' 
  | 'game_lose'
  | 'session_time'

export interface AnalyticsEventData {
  story_id?: string
  story_title?: string
  game_id?: string
  game_title?: string
  duration_seconds?: number
  dialogue_count?: number
}
