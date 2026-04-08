import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { generateTicketNumero } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const tipo = searchParams.get('tipo') || ''
    const fechaDesde = searchParams.get('fechaDesde') || ''
    const fechaHasta = searchParams.get('fechaHasta') || ''
    const puntoStockId = searchParams.get('puntoStockId') || ''

    const skip = (page - 1) * limit

    const where: any = {
      anulado: false,
    }

    if (tipo) {
      where.tipoMovimientoId = tipo
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {}
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        hasta.setHours(23, 59, 59, 999)
        where.fecha.lte = hasta
      }
    }

    if (puntoStockId) {
      where.OR = [
        { puntoOrigenId: puntoStockId },
        { puntoDestinoId: puntoStockId },
      ]
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
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
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movimiento.count({ where }),
    ])

    const result = movimientos.map((m) => ({
      ...m,
      flete: Number(m.flete),
      detalles: m.detalles.map((d) => ({
        ...d,
        cantidad: Number(d.cantidad),
        costoUnitario: Number(d.costoUnitario),
      })),
    }))

    return NextResponse.json({
      movimientos: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching movimientos:', error)
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tipoMovimientoId,
      puntoOrigenId,
      puntoDestinoId,
      proveedorId,
      flete,
      observacion,
      usuarioId,
      detalles,
    } = body

    if (!tipoMovimientoId || !usuarioId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (tipo, usuario, detalles)' },
        { status: 400 }
      )
    }

    // Get the tipo movimiento to know effects and ticket generation
    const tipoMov = await prisma.tipoMovimiento.findUnique({
      where: { id: tipoMovimientoId },
    })

    if (!tipoMov) {
      return NextResponse.json(
        { error: 'Tipo de movimiento no encontrado' },
        { status: 404 }
      )
    }

    // Validate stock availability for movements that subtract from origin
    if (puntoOrigenId && tipoMov.efectoOrigen === 'RESTA') {
      for (const detalle of detalles) {
        if (detalle.tipoLinea === 'produccion') continue // produccion adds, doesn't subtract
        const stock = await prisma.stockPorPunto.findUnique({
          where: {
            productoId_puntoStockId: {
              productoId: detalle.productoId,
              puntoStockId: puntoOrigenId,
            },
          },
          include: { producto: { select: { descripcion: true, codigo: true } } },
        })
        const currentQty = stock ? Number(stock.cantidad) : 0
        if (currentQty < detalle.cantidad) {
          return NextResponse.json(
            { error: `Stock insuficiente de "${stock?.producto?.descripcion || detalle.productoId}" en punto origen. Disponible: ${currentQty}, solicitado: ${detalle.cantidad}` },
            { status: 400 }
          )
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate ticket number if needed
      let ticketNumero: string | null = null
      if (tipoMov.generaTicket) {
        const year = new Date().getFullYear()
        const lastTicket = await tx.movimiento.findFirst({
          where: {
            ticketNumero: { startsWith: `TKT-${year}-` },
          },
          orderBy: { ticketNumero: 'desc' },
          select: { ticketNumero: true },
        })

        let sequence = 1
        if (lastTicket?.ticketNumero) {
          const parts = lastTicket.ticketNumero.split('-')
          const lastSeq = parseInt(parts[2], 10)
          if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1
          }
        }
        ticketNumero = generateTicketNumero(year, sequence)
      }

      // Create the movimiento
      const movimiento = await tx.movimiento.create({
        data: {
          tipoMovimientoId,
          puntoOrigenId: puntoOrigenId || null,
          puntoDestinoId: puntoDestinoId || null,
          proveedorId: proveedorId || null,
          flete: flete || 0,
          observacion: observacion?.trim() || null,
          usuarioId,
          ticketNumero,
        },
      })

      // Create detalle records
      for (const detalle of detalles) {
        await tx.movimientoDetalle.create({
          data: {
            movimientoId: movimiento.id,
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            costoUnitario: detalle.costoUnitario || 0,
            tipoLinea: detalle.tipoLinea || 'movimiento',
          },
        })

        // Update stock based on efecto and tipoLinea
        const isConsumo = detalle.tipoLinea === 'consumo'
        const isProduccion = detalle.tipoLinea === 'produccion'

        // For consumo lines: subtract from origin
        // For produccion lines: add to destination
        // For regular movimiento lines: apply efectoOrigen/efectoDestino

        if (isConsumo) {
          // Consumo always subtracts from origin
          if (puntoOrigenId) {
            await tx.stockPorPunto.upsert({
              where: {
                productoId_puntoStockId: {
                  productoId: detalle.productoId,
                  puntoStockId: puntoOrigenId,
                },
              },
              update: {
                cantidad: { decrement: detalle.cantidad },
              },
              create: {
                productoId: detalle.productoId,
                puntoStockId: puntoOrigenId,
                cantidad: -detalle.cantidad,
              },
            })
          }
        } else if (isProduccion) {
          // Produccion always adds to destination (or origin if no destination)
          const targetPuntoId = puntoDestinoId || puntoOrigenId
          if (targetPuntoId) {
            await tx.stockPorPunto.upsert({
              where: {
                productoId_puntoStockId: {
                  productoId: detalle.productoId,
                  puntoStockId: targetPuntoId,
                },
              },
              update: {
                cantidad: { increment: detalle.cantidad },
              },
              create: {
                productoId: detalle.productoId,
                puntoStockId: targetPuntoId,
                cantidad: detalle.cantidad,
              },
            })
          }
        } else {
          // Regular movimiento line: apply efectoOrigen and efectoDestino
          if (puntoOrigenId && tipoMov.efectoOrigen === 'RESTA') {
            await tx.stockPorPunto.upsert({
              where: {
                productoId_puntoStockId: {
                  productoId: detalle.productoId,
                  puntoStockId: puntoOrigenId,
                },
              },
              update: {
                cantidad: { decrement: detalle.cantidad },
              },
              create: {
                productoId: detalle.productoId,
                puntoStockId: puntoOrigenId,
                cantidad: -detalle.cantidad,
              },
            })
          }

          if (puntoDestinoId && tipoMov.efectoDestino === 'SUMA') {
            await tx.stockPorPunto.upsert({
              where: {
                productoId_puntoStockId: {
                  productoId: detalle.productoId,
                  puntoStockId: puntoDestinoId,
                },
              },
              update: {
                cantidad: { increment: detalle.cantidad },
              },
              create: {
                productoId: detalle.productoId,
                puntoStockId: puntoDestinoId,
                cantidad: detalle.cantidad,
              },
            })
          }
        }
      }

      // Return movimiento with all relations
      return tx.movimiento.findUnique({
        where: { id: movimiento.id },
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
    })

    return NextResponse.json(
      {
        ...result,
        flete: Number(result!.flete),
        detalles: result!.detalles.map((d) => ({
          ...d,
          cantidad: Number(d.cantidad),
          costoUnitario: Number(d.costoUnitario),
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating movimiento:', error)
    return NextResponse.json(
      { error: 'Error al crear movimiento' },
      { status: 500 }
    )
  }
}
