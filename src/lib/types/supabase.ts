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
