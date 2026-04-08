import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const SS = '/Users/user/Desktop/desarrollo/depositoFortuna/screenshots/full';
let n = 0;
const results = [];

async function ss(page, name) {
  n++;
  await page.screenshot({ path: `${SS}/${String(n).padStart(2,'0')}-${name}.png` });
}
function log(test, ok, detail = '') {
  console.log(`  ${ok ? '✅' : '❌'} ${test}${detail ? ' — ' + detail : ''}`);
  results.push({ test, ok });
}

async function closeModals(page) {
  for (let i = 0; i < 5; i++) {
    const modal = await page.$('.fixed');
    if (!modal) break;
    const x = await page.$('.fixed button:has(svg.lucide-x)');
    if (x) { await x.click({ force: true }); await page.waitForTimeout(300); continue; }
    const cancel = await page.$('.fixed button:has-text("Cancelar")');
    if (cancel) { await cancel.click({ force: true }); await page.waitForTimeout(300); continue; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  try {
    // 1. LOGIN
    console.log('\n═══ 1. LOGIN ═══');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await ss(page, 'login');
    log('Login page loads', true);
    await page.fill('input[type="email"]', 'admin@deposito.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    log('Login → dashboard', page.url() === `${BASE}/`);
    await ss(page, 'dashboard');

    // 2. DASHBOARD
    console.log('\n═══ 2. DASHBOARD ═══');
    const db = await page.textContent('body');
    log('Title', db.includes('Dashboard'));
    log('KPI cards', db.includes('Productos Registrados') && db.includes('Stock Valorizado'));
    log('Stock por Punto', db.includes('Materia Prima') && db.includes('Inyectora'));
    log('Distribución chart', db.includes('Distribución'));
    log('Sidebar', db.includes('Depósito Fortuna'));

    // 3. PRODUCTOS
    console.log('\n═══ 3. PRODUCTOS ═══');
    await page.goto(`${BASE}/productos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'productos');
    const pr = await page.textContent('body');
    log('Page loads', pr.includes('Productos'));
    log('Table with data', pr.includes('0001') && pr.includes('Resina'));
    log('Badges', pr.includes('xico'));
    log('Search', !!(await page.$('input[placeholder*="uscar"]')));
    log('Filters', (await page.$$('select')).length >= 2);
    log('Nuevo Producto btn', !!(await page.$('button:has-text("Nuevo Producto")')));

    // Open + close modal
    await page.click('button:has-text("Nuevo Producto")');
    await page.waitForTimeout(800);
    const pm = await page.textContent('.fixed');
    log('Modal opens', pm?.includes('Nuevo Producto') || pm?.includes('Descripcion'));
    await ss(page, 'producto-modal');
    await closeModals(page);

    // Test action buttons exist
    log('View buttons', (await page.$$('button:has(svg.lucide-eye)')).length > 0);
    log('Edit buttons', (await page.$$('button:has(svg.lucide-pencil), button:has(svg.lucide-square-pen)')).length > 0);
    log('Delete buttons', (await page.$$('button:has(svg.lucide-trash), button:has(svg.lucide-trash-2)')).length > 0);

    // 4. PROVEEDORES
    console.log('\n═══ 4. PROVEEDORES ═══');
    await page.goto(`${BASE}/proveedores`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'proveedores');
    const pv = await page.textContent('body');
    log('Page loads', pv.includes('Proveedores'));
    log('Data visible', pv.includes('Plásticos') || pv.includes('Químicos'));
    log('Nuevo btn', !!(await page.$('button:has-text("Nuevo")')));
    log('Edit btns', (await page.$$('button:has(svg.lucide-pencil), button:has(svg.lucide-square-pen)')).length > 0);
    log('Delete btns', (await page.$$('button:has(svg.lucide-trash), button:has(svg.lucide-trash-2)')).length > 0);

    // 5. MOVIMIENTOS
    console.log('\n═══ 5. MOVIMIENTOS ═══');
    await page.goto(`${BASE}/movimientos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'movimientos');
    const mv = await page.textContent('body');
    log('Page loads', mv.includes('Movimientos'));
    log('Filters', mv.includes('Tipo Movimiento') || mv.includes('Filtros'));
    log('Nuevo Movimiento btn', !!(await page.$('button:has-text("Nuevo")')));

    // Create movement
    await page.click('button:has-text("Nuevo Movimiento")');
    await page.waitForTimeout(800);
    await ss(page, 'movimiento-modal');
    const ms = await page.locator('.fixed select').all();
    log('Modal has selects', ms.length >= 3);

    // Fill: Tipo=Compra
    const tOpts = await ms[0].evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent})));
    const compra = tOpts.find(o => o.t.includes('Compra'));
    if (compra) { await ms[0].selectOption(compra.v); log('Tipo Compra selected', true); }
    await page.waitForTimeout(600);

    // Destino
    const ms2 = await page.locator('.fixed select').all();
    for (const s of ms2) {
      const fo = await s.evaluate(el => el.options[0]?.textContent?.trim());
      if (fo === 'Sin destino') {
        const opts = await s.evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
        const mp = opts.find(o => o.t.includes('Materia Prima'));
        if (mp) { await s.selectOption(mp.v); log('Destino selected', true); break; }
      }
    }

    // Product
    for (const s of await page.locator('.fixed select').all()) {
      const fo = await s.evaluate(el => el.options[0]?.textContent?.trim());
      if (fo?.includes('producto')) {
        const opts = await s.evaluate(el => Array.from(el.options).map(o => ({v:o.value,t:o.textContent?.trim()})));
        const r = opts.find(o => o.t?.includes('0001'));
        if (r) { await s.selectOption(r.v); log('Producto selected', true); break; }
      }
    }

    // Cant + Costo
    for (const inp of await page.locator('.fixed input[type="number"]').all()) {
      const ph = await inp.getAttribute('placeholder') || '';
      if (ph.includes('Cant')) { await inp.fill('100'); log('Cantidad filled', true); }
      if (ph.includes('Costo')) { await inp.fill('2500'); log('Costo filled', true); }
    }

    // Submit
    const crearMov = page.locator('.fixed button:has-text("Crear Movimiento")');
    const movDis = await crearMov.isDisabled();
    log('Submit button enabled', !movDis);
    if (!movDis) {
      await crearMov.click();
      await page.waitForTimeout(3000);
      await ss(page, 'movimiento-created');
      const mc = await page.$('.fixed:has-text("Nuevo Movimiento")');
      log('Movement created (modal closed)', !mc);
    }
    await closeModals(page);

    // 6. SOLICITUDES
    console.log('\n═══ 6. SOLICITUDES ═══');
    await page.goto(`${BASE}/solicitudes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'solicitudes');
    const sl = await page.textContent('body');
    log('Page loads', sl.includes('Solicitudes'));
    log('Tab filters', sl.includes('Todas') && sl.includes('Pendientes'));
    log('Nueva btn', !!(await page.$('button:has-text("Nueva")')));

    // Open modal
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForTimeout(800);
    const solModal = await page.textContent('.fixed');
    log('Modal opens', solModal?.includes('Solicitud') || solModal?.includes('Tipo'));
    await ss(page, 'solicitud-modal');
    await closeModals(page);

    // 7. REPORTES
    console.log('\n═══ 7. REPORTES ═══');
    await page.goto(`${BASE}/reportes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'reportes');
    const rp = await page.textContent('body');
    log('Page loads', rp.includes('Reporte') || rp.includes('reporte') || rp.includes('Stock'));
    await ss(page, 'reportes-page');

    // 8. CONFIGURACIÓN
    console.log('\n═══ 8. CONFIGURACIÓN ═══');
    await page.goto(`${BASE}/configuracion`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'configuracion');
    const cf = await page.textContent('body');
    log('Page loads', cf.includes('onfigura') || cf.includes('Sistema'));

    // 9. USUARIOS
    console.log('\n═══ 9. USUARIOS ═══');
    await page.goto(`${BASE}/configuracion/usuarios`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'usuarios');
    const us = await page.textContent('body');
    log('Page loads', us.includes('Usuarios') || us.includes('usuario'));
    log('Shows users', us.includes('admin') || us.includes('Carlos') || us.includes('Administrador'));

    // 10. DEPÓSITOS
    console.log('\n═══ 10. DEPÓSITOS ═══');
    await page.goto(`${BASE}/configuracion/depositos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await ss(page, 'depositos');
    const dp = await page.textContent('body');
    log('Page loads', dp.includes('ósito') || dp.includes('Punto'));
    log('Shows points', dp.includes('DEP1') || dp.includes('Materia Prima') || dp.includes('INY'));

    // 11. VERIFY DATA INTEGRITY
    console.log('\n═══ 11. DATA VERIFICATION ═══');
    const dash = await page.evaluate(() => fetch('/api/dashboard').then(r => r.json()));
    log(`Products: ${dash.stats.totalProductos}`, dash.stats.totalProductos >= 20);
    log(`Movements: ${dash.stats.movimientosMes}`, dash.stats.movimientosMes >= 1);
    log(`Stock points: ${dash.stockPorPunto.length}`, dash.stockPorPunto.length === 6);

    // SUMMARY
    console.log('\n════════════════════════════════════');
    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    console.log(`✅ Passed: ${passed} / ${passed + failed}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
      results.filter(r => !r.ok).forEach(r => console.log(`   ❌ ${r.test}`));
    }
    console.log(jsErrors.length === 0 ? '✅ 0 JS errors' : `⚠️ ${jsErrors.length} JS errors`);
    if (jsErrors.length) jsErrors.forEach((e,i) => console.log(`   ${i+1}. ${e.substring(0,150)}`));
    console.log(`📸 ${n} screenshots`);

  } catch (err) {
    console.error('\n💥 CRASH:', err.message.substring(0, 200));
    await ss(page, 'CRASH');
  } finally {
    await browser.close();
  }
}

run();
