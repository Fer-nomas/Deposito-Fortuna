export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'entregada' | 'cancelada'
export type TipoSolicitud = 'pedido' | 'envio' | 'devolucion' | 'transferencia'
export type Prioridad = 'baja' | 'normal' | 'alta' | 'urgente'
export type TipoPuntoStock = 'deposito' | 'area_productiva'
export type TipoLinea = 'movimiento' | 'consumo' | 'produccion'

export interface DashboardStats {
  stockTotal: number
  stockValorizado: number
  movimientosHoy: number
  movimientosMes: number
  solicitudesPendientes: number
  productosStockBajo: number
  fletesMes: number
  productosToxicos: number
}

export interface StockResumen {
  puntoStockId: string
  puntoStockNombre: string
  puntoStockColor: string
  totalProductos: number
  valorizado: number
}

export interface MovimientoConDetalle {
  id: string
  tipo: string
  fecha: string
  origen: string | null
  destino: string | null
  proveedor: string | null
  flete: number
  observacion: string | null
  usuario: string
  ticketNumero: string | null
  detalles: {
    producto: string
    codigo: string
    cantidad: number
    costoUnitario: number
    tipoLinea: TipoLinea
  }[]
}
