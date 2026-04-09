import * as XLSX from 'xlsx'

export interface StockItemExport {
  codigo: string
  descripcion: string
  clasificacion: string | null
  cantidad: number
  unidad: string
  costoCompra: number
  valorTotal: number
  stockMinimo: number
  stockBajo: boolean
}

export interface PuntoExport {
  nombre: string
  codigo: string
  valorizado: number
  items: StockItemExport[]
}

const COLS = [
  { wch: 8 },  // Código
  { wch: 38 }, // Descripción
  { wch: 16 }, // Clasificación
  { wch: 12 }, // Cantidad
  { wch: 8 },  // Unidad
  { wch: 18 }, // Costo Unit.
  { wch: 18 }, // Valor Total
  { wch: 10 }, // Stock Mín.
  { wch: 12 }, // Estado
]

function buildSheet(punto: PuntoExport, fecha: string): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ['FORTUNA - Sistema de Gestión de Depósitos'],
    [`Depósito: ${punto.nombre} (${punto.codigo})`],
    [`Fecha de emisión: ${fecha}`],
    [],
    ['Código', 'Descripción', 'Clasificación', 'Cantidad', 'Unidad', 'Costo Unit. (₲)', 'Valor Total (₲)', 'Stock Mín.', 'Estado'],
    ...punto.items.map((i) => [
      i.codigo,
      i.descripcion,
      i.clasificacion ?? '—',
      i.cantidad,
      i.unidad,
      i.costoCompra,
      i.valorTotal,
      i.stockMinimo > 0 ? i.stockMinimo : '—',
      i.stockBajo ? 'STOCK BAJO' : 'OK',
    ]),
    [],
    ['', '', '', '', '', 'TOTAL VALORIZADO:', punto.valorizado, '', ''],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = COLS
  // Merge cabezal: filas 1-3 abarcan todas las columnas (A-I)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
  ]
  return ws
}

export function exportarDepositoExcel(punto: PuntoExport) {
  const fecha = new Date().toLocaleDateString('es-PY')
  const fechaArchivo = new Date().toISOString().split('T')[0]
  const wb = XLSX.utils.book_new()
  const ws = buildSheet(punto, fecha)
  XLSX.utils.book_append_sheet(wb, ws, punto.nombre.substring(0, 31))
  XLSX.writeFile(wb, `stock-${punto.codigo.toLowerCase()}-${fechaArchivo}.xlsx`)
}

export function exportarTodoExcel(puntos: PuntoExport[]) {
  const fecha = new Date().toLocaleDateString('es-PY')
  const fechaArchivo = new Date().toISOString().split('T')[0]
  const wb = XLSX.utils.book_new()

  // Hoja resumen
  const totalValorizado = puntos.reduce((a, p) => a + p.valorizado, 0)
  const totalProductos = puntos.reduce((a, p) => a + p.items.length, 0)
  const summaryRows: (string | number)[][] = [
    ['FORTUNA - Sistema de Gestión de Depósitos'],
    ['Resumen General de Stock'],
    [`Fecha de emisión: ${fecha}`],
    [],
    ['Depósito', 'Código', 'Total Productos', 'Valorizado (₲)'],
    ...puntos.map((p) => [p.nombre, p.codigo, p.items.length, p.valorizado]),
    [],
    ['TOTAL', '', totalProductos, totalValorizado],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 16 }, { wch: 18 }]
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
  ]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')

  // Una hoja por depósito
  for (const punto of puntos) {
    const ws = buildSheet(punto, fecha)
    XLSX.utils.book_append_sheet(wb, ws, punto.nombre.substring(0, 31))
  }

  XLSX.writeFile(wb, `stock-fortuna-${fechaArchivo}.xlsx`)
}
