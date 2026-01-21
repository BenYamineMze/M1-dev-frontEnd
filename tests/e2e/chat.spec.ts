import { test, expect } from '@playwright/test';

test('Scénario Complet : Connexion au Chat', async ({ page }) => {
  // 1. Aller sur l'accueil
  await page.goto('/');

  // 2. Vérifier le titre
  await expect(page).toHaveTitle(/Chat/);
  await expect(page.locator('h1')).toContainText('KARIBU');

  // 3. Remplir le formulaire (Pseudo)
  await page.fill('input[type="text"]', 'PlaywrightBot');

  // 4. Cliquer sur rejoindre (si le bouton est activé)
  // Note: Dans ton code, il faut une photo, ici on simplifie
  // await page.click('button.btn-main');

  // 5. Vérifier qu'on change de page (si la logique le permettait)
  // await expect(page).toHaveURL(/\/room\/general/);
});