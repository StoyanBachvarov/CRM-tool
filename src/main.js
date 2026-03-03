import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import * as bootstrapLib from 'bootstrap';
import './styles/main.css';

if (!window.bootstrap) {
  window.bootstrap = bootstrapLib;
}

import { renderLayout } from './components/layout/layout';
import { showToast } from './components/common/toast';
import { getCurrentUser, onAuthStateChange, signOut } from './services/authService';
import { getProfileById } from './services/profilesService';
import { isSupabaseConfigured, supabaseConfigSource } from './services/supabaseClient';
import {
  navigateTo,
  redirectToDashboard,
  redirectToIndex,
  redirectToLogin,
  setPageTitle,
  shouldRedirectToDashboard,
  shouldRedirectToLogin
} from './router';

import { renderIndexPage } from './pages/index/indexPage';
import { renderLoginPage } from './pages/login/loginPage';
import { renderDashboardPage } from './pages/dashboard/dashboardPage';
import { renderCustomersPage } from './pages/customers/customersPage';
import { renderSalesRepsPage } from './pages/sales-reps/salesRepsPage';
import { renderVisitsPage } from './pages/visits/visitsPage';
import { renderProjectsPage } from './pages/projects/projectsPage';
import { renderTasksPage } from './pages/tasks/tasksPage';
import { renderTaskDeadlinesPage } from './pages/task-deadlines/taskDeadlinesPage';
import { renderTaskLabelsPage } from './pages/task-labels/taskLabelsPage';
import { renderAdminPage } from './pages/admin/adminPage';

const app = document.getElementById('app');
const pageId = document.body.dataset.page;

const pageMap = {
  index: { render: renderIndexPage, protected: false },
  login: { render: renderLoginPage, protected: false },
  dashboard: { render: renderDashboardPage, protected: true },
  customers: { render: renderCustomersPage, protected: true },
  'sales-reps': { render: renderSalesRepsPage, protected: true },
  visits: { render: renderVisitsPage, protected: true },
  projects: { render: renderProjectsPage, protected: true },
  tasks: { render: renderTasksPage, protected: true },
  'task-deadlines': { render: renderTaskDeadlinesPage, protected: true },
  'task-labels': { render: renderTaskLabelsPage, protected: true },
  admin: { render: renderAdminPage, protected: true }
};

function isReloadNavigation() {
  const entries = window.performance?.getEntriesByType?.('navigation');
  if (!entries?.length) {
    return false;
  }

  return entries[0].type === 'reload';
}

async function bootstrap() {
  const pageDef = pageMap[pageId];
  if (!pageDef) {
    return;
  }

  setPageTitle(pageId);

  if (import.meta.env.PROD && !window.sessionStorage.getItem('crm_supabase_env_debug_shown')) {
    const status = isSupabaseConfigured
      ? `Supabase config source: ${supabaseConfigSource}`
      : 'Supabase config missing (check Netlify env vars).';
    showToast(status, isSupabaseConfigured ? 'info' : 'danger');
    window.sessionStorage.setItem('crm_supabase_env_debug_shown', '1');
  }

  if (isReloadNavigation()) {
    try {
      await signOut();
    } catch {
      // no-op
    }
  }

  let user = null;
  try {
    user = await getCurrentUser();

    if (user) {
      const profile = await getProfileById(user.id);
      user = {
        ...user,
        role: profile?.role || 'sales_rep',
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email
      };
    }
  } catch (error) {
    showToast(error.message, 'danger');
  }

  if (shouldRedirectToLogin(pageId, user)) {
    redirectToLogin();
    return;
  }

  if (shouldRedirectToDashboard(pageId, user)) {
    redirectToDashboard();
    return;
  }

  if (pageId === 'admin' && user?.role !== 'admin') {
    showToast('Admin role required.', 'danger');
    redirectToDashboard();
    return;
  }

  const container = renderLayout(app, { user, pageId });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
        redirectToIndex();
      } catch (error) {
        showToast(error.message, 'danger');
      }
    });
  }

  await pageDef.render(container, {
    user,
    showToast,
    navigate: navigateTo
  });

  onAuthStateChange((nextUser) => {
    if (!nextUser && shouldRedirectToLogin(pageId, nextUser)) {
      redirectToLogin();
    }
  });
}

bootstrap();
