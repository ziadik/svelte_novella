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
  try {
    auth.loading = true;

    const { data: { session } } = await supabase.auth.getSession();
    auth.session = session;
    auth.user = session?.user ?? null;

    if (session?.user) {
      await loadProfile(session.user.id);
    }

    // Подписка на изменения аутентификации
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event);
      auth.session = session;
      auth.user = session?.user ?? null;

      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        auth.profile = null;
      }
      
      auth.loading = false;
    });
  } catch (error) {
    console.error('[Auth] Init error:', error);
  } finally {
    auth.loading = false;
    auth.initialized = true;
  }
}

// Загрузка профиля пользователя
async function loadProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Профиль не найден - создаем новый
        console.log('[Auth] Profile not found, creating...');
        await createProfile(userId);
      } else {
        console.error('[Auth] Error loading profile:', error);
      }
      return;
    }

    auth.profile = data;
  } catch (error) {
    console.error('[Auth] Error in loadProfile:', error);
  }
}
// Создание профиля
async function createProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ 
        user_id: userId,
        is_author: false,
        is_admin: false 
      }])
      .select()
      .single();

    if (error) {
      console.error('[Auth] Error creating profile:', error);
      return;
    }

    auth.profile = data;
  } catch (error) {
    console.error('[Auth] Error in createProfile:', error);
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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    auth.loading = false;
  }
}

// Вход пользователя
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Валидация на пустые значения
  if (!email || !email.trim()) {
    return { success: false, error: 'Email не может быть пустым' };
  }
  
  if (!password || !password.trim()) {
    return { success: false, error: 'Пароль не может быть пустым' };
  }

  // Базовая валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Неверный формат email' };
  }

  auth.loading = true;

  try {
    console.log('[Auth] Attempting sign in for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      console.error('[Auth] Sign in error:', error);
      
      // Обработка различных ошибок
      if (error.status === 400 || error.status === 422) {
        // Проверяем, не требует ли пользователь подтверждения email
        const { data: userData } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
        });
        
        if (userData) {
          return { 
            success: false, 
            error: 'Email не подтвержден. Проверьте почту и подтвердите регистрацию.' 
          };
        }
        
        return { 
          success: false, 
          error: 'Неверный email или пароль' 
        };
      }
      
      if (error.message?.includes('Invalid login credentials')) {
        return { success: false, error: 'Неверный email или пароль' };
      }
      
      if (error.message?.includes('Email not confirmed')) {
        return { 
          success: false, 
          error: 'Email не подтвержден. Проверьте почту и перейдите по ссылке подтверждения.' 
        };
      }
      
      return { success: false, error: error.message };
    }

    console.log('[Auth] Sign in successful:', data.user?.email);
    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Sign in exception:', error);
    return { success: false, error: 'Произошла ошибка при входе' };
  } finally {
    auth.loading = false;
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
    // Для чисто клиентского приложения используем относительный URL
    const redirectUrl = `${window.location.origin}/reset-password`;
    console.log('[Auth] Sending reset email to:', email, 'with redirect:', redirectUrl);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('[Auth] Reset password error:', error);
      
      // Обработка rate limit
      if (error.message?.toLowerCase().includes('rate limit') || 
          error.message?.toLowerCase().includes('too many')) {
        return { 
          success: false, 
          error: 'Лимит отправки писем исчерпан. Пожалуйста, подождите час или настройте SMTP в Supabase.' 
        };
      }
      
      return { success: false, error: error.message };
    }

    console.log('[Auth] Reset email sent:', data);
    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Reset password exception:', error);
    return { success: false, error: error.message };
  }
}

// Проверка статуса пользователя
export async function checkUserStatus(email: string): Promise<{ 
  exists: boolean; 
  confirmed: boolean;
  error?: string 
}> {
  try {
    // Пробуем отправить OTP - если пользователь существует, получим успех
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false // Не создавать нового пользователя
      }
    });

    if (error) {
      if (error.message?.includes('User not found')) {
        return { exists: false, confirmed: false };
      }
      return { exists: true, confirmed: false, error: error.message };
    }

    // Если OTP отправился успешно - пользователь существует
    return { exists: true, confirmed: true };
  } catch (error) {
    return { exists: false, confirmed: false, error: 'Ошибка проверки' };
  }
}

// Экспорт состояния
export const authState = auth;
export const authDerivedState = authDerived;
