import { signIn, signUp } from '../../services/authService';

export async function renderLoginPage(container, { showToast, navigate }) {
  container.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-8 col-lg-6">
        <div class="card shadow-sm">
          <div class="card-header bg-white">
            <ul class="nav nav-tabs card-header-tabs" id="authTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#login-pane" type="button">Login</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#register-pane" type="button">Register</button>
              </li>
            </ul>
          </div>
          <div class="card-body tab-content">
            <div class="tab-pane fade show active" id="login-pane">
              <form id="login-form" class="vstack gap-3" autocomplete="off">
                <input type="text" name="fake_username" autocomplete="username" class="d-none" tabindex="-1" aria-hidden="true" />
                <input type="password" name="fake_password" autocomplete="current-password" class="d-none" tabindex="-1" aria-hidden="true" />
                <input class="form-control" type="email" name="login_email" placeholder="Email" autocomplete="off" autocapitalize="off" spellcheck="false" required />
                <input class="form-control" type="password" name="login_password" placeholder="Password" autocomplete="new-password" required />
                <button class="btn btn-primary" type="submit">Login</button>
              </form>
            </div>
            <div class="tab-pane fade" id="register-pane">
              <form id="register-form" class="vstack gap-3" autocomplete="off">
                <input type="text" name="fake_reg_username" autocomplete="username" class="d-none" tabindex="-1" aria-hidden="true" />
                <input type="password" name="fake_reg_password" autocomplete="current-password" class="d-none" tabindex="-1" aria-hidden="true" />
                <input class="form-control" type="text" name="fullName" placeholder="Full name" autocomplete="off" required />
                <input class="form-control" type="email" name="register_email" placeholder="Email" autocomplete="off" autocapitalize="off" spellcheck="false" required />
                <input class="form-control" type="password" name="register_password" placeholder="Password" minlength="6" autocomplete="new-password" required />
                <button class="btn btn-outline-primary" type="submit">Create account</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  function clearAuthForms() {
    loginForm.reset();
    registerForm.reset();

    const loginEmail = loginForm.elements.login_email;
    const loginPassword = loginForm.elements.login_password;
    const registerEmail = registerForm.elements.register_email;
    const registerPassword = registerForm.elements.register_password;

    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';
  }

  clearAuthForms();

  const onPageShow = () => {
    clearAuthForms();
  };
  if (window.__crmLoginPageShowHandler) {
    window.removeEventListener('pageshow', window.__crmLoginPageShowHandler);
  }
  window.__crmLoginPageShowHandler = onPageShow;
  window.addEventListener('pageshow', onPageShow);

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);

    try {
      await signIn(formData.get('login_email'), formData.get('login_password'));
      navigate('/dashboard');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('register_email') || '').trim();
    const password = String(formData.get('register_password') || '');

    try {
      const result = await signUp(email, password, fullName);

      if (result?.session) {
        showToast('Registration successful. You are now logged in.');
        navigate('/dashboard');
        return;
      }

      showToast('Registration created. Check your email if confirmation is enabled, then log in.');
      registerForm.reset();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });
}
