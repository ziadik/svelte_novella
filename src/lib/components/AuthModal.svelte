<script lang="ts">
  import { authState, authDerivedState, signIn, signUp, resetPassword } from '../store/authStore.svelte';

  let {
    onClose,
    initialMode = 'login'
  } = $props<{
    onClose?: () => void;
    initialMode?: 'login' | 'register' | 'reset';
  }>();

  let mode = $state<'login' | 'register' | 'reset'>(initialMode);
  let email = $state('');
  let password = $state('');
  let username = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);

  async function handleSubmit() {
    error = '';
    success = '';
    loading = true;

    if (mode === 'login') {
      const result = await signIn(email, password);
      if (!result.success) {
        error = result.error || 'Ошибка входа';
      } else {
        onClose?.();
      }
    } else if (mode === 'register') {
      const result = await signUp(email, password, username);
      if (!result.success) {
        error = result.error || 'Ошибка регистрации';
      } else {
        success = 'Проверьте почту для подтверждения регистрации!';
      }
    } else if (mode === 'reset') {
      const result = await resetPassword(email);
      if (!result.success) {
        error = result.error || 'Ошибка сброса пароля';
      } else {
        success = 'Инструкции по сбросу пароля отправлены на почту!';
      }
    }

    loading = false;
  }

  function switchMode(newMode: 'login' | 'register' | 'reset') {
    mode = newMode;
    error = '';
    success = '';
  }
</script>

<div class="auth-modal-overlay" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose?.()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="auth-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
    <button class="close-btn" onclick={onClose} aria-label="Закрыть">×</button>
    
    <h2>
      {#if mode === 'login'}
        Вход
      {:else if mode === 'register'}
        Регистрация
      {:else}
        Сброс пароля
      {/if}
    </h2>

    {#if error}
      <div class="alert error">{error}</div>
    {/if}

    {#if success}
      <div class="alert success">{success}</div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {#if mode === 'register'}
        <div class="form-group">
          <label for="username">Имя пользователя</label>
          <input
            type="text"
            id="username"
            bind:value={username}
            placeholder="Придумайте имя"
            required
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="your@email.com"
          required
        />
      </div>

      {#if mode !== 'reset'}
        <div class="form-group">
          <label for="password">Пароль</label>
          <input
            type="password"
            id="password"
            bind:value={password}
            placeholder="Введите пароль"
            required
            minlength="6"
          />
        </div>
      {/if}

      <button type="submit" class="btn-primary" disabled={loading}>
        {#if loading}
          Загрузка...
        {:else if mode === 'login'}
          Войти
        {:else if mode === 'register'}
          Зарегистрироваться
        {:else}
          Отправить
        {/if}
      </button>
    </form>

    <div class="auth-links">
      {#if mode === 'login'}
        <button type="button" class="link-btn" onclick={() => switchMode('reset')}>
          Забыли пароль?
        </button>
        <button type="button" class="link-btn" onclick={() => switchMode('register')}>
          Нет аккаунта? Регистрация
        </button>
      {:else if mode === 'register'}
        <button type="button" class="link-btn" onclick={() => switchMode('login')}>
          Уже есть аккаунт? Войти
        </button>
      {:else}
        <button type="button" class="link-btn" onclick={() => switchMode('login')}>
          Вспомнили пароль? Войти
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .auth-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }

  .auth-modal {
    background: #252526;
    border-radius: 12px;
    padding: 30px;
    width: 100%;
    max-width: 400px;
    position: relative;
    border: 1px solid #3c3c3c;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    color: #888;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .close-btn:hover {
    color: #fff;
  }

  h2 {
    margin: 0 0 20px 0;
    color: #ececec;
    text-align: center;
    font-size: 1.5rem;
  }

  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    color: #aaa;
    font-size: 0.9rem;
  }

  input {
    width: 100%;
    padding: 12px;
    background: #3c3c3c;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    color: #fff;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #e94560;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #e94560, #c0394d);
    border: none;
    border-radius: 6px;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(233, 69, 96, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .alert {
    padding: 10px 15px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-size: 0.9rem;
  }

  .alert.error {
    background: rgba(233, 69, 96, 0.2);
    border: 1px solid #e94560;
    color: #e94560;
  }

  .alert.success {
    background: rgba(0, 184, 148, 0.2);
    border: 1px solid #00b894;
    color: #00b894;
  }

  .auth-links {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .link-btn {
    background: none;
    border: none;
    color: #4db6ac;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 5px;
  }

  .link-btn:hover {
    color: #80cbc4;
    text-decoration: underline;
  }
</style>
