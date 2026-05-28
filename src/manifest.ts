import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AI Job Copilot',
  description: 'Find LinkedIn jobs, parse CVs, and generate application answers.',
  version: '1.0.0',
  permissions: ['storage', 'tabs', 'notifications', 'scripting'],
  host_permissions: ['https://*.linkedin.com/*', 'https://linkedin.com/*'],
  action: {
    default_popup: 'index.html',
    default_title: 'AI Job Copilot',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://*.linkedin.com/jobs/*', 'https://linkedin.com/jobs/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
});
