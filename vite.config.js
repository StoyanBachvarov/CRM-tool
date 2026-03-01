import { defineConfig } from 'vite';
import { resolve } from 'path';

function rewritePrettyUrl(urlValue) {
  if (!urlValue) {
    return urlValue;
  }

  const url = new URL(urlValue, 'http://localhost');
  const pathname = url.pathname;

  const staticMap = {
    '/': '/index.html',
    '/login': '/login.html',
    '/dashboard': '/dashboard.html',
    '/customers': '/customers.html',
    '/sales-reps': '/sales-reps.html',
    '/visits': '/visits.html',
    '/projects': '/projects.html',
    '/tasks': '/tasks.html',
    '/task-labels': '/task-labels.html',
    '/admin': '/admin.html'
  };

  if (staticMap[pathname]) {
    return `${staticMap[pathname]}${url.search}`;
  }

  const projectTasksMatch = pathname.match(/^\/projects\/([^/]+)\/tasks\/?$/);
  if (projectTasksMatch) {
    const projectId = encodeURIComponent(decodeURIComponent(projectTasksMatch[1]));
    return `/tasks.html?projectId=${projectId}${url.search ? `&${url.search.slice(1)}` : ''}`;
  }

  const projectUsersMatch = pathname.match(/^\/projects\/([^/]+)\/users\/?$/);
  if (projectUsersMatch) {
    return `/projects.html${url.search}`;
  }

  const projectTasksSingularMatch = pathname.match(/^\/project\/([^/]+)\/tasks\/?$/);
  if (projectTasksSingularMatch) {
    const projectId = encodeURIComponent(decodeURIComponent(projectTasksSingularMatch[1]));
    return `/tasks.html?projectId=${projectId}${url.search ? `&${url.search.slice(1)}` : ''}`;
  }

  const customerProjectsMatch = pathname.match(/^\/customer\/([^/]+)\/projects\/?$/);
  if (customerProjectsMatch) {
    const customerId = encodeURIComponent(decodeURIComponent(customerProjectsMatch[1]));
    return `/projects.html?customerId=${customerId}${url.search ? `&${url.search.slice(1)}` : ''}`;
  }

  if (pathname === '/customer/add') {
    return `/customers.html${url.search}`;
  }

  if (/^\/customer\/[^/]+\/edit\/?$/.test(pathname)) {
    return `/customers.html${url.search}`;
  }

  if (pathname === '/project/add') {
    return `/projects.html${url.search}`;
  }

  if (/^\/project\/[^/]+\/edit\/?$/.test(pathname)) {
    return `/projects.html${url.search}`;
  }

  return urlValue;
}

function createPrettyUrlRewritePlugin() {
  const applyRewrite = (req) => {
    if (!req.url) {
      return;
    }

    if (!req.headers.accept?.includes('text/html')) {
      return;
    }

    if (req.url.includes('.')) {
      return;
    }

    req.url = rewritePrettyUrl(req.url);
  };

  return {
    name: 'crm-pretty-url-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        applyRewrite(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        applyRewrite(req);
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [createPrettyUrlRewritePlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        customers: resolve(__dirname, 'customers.html'),
        salesReps: resolve(__dirname, 'sales-reps.html'),
        visits: resolve(__dirname, 'visits.html'),
        projects: resolve(__dirname, 'projects.html'),
        tasks: resolve(__dirname, 'tasks.html'),
        taskLabels: resolve(__dirname, 'task-labels.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});
