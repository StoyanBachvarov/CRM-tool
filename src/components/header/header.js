const protectedLinks = [
  { href: '/dashboard.html', label: 'Dashboard', page: 'dashboard' },
  { href: '/customers.html', label: 'Customers', page: 'customers' },
  { href: '/sales-reps.html', label: 'Sales Reps', page: 'sales-reps' },
  { href: '/visits.html', label: 'Visits', page: 'visits' },
  { href: '/projects.html', label: 'Projects', page: 'projects' },
  { href: '/tasks.html', label: 'Tasks', page: 'tasks' }
];

export function renderHeader({ user, pageId }) {
  const navLinks = user
    ? protectedLinks
        .map(
          (link) => `
            <li class="nav-item">
              <a class="nav-link ${pageId === link.page ? 'active' : ''}" href="${link.href}">${link.label}</a>
            </li>
          `
        )
        .join('')
    : `
      <li class="nav-item"><a class="nav-link ${pageId === 'index' ? 'active' : ''}" href="/index.html">Home</a></li>
      <li class="nav-item"><a class="nav-link ${pageId === 'login' ? 'active' : ''}" href="/login.html">Login</a></li>
    `;

  const rightContent = user
    ? `
      <span class="navbar-text me-3 text-light">${user.email}</span>
      <button id="logout-btn" class="btn btn-outline-light btn-sm">Logout</button>
    `
    : '<a class="btn btn-light btn-sm" href="/login.html">Get Started</a>';

  return `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div class="container">
        <a class="navbar-brand fw-bold" href="/index.html">CRM Tool</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#crmNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="crmNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">${navLinks}</ul>
          <div class="d-flex align-items-center">${rightContent}</div>
        </div>
      </div>
    </nav>
  `;
}
