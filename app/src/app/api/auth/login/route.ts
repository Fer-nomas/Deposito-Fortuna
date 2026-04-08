import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'deposito-fortuna-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        userRoles: {
          include: {
            rol: true,
          },
        },
        userPuntos: {
          include: {
            puntoStock: true,
          },
        },
      },
    })

    if (!user || !user.activo) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const passwordValid = await compare(password, user.passwordHash)

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date() },
    })

    const roles = user.userRoles.map((ur) => ur.rol.nombre)
    const esAdmin = user.userRoles.some((ur) => ur.rol.esAdmin)
    const puntosStock = user.userPuntos.map((up) => ({
      id: up.puntoStock.id,
      nombre: up.puntoStock.nombre,
      codigo: up.puntoStock.codigo,
      esEncargado: up.esEncargado,
      puedeAprobar: up.puntoStock.puedeAprobar,
    }))

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles,
      esAdmin,
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' })

    const userData = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      roles,
      puntosStock,
      esAdmin,
    }

    const response = NextResponse.json({
      token,
      user: userData,
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
