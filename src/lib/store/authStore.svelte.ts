import { supabase } from "../supabaseClient";
import type { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  user_id: string;
  created_at: string;
  telegram_id: number | null;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_photo_url: string | null;
  is_author: boolean;
  is_admin: boolean;
}

// Состояние - используем объект для реактивности
const authStateObj = $state({
  user: null as User | null,
  session: null as Session | null,
  profile: null as UserProfile | null,
  loading: true,
  initialized: false,
});

// Геттеры для обратной совместимости
const user = $derived(authStateObj.user);
const session = $derived(authStateObj.session);
const profile = $derived(authStateObj.profile);
const loading = $derived(authStateObj.loading);
const initialized = $derived(authStateObj.initialized);

// Производные значения
const isAuthenticated = $derived(session !== null && user !== null);
const isAuthor = $derived(profile?.is_author ?? false);
const isAdmin = $derived(profile?.is_admin ?? false);

// Инициализация
export async function initAuth(): Promise<void> {
  try {
    authStateObj.loading = true;

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    authStateObj.session = currentSession;
    authStateObj.user = currentSession?.user ?? null;

    if (currentSession?.user) {
      await loadProfile(currentSession.user.id);
    }

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("[Auth] State change:", event, newSession?.user?.email);

      authStateObj.session = newSession;
      authStateObj.user = newSession?.user ?? null;

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        authStateObj.profile = null;
      }
    });
  } catch (error) {
    console.error("[Auth] Init error:", error);
  } finally {
    authStateObj.loading = false;
    authStateObj.initialized = true;
  }
}

async function loadProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log("[Auth] Profile not found, creating...");
        await createProfile(userId);
      } else {
        console.error("[Auth] Error loading profile:", error);
      }
      return;
    }

    authStateObj.profile = data;
    console.log("[Auth] Profile loaded:", data);
  } catch (error) {
    console.error("[Auth] Error in loadProfile:", error);
  }
}

async function createProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert([
        {
          user_id: userId,
          is_author: false,
          is_admin: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[Auth] Error creating profile:", error);
      return;
    }

    authStateObj.profile = data;
  } catch (error) {
    console.error("[Auth] Error in createProfile:", error);
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.trim()) {
    return { success: false, error: "Email не может быть пустым" };
  }

  if (!password || !password.trim()) {
    return { success: false, error: "Пароль не может быть пустым" };
  }

  authStateObj.loading = true;

  try {
    console.log("[Auth] Attempting sign in for:", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (error) {
      console.error("[Auth] Sign in error:", error);

      if (error.status === 400 || error.status === 422) {
        return { success: false, error: "Неверный email или пароль" };
      }

      if (error.message?.includes("Email not confirmed")) {
        return {
          success: false,
          error: "Email не подтвержден. Проверьте почту.",
        };
      }

      return { success: false, error: error.message };
    }

    console.log("[Auth] Sign in successful:", data.user?.email);

    authStateObj.session = data.session;
    authStateObj.user = data.user;

    if (data.user) {
      await loadProfile(data.user.id);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Auth] Sign in exception:", error);
    return { success: false, error: "Произошла ошибка при входе" };
  } finally {
    authStateObj.loading = false;
  }
}

export async function signOut(): Promise<void> {
  authStateObj.loading = true;

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Auth] Error signing out:", error);
    }

    // Сбрасываем все состояния
    authStateObj.user = null;
    authStateObj.session = null;
    authStateObj.profile = null;
    
    console.log("[Auth] Signed out successfully");
  } finally {
    authStateObj.loading = false;
  }
}

export async function signUp(
  email: string,
  password: string,
  username?: string,
): Promise<{
  success: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}> {
  authStateObj.loading = true;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split("@")[0],
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (
        error.status === 429 ||
        error.message?.toLowerCase().includes("rate limit")
      ) {
        return {
          success: false,
          error: "Слишком много попыток. Пожалуйста, подождите час.",
        };
      }
      return { success: false, error: error.message };
    }

    const needsConfirmation =
      data.user?.identities?.length === 0 ||
      data.user?.email_confirmed_at === null;

    return { success: true, needsEmailConfirmation: needsConfirmation };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    authStateObj.loading = false;
  }
}

export async function resetPassword(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectUrl = `${window.location.origin}/reset-password`;
    console.log("[Auth] Sending reset email to:", email);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error("[Auth] Reset password error:", error);

      if (
        error.status === 429 ||
        error.message?.toLowerCase().includes("rate limit")
      ) {
        return {
          success: false,
          error: "Слишком много попыток. Пожалуйста, подождите час.",
        };
      }

      return { success: false, error: error.message };
    }

    console.log("[Auth] Reset email sent:", data);
    return { success: true };
  } catch (error: any) {
    console.error("[Auth] Reset password exception:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProfile(
  updates: Partial<UserProfile>,
): Promise<{ success: boolean; error?: string }> {
  if (!authStateObj.user) {
    return { success: false, error: "Пользователь не авторизован" };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", authStateObj.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    if (authStateObj.profile) {
      authStateObj.profile = { ...authStateObj.profile, ...updates };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePassword(
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
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

// ✅ НОВАЯ ФУНКЦИЯ: проверка статуса пользователя
export async function checkUserStatus(email: string): Promise<{
  exists: boolean;
  confirmed: boolean;
  error?: string;
}> {
  try {
    // Пробуем отправить OTP - если пользователь существует, получим успех
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false, // Не создавать нового пользователя
      },
    });

    if (error) {
      // Если пользователь не найден
      if (error.message?.includes("User not found")) {
        return { exists: false, confirmed: false };
      }

      // Другие ошибки (например, rate limit)
      return { exists: true, confirmed: false, error: error.message };
    }

    // Если OTP отправился успешно - пользователь существует
    return { exists: true, confirmed: true };
  } catch (error: any) {
    console.error("[Auth] Error checking user status:", error);
    return { exists: false, confirmed: false, error: error.message };
  }
}

// Экспорты - используем derived для реактивности
export const authState = {
  get user() {
    return authStateObj.user;
  },
  get session() {
    return authStateObj.session;
  },
  get profile() {
    return authStateObj.profile;
  },
  get loading() {
    return authStateObj.loading;
  },
  get initialized() {
    return authStateObj.initialized;
  },
};

export const authDerivedState = {
  get isAuthenticated() {
    return isAuthenticated;
  },
  get isAuthor() {
    return isAuthor;
  },
  get isAdmin() {
    return isAdmin;
  },
};
