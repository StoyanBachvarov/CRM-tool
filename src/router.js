const PUBLIC_PAGES = new Set(['index', 'login']);

const PAGE_TITLES = {
  index: 'CRM Tool | Home',
  login: 'CRM Tool | Login',
  dashboard: 'CRM Tool | Dashboard',
  customers: 'CRM Tool | Customers',
  'sales-reps': 'CRM Tool | Sales Representatives',
  visits: 'CRM Tool | Visits',
  projects: 'CRM Tool | Projects',
  tasks: 'CRM Tool | Tasks'
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
  navigateTo('/login.html');
}

export function redirectToDashboard() {
  navigateTo('/dashboard.html');
}

export function redirectToIndex() {
  navigateTo('/index.html');
}

export function getQueryParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}
