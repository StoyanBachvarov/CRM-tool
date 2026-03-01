let toastContainer;

function ensureToastContainer() {
  if (toastContainer) {
    return toastContainer;
  }

  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
  toastContainer.style.zIndex = '2000';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message, variant = 'info') {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  const borderClass = variant === 'danger' ? 'text-bg-danger' : 'text-bg-dark';

  toast.className = `toast align-items-center border-0 ${borderClass}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);
  const bsToast = new window.bootstrap.Toast(toast, { delay: 2800 });
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}
