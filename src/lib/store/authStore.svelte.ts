import { supabase } from '../supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// Тип для профиля пользователя (по структуре вашей таблицы)
interface UserProfile {
  user_id: string;
  created_at: string;
  telegram_id: bigint | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_photo_url: string | null;
  is_author: boolean;
  is_admin: boolean;
}

// Состояние аутентификации
interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
}

// Начальное состояние
const auth: AuthState = $state({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,
});

// Derived состояние
const authDerived = $derived({
  isAuthenticated: auth.session !== null && auth.user !== null,
  isAuthor: auth.profile?.is_author ?? false,
});

// Инициализация аутентификации
export async function initAuth(): Promise<void> {
  auth.loading = true;

  const { data: { session } } = await supabase.auth.getSession();
  auth.session = session;
  auth.user = session?.user ?? null;

  if (session?.user) {
    await loadProfile(session.user.id);
  }

  auth.loading = false;
  auth.initialized = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    auth.session = session;
    auth.user = session?.user ?? null;

    if (session?.user) {
      await loadProfile(session.user.id);
    } else {
      auth.profile = null;
    }
  });
}

// Загрузка профиля пользователя
async function loadProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading profile:', error);
      return;
    }

    auth.profile = data;
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Регистрация нового пользователя
export async function signUp(email: string, password: string, username?: string): Promise<{ success: boolean; error?: string }> {
  auth.loading = true;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
        }
      }
    });

    if (error) {
      auth.loading = false;
      return { success: false, error: error.message };
    }

    auth.loading = false;
    return { success: true };
  } catch (error: any) {
    auth.loading = false;
    return { success: false, error: error.message };
  }
}

// Вход пользователя
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  auth.loading = true;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      auth.loading = false;
      return { success: false, error: error.message };
    }

    auth.loading = false;
    return { success: true };
  } catch (error: any) {
    auth.loading = false;
    return { success: false, error: error.message };
  }
}

// Выход пользователя
export async function signOut(): Promise<void> {
  auth.loading = true;

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
  }

  auth.user = null;
  auth.session = null;
  auth.profile = null;
  auth.loading = false;
}

// Обновление профиля
export async function updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
  if (!auth.user) {
    return { success: false, error: 'Пользователь не авторизован' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', auth.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    if (auth.profile) {
      auth.profile = { ...auth.profile, ...updates };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Обновление пароля
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Сброс пароля
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Экспорт состояния
export const authState = auth;
export const authDerivedState = authDerived;
