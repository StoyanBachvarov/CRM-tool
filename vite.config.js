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
    '/tasks': '/tasks.html'
  };

  if (staticMap[pathname]) {
    return `${staticMap[pathname]}${url.search}`;
  }

  const projectTasksMatch = pathname.match(/^\/projects\/([^/]+)\/tasks\/?$/);
  if (projectTasksMatch) {
    const projectId = encodeURIComponent(decodeURIComponent(projectTasksMatch[1]));
    return `/tasks.html?projectId=${projectId}${url.search ? `&${url.search.slice(1)}` : ''}`;
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
        tasks: resolve(__dirname, 'tasks.html')
      }
    }
  }
});
