<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../supabaseClient';

  let { onClose, initialError = '', initialToken = '' } = $props<{ 
    onClose?: () => void; 
    initialError?: string;
    initialToken?: string;
  }>();

  let newPassword = $state('');
  let confirmPassword = $state('');
  let resetEmail = $state('');
  let loading = $state(false);
  let message = $state('');
  let error = $state(initialError);
  let isSuccess = $state(false);
  let hasValidToken = $state(false);
  let sessionSet = $state(false);

  async function setSessionFromToken() {
    if (sessionSet) return true;
    
    try {
      console.log('[ResetPassword] Setting session from token');
      
      // Пробуем установить сессию из текущей URL
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[ResetPassword] Session error:', sessionError);
        return false;
      }
      
      if (session) {
        console.log('[ResetPassword] Session already exists');
        sessionSet = true;
        return true;
      }
      
      // Если нет сессии, но есть токен - пробуем восстановить
      if (initialToken) {
        // Для PKCE потока токен уже в URL, Supabase сам обработает
        console.log('[ResetPassword] Token provided, waiting for session...');
        
        // Даем время Supabase обработать токен
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          sessionSet = true;
          return true;
        }
      }
      
      return false;
    } catch (err) {
      console.error('[ResetPassword] Error setting session:', err);
      return false;
    }
  }

  onMount(async () => {
    console.log('[ResetPassword] Mounted with:', { 
      hasToken: !!initialToken, 
      hasError: !!initialError,
      path: window.location.pathname,
      hash: window.location.hash,
      search: window.location.search
    });

    // Если есть токен или мы на странице сброса
    if (initialToken || window.location.pathname === '/reset-password') {
      const sessionValid = await setSessionFromToken();
      hasValidToken = sessionValid;
      
      if (!sessionValid && !initialError) {
        error = 'Ссылка для сброса пароля недействительна или истекла. Запросите новую.';
      }
    } else if (initialError) {
      hasValidToken = false;
      error = initialError;
    }
  });

  async function resendResetLink() {
    if (!resetEmail) return;
    
    loading = true;
    error = '';
    message = '';

    console.log('[ResetPassword] Sending reset to:', resetEmail);

    try {
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      console.log('[ResetPassword] Response:', { data, error: resetError });

      if (resetError) {
        if (resetError.message?.toLowerCase().includes('rate limit') || 
            resetError.message?.toLowerCase().includes('too many')) {
          error = 'Лимит отправки писем исчерпан. Пожалуйста, подождите час.';
        } else if (resetError.message?.includes('User not found')) {
          error = 'Пользователь с таким email не найден';
        } else {
          error = resetError.message;
        }
      } else {
        message = 'Ссылка для сброса пароля отправлена! Проверьте почту (и папку спам).';
      }
    } catch (err: any) {
      console.error('[ResetPassword] Exception:', err);
      error = err.message || 'Ошибка отправки';
    }

    loading = false;
  }

  async function handleResetPassword() {
    error = '';
    message = '';

    if (newPassword.length < 6) {
      error = 'Пароль должен быть не менее 6 символов';
      return;
    }

    if (newPassword !== confirmPassword) {
      error = 'Пароли не совпадают';
      return;
    }

    loading = true;

    try {
      // Сначала убеждаемся что есть сессия
      const sessionValid = await setSessionFromToken();
      
      if (!sessionValid) {
        error = 'Сессия не найдена. Пожалуйста, запросите новую ссылку для сброса пароля.';
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('[ResetPassword] Update error:', updateError);
        error = updateError.message;
      } else {
        isSuccess = true;
        message = 'Пароль успешно изменён!';
        
        // Выходим через 3 секунды
        setTimeout(() => {
          window.location.hash = '';
          onClose?.();
        }, 3000);
      }
    } catch (err: any) {
      console.error('[ResetPassword] Exception:', err);
      error = err.message || 'Ошибка при сбросе пароля';
    } finally {
      loading = false;
    }
  }
</script>

