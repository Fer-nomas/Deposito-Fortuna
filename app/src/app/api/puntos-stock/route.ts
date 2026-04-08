import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const puntos = await prisma.puntoStock.findMany({
      where: { deletedAt: null },
      include: {
        userPuntos: {
          where: { esEncargado: true },
          include: {
            user: { select: { id: true, nombre: true, email: true } },
          },
        },
        _count: {
          select: {
            stockProductos: true,
          },
        },
      },
      orderBy: { orden: 'asc' },
    })

    return NextResponse.json({
      puntos: puntos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        tipo: p.tipo,
        descripcion: p.descripcion,
        ubicacion: p.ubicacion,
        puedeAprobar: p.puedeAprobar,
        color: p.color,
        icono: p.icono,
        orden: p.orden,
        activo: p.activo,
        createdAt: p.createdAt,
        encargado: p.userPuntos[0]?.user || null,
        totalProductos: p._count.stockProductos,
      })),
    })
  } catch (error) {
    console.error('Error fetching puntos de stock:', error)
    return NextResponse.json(
      { error: 'Error al obtener puntos de stock' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, codigo, tipo, descripcion, ubicacion, puedeAprobar, color, icono } = body

    if (!nombre || !codigo || !tipo) {
      return NextResponse.json(
        { error: 'Nombre, codigo y tipo son obligatorios' },
        { status: 400 }
      )
    }

    const existing = await prisma.puntoStock.findUnique({ where: { codigo } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un punto de stock con ese codigo' },
        { status: 400 }
      )
    }

    const lastPunto = await prisma.puntoStock.findFirst({
      orderBy: { orden: 'desc' },
      select: { orden: true },
    })

    const punto = await prisma.puntoStock.create({
      data: {
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase(),
        tipo,
        descripcion: descripcion?.trim() || null,
        ubicacion: ubicacion?.trim() || null,
        puedeAprobar: puedeAprobar || false,
        color: color || '#6366f1',
        icono: icono || null,
        orden: (lastPunto?.orden || 0) + 1,
      },
    })

    return NextResponse.json(punto, { status: 201 })
  } catch (error) {
    console.error('Error creating punto de stock:', error)
    return NextResponse.json(
      { error: 'Error al crear punto de stock' },
      { status: 500 }
    )
  }
}
