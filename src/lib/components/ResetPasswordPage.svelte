<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../supabaseClient';

  let { onClose, initialError = '' } = $props<{ 
    onClose?: () => void; 
    initialError?: string;
  }>();

  let newPassword = $state('');
  let confirmPassword = $state('');
  let resetEmail = $state('');
  let loading = $state(false);
  let message = $state('');
  let error = $state(initialError);
  let isSuccess = $state(false);
  let hasValidToken = $state(false);

  async function resendResetLink() {
    if (!resetEmail) return;
    
    loading = true;
    error = '';
    message = '';

    console.log('[ResetPassword] Отправка сброса на:', resetEmail);

    try {
      // Используем базовый URL без redirectTo для тестирования
      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail);

      console.log('[ResetPassword] Ответ:', { data, error: resetError });

      if (resetError) {
        console.error('[ResetPassword] Ошибка:', resetError);
        
        // Обработка rate limit (бесплатный план: 2 письма в час)
        if (resetError.message?.toLowerCase().includes('rate limit') || resetError.message?.toLowerCase().includes('too many')) {
          error = '⚠️ Лимит писем исчерпан! На бесплатном плане Supabase можно отправить только 2 письма в час.\n\n📧 Решение: настройте SMTP в Supabase (например, Resend — бесплатно 3000 писем/мес).';
        } else if (resetError.message?.includes('User not found') || resetError.message?.includes('No user')) {
          error = 'Пользователь с таким email не найден';
        } else if (resetError.message?.includes('Email address is invalid')) {
          error = 'Неверный формат email';
        } else {
          // Показываем оригинальную ошибку для диагностики
          error = `Ошибка: ${resetError.message}`;
        }
      } else {
        message = 'Ссылка для сброса пароля отправлена! Проверьте почту (и спам).';
      }
    } catch (err: any) {
      console.error('[ResetPassword] Исключение:', err);
      error = err.message || 'Ошибка отправки ссылки';
    }

    loading = false;
  }

  onMount(async () => {
    // Проверяем токен в URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const errorParam = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    console.log('[ResetPassword] Hash params:', { accessToken, type, errorParam, errorDescription });

    // Если есть ошибка в URL - показываем форму повторной отправки
    if (errorParam) {
      hasValidToken = false;
      error = errorDescription || errorParam;
      return;
    }

    // Если есть токен и тип recovery - показываем форму ввода пароля
    if (accessToken && type === 'recovery') {
      hasValidToken = true;
      // Устанавливаем сессию из токена
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || '',
      });

      if (sessionError) {
        console.error('[ResetPassword] Ошибка установки сессии:', sessionError);
        error = sessionError.message || 'Ссылка для сброса пароля недействительна';
        hasValidToken = false;
      }
    } else if (initialError) {
      // Если передана начальная ошибка
      hasValidToken = false;
      error = initialError;
    } else {
      // Нет токена - показываем форму для повторной отправки
      hasValidToken = false;
    }
  });

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
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('[ResetPassword] Ошибка обновления пароля:', updateError);
        error = updateError.message;
      } else {
        isSuccess = true;
        message = 'Пароль успешно изменён! Теперь вы можете войти с новым паролем.';
        
        // Перенаправляем через 3 секунды
        setTimeout(() => {
          // Очищаем URL
          window.location.hash = '';
          onClose?.();
        }, 3000);
      }
    } catch (err: any) {
      console.error('[ResetPassword] Исключение:', err);
      error = err.message || 'Произошла ошибка при сбросе пароля';
    }

    loading = false;
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
