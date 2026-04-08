import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    if (tipo === 'clasificaciones') {
      const clasificaciones = await prisma.clasificacion.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' },
      })
      return NextResponse.json(clasificaciones)
    }

    if (tipo === 'unidades') {
      const unidades = await prisma.unidadMedida.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      })
      return NextResponse.json(unidades)
    }

    if (tipo === 'puntos') {
      const puntos = await prisma.puntoStock.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          nombre: true,
          codigo: true,
          tipo: true,
          color: true,
          puedeAprobar: true,
        },
      })
      return NextResponse.json(puntos)
    }

    if (tipo === 'tipos_movimiento') {
      const tipos = await prisma.tipoMovimiento.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      })
      return NextResponse.json(tipos)
    }

    return NextResponse.json({ error: 'Tipo no valido' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching catalogos:', error)
    return NextResponse.json(
      { error: 'Error al obtener catalogos' },
      { status: 500 }
    )
  }
}
