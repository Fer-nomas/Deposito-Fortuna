import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, codigo, tipo, descripcion, ubicacion, puedeAprobar, color, icono, activo } = body

    const existing = await prisma.puntoStock.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Punto de stock no encontrado' }, { status: 404 })
    }

    if (codigo && codigo !== existing.codigo) {
      const codigoTaken = await prisma.puntoStock.findUnique({ where: { codigo } })
      if (codigoTaken) {
        return NextResponse.json(
          { error: 'Ya existe un punto de stock con ese codigo' },
          { status: 400 }
        )
      }
    }

    const punto = await prisma.puntoStock.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(codigo !== undefined && { codigo: codigo.trim().toUpperCase() }),
        ...(tipo !== undefined && { tipo }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(ubicacion !== undefined && { ubicacion: ubicacion?.trim() || null }),
        ...(puedeAprobar !== undefined && { puedeAprobar }),
        ...(color !== undefined && { color }),
        ...(icono !== undefined && { icono }),
        ...(activo !== undefined && { activo }),
      },
    })

    return NextResponse.json(punto)
  } catch (error) {
    console.error('Error updating punto de stock:', error)
    return NextResponse.json(
      { error: 'Error al actualizar punto de stock' },
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

    const existing = await prisma.puntoStock.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Punto de stock no encontrado' }, { status: 404 })
    }

    await prisma.puntoStock.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting punto de stock:', error)
    return NextResponse.json(
      { error: 'Error al eliminar punto de stock' },
      { status: 500 }
    )
  }
}
