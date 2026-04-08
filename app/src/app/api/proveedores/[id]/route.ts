import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, ruc, telefono, email, direccion, contactoNombre, notas } = body

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      )
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        ruc: ruc?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        direccion: direccion?.trim() || null,
        contactoNombre: contactoNombre?.trim() || null,
        notas: notas?.trim() || null,
      },
    })

    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error updating proveedor:', error)
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
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

    await prisma.proveedor.update({
      where: { id },
      data: {
        activo: false,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proveedor:', error)
    return NextResponse.json(
      { error: 'Error al eliminar proveedor' },
      { status: 500 }
    )
  }
}
