import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: any = {
      activo: true,
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactoNombre: { contains: search, mode: 'insensitive' } },
      ]
    }

    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ proveedores })
  } catch (error) {
    console.error('Error fetching proveedores:', error)
    return NextResponse.json(
      { error: 'Error al obtener proveedores' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, ruc, telefono, email, direccion, contactoNombre, notas } = body

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 }
      )
    }

    const proveedor = await prisma.proveedor.create({
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

    return NextResponse.json(proveedor, { status: 201 })
  } catch (error) {
    console.error('Error creating proveedor:', error)
    return NextResponse.json(
      { error: 'Error al crear proveedor' },
      { status: 500 }
    )
  }
}
