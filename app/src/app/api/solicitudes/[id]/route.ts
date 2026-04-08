import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { generateTicketNumero } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const solicitud = await prisma.solicitud.findUnique({
      where: { id },
      include: {
        solicitante: {
          select: { id: true, nombre: true, email: true },
        },
        puntoOrigen: {
          select: { id: true, nombre: true, codigo: true, color: true, tipo: true, puedeAprobar: true },
        },
        puntoDestino: {
          select: { id: true, nombre: true, codigo: true, color: true, tipo: true, puedeAprobar: true },
        },
        aprobadoPor: {
          select: { id: true, nombre: true },
        },
        detalles: {
          include: {
            producto: {
              select: { id: true, codigo: true, descripcion: true },
            },
          },
        },
        movimientos: {
          include: {
            tipoMovimiento: { select: { nombre: true, codigo: true } },
            detalles: {
              include: {
                producto: { select: { codigo: true, descripcion: true } },
              },
            },
          },
        },
      },
    })

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...solicitud,
      detalles: solicitud.detalles.map((d) => ({
        ...d,
        cantidadSolicitada: Number(d.cantidadSolicitada),
        cantidadAprobada: d.cantidadAprobada ? Number(d.cantidadAprobada) : null,
      })),
      movimientos: solicitud.movimientos.map((m) => ({
        ...m,
        flete: Number(m.flete),
        detalles: m.detalles.map((d) => ({
          ...d,
          cantidad: Number(d.cantidad),
          costoUnitario: Number(d.costoUnitario),
        })),
      })),
    })
  } catch (error) {
    console.error('Error fetching solicitud:', error)
    return NextResponse.json(
      { error: 'Error al obtener solicitud' },
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
    const { accion, aprobadoPorId, observacionRespuesta, detallesAprobados } = body

    const solicitud = await prisma.solicitud.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            producto: true,
          },
        },
        puntoOrigen: true,
        puntoDestino: true,
      },
    })

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden procesar solicitudes pendientes' },
        { status: 400 }
      )
    }

    // --- RECHAZAR ---
    if (accion === 'rechazar') {
      if (!observacionRespuesta) {
        return NextResponse.json(
          { error: 'Debe indicar un motivo de rechazo' },
          { status: 400 }
        )
      }

      const updated = await prisma.solicitud.update({
        where: { id },
        data: {
          estado: 'rechazada',
          aprobadoPorId,
          observacionRespuesta,
          fechaRespuesta: new Date(),
        },
        include: {
          solicitante: { select: { id: true, nombre: true } },
          puntoOrigen: { select: { id: true, nombre: true, codigo: true } },
          puntoDestino: { select: { id: true, nombre: true, codigo: true } },
          detalles: {
            include: { producto: { select: { id: true, codigo: true, descripcion: true } } },
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
    }

    // --- APROBAR ---
    if (accion === 'aprobar') {
      if (!aprobadoPorId) {
        return NextResponse.json(
          { error: 'Se requiere el ID del aprobador' },
          { status: 400 }
        )
      }

      if (!detallesAprobados || !detallesAprobados.length) {
        return NextResponse.json(
          { error: 'Debe indicar cantidades aprobadas' },
          { status: 400 }
        )
      }

      // Find TRANSFERENCIA tipo movimiento
      let tipoMovimiento = await prisma.tipoMovimiento.findFirst({
        where: { codigo: 'TRANSFERENCIA', activo: true },
      })

      // Fallback: try SALIDA
      if (!tipoMovimiento) {
        tipoMovimiento = await prisma.tipoMovimiento.findFirst({
          where: { codigo: 'SALIDA', activo: true },
        })
      }

      if (!tipoMovimiento) {
        return NextResponse.json(
          { error: 'No se encontró un tipo de movimiento válido. Configure TRANSFERENCIA o SALIDA.' },
          { status: 500 }
        )
      }

      // Generate ticket number
      const year = new Date().getFullYear()
      const tktPrefix = `TKT-${year}-`
      const lastTicket = await prisma.movimiento.findFirst({
        where: { ticketNumero: { startsWith: tktPrefix } },
        orderBy: { ticketNumero: 'desc' },
        select: { ticketNumero: true },
      })

      let tktSequence = 1
      if (lastTicket?.ticketNumero) {
        const lastNum = parseInt(lastTicket.ticketNumero.replace(tktPrefix, ''), 10)
        if (!isNaN(lastNum)) {
          tktSequence = lastNum + 1
        }
      }
      const ticketNumero = generateTicketNumero(year, tktSequence)

      // Build a map of detallesAprobados by detalleId
      const aprobadosMap = new Map<string, number>()
      for (const da of detallesAprobados) {
        aprobadosMap.set(da.detalleId, da.cantidadAprobada)
      }

      // Execute approval in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update solicitud
        const updatedSolicitud = await tx.solicitud.update({
          where: { id },
          data: {
            estado: 'aprobada',
            aprobadoPorId,
            observacionRespuesta: observacionRespuesta || null,
            fechaRespuesta: new Date(),
          },
        })

        // 2. Update each detalle with cantidadAprobada
        for (const detalle of solicitud.detalles) {
          const cantAprobada = aprobadosMap.get(detalle.id) ?? 0
          await tx.solicitudDetalle.update({
            where: { id: detalle.id },
            data: { cantidadAprobada: cantAprobada },
          })
        }

        // 3. Determine stock flow direction
        // For "pedido": solicitante (origen) requests FROM destino, so material flows destino → origen
        // For "envio": solicitante (origen) sends TO destino, so material flows origen → destino
        // For "devolucion": same as envio (origin sends back to destination)
        // For "transferencia": same as envio
        const isPedido = solicitud.tipo === 'pedido'
        const stockFromId = isPedido ? solicitud.puntoDestinoId : solicitud.puntoOrigenId
        const stockToId = isPedido ? solicitud.puntoOrigenId : solicitud.puntoDestinoId

        // Create Movimiento (always: material leaves stockFrom, arrives at stockTo)
        const movimiento = await tx.movimiento.create({
          data: {
            tipoMovimientoId: tipoMovimiento!.id,
            fecha: new Date(),
            puntoOrigenId: stockFromId,
            puntoDestinoId: stockToId,
            observacion: `Aprobación de solicitud ${solicitud.numero}`,
            usuarioId: aprobadoPorId,
            ticketNumero,
            solicitudId: solicitud.id,
            detalles: {
              create: solicitud.detalles
                .filter((d) => {
                  const cant = aprobadosMap.get(d.id) ?? 0
                  return cant > 0
                })
                .map((d) => ({
                  productoId: d.productoId,
                  cantidad: aprobadosMap.get(d.id) ?? 0,
                  costoUnitario: Number(d.producto.costoCompra),
                  tipoLinea: 'movimiento',
                })),
            },
          },
        })

        // 4. Update StockPorPunto: subtract from source, add to destination
        for (const detalle of solicitud.detalles) {
          const cantAprobada = aprobadosMap.get(detalle.id) ?? 0
          if (cantAprobada <= 0) continue

          // Subtract from source (where material comes from)
          await tx.stockPorPunto.upsert({
            where: {
              productoId_puntoStockId: {
                productoId: detalle.productoId,
                puntoStockId: stockFromId,
              },
            },
            update: {
              cantidad: { decrement: cantAprobada },
            },
            create: {
              productoId: detalle.productoId,
              puntoStockId: stockFromId,
              cantidad: -cantAprobada,
            },
          })

          // Add to destination (where material goes to)
          await tx.stockPorPunto.upsert({
            where: {
              productoId_puntoStockId: {
                productoId: detalle.productoId,
                puntoStockId: stockToId,
              },
            },
            update: {
              cantidad: { increment: cantAprobada },
            },
            create: {
              productoId: detalle.productoId,
              puntoStockId: stockToId,
              cantidad: cantAprobada,
            },
          })
        }

        return { updatedSolicitud, movimiento, ticketNumero }
      })

      // Fetch the full updated solicitud
      const fullSolicitud = await prisma.solicitud.findUnique({
        where: { id },
        include: {
          solicitante: { select: { id: true, nombre: true } },
          puntoOrigen: { select: { id: true, nombre: true, codigo: true, color: true } },
          puntoDestino: { select: { id: true, nombre: true, codigo: true, color: true } },
          aprobadoPor: { select: { id: true, nombre: true } },
          detalles: {
            include: { producto: { select: { id: true, codigo: true, descripcion: true } } },
          },
        },
      })

      return NextResponse.json({
        ...fullSolicitud,
        ticketNumero: result.ticketNumero,
        detalles: fullSolicitud!.detalles.map((d) => ({
          ...d,
          cantidadSolicitada: Number(d.cantidadSolicitada),
          cantidadAprobada: d.cantidadAprobada ? Number(d.cantidadAprobada) : null,
        })),
      })
    }

    return NextResponse.json(
      { error: 'Acción no válida. Use "aprobar" o "rechazar"' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error updating solicitud:', error)
    return NextResponse.json(
      { error: `Error al procesar solicitud: ${error?.message || 'Unknown'}` },
      { status: 500 }
    )
  }
}
