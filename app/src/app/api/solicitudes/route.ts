import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { generateSolicitudNumero } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const estado = searchParams.get('estado') || ''
    const tipo = searchParams.get('tipo') || ''
    const puntoId = searchParams.get('puntoId') || ''
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (estado) {
      where.estado = estado
    }

    if (tipo) {
      where.tipo = tipo
    }

    if (puntoId) {
      where.OR = [
        { puntoOrigenId: puntoId },
        { puntoDestinoId: puntoId },
      ]
    }

    if (search) {
      const searchCondition = [
        { numero: { contains: search, mode: 'insensitive' as const } },
        { solicitante: { nombre: { contains: search, mode: 'insensitive' as const } } },
      ]
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }]
        delete where.OR
      } else {
        where.OR = searchCondition
      }
    }

    const [solicitudes, total] = await Promise.all([
      prisma.solicitud.findMany({
        where,
        include: {
          solicitante: {
            select: { id: true, nombre: true, email: true },
          },
          puntoOrigen: {
            select: { id: true, nombre: true, codigo: true, color: true, puedeAprobar: true },
          },
          puntoDestino: {
            select: { id: true, nombre: true, codigo: true, color: true, puedeAprobar: true },
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
        },
        orderBy: { fechaSolicitud: 'desc' },
        skip,
        take: limit,
      }),
      prisma.solicitud.count({ where }),
    ])

    const solicitudesFormatted = solicitudes.map((s) => ({
      ...s,
      detalles: s.detalles.map((d) => ({
        ...d,
        cantidadSolicitada: Number(d.cantidadSolicitada),
        cantidadAprobada: d.cantidadAprobada ? Number(d.cantidadAprobada) : null,
      })),
    }))

    return NextResponse.json({
      solicitudes: solicitudesFormatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching solicitudes:', error)
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tipo,
      solicitanteId,
      puntoOrigenId,
      puntoDestinoId,
      prioridad,
      observacionSolicitud,
      detalles,
    } = body

    if (!tipo || !solicitanteId || !puntoOrigenId || !puntoDestinoId || !detalles?.length) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    // Generate SOL-YYYY-NNNNNN
    const year = new Date().getFullYear()
    const prefix = `SOL-${year}-`

    const lastSolicitud = await prisma.solicitud.findFirst({
      where: { numero: { startsWith: prefix } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    })

    let sequence = 1
    if (lastSolicitud) {
      const lastNum = parseInt(lastSolicitud.numero.replace(prefix, ''), 10)
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1
      }
    }

    const numero = generateSolicitudNumero(year, sequence)

    const solicitud = await prisma.solicitud.create({
      data: {
        numero,
        tipo,
        solicitanteId,
        puntoOrigenId,
        puntoDestinoId,
        prioridad: prioridad || 'normal',
        observacionSolicitud: observacionSolicitud || null,
        detalles: {
          create: detalles.map((d: any) => ({
            productoId: d.productoId,
            cantidadSolicitada: d.cantidadSolicitada,
          })),
        },
      },
      include: {
        solicitante: {
          select: { id: true, nombre: true, email: true },
        },
        puntoOrigen: {
          select: { id: true, nombre: true, codigo: true, color: true, puedeAprobar: true },
        },
        puntoDestino: {
          select: { id: true, nombre: true, codigo: true, color: true, puedeAprobar: true },
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

    return NextResponse.json(
      {
        ...solicitud,
        detalles: solicitud.detalles.map((d) => ({
          ...d,
          cantidadSolicitada: Number(d.cantidadSolicitada),
          cantidadAprobada: d.cantidadAprobada ? Number(d.cantidadAprobada) : null,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating solicitud:', error)
    return NextResponse.json(
      { error: 'Error al crear solicitud' },
      { status: 500 }
    )
  }
}
