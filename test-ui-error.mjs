import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/user/Desktop/desarrollo/depositoFortuna/screenshots/bugs';

async function run() {
  const browser = await chromium.launch({ headless: false }); // visible browser!
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Capture dialog (alert) messages
  page.on('dialog', async (dialog) => {
    console.log(`\n  🔔 ALERT: "${dialog.message()}"`);
    await dialog.accept();
  });

  // Capture API responses
  page.on('response', async (resp) => {
    if (resp.url().includes('/api/') && resp.request().method() !== 'GET') {
      let body = ''; try { body = await resp.text(); } catch {}
      console.log(`  📡 ${resp.request().method()} ${resp.url().replace(BASE, '')} → ${resp.status()}`);
      if (resp.status() >= 400) console.log(`     Body: ${body.substring(0, 300)}`);
    }
  });

  try {
    // LOGIN
    console.log('\n🔐 Login...');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', 'admin@deposito.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // CREATE SOLICITUD - exact same as user did
    console.log('\n📋 Creating solicitud: Transferencia DEP1→INY...');
    await page.goto(`${BASE}/solicitudes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForTimeout(1000);

    // Tipo = Transferencia
    const selects = await page.locator('.fixed select').all();
    for (const sel of selects) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));

      // Tipo
      const transf = opts.find(o => o.t?.toLowerCase().includes('transferencia'));
      if (transf) { await sel.selectOption(transf.v); console.log('  ✅ Tipo: Transferencia'); continue; }

      // Prioridad
      const norm = opts.find(o => o.t?.toLowerCase() === 'normal');
      if (norm && opts.length <= 5) { await sel.selectOption(norm.v); continue; }
    }
    await page.waitForTimeout(300);

    // Origen = DEP1
    const selects2 = await page.locator('.fixed select').all();
    for (let i = 0; i < selects2.length; i++) {
      const opts = await selects2[i].evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
      if (opts[0]?.t?.includes('Seleccionar')) {
        const dep1 = opts.find(o => o.t?.includes('Materia Prima'));
        if (dep1) { await selects2[i].selectOption(dep1.v); console.log(`  ✅ Select[${i}]: Materia Prima`); break; }
      }
    }
    await page.waitForTimeout(300);

    // Destino = INY
    const selects3 = await page.locator('.fixed select').all();
    for (let i = selects3.length - 1; i >= 0; i--) {
      const opts = await selects3[i].evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
      if (opts[0]?.t?.includes('Seleccionar') && !(await selects3[i].evaluate(el => el.value))) {
        const iny = opts.find(o => o.t?.includes('Inyectora'));
        if (iny) { await selects3[i].selectOption(iny.v); console.log(`  ✅ Select[${i}]: Inyectora`); break; }
      }
    }
    await page.waitForTimeout(300);

    // Product = 0001
    for (const sel of await page.locator('.fixed select').all()) {
      const opts = await sel.evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
      const r = opts.find(o => o.t?.includes('0001'));
      if (r) { await sel.selectOption(r.v); console.log('  ✅ Product: 0001'); break; }
    }

    // Quantity = 1
    for (const inp of await page.locator('.fixed input[type="number"]').all()) {
      const val = await inp.inputValue();
      if (!val || val === '0' || val === '1') { await inp.fill('1'); break; }
    }

    await page.screenshot({ path: `${SS}/ui-solicitud-before-submit.png` });

    // SUBMIT
    console.log('\n  Submitting solicitud...');
    const submitBtn = await page.$('.fixed button:has-text("Crear Solicitud"), .fixed button:has-text("Crear")');
    if (submitBtn) {
      const disabled = await submitBtn.isDisabled();
      console.log(`  Button disabled: ${disabled}`);
      if (disabled) {
        console.log('  ❌ BUTTON IS DISABLED - checking why...');
        // Check what values are set
        for (const sel of await page.locator('.fixed select').all()) {
          const val = await sel.evaluate(el => ({ value: el.value, text: el.options[el.selectedIndex]?.textContent?.trim() }));
          console.log(`    Select: value="${val.value}" text="${val.text}"`);
        }
        for (const inp of await page.locator('.fixed input').all()) {
          const val = await inp.inputValue();
          const ph = await inp.getAttribute('placeholder');
          console.log(`    Input: value="${val}" placeholder="${ph}"`);
        }
      } else {
        await submitBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${SS}/ui-solicitud-after-submit.png` });
        const modal = await page.$('.fixed:has-text("Nueva Solicitud")');
        console.log(`  Modal closed: ${!modal}`);
      }
    }

    // Now try to APPROVE it
    console.log('\n✅ Approving solicitud...');
    await page.goto(`${BASE}/solicitudes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click on pendientes
    const pendTab = await page.$('button:has-text("Pendientes")');
    if (pendTab) await pendTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SS}/ui-pendientes.png` });

    // Find and click first action button
    const rows = await page.$$('tbody tr');
    console.log(`  Rows: ${rows.length}`);
    if (rows.length > 0) {
      const btns = await rows[0].$$('button');
      console.log(`  Buttons in first row: ${btns.length}`);
      if (btns.length > 0) {
        await btns[0].click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SS}/ui-solicitud-detail.png` });

        // Find Aprobar button
        const aprobar = await page.$('.fixed button:has-text("Aprobar")');
        if (aprobar) {
          console.log('  Clicking Aprobar...');
          await aprobar.click();
          await page.waitForTimeout(1500);
          await page.screenshot({ path: `${SS}/ui-aprobar-form.png` });

          // Find confirm button
          const allBtns = await page.$$('.fixed button');
          console.log(`  Buttons in modal: ${allBtns.length}`);
          for (const btn of allBtns) {
            const txt = await btn.textContent();
            console.log(`    Button: "${txt?.trim()}"`);
          }

          // Click confirm
          const confirm = await page.$('.fixed button:has-text("Confirmar")');
          if (confirm) {
            console.log('\n  Confirming approval...');
            await confirm.click();
            await page.waitForTimeout(5000);
            await page.screenshot({ path: `${SS}/ui-after-approve.png` });
          }
        }
      }
    }

    await page.waitForTimeout(2000);

  } catch (err) {
    console.error('\n💥:', err.message.substring(0, 200));
    await page.screenshot({ path: `${SS}/ui-CRASH.png` });
  } finally {
    await browser.close();
  }
}

run();
