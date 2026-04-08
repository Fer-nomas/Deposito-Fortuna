import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/user/Desktop/desarrollo/depositoFortuna/screenshots';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('response', async (response) => {
    if (response.url().includes('/api/movimientos') && response.request().method() === 'POST') {
      console.log(`\n  🌐 POST /api/movimientos → ${response.status()}`);
      console.log(`  Response: ${(await response.text()).substring(0, 500)}`);
    }
  });

  try {
    // LOGIN
    console.log('🔐 Login...');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', 'admin@deposito.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // GO TO MOVIMIENTOS
    console.log('\n🔄 Opening movimientos...');
    await page.goto(`${BASE}/movimientos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click Nuevo Movimiento
    await page.click('button:has-text("Nuevo Movimiento")');
    await page.waitForTimeout(1000);

    // The modal has its own selects. The page filter selects come BEFORE the modal selects.
    // Modal selects are inside the fixed overlay div
    // Select[0,1] = page filters, Select[2] = modal tipo, Select[3] = modal origen, Select[4] = modal destino, Select[5] = product

    console.log('\n📝 Filling modal form...');

    // 1. Tipo de Movimiento (select[2] in the modal)
    const modalSelects = await page.locator('.fixed select').all();
    console.log(`  Modal selects: ${modalSelects.length}`);

    if (modalSelects.length >= 1) {
      // First modal select = Tipo
      const tipoOpts = await modalSelects[0].evaluate(el =>
        Array.from(el.options).map(o => ({ v: o.value, t: o.textContent }))
      );
      console.log(`  Tipo options: ${tipoOpts.map(o => o.t).join(', ')}`);
      const compra = tipoOpts.find(o => o.t.includes('Compra'));
      if (compra) {
        await modalSelects[0].selectOption(compra.v);
        console.log('  ✅ Tipo: Compra');
      }
    }
    await page.waitForTimeout(800);

    // Re-get modal selects (Proveedor may have appeared)
    const modalSelects2 = await page.locator('.fixed select').all();
    console.log(`  Modal selects after tipo: ${modalSelects2.length}`);
    for (let i = 0; i < modalSelects2.length; i++) {
      const opts = await modalSelects2[i].evaluate(el =>
        Array.from(el.options).map(o => o.textContent?.trim()).slice(0, 3)
      );
      console.log(`    [${i}]: ${opts.join(' | ')}...`);
    }

    // 2. Punto Destino (for Compra = where material arrives)
    // Find the select that has "Sin destino"
    for (let i = 0; i < modalSelects2.length; i++) {
      const firstOpt = await modalSelects2[i].evaluate(el => el.options[0]?.textContent?.trim());
      if (firstOpt === 'Sin destino') {
        const opts = await modalSelects2[i].evaluate(el =>
          Array.from(el.options).map(o => ({ v: o.value, t: o.textContent?.trim() }))
        );
        const mp = opts.find(o => o.t.includes('Materia Prima'));
        if (mp) {
          await modalSelects2[i].selectOption(mp.v);
          console.log(`  ✅ Destino: Materia Prima`);
        }
      }
    }
    await page.waitForTimeout(500);

    // 3. Flete
    const modalInputs = await page.locator('.fixed input[type="number"]').all();
    console.log(`  Modal number inputs: ${modalInputs.length}`);
    if (modalInputs.length >= 1) {
      await modalInputs[0].fill('25000');
      console.log('  ✅ Flete: 25000');
    }

    // 4. Product select
    // Find select with "Seleccionar producto..."
    const prodSelect = await page.locator('.fixed select').all();
    for (const sel of prodSelect) {
      const firstOpt = await sel.evaluate(el => el.options[0]?.textContent?.trim());
      if (firstOpt === 'Seleccionar producto...' || firstOpt?.includes('producto')) {
        const opts = await sel.evaluate(el =>
          Array.from(el.options).map(o => ({ v: o.value, t: o.textContent?.trim() }))
        );
        const resina = opts.find(o => o.t.includes('0001'));
        if (resina) {
          await sel.selectOption(resina.v);
          console.log(`  ✅ Producto: ${resina.t}`);
        }
        break;
      }
    }
    await page.waitForTimeout(500);

    // 5. Cantidad and Costo
    const numInputs = await page.locator('.fixed input[type="number"]').all();
    console.log(`  Number inputs: ${numInputs.length}`);
    for (const inp of numInputs) {
      const ph = await inp.getAttribute('placeholder') || '';
      if (ph.includes('Cant')) {
        await inp.fill('150');
        console.log('  ✅ Cantidad: 150');
      }
      if (ph.includes('Costo')) {
        await inp.fill('2500');
        console.log('  ✅ Costo: 2500');
      }
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SS}/mov-final-before-submit.png` });

    // Check if button is enabled
    const submitBtn = page.locator('.fixed button:has-text("Crear Movimiento")');
    const isDisabled = await submitBtn.isDisabled();
    console.log(`\n  Button disabled: ${isDisabled ? '❌ YES' : '✅ NO (enabled)'}`);

    if (isDisabled) {
      // Debug: check form state
      const tipoVal = await modalSelects2[0]?.evaluate(el => el.value) || 'empty';
      console.log(`  formTipoId value: "${tipoVal}"`);

      // Check product line
      for (const sel of await page.locator('.fixed select').all()) {
        const val = await sel.evaluate(el => el.value);
        const text = await sel.evaluate(el => el.options[el.selectedIndex]?.textContent);
        console.log(`    Select value="${val}" text="${text}"`);
      }
      for (const inp of numInputs) {
        const val = await inp.inputValue();
        const ph = await inp.getAttribute('placeholder');
        console.log(`    Input placeholder="${ph}" value="${val}"`);
      }
    }

    // 6. Submit
    console.log('\n🚀 Clicking submit...');
    await submitBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(5000);

    await page.screenshot({ path: `${SS}/mov-final-after-submit.png` });

    const modalStillOpen = await page.locator('.fixed:has-text("Nuevo Movimiento")').count();
    if (modalStillOpen === 0) {
      console.log('  ✅ Modal closed — movement created!');
    } else {
      console.log('  ❌ Modal still open');
    }

    // Verify
    const apiResult = await page.evaluate(async () => {
      const r = await fetch('/api/movimientos');
      return r.json();
    });
    console.log(`\n  Total movimientos via API: ${apiResult.movimientos?.length || 0}`);

  } catch (err) {
    console.error('\n💥 ERROR:', err.message);
    await page.screenshot({ path: `${SS}/mov-final-ERROR.png` });
  } finally {
    await browser.close();
  }
}

run();
