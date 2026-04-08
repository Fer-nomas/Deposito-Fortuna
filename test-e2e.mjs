import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/user/Desktop/desarrollo/depositoFortuna/screenshots';
let step = 0;

async function screenshot(page, name) {
  step++;
  const file = `${SS}/${String(step).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${file}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  try {
    // ==========================================
    // 1. LOGIN
    // ==========================================
    console.log('\n🔐 LOGIN');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, 'login-page');

    await page.fill('input[type="email"]', 'admin@deposito.com');
    await page.fill('input[type="password"]', 'admin123');
    await screenshot(page, 'login-filled');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await screenshot(page, 'after-login');
    console.log(`  URL: ${page.url()}`);

    // If still on login, try setting cookie manually and navigate
    if (page.url().includes('/login')) {
      console.log('  ⚠️ Login redirect may not work in headless. Setting cookie manually...');
      // Login via API
      const loginResp = await page.evaluate(async () => {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@deposito.com', password: 'admin123' }),
        });
        return r.json();
      });
      console.log(`  Token received: ${loginResp.token ? 'YES' : 'NO'}`);

      // Store in localStorage for zustand
      await page.evaluate((data) => {
        localStorage.setItem('deposito-auth', JSON.stringify({
          state: { user: data.user, token: data.token },
          version: 0,
        }));
      }, loginResp);

      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    // ==========================================
    // 2. DASHBOARD
    // ==========================================
    console.log('\n📊 DASHBOARD');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await screenshot(page, 'dashboard');

    // Check if dashboard loaded with data
    const dashText = await page.textContent('body');
    const hasStats = dashText.includes('Productos Registrados') || dashText.includes('Stock');
    console.log(`  Dashboard loaded: ${hasStats ? '✅' : '❌'}`);
    console.log(`  Has sidebar: ${dashText.includes('Depósito Fortuna') ? '✅' : '❌'}`);

    // ==========================================
    // 3. PRODUCTOS - LIST
    // ==========================================
    console.log('\n📦 PRODUCTOS');
    await page.click('a[href="/productos"]');
    await page.waitForTimeout(2000);
    await screenshot(page, 'productos-list');

    const prodText = await page.textContent('body');
    console.log(`  Products table visible: ${prodText.includes('0001') || prodText.includes('Resina') ? '✅' : '❌'}`);

    // 3a. Create Product
    console.log('  → Creating product...');
    const newProdBtn = await page.$('button:has-text("Nuevo Producto")');
    if (newProdBtn) {
      await newProdBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'producto-modal-open');

      // Fill form
      const fields = await page.$$('input, select, textarea');
      console.log(`  Form fields found: ${fields.length}`);

      // Try filling description
      const descInput = await page.$('input[name="descripcion"]');
      if (descInput) {
        await descInput.fill('Resina Test Playwright');
        console.log('  ✅ Filled descripcion');
      }

      await page.waitForTimeout(500);
      await screenshot(page, 'producto-form-filled');

      // Try to submit
      const submitBtn = await page.$('button:has-text("Crear"), button:has-text("Guardar")');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        await screenshot(page, 'producto-after-submit');
        const afterText = await page.textContent('body');
        console.log(`  Submit result: ${afterText.includes('error') ? '❌ Error' : '✅ OK'}`);
      }

      // Close modal if still open
      const cancelBtn = await page.$('button:has-text("Cancelar")');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log('  ❌ "Nuevo Producto" button NOT found');
    }

    // ==========================================
    // 4. PROVEEDORES
    // ==========================================
    console.log('\n🏭 PROVEEDORES');
    await page.click('a[href="/proveedores"]');
    await page.waitForTimeout(2000);
    await screenshot(page, 'proveedores-list');

    const provText = await page.textContent('body');
    console.log(`  Suppliers visible: ${provText.includes('Plásticos') || provText.includes('Químicos') ? '✅' : '❌'}`);

    // Create proveedor
    const newProvBtn = await page.$('button:has-text("Nuevo Proveedor"), button:has-text("Nuevo")');
    if (newProvBtn) {
      await newProvBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'proveedor-modal');

      const nombreInput = await page.$('input[name="nombre"]');
      if (nombreInput) {
        await nombreInput.fill('Proveedor Test PW');
        const rucInput = await page.$('input[name="ruc"]');
        if (rucInput) await rucInput.fill('80099999-0');
        const telInput = await page.$('input[name="telefono"]');
        if (telInput) await telInput.fill('021-555-9999');
        await screenshot(page, 'proveedor-form-filled');

        const crearBtn = await page.$('button:has-text("Crear"), button:has-text("Guardar")');
        if (crearBtn) {
          await crearBtn.click();
          await page.waitForTimeout(2000);
          await screenshot(page, 'proveedor-after-create');
          const afterProv = await page.textContent('body');
          console.log(`  Create result: ${afterProv.includes('Proveedor Test') ? '✅ Created' : '❌ Not visible'}`);
        }
      }

      const cancelBtn = await page.$('button:has-text("Cancelar")');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(500);
    }

    // ==========================================
    // 5. MOVIMIENTOS
    // ==========================================
    console.log('\n🔄 MOVIMIENTOS');
    await page.click('a[href="/movimientos"]');
    await page.waitForTimeout(2000);
    await screenshot(page, 'movimientos-list');

    // Create a movement
    const newMovBtn = await page.$('button:has-text("Nuevo Movimiento"), button:has-text("Nuevo")');
    if (newMovBtn) {
      await newMovBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'movimiento-modal');

      // Check form elements
      const selects = await page.$$('select');
      console.log(`  Select fields: ${selects.length}`);

      // List all form labels
      const labels = await page.$$eval('label', els => els.map(e => e.textContent.trim()));
      console.log(`  Form labels: ${labels.join(', ')}`);

      await screenshot(page, 'movimiento-form');

      // Close
      const cancelBtn = await page.$('button:has-text("Cancelar")');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log('  ❌ "Nuevo Movimiento" button NOT found');
    }

    // ==========================================
    // 6. SOLICITUDES
    // ==========================================
    console.log('\n📋 SOLICITUDES');
    await page.click('a[href="/solicitudes"]');
    await page.waitForTimeout(2000);
    await screenshot(page, 'solicitudes-list');

    const solText = await page.textContent('body');
    console.log(`  Page loaded: ${solText.includes('Solicitudes') || solText.includes('solicitud') ? '✅' : '❌'}`);

    // Create solicitud
    const newSolBtn = await page.$('button:has-text("Nueva Solicitud"), button:has-text("Nueva")');
    if (newSolBtn) {
      await newSolBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, 'solicitud-modal');

      const solLabels = await page.$$eval('label', els => els.map(e => e.textContent.trim()));
      console.log(`  Form labels: ${solLabels.join(', ')}`);

      // Close
      const cancelBtn = await page.$('button:has-text("Cancelar")');
      if (cancelBtn) await cancelBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log('  ❌ "Nueva Solicitud" button NOT found');
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n========================================');
    console.log('📊 TEST SUMMARY');
    console.log('========================================');
    if (errors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log(`❌ ${errors.length} console error(s):`);
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 300)}`));
    }
    console.log(`📸 ${step} screenshots saved to ${SS}/`);

  } catch (err) {
    console.error('\n💥 TEST CRASHED:', err.message);
    await screenshot(page, 'CRASH');
  } finally {
    await browser.close();
  }
}

run();
