import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const clasificacionId = searchParams.get('clasificacionId') || ''
    const puntoStockId = searchParams.get('puntoStockId') || ''

    const skip = (page - 1) * limit

    const where: any = {
      activo: true,
    }

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (clasificacionId) {
      where.clasificacionId = clasificacionId
    }

    if (puntoStockId) {
      where.stockPorPunto = {
        some: {
          puntoStockId,
          cantidad: { gt: 0 },
        },
      }
    }

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          clasificacion: true,
          unidad: true,
          creadoPorPunto: {
            select: { id: true, nombre: true, codigo: true },
          },
          stockPorPunto: {
            include: {
              puntoStock: {
                select: { id: true, nombre: true, codigo: true, color: true },
              },
            },
          },
        },
        orderBy: { codigo: 'asc' },
        skip,
        take: limit,
      }),
      prisma.producto.count({ where }),
    ])

    const productosWithStockTotal = productos.map((p) => ({
      ...p,
      costoCompra: Number(p.costoCompra),
      costoVenta: Number(p.costoVenta),
      stockMinimo: Number(p.stockMinimo),
      stockTotal: p.stockPorPunto.reduce(
        (acc, s) => acc + Number(s.cantidad),
        0
      ),
      stockPorPunto: p.stockPorPunto.map((s) => ({
        ...s,
        cantidad: Number(s.cantidad),
      })),
    }))

    return NextResponse.json({
      productos: productosWithStockTotal,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching productos:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      descripcion,
      clasificacionId,
      unidadId,
      costoCompra,
      costoVenta,
      stockMinimo,
      creadoPorPuntoId,
      notas,
      imagenUrl,
    } = body

    // Auto-generate 4-digit code
    const lastProducto = await prisma.producto.findFirst({
      orderBy: { codigo: 'desc' },
      select: { codigo: true },
    })

    let nextCode = '0001'
    if (lastProducto) {
      const num = parseInt(lastProducto.codigo, 10)
      if (!isNaN(num)) {
        nextCode = (num + 1).toString().padStart(4, '0')
      }
    }

    const producto = await prisma.producto.create({
      data: {
        codigo: nextCode,
        descripcion,
        clasificacionId: clasificacionId || null,
        unidadId,
        costoCompra: costoCompra || 0,
        costoVenta: costoVenta || 0,
        stockMinimo: stockMinimo || 0,
        creadoPorPuntoId: creadoPorPuntoId || null,
        notas: notas || null,
        imagenUrl: imagenUrl || null,
      },
      include: {
        clasificacion: true,
        unidad: true,
        creadoPorPunto: {
          select: { id: true, nombre: true, codigo: true },
        },
        stockPorPunto: {
          include: {
            puntoStock: {
              select: { id: true, nombre: true, codigo: true, color: true },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        ...producto,
        costoCompra: Number(producto.costoCompra),
        costoVenta: Number(producto.costoVenta),
        stockMinimo: Number(producto.stockMinimo),
        stockTotal: 0,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating producto:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}
