const protectedLinks = [
  { href: '/dashboard', label: 'Dashboard', page: 'dashboard' },
  { href: '/customers', label: 'Customers', page: 'customers' },
  { href: '/sales-reps', label: 'Sales Reps', page: 'sales-reps' },
  { href: '/visits', label: 'Visits', page: 'visits' },
  { href: '/projects', label: 'Projects', page: 'projects' },
  { href: '/tasks', label: 'Tasks', page: 'tasks' },
  { href: '/task-deadlines', label: 'Deadlines', page: 'task-deadlines' },
  { href: '/task-labels', label: 'Task Labels', page: 'task-labels' }
];

export function renderHeader({ user, pageId }) {
  const links = user?.role === 'admin' ? [...protectedLinks, { href: '/admin', label: 'Admin', page: 'admin' }] : protectedLinks;
  const navLinks = user
    ? links
        .map(
          (link) => `
            <li class="nav-item">
              <a class="nav-link ${pageId === link.page ? 'active' : ''}" href="${link.href}">${link.label}</a>
            </li>
          `
        )
        .join('')
    : `
      <li class="nav-item"><a class="nav-link ${pageId === 'index' ? 'active' : ''}" href="/">Home</a></li>
      <li class="nav-item"><a class="nav-link ${pageId === 'login' ? 'active' : ''}" href="/login">Login</a></li>
    `;

  const rightContent = user
    ? `
      <span class="navbar-text me-3 text-light">${user.email}</span>
      <button id="logout-btn" class="btn btn-outline-light btn-sm">Logout</button>
    `
    : '<a class="btn btn-light btn-sm" href="/login">Get Started</a>';

  return `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div class="container">
        <a class="navbar-brand fw-bold" href="/">CRM Tool</a>
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
