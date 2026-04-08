import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const puntos = await prisma.puntoStock.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      include: {
        userPuntos: {
          where: { esEncargado: true },
          include: { user: { select: { nombre: true } } },
        },
        stockProductos: {
          orderBy: { producto: { descripcion: 'asc' } },
          include: {
            producto: {
              include: {
                clasificacion: { select: { nombre: true, color: true, requiereManejoEspecial: true } },
                unidad: { select: { nombre: true, abreviatura: true } },
              },
            },
          },
        },
      },
    })

    const result = puntos.map((p) => {
      const encargado = p.userPuntos[0]?.user.nombre || null
      const stockActivo = p.stockProductos.filter((s) => Number(s.cantidad) > 0)
      const totalProductos = stockActivo.length
      const valorizado = stockActivo.reduce(
        (acc, s) => acc + Number(s.cantidad) * Number(s.producto.costoCompra),
        0
      )
      const stockBajo = stockActivo.filter(
        (s) => Number(s.producto.stockMinimo) > 0 && Number(s.cantidad) <= Number(s.producto.stockMinimo)
      ).length

      const items = p.stockProductos
        .filter((s) => Number(s.cantidad) > 0)
        .map((s) => ({
          productoId: s.productoId,
          codigo: s.producto.codigo,
          descripcion: s.producto.descripcion,
          cantidad: Number(s.cantidad),
          costoCompra: Number(s.producto.costoCompra),
          valorTotal: Number(s.cantidad) * Number(s.producto.costoCompra),
          unidad: s.producto.unidad?.abreviatura || '',
          clasificacion: s.producto.clasificacion?.nombre || null,
          clasificacionColor: s.producto.clasificacion?.color || null,
          requiereManejoEspecial: s.producto.clasificacion?.requiereManejoEspecial || false,
          stockMinimo: Number(s.producto.stockMinimo),
          stockBajo: Number(s.producto.stockMinimo) > 0 && Number(s.cantidad) <= Number(s.producto.stockMinimo),
        }))

      return {
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        tipo: p.tipo,
        color: p.color,
        icono: p.icono,
        encargado,
        totalProductos,
        valorizado,
        stockBajo,
        items,
      }
    })

    return NextResponse.json({ puntos: result })
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
