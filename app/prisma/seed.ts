import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ============================================
  // CLASIFICACIONES
  // ============================================
  const clasificaciones = await Promise.all([
    prisma.clasificacion.create({
      data: { nombre: 'Tóxico', color: '#EF4444', icono: 'skull', requiereManejoEspecial: true, orden: 1 },
    }),
    prisma.clasificacion.create({
      data: { nombre: 'No tóxico', color: '#22C55E', icono: 'shield-check', orden: 2 },
    }),
    prisma.clasificacion.create({
      data: { nombre: 'Líquido', color: '#3B82F6', icono: 'droplets', orden: 3 },
    }),
    prisma.clasificacion.create({
      data: { nombre: 'Sólido (Kg)', color: '#EAB308', icono: 'box', orden: 4 },
    }),
    prisma.clasificacion.create({
      data: { nombre: 'Inflamable', color: '#F97316', icono: 'flame', requiereManejoEspecial: true, orden: 5 },
    }),
  ])

  // ============================================
  // UNIDADES DE MEDIDA
  // ============================================
  const unidades = await Promise.all([
    prisma.unidadMedida.create({ data: { nombre: 'Kilogramos', abreviatura: 'kg' } }),
    prisma.unidadMedida.create({ data: { nombre: 'Litros', abreviatura: 'L' } }),
    prisma.unidadMedida.create({ data: { nombre: 'Unidades', abreviatura: 'un' } }),
    prisma.unidadMedida.create({ data: { nombre: 'Cajas', abreviatura: 'cj' } }),
    prisma.unidadMedida.create({ data: { nombre: 'Metros', abreviatura: 'm' } }),
    prisma.unidadMedida.create({ data: { nombre: 'Gramos', abreviatura: 'g' } }),
    prisma.unidadMedida.create({ data: { nombre: 'Toneladas', abreviatura: 't' } }),
  ])

  // ============================================
  // TIPOS DE MOVIMIENTO
  // ============================================
  await Promise.all([
    prisma.tipoMovimiento.create({
      data: { nombre: 'Compra', codigo: 'COMPRA', efectoDestino: 'SUMA', generaTicket: true },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Entrada', codigo: 'ENTRADA', efectoDestino: 'SUMA' },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Salida', codigo: 'SALIDA', efectoOrigen: 'RESTA', generaTicket: true },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Transferencia', codigo: 'TRANSFERENCIA', efectoOrigen: 'RESTA', efectoDestino: 'SUMA', requiereAprobacion: true, generaTicket: true },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Devolución a proveedor', codigo: 'DEV_PROVEEDOR', efectoOrigen: 'RESTA', generaTicket: true },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Devolución interna', codigo: 'DEV_INTERNA', efectoOrigen: 'RESTA', efectoDestino: 'SUMA', generaTicket: true },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Despacho', codigo: 'DESPACHO', efectoOrigen: 'RESTA', generaTicket: true },
    }),
    prisma.tipoMovimiento.create({
      data: { nombre: 'Consumo/Producción', codigo: 'CONSUMO_PROD', generaTicket: false },
    }),
  ])

  // ============================================
  // ROLES
  // ============================================
  const rolAdmin = await prisma.rol.create({
    data: {
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema',
      esAdmin: true,
      puedeAprobar: true,
      puedeCrearProductos: true,
      puedeVerReportes: true,
      puedeGestionarUsuarios: true,
    },
  })

  const rolEncargado = await prisma.rol.create({
    data: {
      nombre: 'Encargado',
      descripcion: 'Gestiona su punto de stock, aprueba solicitudes',
      esAdmin: false,
      puedeAprobar: true,
      puedeCrearProductos: true,
      puedeVerReportes: true,
      puedeGestionarUsuarios: false,
    },
  })

  const rolOperador = await prisma.rol.create({
    data: {
      nombre: 'Operador',
      descripcion: 'Crea solicitudes y registra consumo/producción',
      esAdmin: false,
      puedeAprobar: false,
      puedeCrearProductos: false,
      puedeVerReportes: false,
      puedeGestionarUsuarios: false,
    },
  })

  // ============================================
  // PUNTOS DE STOCK
  // ============================================
  const dep1 = await prisma.puntoStock.create({
    data: { nombre: 'Materia Prima', codigo: 'DEP1', tipo: 'deposito', descripcion: 'Resinas, pigmentos, químicos', puedeAprobar: true, color: '#6366F1', icono: 'warehouse', orden: 1 },
  })
  const dep2 = await prisma.puntoStock.create({
    data: { nombre: 'Semi-terminados', codigo: 'DEP2', tipo: 'deposito', descripcion: 'Tappers, temperas, piezas inyectadas', puedeAprobar: true, color: '#8B5CF6', icono: 'package', orden: 2 },
  })
  const dep3 = await prisma.puntoStock.create({
    data: { nombre: 'Productos Finales', codigo: 'DEP3', tipo: 'deposito', descripcion: 'Productos empacados para exportación', puedeAprobar: true, color: '#06B6D4', icono: 'truck', orden: 3 },
  })
  const dep4 = await prisma.puntoStock.create({
    data: { nombre: 'Insumos y Varios', codigo: 'DEP4', tipo: 'deposito', descripcion: 'Herramientas, repuestos, auxiliares', puedeAprobar: true, color: '#F59E0B', icono: 'wrench', orden: 4 },
  })
  const inyectora = await prisma.puntoStock.create({
    data: { nombre: 'Inyectora', codigo: 'INY', tipo: 'area_productiva', descripcion: 'Moldeo por inyección de plásticos', puedeAprobar: false, color: '#EF4444', icono: 'cog', orden: 5 },
  })
  const produccion = await prisma.puntoStock.create({
    data: { nombre: 'Producción', codigo: 'PROD', tipo: 'area_productiva', descripcion: 'Ensamble, etiquetado, empaque', puedeAprobar: false, color: '#22C55E', icono: 'factory', orden: 6 },
  })

  // ============================================
  // USUARIOS
  // ============================================
  const passwordHash = await hash('admin123', 12)

  const admin = await prisma.user.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@deposito.com',
      passwordHash,
    },
  })
  await prisma.userRol.create({ data: { userId: admin.id, rolId: rolAdmin.id } })

  const encargados = await Promise.all([
    prisma.user.create({ data: { nombre: 'Carlos Benítez', email: 'carlos@deposito.com', passwordHash } }),
    prisma.user.create({ data: { nombre: 'María González', email: 'maria@deposito.com', passwordHash } }),
    prisma.user.create({ data: { nombre: 'José Ramírez', email: 'jose@deposito.com', passwordHash } }),
    prisma.user.create({ data: { nombre: 'Ana López', email: 'ana@deposito.com', passwordHash } }),
  ])

  // Asignar rol encargado y punto de stock
  const puntos = [dep1, dep2, dep3, dep4]
  for (let i = 0; i < encargados.length; i++) {
    await prisma.userRol.create({ data: { userId: encargados[i].id, rolId: rolEncargado.id } })
    await prisma.userPuntoStock.create({ data: { userId: encargados[i].id, puntoStockId: puntos[i].id, esEncargado: true } })
  }

  // Operadores
  const opInyectora = await prisma.user.create({ data: { nombre: 'Pedro Martínez', email: 'pedro@deposito.com', passwordHash } })
  await prisma.userRol.create({ data: { userId: opInyectora.id, rolId: rolOperador.id } })
  await prisma.userPuntoStock.create({ data: { userId: opInyectora.id, puntoStockId: inyectora.id, esEncargado: true } })

  const opProduccion = await prisma.user.create({ data: { nombre: 'Laura Acosta', email: 'laura@deposito.com', passwordHash } })
  await prisma.userRol.create({ data: { userId: opProduccion.id, rolId: rolOperador.id } })
  await prisma.userPuntoStock.create({ data: { userId: opProduccion.id, puntoStockId: produccion.id, esEncargado: true } })

  // ============================================
  // PROVEEDORES
  // ============================================
  await Promise.all([
    prisma.proveedor.create({ data: { nombre: 'Plásticos del Sur S.A.', ruc: '80012345-6', telefono: '021-555-0101', email: 'ventas@plasticosdelsur.com', direccion: 'Ruta 1, Km 25, Luque' } }),
    prisma.proveedor.create({ data: { nombre: 'Químicos Industriales Paraguay', ruc: '80023456-7', telefono: '021-555-0202', email: 'contacto@quimicosind.com.py', direccion: 'Av. Industrial 1500, San Lorenzo' } }),
    prisma.proveedor.create({ data: { nombre: 'Importadora Resinas BR', ruc: '80034567-8', telefono: '+55 11 9999-0000', email: 'export@resinabr.com.br', direccion: 'São Paulo, Brasil' } }),
    prisma.proveedor.create({ data: { nombre: 'Pigmentos Color S.R.L.', ruc: '80045678-9', telefono: '021-555-0303', email: 'ventas@pigmentoscolor.com', direccion: 'Fernando de la Mora, Central' } }),
  ])

  // ============================================
  // PRODUCTOS DE EJEMPLO
  // ============================================
  const kg = unidades[0]
  const litros = unidades[1]
  const un = unidades[2]
  const cajas = unidades[3]
  const toxico = clasificaciones[0]
  const noToxico = clasificaciones[1]
  const liquido = clasificaciones[2]
  const solidoKg = clasificaciones[3]

  const productosData = [
    // Materia prima
    { codigo: '0001', descripcion: 'Resina Polietileno HD', clasificacionId: noToxico.id, unidadId: kg.id, costoCompra: 2500, costoVenta: 0, stockMinimo: 100, puntoId: dep1.id, stock: 850 },
    { codigo: '0002', descripcion: 'Resina Polipropileno', clasificacionId: noToxico.id, unidadId: kg.id, costoCompra: 3200, costoVenta: 0, stockMinimo: 80, puntoId: dep1.id, stock: 620 },
    { codigo: '0003', descripcion: 'Pigmento Azul Ultramar', clasificacionId: toxico.id, unidadId: kg.id, costoCompra: 15000, costoVenta: 0, stockMinimo: 20, puntoId: dep1.id, stock: 45 },
    { codigo: '0004', descripcion: 'Pigmento Rojo Cadmio', clasificacionId: toxico.id, unidadId: kg.id, costoCompra: 18000, costoVenta: 0, stockMinimo: 15, puntoId: dep1.id, stock: 30 },
    { codigo: '0005', descripcion: 'Solvente Industrial', clasificacionId: toxico.id, unidadId: litros.id, costoCompra: 8500, costoVenta: 0, stockMinimo: 50, puntoId: dep1.id, stock: 120 },
    { codigo: '0006', descripcion: 'Aceite Desmoldante', clasificacionId: liquido.id, unidadId: litros.id, costoCompra: 12000, costoVenta: 0, stockMinimo: 30, puntoId: dep1.id, stock: 75 },
    { codigo: '0007', descripcion: 'Carbonato de Calcio', clasificacionId: noToxico.id, unidadId: kg.id, costoCompra: 800, costoVenta: 0, stockMinimo: 200, puntoId: dep1.id, stock: 1200 },
    { codigo: '0008', descripcion: 'Masterbatch Negro', clasificacionId: noToxico.id, unidadId: kg.id, costoCompra: 22000, costoVenta: 0, stockMinimo: 10, puntoId: dep1.id, stock: 35 },

    // Semi-terminados (en Dep2)
    { codigo: '0009', descripcion: 'Tapper 500ml Transparente', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 0, costoVenta: 1500, stockMinimo: 500, puntoId: dep2.id, stock: 8500 },
    { codigo: '0010', descripcion: 'Tapper 1L Azul', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 0, costoVenta: 2200, stockMinimo: 300, puntoId: dep2.id, stock: 4200 },
    { codigo: '0011', descripcion: 'Tapper 2L Rojo', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 0, costoVenta: 3500, stockMinimo: 200, puntoId: dep2.id, stock: 2800 },
    { codigo: '0012', descripcion: 'Tapa Tapper Universal', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 0, costoVenta: 500, stockMinimo: 1000, puntoId: dep2.id, stock: 15000 },
    { codigo: '0013', descripcion: 'Envase Tempera 250ml', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 0, costoVenta: 800, stockMinimo: 800, puntoId: dep2.id, stock: 12000 },
    { codigo: '0014', descripcion: 'Envase Tempera 500ml', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 0, costoVenta: 1200, stockMinimo: 500, puntoId: dep2.id, stock: 6500 },

    // Productos finales (en Dep3)
    { codigo: '0015', descripcion: 'Set Tappers x6 (Caja Export)', clasificacionId: noToxico.id, unidadId: cajas.id, costoCompra: 0, costoVenta: 25000, stockMinimo: 100, puntoId: dep3.id, stock: 450 },
    { codigo: '0016', descripcion: 'Set Temperas x12 colores', clasificacionId: noToxico.id, unidadId: cajas.id, costoCompra: 0, costoVenta: 18000, stockMinimo: 200, puntoId: dep3.id, stock: 1200 },
    { codigo: '0017', descripcion: 'Kit Escolar Temperas x6', clasificacionId: noToxico.id, unidadId: cajas.id, costoCompra: 0, costoVenta: 12000, stockMinimo: 300, puntoId: dep3.id, stock: 2500 },

    // Insumos (en Dep4)
    { codigo: '0018', descripcion: 'Molde Inyección Tapper 500ml', clasificacionId: solidoKg.id, unidadId: un.id, costoCompra: 5500000, costoVenta: 0, stockMinimo: 1, puntoId: dep4.id, stock: 3 },
    { codigo: '0019', descripcion: 'Cinta Embalaje 48mm', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 8500, costoVenta: 0, stockMinimo: 50, puntoId: dep4.id, stock: 120 },
    { codigo: '0020', descripcion: 'Etiquetas Adhesivas (rollo x1000)', clasificacionId: noToxico.id, unidadId: un.id, costoCompra: 45000, costoVenta: 0, stockMinimo: 20, puntoId: dep4.id, stock: 65 },
  ]

  for (const p of productosData) {
    const producto = await prisma.producto.create({
      data: {
        codigo: p.codigo,
        descripcion: p.descripcion,
        clasificacionId: p.clasificacionId,
        unidadId: p.unidadId,
        costoCompra: p.costoCompra,
        costoVenta: p.costoVenta,
        stockMinimo: p.stockMinimo,
        creadoPorPuntoId: p.puntoId,
      },
    })
    await prisma.stockPorPunto.create({
      data: {
        productoId: producto.id,
        puntoStockId: p.puntoId,
        cantidad: p.stock,
      },
    })
  }

  // ============================================
  // CONFIGURACION INICIAL
  // ============================================
  await Promise.all([
    prisma.configuracion.create({ data: { clave: 'moneda', valor: '"PYG"', descripcion: 'Moneda del sistema' } }),
    prisma.configuracion.create({ data: { clave: 'empresa_nombre', valor: '"Depósito Fortuna"', descripcion: 'Nombre de la empresa' } }),
    prisma.configuracion.create({ data: { clave: 'ticket_prefijo', valor: '"TKT"', descripcion: 'Prefijo para tickets' } }),
    prisma.configuracion.create({ data: { clave: 'solicitud_prefijo', valor: '"SOL"', descripcion: 'Prefijo para solicitudes' } }),
  ])

  console.log('Seed completed!')
  console.log('')
  console.log('Usuarios de prueba:')
  console.log('  Admin:      admin@deposito.com / admin123')
  console.log('  Encargados: carlos@deposito.com, maria@deposito.com, jose@deposito.com, ana@deposito.com / admin123')
  console.log('  Operadores: pedro@deposito.com (Inyectora), laura@deposito.com (Producción) / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
