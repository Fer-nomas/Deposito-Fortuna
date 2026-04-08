import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        clasificacion: true,
        unidad: true,
        creadoPorPunto: {
          select: { id: true, nombre: true, codigo: true },
        },
        stockPorPunto: {
          include: {
            puntoStock: {
              select: { id: true, nombre: true, codigo: true, color: true, tipo: true },
            },
          },
        },
        movimientoDetalles: {
          take: 50,
          orderBy: { movimiento: { fecha: 'desc' } },
          include: {
            movimiento: {
              include: {
                tipoMovimiento: { select: { nombre: true, codigo: true } },
                puntoOrigen: { select: { nombre: true, codigo: true } },
                puntoDestino: { select: { nombre: true, codigo: true } },
                usuario: { select: { nombre: true } },
              },
            },
          },
        },
      },
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...producto,
      costoCompra: Number(producto.costoCompra),
      costoVenta: Number(producto.costoVenta),
      stockMinimo: Number(producto.stockMinimo),
      stockTotal: producto.stockPorPunto.reduce(
        (acc, s) => acc + Number(s.cantidad),
        0
      ),
      stockPorPunto: producto.stockPorPunto.map((s) => ({
        ...s,
        cantidad: Number(s.cantidad),
      })),
      movimientoDetalles: producto.movimientoDetalles.map((d) => ({
        ...d,
        cantidad: Number(d.cantidad),
        costoUnitario: Number(d.costoUnitario),
      })),
    })
  } catch (error) {
    console.error('Error fetching producto:', error)
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      descripcion,
      clasificacionId,
      unidadId,
      costoCompra,
      costoVenta,
      stockMinimo,
      notas,
      imagenUrl,
    } = body

    const existing = await prisma.producto.findUnique({ where: { id } })
    if (!existing || !existing.activo) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        descripcion,
        clasificacionId: clasificacionId || null,
        unidadId,
        costoCompra: costoCompra ?? existing.costoCompra,
        costoVenta: costoVenta ?? existing.costoVenta,
        stockMinimo: stockMinimo ?? existing.stockMinimo,
        notas: notas !== undefined ? notas : existing.notas,
        imagenUrl: imagenUrl !== undefined ? imagenUrl : existing.imagenUrl,
      },
      include: {
        clasificacion: true,
        unidad: true,
        creadoPorPunto: {
          select: { id: true, nombre: true, codigo: true },
        },
        stockPorPunto: {
          include: {
            puntoStock: {
              select: { id: true, nombre: true, codigo: true, color: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      ...producto,
      costoCompra: Number(producto.costoCompra),
      costoVenta: Number(producto.costoVenta),
      stockMinimo: Number(producto.stockMinimo),
      stockTotal: producto.stockPorPunto.reduce(
        (acc, s) => acc + Number(s.cantidad),
        0
      ),
      stockPorPunto: producto.stockPorPunto.map((s) => ({
        ...s,
        cantidad: Number(s.cantidad),
      })),
    })
  } catch (error) {
    console.error('Error updating producto:', error)
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.producto.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    await prisma.producto.update({
      where: { id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ message: 'Producto eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting producto:', error)
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    )
  }
}
