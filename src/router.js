const PUBLIC_PAGES = new Set(['index', 'login']);

const PAGE_TITLES = {
  index: 'CRM Tool | Home',
  login: 'CRM Tool | Login',
  dashboard: 'CRM Tool | Dashboard',
  customers: 'CRM Tool | Customers',
  'sales-reps': 'CRM Tool | Sales Representatives',
  visits: 'CRM Tool | Visits',
  projects: 'CRM Tool | Projects',
  tasks: 'CRM Tool | Tasks',
  admin: 'CRM Tool | Admin'
};

export function setPageTitle(pageId) {
  document.title = PAGE_TITLES[pageId] || 'CRM Tool';
}

export function isProtectedPage(pageId) {
  return Boolean(pageId) && !PUBLIC_PAGES.has(pageId);
}

export function shouldRedirectToLogin(pageId, user) {
  return isProtectedPage(pageId) && !user;
}

export function shouldRedirectToDashboard(pageId, user) {
  return Boolean(user) && PUBLIC_PAGES.has(pageId);
}

export function navigateTo(url) {
  window.location.href = url;
}

export function redirectToLogin() {
  navigateTo('/login');
}

export function redirectToDashboard() {
  navigateTo('/dashboard');
}

export function redirectToIndex() {
  navigateTo('/');
}

export function getQueryParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

export function getProjectIdFromUrl() {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get('projectId');
  if (fromQuery) {
    return fromQuery;
  }

  const match = url.pathname.match(/^\/(?:project|projects)\/([^/]+)\/tasks\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getProjectUsersIdFromUrl() {
  const url = new URL(window.location.href);
  const match = url.pathname.match(/^\/projects\/([^/]+)\/users\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getTasksUrlForProject(projectId) {
  return `/project/${encodeURIComponent(projectId)}/tasks`;
}

export function getProjectUsersUrlForProject(projectId) {
  return `/projects/${encodeURIComponent(projectId)}/users`;
}
