import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
