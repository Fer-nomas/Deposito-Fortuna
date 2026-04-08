import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/user/Desktop/desarrollo/depositoFortuna/screenshots';
let step = 20;

async function ss(page, name) {
  step++;
  const file = `${SS}/${step}-${name}.png`;
  await page.screenshot({ path: file });
  console.log(`  📸 ${step}-${name}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    // LOGIN
    console.log('\n🔐 LOGIN');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', 'admin@deposito.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log(`  URL: ${page.url()} ${page.url() === BASE + '/' ? '✅' : '⚠️'}`);

    // ==========================================
    // TEST A: Create COMPRA movement
    // ==========================================
    console.log('\n🔄 TEST A: CREAR MOVIMIENTO DE COMPRA');
    await page.goto(`${BASE}/movimientos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Click "Nuevo Movimiento"
    await page.click('button:has-text("Nuevo")');
    await page.waitForTimeout(1000);

    // Select tipo = Compra
    const tipoSelect = await page.$('select:near(:text("Tipo de Movimiento"))');
    if (tipoSelect) {
      const options = await tipoSelect.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
      console.log(`  Tipos disponibles: ${options.map(o => o.text).join(', ')}`);
      const compraOpt = options.find(o => o.text.includes('Compra'));
      if (compraOpt) {
        await tipoSelect.selectOption(compraOpt.value);
        console.log('  ✅ Tipo Compra selected');
      }
    } else {
      // Try first select in modal
      const selects = await page.$$('select');
      if (selects.length > 0) {
        const opts = await selects[0].$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
        console.log(`  Select options: ${opts.map(o=>o.text).join(', ')}`);
        const compraOpt = opts.find(o => o.text.toLowerCase().includes('compra'));
        if (compraOpt) {
          await selects[0].selectOption(compraOpt.value);
          console.log('  ✅ Tipo Compra selected');
        }
      }
    }
    await page.waitForTimeout(500);

    // Select punto destino = Materia Prima
    const allSelects = await page.$$('select');
    for (const sel of allSelects) {
      const opts = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
      const mp = opts.find(o => o.text.includes('Materia Prima'));
      if (mp) {
        await sel.selectOption(mp.value);
        console.log('  ✅ Punto Materia Prima selected');
        break;
      }
    }
    await page.waitForTimeout(500);

    // Set flete
    const fleteInput = await page.$('input[name="flete"], input[placeholder*="0"]');
    if (fleteInput) {
      await fleteInput.fill('50000');
      console.log('  ✅ Flete: 50000');
    }

    // Select product in first product line
    const prodSelects = await page.$$('select');
    for (const sel of prodSelects) {
      const opts = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
      const resina = opts.find(o => o.text.includes('Resina Polietileno'));
      if (resina) {
        await sel.selectOption(resina.value);
        console.log('  ✅ Product: Resina Polietileno');
        break;
      }
    }
    await page.waitForTimeout(500);

    // Fill quantity
    const cantInputs = await page.$$('input[placeholder*="Cant"], input[name*="cant"]');
    if (cantInputs.length > 0) {
      await cantInputs[0].fill('200');
      console.log('  ✅ Cantidad: 200');
    } else {
      // Try number inputs near product
      const numInputs = await page.$$('input[type="number"]');
      for (const inp of numInputs) {
        const val = await inp.inputValue();
        if (val === '' || val === '0') {
          await inp.fill('200');
          console.log('  ✅ Cantidad: 200 (via number input)');
          break;
        }
      }
    }

    await page.waitForTimeout(500);
    await ss(page, 'compra-form-filled');

    // Submit
    const crearMovBtn = await page.$('button:has-text("Crear Movimiento")');
    if (crearMovBtn) {
      await crearMovBtn.click();
      await page.waitForTimeout(3000);
      await ss(page, 'compra-after-submit');

      // Check if modal closed (success) or shows error
      const modalVisible = await page.$('.fixed:has(button:has-text("Crear Movimiento"))');
      if (!modalVisible) {
        console.log('  ✅ Movement created successfully!');
      } else {
        console.log('  ❌ Modal still open - check for errors');
        const errorText = await page.textContent('.fixed');
        if (errorText.includes('error') || errorText.includes('Error')) {
          console.log(`  Error: ${errorText.substring(0, 200)}`);
        }
      }
    }

    // Check movimientos list
    await page.waitForTimeout(1000);
    await ss(page, 'movimientos-after-compra');
    const movText = await page.textContent('body');
    console.log(`  Movimientos visible: ${movText.includes('TKT') || movText.includes('Compra') ? '✅' : '❌'}`);

    // ==========================================
    // TEST B: Verify stock changed on dashboard
    // ==========================================
    console.log('\n📊 TEST B: VERIFY STOCK ON DASHBOARD');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'dashboard-after-compra');

    // ==========================================
    // TEST C: Create SOLICITUD
    // ==========================================
    console.log('\n📋 TEST C: CREAR SOLICITUD');
    await page.goto(`${BASE}/solicitudes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.click('button:has-text("Nueva")');
    await page.waitForTimeout(1000);
    await ss(page, 'solicitud-form-open');

    // Fill solicitud form
    const solSelects = await page.$$('select');
    console.log(`  Found ${solSelects.length} selects`);

    // Try to fill each select
    for (let i = 0; i < solSelects.length; i++) {
      const opts = await solSelects[i].$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
      console.log(`  Select ${i}: ${opts.map(o=>o.text).join(' | ')}`);

      // Select first non-empty option for tipo
      if (opts.some(o => o.text.includes('pedido') || o.text.includes('Pedido'))) {
        const ped = opts.find(o => o.text.toLowerCase().includes('pedido'));
        if (ped) await solSelects[i].selectOption(ped.value);
        console.log('  ✅ Tipo: pedido');
      }
      // Select prioridad
      if (opts.some(o => o.text.includes('alta') || o.text.includes('Alta'))) {
        const alta = opts.find(o => o.text.toLowerCase().includes('alta'));
        if (alta) await solSelects[i].selectOption(alta.value);
        console.log('  ✅ Prioridad: alta');
      }
      // Select Inyectora as origin
      if (opts.some(o => o.text.includes('Inyectora'))) {
        const iny = opts.find(o => o.text.includes('Inyectora'));
        if (iny) await solSelects[i].selectOption(iny.value);
        console.log('  ✅ Punto: Inyectora');
      }
      // Select Materia Prima as destination
      if (opts.some(o => o.text.includes('Materia Prima')) && i > 2) {
        const mp = opts.find(o => o.text.includes('Materia Prima'));
        if (mp) await solSelects[i].selectOption(mp.value);
        console.log('  ✅ Punto: Materia Prima');
      }
    }

    await page.waitForTimeout(500);

    // Add product to solicitud
    const addProdBtn = await page.$('button:has-text("Agregar"), button:has-text("agregar")');
    if (addProdBtn) {
      await addProdBtn.click();
      await page.waitForTimeout(500);
    }

    // Select product and quantity in solicitud
    const solProdSelects = await page.$$('select');
    for (const sel of solProdSelects) {
      const opts = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
      const resina = opts.find(o => o.text.includes('Resina'));
      if (resina) {
        await sel.selectOption(resina.value);
        break;
      }
    }

    // Fill quantity
    const solNumInputs = await page.$$('input[type="number"]');
    for (const inp of solNumInputs) {
      const val = await inp.inputValue();
      if (val === '' || val === '0') {
        await inp.fill('50');
        console.log('  ✅ Cantidad solicitada: 50');
        break;
      }
    }

    await page.waitForTimeout(500);
    await ss(page, 'solicitud-form-filled');

    // Submit solicitud
    const crearSolBtn = await page.$('button:has-text("Crear Solicitud"), button:has-text("Crear")');
    if (crearSolBtn) {
      await crearSolBtn.click();
      await page.waitForTimeout(3000);
      await ss(page, 'solicitud-after-create');

      const afterSolText = await page.textContent('body');
      console.log(`  Solicitud created: ${afterSolText.includes('SOL-') ? '✅' : '❌'}`);
      console.log(`  Shows pendiente: ${afterSolText.includes('pendiente') ? '✅' : '❌'}`);
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n========================================');
    console.log('📊 FULL FLOW TEST SUMMARY');
    console.log('========================================');
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors');
    } else {
      console.log(`❌ ${errors.length} error(s):`);
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.substring(0, 200)}`));
    }

  } catch (err) {
    console.error('\n💥 CRASH:', err.message);
    await ss(page, 'CRASH');
  } finally {
    await browser.close();
  }
}

run();
