import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      include: {
        tipoMovimiento: true,
        puntoOrigen: {
          select: { id: true, nombre: true, codigo: true, color: true },
        },
        puntoDestino: {
          select: { id: true, nombre: true, codigo: true, color: true },
        },
        proveedor: {
          select: { id: true, nombre: true, ruc: true },
        },
        usuario: {
          select: { id: true, nombre: true },
        },
        detalles: {
          include: {
            producto: {
              select: { id: true, codigo: true, descripcion: true },
            },
          },
        },
      },
    })

    if (!movimiento) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...movimiento,
      flete: Number(movimiento.flete),
      detalles: movimiento.detalles.map((d) => ({
        ...d,
        cantidad: Number(d.cantidad),
        costoUnitario: Number(d.costoUnitario),
      })),
    })
  } catch (error) {
    console.error('Error fetching movimiento:', error)
    return NextResponse.json(
      { error: 'Error al obtener movimiento' },
      { status: 500 }
    )
  }
}