<div class="reset-password-overlay">
  <div class="reset-card">
    <button class="close-btn" onclick={onClose} aria-label="Закрыть">×</button>
    
    <h1>🔐 Сброс пароля</h1>

    {#if isSuccess}
      <div class="success-message">
        <span class="icon">✅</span>
        <p>{message}</p>
        <p class="redirect">Перенаправление...</p>
      </div>
    {:else if !hasValidToken && error}
      <div class="error-message">
        <span class="icon">⚠️</span>
        <p>{error}</p>
        <p class="hint">Срок действия ссылки истёк. Запросите новую ссылку для сброса пароля.</p>
        <button class="btn secondary" onclick={onClose}>Вернуться</button>
      </div>
    {:else if !hasValidToken}
      <!-- Форма для повторной отправки ссылки -->
      <p class="description">
        Для сброса пароля введите ваш email. Мы отправим вам ссылку для создания нового пароля.
      </p>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      {#if message}
        <div class="success-message-small">{message}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); resendResetLink(); }}>
        <div class="form-group">
          <label for="reset-email">Ваш email</label>
          <input
            type="email"
            id="reset-email"
            bind:value={resetEmail}
            placeholder="your@email.com"
            required
          />
        </div>

        <button type="submit" class="btn-submit" disabled={loading || !resetEmail}>
          {loading ? 'Отправка...' : 'Отправить ссылку'}
        </button>
      </form>

      <div class="links">
        <button class="btn-link" onclick={onClose}>← На главную</button>
      </div>
    {:else}
      <p class="description">
        Введите новый пароль для вашего аккаунта.
      </p>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleResetPassword(); }}>
        <div class="form-group">
          <label for="new-password">Новый пароль</label>
          <input
            type="password"
            id="new-password"
            bind:value={newPassword}
            placeholder="Минимум 6 символов"
            minlength="6"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirm-password">Подтвердите пароль</label>
          <input
            type="password"
            id="confirm-password"
            bind:value={confirmPassword}
            placeholder="Повторите пароль"
            minlength="6"
            required
          />
        </div>

        <button type="submit" class="btn-submit" disabled={loading || !hasValidToken}>
          {loading ? 'Сохранение...' : 'Сохранить новый пароль'}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .reset-password-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    padding: 20px;
  }

  .reset-card {
    background: #252526;
    border-radius: 16px;
    padding: 40px;
    width: 100%;
    max-width: 400px;
    border: 1px solid #3c3c3c;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: 15px;
    right: 20px;
    background: none;
    border: none;
    color: #888;
    font-size: 28px;
    cursor: pointer;
    line-height: 1;
  }

  .close-btn:hover {
    color: #fff;
  }

  h1 {
    color: #ececec;
    font-size: 1.5rem;
    margin: 0 0 20px 0;
    text-align: center;
  }

  .description {
    color: #aaa;
    text-align: center;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    color: #aaa;
    margin-bottom: 8px;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 12px;
    background: #3c3c3c;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #e94560;
  }

  .btn-submit {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #e94560, #c0394d);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(233, 69, 96, 0.4);
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    background: rgba(233, 69, 96, 0.2);
    border: 1px solid #e94560;
    color: #e94560;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.9rem;
    text-align: center;
    white-space: pre-line;
  }

  .error-message .icon {
    font-size: 24px;
    display: block;
    margin-bottom: 8px;
  }

  .success-message {
    text-align: center;
    padding: 20px;
  }

  .success-message .icon {
    font-size: 48px;
    display: block;
    margin-bottom: 15px;
  }

  .success-message p {
    color: #00b894;
    margin: 0 0 10px 0;
  }

  .success-message .redirect {
    color: #888;
    font-size: 0.9rem;
  }

  .btn-link {
    background: none;
    border: none;
    color: #4db6ac;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 10px;
    text-decoration: underline;
  }

  .btn-link:hover {
    color: #80cbc4;
  }

  .hint {
    color: #888;
    font-size: 0.85rem;
    margin-top: 5px;
  }

  .success-message-small {
    background: rgba(0, 184, 148, 0.2);
    border: 1px solid #00b894;
    color: #00b894;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 0.9rem;
    text-align: center;
  }

  .btn.secondary {
    background: #3c3c3c;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 10px;
  }

  .btn.secondary:hover {
    background: #4a4a4a;
  }
</style>
