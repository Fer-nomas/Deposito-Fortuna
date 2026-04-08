import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, email, password, rolId, puntoStockId, esEncargado, activo } = body

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } })
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Ya existe un usuario con ese email' },
          { status: 400 }
        )
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updateData: any = {}
      if (nombre !== undefined) updateData.nombre = nombre.trim()
      if (email !== undefined) updateData.email = email.trim().toLowerCase()
      if (activo !== undefined) updateData.activo = activo
      if (password) {
        updateData.passwordHash = await hash(password, 12)
      }

      await tx.user.update({ where: { id }, data: updateData })

      if (rolId) {
        await tx.userRol.deleteMany({ where: { userId: id } })
        await tx.userRol.create({ data: { userId: id, rolId } })
      }

      if (puntoStockId !== undefined) {
        await tx.userPuntoStock.deleteMany({ where: { userId: id } })
        if (puntoStockId) {
          await tx.userPuntoStock.create({
            data: {
              userId: id,
              puntoStockId,
              esEncargado: esEncargado || false,
            },
          })
        }
      }

      return tx.user.findUnique({
        where: { id },
        include: {
          userRoles: { include: { rol: true } },
          userPuntos: {
            include: {
              puntoStock: {
                select: { id: true, nombre: true, codigo: true, color: true },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating usuario:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
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

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting usuario:', error)
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    )
  }
}
