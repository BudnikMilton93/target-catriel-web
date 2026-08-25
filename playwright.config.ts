import { defineConfig, devices } from '@playwright/test';

// Config de Playwright para E2E (ver documents/TESTING.md, sección "E2E
// (Playwright)"). Los specs actuales (e2e/auth.spec.ts) solo ejercitan el
// login mockeado del frontend (src/context/AuthContext.jsx), sin llamar a
// la API real, así que `webServer` levanta únicamente el frontend y no
// depende de Postgres. El día que un spec necesite la API real, agregar
// una segunda entrada a `webServer` para `npm run dev:api` (con su
// readiness check) y documentar el requisito de `npm run db:up` + migrate
// + seed en ese mismo lugar.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
