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
  tasks: { render: renderTasksPage, protected: true }
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
