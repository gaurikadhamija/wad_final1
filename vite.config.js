import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        about: path.resolve(__dirname, 'about.html'),
        student: path.resolve(__dirname, 'student.html'),
        provider: path.resolve(__dirname, 'provider.html'),
        operator: path.resolve(__dirname, 'operator.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        userDashboard: path.resolve(__dirname, 'user-dashboard.html'),
        providerDashboard: path.resolve(__dirname, 'provider-dashboard.html'),
        intelligence: path.resolve(__dirname, 'intelligence.html'),
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
