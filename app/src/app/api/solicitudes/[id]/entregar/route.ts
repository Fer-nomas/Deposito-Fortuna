import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const solicitud = await prisma.solicitud.findUnique({
      where: { id },
    })

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    if (solicitud.estado !== 'aprobada') {
      return NextResponse.json(
        { error: 'Solo se pueden entregar solicitudes aprobadas' },
        { status: 400 }
      )
    }

    const updated = await prisma.solicitud.update({
      where: { id },
      data: {
        estado: 'entregada',
        fechaEntrega: new Date(),
      },
      include: {
        solicitante: { select: { id: true, nombre: true } },
        puntoOrigen: { select: { id: true, nombre: true, codigo: true } },
        puntoDestino: { select: { id: true, nombre: true, codigo: true } },
        detalles: {
          include: {
            producto: { select: { id: true, codigo: true, descripcion: true } },
          },
        },
      },
    })

    return NextResponse.json({
      ...updated,
      detalles: updated.detalles.map((d) => ({
        ...d,
        cantidadSolicitada: Number(d.cantidadSolicitada),
        cantidadAprobada: d.cantidadAprobada ? Number(d.cantidadAprobada) : null,
      })),
    })
  } catch (error) {
    console.error('Error marking solicitud as entregada:', error)
    return NextResponse.json(
      { error: 'Error al marcar como entregada' },
      { status: 500 }
    )
  }
}
