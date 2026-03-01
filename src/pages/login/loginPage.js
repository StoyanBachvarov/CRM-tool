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
              <form id="login-form" class="vstack gap-3">
                <input class="form-control" type="email" name="email" placeholder="Email" required />
                <input class="form-control" type="password" name="password" placeholder="Password" required />
                <button class="btn btn-primary" type="submit">Login</button>
              </form>
            </div>
            <div class="tab-pane fade" id="register-pane">
              <form id="register-form" class="vstack gap-3">
                <input class="form-control" type="text" name="fullName" placeholder="Full name" required />
                <input class="form-control" type="email" name="email" placeholder="Email" required />
                <input class="form-control" type="password" name="password" placeholder="Password" minlength="6" required />
                <button class="btn btn-outline-primary" type="submit">Create account</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);

    try {
      await signIn(formData.get('email'), formData.get('password'));
      navigate('/dashboard.html');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);

    try {
      await signUp(formData.get('email'), formData.get('password'), formData.get('fullName'));
      showToast('Registration created. You can now log in.');
      registerForm.reset();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });
}
