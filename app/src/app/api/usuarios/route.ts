import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'

export async function GET() {
  try {
    const usuarios = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        userRoles: {
          include: { rol: true },
        },
        userPuntos: {
          include: {
            puntoStock: {
              select: { id: true, nombre: true, codigo: true, color: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })

    const roles = await prisma.rol.findMany({ orderBy: { nombre: 'asc' } })
    const puntosStock = await prisma.puntoStock.findMany({
      where: { activo: true, deletedAt: null },
      orderBy: { orden: 'asc' },
      select: { id: true, nombre: true, codigo: true, color: true },
    })

    return NextResponse.json({
      usuarios: usuarios.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        activo: u.activo,
        ultimoLogin: u.ultimoLogin,
        createdAt: u.createdAt,
        roles: u.userRoles.map((ur) => ({
          id: ur.rol.id,
          nombre: ur.rol.nombre,
          esAdmin: ur.rol.esAdmin,
        })),
        puntosStock: u.userPuntos.map((up) => ({
          ...up.puntoStock,
          esEncargado: up.esEncargado,
        })),
      })),
      roles,
      puntosStock,
    })
  } catch (error) {
    console.error('Error fetching usuarios:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, password, rolId, puntoStockId, esEncargado } = body

    if (!nombre || !email || !password || !rolId) {
      return NextResponse.json(
        { error: 'Nombre, email, password y rol son obligatorios' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      )
    }

    const passwordHash = await hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
        },
      })

      await tx.userRol.create({
        data: {
          userId: newUser.id,
          rolId,
        },
      })

      if (puntoStockId) {
        await tx.userPuntoStock.create({
          data: {
            userId: newUser.id,
            puntoStockId,
            esEncargado: esEncargado || false,
          },
        })
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating usuario:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}
