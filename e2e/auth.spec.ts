import { test, expect } from '@playwright/test';
import { users } from './fixtures/users';

test.describe('Login y redirección por rol', () => {
  for (const [role, { email, dashboardPath }] of Object.entries(users)) {
    test(`${role} inicia sesión y cae en ${dashboardPath}`, async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Contraseña').fill('cualquier-cosa');
      await page.getByRole('button', { name: /ingresar/i }).click();

      await expect(page).toHaveURL(new RegExp(dashboardPath.replace('/', '\\/')));
    });
  }

  test('rechaza un email que no existe', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('no-existe@target.com');
    await page.getByLabel('Contraseña').fill('cualquier-cosa');
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Guard de rutas protegidas', () => {
  test('redirige a /login si se accede a un dashboard sin sesión', async ({ page }) => {
    await page.goto('/dashboard/profesor');
    await expect(page).toHaveURL(/\/login/);
  });

  test('un alumno no puede entrar al dashboard de profesor', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(users.alumno.email);
    await page.getByLabel('Contraseña').fill('cualquier-cosa');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/alumno/);

    await page.goto('/dashboard/profesor');
    await expect(page).not.toHaveURL(/\/dashboard\/profesor/);
  });
});
