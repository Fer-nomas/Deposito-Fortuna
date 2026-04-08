import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      puntosStock,
      totalProductos,
      movimientosHoy,
      movimientosMes,
      solicitudesPendientes,
      stockData,
      ultimosMovimientos,
      solicitudesRecientes,
    ] = await Promise.all([
      prisma.puntoStock.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' },
        include: {
          stockProductos: { include: { producto: true } },
          userPuntos: { where: { esEncargado: true }, include: { user: true } },
        },
      }),
      prisma.producto.count({ where: { activo: true } }),
      prisma.movimiento.count({
        where: {
          fecha: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          anulado: false,
        },
      }),
      prisma.movimiento.count({
        where: {
          fecha: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          anulado: false,
        },
      }),
      prisma.solicitud.count({ where: { estado: 'pendiente' } }),
      prisma.stockPorPunto.findMany({
        include: { producto: true, puntoStock: true },
      }),
      prisma.movimiento.findMany({
        take: 10,
        orderBy: { fecha: 'desc' },
        where: { anulado: false },
        include: {
          tipoMovimiento: true,
          puntoOrigen: true,
          puntoDestino: true,
          usuario: true,
          detalles: { include: { producto: true } },
        },
      }),
      prisma.solicitud.findMany({
        take: 5,
        where: { estado: 'pendiente' },
        orderBy: { fechaSolicitud: 'desc' },
        include: {
          solicitante: true,
          puntoOrigen: true,
          puntoDestino: true,
          detalles: { include: { producto: true } },
        },
      }),
    ])

    // Calculate stock stats per punto (only positive stock)
    const stockPorPunto = puntosStock.map((punto) => {
      const stocks = stockData.filter((s) => s.puntoStockId === punto.id && Number(s.cantidad) > 0)
      const totalProductos = stocks.length
      const valorizado = stocks.reduce((acc, s) => {
        return acc + Number(s.cantidad) * Number(s.producto.costoCompra)
      }, 0)

      return {
        id: punto.id,
        nombre: punto.nombre,
        codigo: punto.codigo,
        tipo: punto.tipo,
        color: punto.color,
        icono: punto.icono,
        encargado: punto.userPuntos[0]?.user?.nombre || 'Sin asignar',
        totalProductos,
        valorizado,
        puedeAprobar: punto.puedeAprobar,
      }
    })

    // Products with low stock (only positive stock, above zero minimum)
    const productosStockBajo = stockData.filter(
      (s) => Number(s.cantidad) > 0 && Number(s.producto.stockMinimo) > 0 && Number(s.cantidad) <= Number(s.producto.stockMinimo)
    ).map((s) => ({
      producto: s.producto.descripcion,
      codigo: s.producto.codigo,
      punto: s.puntoStock.nombre,
      cantidad: Number(s.cantidad),
      minimo: Number(s.producto.stockMinimo),
      unidad: '',
    }))

    // Toxic products count
    const productosToxicos = await prisma.stockPorPunto.count({
      where: {
        cantidad: { gt: 0 },
        producto: {
          clasificacion: { requiereManejoEspecial: true },
        },
      },
    })

    // Total freight this month
    const fletesMes = await prisma.movimiento.aggregate({
      _sum: { flete: true },
      where: {
        fecha: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        anulado: false,
      },
    })

    // Stock total valorizado
    const stockValorizado = stockPorPunto.reduce((acc, p) => acc + p.valorizado, 0)

    return NextResponse.json({
      stats: {
        totalProductos,
        stockValorizado,
        movimientosHoy,
        movimientosMes,
        solicitudesPendientes,
        productosStockBajo: productosStockBajo.length,
        fletesMes: Number(fletesMes._sum.flete || 0),
        productosToxicos,
      },
      stockPorPunto,
      productosStockBajo,
      ultimosMovimientos: ultimosMovimientos.map((m) => ({
        id: m.id,
        tipo: m.tipoMovimiento.nombre,
        tipoCodigo: m.tipoMovimiento.codigo,
        fecha: m.fecha,
        origen: m.puntoOrigen?.nombre || null,
        destino: m.puntoDestino?.nombre || null,
        usuario: m.usuario.nombre,
        ticketNumero: m.ticketNumero,
        totalItems: m.detalles.length,
        observacion: m.observacion,
      })),
      solicitudesRecientes: solicitudesRecientes.map((s) => ({
        id: s.id,
        numero: s.numero,
        tipo: s.tipo,
        estado: s.estado,
        solicitante: s.solicitante.nombre,
        origen: s.puntoOrigen.nombre,
        destino: s.puntoDestino.nombre,
        fecha: s.fechaSolicitud,
        totalItems: s.detalles.length,
        prioridad: s.prioridad,
      })),
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Error loading dashboard' }, { status: 500 })
  }
}
