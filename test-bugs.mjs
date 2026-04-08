import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/user/Desktop/desarrollo/depositoFortuna/screenshots/bugs';
let n = 0;
const bugs = [];

async function ss(page, name) {
  n++;
  await page.screenshot({ path: `${SS}/${String(n).padStart(2,'0')}-${name}.png` });
}

async function closeModals(page) {
  for (let i = 0; i < 5; i++) {
    if (!(await page.$('.fixed'))) break;
    const x = await page.$('.fixed button:has(svg.lucide-x)');
    if (x) { await x.click({ force: true }); await page.waitForTimeout(300); continue; }
    const c = await page.$('.fixed button:has-text("Cancelar")');
    if (c) { await c.click({ force: true }); await page.waitForTimeout(300); continue; }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const apiErrors = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/api/') && resp.status() >= 400) {
      let body = ''; try { body = await resp.text(); } catch {}
      apiErrors.push({ url: resp.url().replace(BASE, ''), method: resp.request().method(), status: resp.status(), body });
      console.log(`  🔴 ${resp.request().method()} ${resp.url().replace(BASE, '')} → ${resp.status()}: ${body.substring(0, 200)}`);
    }
  });
  const jsErrors = [];
  page.on('pageerror', err => { jsErrors.push(err.message); console.log(`  🔴 JS: ${err.message.substring(0, 150)}`); });

  try {
    // LOGIN
    console.log('\n═══ LOGIN ═══');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', 'admin@deposito.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // ═══ CREATE MOVIMIENTO ═══
    console.log('\n═══ CREATE MOVIMIENTO (COMPRA) ═══');
    await page.goto(`${BASE}/movimientos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Nuevo Movimiento")');
    await page.waitForTimeout(800);

    const ms = await page.locator('.fixed select').all();
    // Tipo=Compra
    const tOpts = await ms[0].evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent})));
    const compra = tOpts.find(o => o.t?.includes('Compra'));
    if (compra) await ms[0].selectOption(compra.v);
    await page.waitForTimeout(600);
    // Destino
    for (const s of await page.locator('.fixed select').all()) {
      const fo = await s.evaluate(el => el.options[0]?.textContent?.trim());
      if (fo === 'Sin destino') {
        const opts = await s.evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
        const mp = opts.find(o => o.t?.includes('Materia Prima'));
        if (mp) await s.selectOption(mp.v);
      }
    }
    // Product
    for (const s of await page.locator('.fixed select').all()) {
      const fo = await s.evaluate(el => el.options[0]?.textContent?.trim());
      if (fo?.includes('producto')) {
        const opts = await s.evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
        const r = opts.find(o => o.t?.includes('0001'));
        if (r) await s.selectOption(r.v);
        break;
      }
    }
    for (const inp of await page.locator('.fixed input[type="number"]').all()) {
      const ph = await inp.getAttribute('placeholder') || '';
      if (ph.includes('Cant')) await inp.fill('200');
      if (ph.includes('Costo')) await inp.fill('2500');
    }
    const crearMov = page.locator('.fixed button:has-text("Crear Movimiento")');
    if (!(await crearMov.isDisabled())) {
      await crearMov.click();
      await page.waitForTimeout(3000);
      const still = await page.$('.fixed:has-text("Nuevo Movimiento")');
      console.log(`  Modal closed: ${!still} ${!still ? '✅' : '❌'}`);
      if (still) bugs.push('MOVIMIENTO: modal stays open after create');
    } else { bugs.push('MOVIMIENTO: button disabled'); }
    await closeModals(page);
    await ss(page, 'after-movimiento');

    // ═══ CREATE SOLICITUD ═══
    console.log('\n═══ CREATE SOLICITUD ═══');
    await page.goto(`${BASE}/solicitudes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForTimeout(800);

    const sSelects = await page.locator('.fixed select').all();
    console.log(`  Selects in modal: ${sSelects.length}`);
    // Fill each select
    for (let i = 0; i < sSelects.length; i++) {
      const opts = await sSelects[i].evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim(), idx: o.index})));
      if (i === 0 && opts.some(o => o.t?.toLowerCase().includes('pedido'))) {
        await sSelects[i].selectOption(opts.find(o => o.t?.toLowerCase().includes('pedido')).v);
      }
      if (i === 1 && opts.some(o => o.t?.toLowerCase().includes('normal'))) {
        await sSelects[i].selectOption(opts.find(o => o.t?.toLowerCase() === 'normal').v);
      }
      if (i === 2) {
        const iny = opts.find(o => o.t?.includes('Inyectora'));
        if (iny) await sSelects[i].selectOption(iny.v);
      }
      if (i === 3) {
        const mp = opts.find(o => o.t?.includes('Materia Prima'));
        if (mp) await sSelects[i].selectOption(mp.v);
      }
      if (i === 4) {
        const r = opts.find(o => o.t?.includes('0001'));
        if (r) await sSelects[i].selectOption(r.v);
      }
    }
    for (const inp of await page.locator('.fixed input[type="number"]').all()) {
      const val = await inp.inputValue();
      if (!val || val === '0' || val === '1') { await inp.fill('50'); break; }
    }
    await page.waitForTimeout(300);
    await ss(page, 'solicitud-filled');

    const crearSol = await page.$('.fixed button:has-text("Crear Solicitud"), .fixed button:has-text("Crear")');
    if (crearSol) {
      const dis = await crearSol.isDisabled();
      if (!dis) {
        await crearSol.click();
        await page.waitForTimeout(3000);
        const still = await page.$('.fixed:has-text("Nueva Solicitud")');
        console.log(`  Modal closed: ${!still} ${!still ? '✅' : '❌'}`);
        if (still) bugs.push('SOLICITUD: modal stays open after create');
      } else { bugs.push('SOLICITUD: button disabled'); }
    }
    await closeModals(page);
    await ss(page, 'after-solicitud');

    // ═══ APPROVE SOLICITUD ═══
    console.log('\n═══ APPROVE SOLICITUD ═══');
    await page.goto(`${BASE}/solicitudes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click pendientes tab
    const pendTab = await page.$('button:has-text("Pendientes")');
    if (pendTab) { await pendTab.click(); await page.waitForTimeout(1000); }

    const body = await page.textContent('body');
    if (body.includes('SOL-')) {
      // Click the first action button to see detail
      const detailBtns = await page.$$('table button, td button');
      console.log(`  Action buttons: ${detailBtns.length}`);
      if (detailBtns.length > 0) {
        await detailBtns[0].click();
        await page.waitForTimeout(1000);
        await ss(page, 'solicitud-detail');

        // Look for Aprobar button
        const aprobarBtn = await page.$('.fixed button:has-text("Aprobar")');
        if (aprobarBtn) {
          console.log('  Found Aprobar button, clicking...');
          await aprobarBtn.click();
          await page.waitForTimeout(1000);
          await ss(page, 'aprobar-form');

          // Submit approval
          const confirmBtn = await page.$('.fixed button:has-text("Confirmar Aprobación"), .fixed button:has-text("Confirmar"), .fixed button:has-text("Aprobar"):not([disabled])');
          if (confirmBtn) {
            console.log('  Confirming approval...');
            await confirmBtn.click();
            await page.waitForTimeout(5000);
            await ss(page, 'after-approve');
          } else {
            console.log('  No confirm button found');
            await ss(page, 'no-confirm-btn');
          }
        } else {
          console.log('  No Aprobar button found');
        }
      }
    } else {
      console.log('  No solicitudes found');
    }
    await closeModals(page);

    // ═══ VERIFY STOCK ═══
    console.log('\n═══ VERIFY STOCK ═══');
    const dash = await page.evaluate(() => fetch('/api/dashboard').then(r => r.json()));
    console.log(`  Products: ${dash.stats.totalProductos}`);
    console.log(`  Movements: ${dash.stats.movimientosMes}`);
    console.log(`  Pending solicitudes: ${dash.stats.solicitudesPendientes}`);

    // Check stock of product 0001
    const prods = await page.evaluate(() => fetch('/api/productos').then(r => r.json()));
    const p1 = prods.productos.find(p => p.codigo === '0001');
    if (p1) {
      const detail = await page.evaluate((id) => fetch(`/api/productos/${id}`).then(r => r.json()), p1.id);
      console.log(`  Product 0001 stock:`);
      for (const s of detail.stockPorPunto || []) {
        console.log(`    ${s.puntoStock.nombre}: ${s.cantidad}`);
      }
    }

    // ═══ SUMMARY ═══
    console.log('\n════════════════════════════════════');
    console.log('🐛 BUG REPORT');
    console.log('════════════════════════════════════');

    if (bugs.length === 0 && apiErrors.length === 0 && jsErrors.length === 0) {
      console.log('✅ NO BUGS FOUND!');
    }
    if (bugs.length > 0) {
      console.log(`\n❌ UI Bugs (${bugs.length}):`);
      bugs.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
    }
    if (apiErrors.length > 0) {
      console.log(`\n❌ API Errors (${apiErrors.length}):`);
      apiErrors.forEach((e, i) => console.log(`  ${i+1}. ${e.method} ${e.url} → ${e.status}: ${e.body.substring(0, 300)}`));
    }
    if (jsErrors.length > 0) {
      console.log(`\n❌ JS Errors (${jsErrors.length}):`);
      jsErrors.forEach((e, i) => console.log(`  ${i+1}. ${e.substring(0, 200)}`));
    }
    console.log(`\n📸 ${n} screenshots`);

  } catch (err) {
    console.error('\n💥 CRASH:', err.message.substring(0, 300));
    await ss(page, 'CRASH');
  } finally {
    await browser.close();
  }
}

run();
