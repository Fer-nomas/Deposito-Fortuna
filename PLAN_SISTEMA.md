# Sistema de Gestión de Depósitos - Depósito Fortuna

## Documento de Planificación v1.0
**Fecha:** 2026-03-21
**Contacto:** Rolando - 0983108604

---

## 1. Visión General

Sistema web interno para gestionar el flujo completo de materiales en una fábrica de productos plásticos, desde la recepción de materia prima hasta el despacho de productos terminados para exportación a Brasil.

### Flujo productivo de la empresa

**CONCEPTOS CLAVE:**
1. Los 6 puntos son equivalentes: todos tienen stock propio, todos pueden crear productos, todos pueden enviar a cualquier otro.
2. **Todo movimiento entre puntos requiere SOLICITUD + APROBACIÓN del destino.** Nadie recibe nada que no haya aprobado.
3. Cada punto gestiona sus propios productos (Inyectora crea tappers, Producción crea cajas de temperas, etc.)
4. Nada "desaparece" — todo consumo y producción queda registrado.

```
┌──────────────────────────────────────────────────────────────┐
│                    RED DE 6 PUNTOS DE STOCK                  │
│                  (cualquiera ↔ cualquiera)                   │
│                  TODO movimiento por SOLICITUD                │
│                  El DESTINO aprueba para recibir              │
│                                                              │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│   │  DEPÓSITO 1 │◄───►│  INYECTORA  │◄───►│  DEPÓSITO 2 │   │
│   │  Mat. Prima  │     │  Crea:      │     │  Semi-term.  │   │
│   │  Crea: resinas│     │  tappers,   │     │  Almacena    │   │
│   │  pigmentos   │     │  piezas     │     │  tappers,    │   │
│   │              │     │  plásticas  │     │  temperas    │   │
│   └──────┬───┬──┘     └──────┬──────┘     └───┬────┬────┘   │
│          │   │               │                 │    │         │
│          │   └───────────────┼─────────────────┘    │         │
│          │                   │                      │         │
│   ┌──────┴──────┐     ┌─────┴───────┐     ┌───────┴─────┐   │
│   │  DEPÓSITO 4 │◄───►│ PRODUCCIÓN  │◄───►│  DEPÓSITO 3 │   │
│   │  Insumos/   │     │  Crea:      │     │  Prod.       │   │
│   │  Varios     │     │  cajas de   │     │  Finales     │   │
│   │  Herramient.│     │  temperas,  │     │  Listos p/   │   │
│   │             │     │  prod.final │     │  exportación │   │
│   └─────────────┘     └─────────────┘     └──────┬──────┘   │
│                                                   │          │
└───────────────────────────────────────────────────┼──────────┘
                                                    ▼
                                            EXPORTACIÓN A BRASIL

    PROVEEDORES ───compra───► Cualquier punto (normalmente Dep1)
```

### Flujo de solicitud (REGLA: EL DEPÓSITO SIEMPRE DECIDE)

Los **4 encargados de depósito** son quienes aprueban o rechazan solicitudes. Inyectora y Producción solo solicitan.

**Caso 1: Inyectora/Producción PIDE material a un depósito**
```
INYECTORA                          DEPÓSITO 1
     │                                    │
     ├── "Necesito 100kg resina" ────────►│
     │                                    ├── Revisa, APRUEBA
     │   ◄──── Ticket de salida ─────────┤
     │   +100kg en Inyectora              │  -100kg en Dep1
    FIN                                  FIN
```

**Caso 2: Inyectora/Producción ENVÍA producto a un depósito**
```
INYECTORA                          DEPÓSITO 2
     │                                    │
     ├── "Tengo 10,000 tappers" ─────────►│
     │                                    ├── Revisa, APRUEBA
     │   -10,000 tappers de Inyectora     │  +10,000 tappers en Dep2
     │   Se genera TICKET                 │
    FIN                                  FIN
```

**Caso 3: Depósito DEVUELVE a Inyectora/Producción (ej: tappers defectuosos)**
```
DEPÓSITO 2                         INYECTORA
     │                                    │
     │  Dep2 decide enviar defectuosos    │
     │  -500 tappers de Dep2              │
     │  +500 tappers en Inyectora         │
     │  (El depósito decide, no necesita  │
     │   aprobación de Inyectora)         │
    FIN                                  FIN
```

**Resumen: ¿Quién aprueba qué?**

| Situación | Quién decide |
|-----------|-------------|
| Inyectora/Producción pide material | El **depósito** que tiene el material |
| Inyectora/Producción envía producto | El **depósito** que va a recibir |
| Depósito envía/devuelve a Inyectora/Producción | El **depósito** mismo (él decide) |
| Transferencia entre depósitos | El **depósito destino** |

### Ejemplo real del flujo completo

| Paso | Quién | Acción | Tipo | Aprueba |
|------|-------|--------|------|---------|
| 1 | Inyectora | Solicita 100kg resina a Dep1 | Solicitud de pedido | **Dep1** |
| 2 | Dep1 | Aprueba → -100kg de Dep1, +100kg en Inyectora | Ticket | — |
| 3 | Inyectora | Consume 80kg resina, produce 10,000 tappers | Consumo/Producción | — |
| 4 | Inyectora | Máquina falla, solicita 20kg más a Dep1 | Solicitud de pedido | **Dep1** |
| 5 | Dep1 | Aprueba → -20kg de Dep1, +20kg en Inyectora | Ticket | — |
| 6 | Inyectora | Consume 20kg, produce 2,500 tappers más | Consumo/Producción | — |
| 7 | Inyectora | Solicita enviar 12,500 tappers a Dep2 | Solicitud de envío | **Dep2** |
| 8 | Dep2 | Aprueba → -12,500 de Inyectora, +12,500 en Dep2 | Ticket | — |
| 9 | Inyectora | Solicita devolver 20kg resina sobrante a Dep1 | Solicitud de envío | **Dep1** |
| 10 | Dep1 | Aprueba → -20kg de Inyectora, +20kg en Dep1 | Ticket | — |
| 11 | Dep2 | Detecta 500 tappers defectuosos, los envía a Inyectora | Devolución directa | **Dep2 decide** |

**Regla:** El **depósito siempre decide**. Inyectora/Producción solo solicitan.

### Tipos de solicitud

| Tipo | Quién crea | Quién aprueba | Ejemplo |
|------|-----------|---------------|---------|
| **Pedido** | Inyectora/Producción | El **depósito** que tiene el material | Inyectora pide resina a Dep1 |
| **Envío** | Inyectora/Producción | El **depósito** que va a recibir | Inyectora envía tappers a Dep2 |
| **Transferencia** | Depósito | El **depósito destino** | Dep4 manda herramientas a Dep1 |
| **Devolución** | Depósito | El **depósito mismo** (él decide) | Dep2 devuelve tappers defectuosos a Inyectora |

---

## 2. Puntos de Stock (6 ubicaciones)

| # | Nombre | Tipo | Crea productos como | Responsable |
|---|--------|------|---------------------|-------------|
| 1 | Materia Prima | Punto de stock | Resinas, pigmentos, químicos | Encargado 1 |
| 2 | Semi-terminados | Punto de stock | Tappers, temperas, piezas almacenadas | Encargado 2 |
| 3 | Productos Finales | Punto de stock | Productos empacados para exportación | Encargado 3 |
| 4 | Insumos/Varios | Punto de stock | Herramientas, repuestos, auxiliares | Encargado 4 |
| 5 | Inyectora | Punto de stock | Tappers, piezas plásticas inyectadas | Encargado 5 |
| 6 | Producción | Punto de stock | Cajas de temperas, producto terminado | Encargado 6 |

- Cada punto tiene **su propio stock independiente**
- Cada punto **puede crear sus propios productos** (CRUD de productos)
- Cada punto **puede enviar a cualquiera de los otros 5** (siempre por solicitud)
- **Todos los 6 puntos son equivalentes** en funcionalidad

### Movimiento Consumo/Producción

Cualquier punto puede registrar transformación de materiales:

| Campo | Ejemplo |
|-------|---------|
| Materiales consumidos | 80kg resina, 2L pigmento azul |
| Productos generados | 10,000 tappers azules |
| Observación | Lote #45, máquina inyectora 2 |

Efecto: -80kg resina y -2L pigmento del stock del punto, +10,000 tappers al stock del mismo punto.

---

## 3. Módulo de Productos

### Campos del producto

| Campo | Tipo | Detalle |
|-------|------|---------|
| Código | Auto (4 dígitos) | 0001 - 9999, generado automáticamente |
| Descripción | Texto | Nombre/descripción del producto |
| Clasificación | Selector | Tóxico, No tóxico, Líquido, Sólido (kg) |
| Unidad de medida | Selector | Kg, Litros, Unidades, Cajas, Metros |
| Stock | Numérico | Por depósito (stock independiente en cada uno) |
| Costo de compra | Moneda | Precio de adquisición |
| Costo de venta | Moneda | Precio referencial de venta |
| Estado | Toggle | Activo / Inactivo |

### Clasificación con iconos/colores
- 🔴 **Tóxico** - Requiere manejo especial, alerta visual
- 🟢 **No tóxico** - Sin restricciones
- 🔵 **Líquido** - Unidad en litros
- 🟡 **Sólido (Kg)** - Unidad en kilogramos

---

## 4. Tipos de Movimiento

| # | Tipo | Efecto Stock | Descripción |
|---|------|-------------|-------------|
| 1 | **Compra** | + stock destino | Ingreso de materia prima de proveedor |
| 2 | **Entrada** | + stock | Ajuste manual de ingreso / recepción interna |
| 3 | **Salida** | - stock | Consumo aprobado (genera ticket) |
| 4 | **Transferencia** | - origen / + destino | Movimiento entre los 6 puntos de stock |
| 5 | **Devolución a proveedor** | - stock | Retorno de material defectuoso |
| 6 | **Devolución interna** | - origen / + destino | Entre cualquier punto (ej: Dep2 → Inyectora por defectos) |
| 7 | **Despacho** | - stock | Salida final para exportación a Brasil |
| 8 | **Consumo/Producción** | - insumos / + productos | **NUEVO:** Transformación de materiales en Inyectora o Producción |

### Movimiento tipo 8: Consumo/Producción (clave del sistema)

Este movimiento es exclusivo de Inyectora y Producción. Registra cuándo se **transforman** materiales en productos nuevos.

**Ejemplo:** Inyectora consume materia prima para hacer tappers

| Sección | Detalle |
|---------|---------|
| **Materiales consumidos** | 80kg resina (código 0012), 2L pigmento azul (código 0045) |
| **Productos generados** | 10,000 tappers azules (código 0089) |
| **Observación** | Lote #45, máquina inyectora 2, turno mañana |

**Efecto en stock de Inyectora:**
- -80kg resina (código 0012)
- -2L pigmento azul (código 0045)
- +10,000 tappers azules (código 0089)

Esto permite saber exactamente **cuánta materia prima se usó para cada producto**, detectar desperdicios, y tener trazabilidad completa.

### Campos de cada movimiento

| Campo | Detalle |
|-------|---------|
| Fecha | Automática + editable |
| Tipo | Selector de los 8 tipos |
| Punto de stock origen | De dónde sale (cualquiera de los 6) |
| Punto de stock destino | A dónde llega (si aplica) |
| Proveedor / Origen | Proveedor externo o área interna |
| Productos | Lista de productos con cantidades |
| Consumo (tipo 8) | Lista de materiales consumidos con cantidades |
| Producción (tipo 8) | Lista de productos generados con cantidades |
| Flete | Monto manual (costo del transporte) |
| Observación | Nota libre (obligatoria en salidas y consumo/producción) |
| Usuario | Quién registró el movimiento |
| Ticket # | Auto-generado para salidas |

---

## 5. Módulo de Solicitudes

### Flujo de solicitud

```
INYECTORA / PRODUCCIÓN              DEPÓSITO
        │                               │
        ├── Crea solicitud ────────────►│
        │   (productos + cantidades)    │
        │                               ├── Revisa solicitud
        │                               │
        │   ◄──── Aprueba / Rechaza ────┤
        │                               │
        │   Si aprobada:                │
        │   ◄──── Genera TICKET ────────┤
        │         DE SALIDA             │
        │         (descuenta stock)     │
        │                               │
        ├── Confirma recepción ────────►│
        │                               │
      FIN                             FIN
```

### Estados de solicitud
1. **Pendiente** - Creada, esperando revisión
2. **Aprobada** - Depósito aceptó, se genera ticket
3. **Rechazada** - Con motivo
4. **Entregada** - Materiales recibidos por solicitante
5. **Cancelada** - Anulada por solicitante

### Ticket de salida
Documento generado al aprobar una solicitud:
- Número correlativo (ej: TKT-2026-0001)
- Fecha y hora
- Depósito de origen
- Destino (Inyectora / Producción / otro depósito)
- Lista de productos con cantidades
- Observación de uso
- Firma/confirmación del que recibe

---

## 6. Usuarios y Roles

### Sistema de roles dinámico
Los roles se crean desde el admin (tabla `roles`), no están hardcodeados. Los permisos se asignan por rol + punto de stock. Un usuario puede estar asignado a múltiples puntos.

### Roles iniciales (demo)

| Rol | Puede aprobar | Acciones principales |
|-----|:------------:|----------------------|
| **Administrador** | ✅ | Todo: reportes, usuarios, configuración, dashboard ejecutivo |
| **Encargado** | ✅ | CRUD productos de su punto, movimientos, aprobar solicitudes, transferir |
| **Operador** | ❌ | Crear solicitudes, ver su stock, registrar consumo/producción, confirmar recepción |

### Permisos por rol

| Acción | Admin | Encargado | Operador |
|--------|:-----:|:---------:|:--------:|
| Dashboard general | ✅ | ❌ | ❌ |
| Dashboard de su punto | ✅ | ✅ | ✅ (limitado) |
| CRUD productos | ✅ | ✅ (su punto) | ❌ |
| Registrar compra | ✅ | ✅ | ❌ |
| Registrar movimientos | ✅ | ✅ | ❌ |
| Registrar consumo/producción | ✅ | ✅ | ✅ (su punto) |
| Crear solicitud | ✅ | ✅ | ✅ |
| Aprobar/rechazar solicitud | ✅ | ✅ (su punto, solo depósitos) | ❌ |
| Generar ticket | ✅ | ✅ | ❌ |
| Ver reportes | ✅ | ✅ (su punto) | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Configuración sistema | ✅ | ❌ | ❌ |

### Asignación flexible
- El admin crea puntos de stock sin límite (6, 10, 20...)
- El admin crea usuarios y los asigna a 1 o más puntos
- Cada punto tiene 1 encargado y N operadores
- Solo los puntos tipo "depósito" con `puede_aprobar = true` aprueban solicitudes

---

## 7. Pantallas del Sistema

### 7.1 Login
- Login profesional con animación de entrada
- Logo de la empresa
- Recordar sesión

### 7.2 Dashboard Administrador
- **KPIs principales** (cards animados):
  - Stock total valorizado (por depósito)
  - Movimientos del día/semana/mes
  - Solicitudes pendientes
  - Costo total en fletes del período
  - Productos con stock bajo (alerta)
  - Productos tóxicos en almacén (alerta)
- **Gráficos**:
  - Movimientos por tipo (barras)
  - Stock por depósito (donut/pie)
  - Evolución de stock en el tiempo (líneas)
  - Top 10 productos más movidos
  - Costo de compras vs fletes (comparativo)
  - Despachos mensuales (para tracking de exportación)
- **Actividad reciente**: Timeline de últimos movimientos
- **Solicitudes pendientes**: Lista rápida con acciones

### 7.3 Dashboard Encargado de Depósito
- Stock de su depósito
- Solicitudes pendientes para su depósito
- Últimos movimientos
- Alertas de stock bajo

### 7.4 Productos
- Tabla con búsqueda, filtros por clasificación y depósito
- Vista de stock en todos los depósitos
- Historial de movimientos por producto
- Alertas de stock mínimo
- Exportar a Excel/PDF

### 7.5 Movimientos
- Formulario de nuevo movimiento según tipo
- Tabla de historial con filtros (fecha, tipo, depósito, producto)
- Detalle de movimiento con ticket
- Campo de flete por movimiento
- Exportar a Excel/PDF

### 7.6 Solicitudes (vista Inyectora/Producción)
- Crear nueva solicitud
- Mis solicitudes (con estados)
- Detalle con timeline de progreso

### 7.7 Solicitudes (vista Encargado)
- Bandeja de solicitudes pendientes
- Aprobar/rechazar con observaciones
- Generar ticket de salida

### 7.8 Transferencias
- Formulario de transferencia entre depósitos
- Historial de transferencias
- Estado: En tránsito / Recibido

### 7.9 Proveedores
- CRUD de proveedores
- Historial de compras por proveedor
- Datos de contacto

### 7.10 Reportes (Administrador)
- **Stock actual** por punto de stock (6 ubicaciones) con valorización
- **Movimientos** por rango de fechas, tipo, punto de stock
- **Kardex** por producto (todas las entradas y salidas en todos los puntos)
- **Consumo por área** (cuánta materia prima consume Inyectora vs Producción)
- **Eficiencia productiva** — materia prima consumida vs productos generados (rendimiento)
- **Costos de flete** acumulados por período
- **Productos tóxicos** en inventario (reporte de seguridad)
- **Devoluciones** análisis de rechazos/defectos (cuántos tappers vuelven a Inyectora)
- **Despachos para exportación** (Depósito 3 → Brasil)
- **Rotación de inventario** por producto
- **Stock valorizado** costo total por punto de stock
- **Comparativo mensual** de entradas vs salidas
- **Solicitudes** aprobadas/rechazadas/tiempos de respuesta
- **Trazabilidad de lote** — de qué materia prima se hizo qué producto final
- **Desperdicios** — diferencia entre material solicitado y consumido real
- Todos exportables a **Excel y PDF**

### 7.11 Configuración (Admin)
- Gestión de usuarios
- Gestión de depósitos
- Parámetros generales (stock mínimo, moneda, etc.)
- Log de auditoría (quién hizo qué y cuándo)

---

## 8. Diseño y UX

### Estilo visual
- **Tema oscuro elegante** con acentos de color corporativo
- **Animaciones fluidas**: transiciones de página, entrada de cards, hover effects
- **Glassmorphism** sutil en cards y paneles
- **Sidebar colapsable** con iconos animados
- **Notificaciones en tiempo real** (solicitudes nuevas, stock bajo)
- **Responsive** aunque se use en mismo lugar (para tablets en depósito)
- **Loading skeletons** en vez de spinners
- **Micro-interacciones**: botones con feedback, toggles suaves, contadores animados

### Paleta de colores sugerida
- Fondo principal: `#0f1117` (negro azulado)
- Cards/paneles: `#1a1d27` con borde sutil
- Acento primario: `#6366f1` (indigo vibrante)
- Éxito: `#22c55e`
- Alerta: `#f59e0b`
- Peligro: `#ef4444`
- Texto: `#e2e8f0`

### Animaciones clave
- Dashboard: números que cuentan hacia arriba al cargar
- Gráficos: dibujado progresivo
- Tablas: filas que aparecen con stagger
- Sidebar: transición suave al colapsar
- Modales: scale + fade
- Notificaciones: slide desde arriba
- Tickets: efecto de "impresión"

---

## 9. Arquitectura Escalable

### Principios de diseño
- **Todo configurable, nada hardcodeado** — N depósitos, N productos, N usuarios, N clasificaciones
- **Roles y permisos dinámicos** — se crean desde el admin, no están en código
- **Tablas de catálogo** — clasificaciones, unidades, tipos de movimiento son tablas, no enums
- **Paginación server-side** — tablas con 100k+ productos sin problemas
- **Índices estratégicos** — en FK, fechas, y campos de búsqueda frecuente
- **Soft delete** — nada se borra físicamente, todo tiene campo `activo`/`deleted_at`
- **Auditoría automática** — todo cambio queda logueado con usuario, IP, antes/después
- **Multi-tenant ready** — estructura preparada para agregar `empresa_id` si se vende a otros clientes

### Stack Tecnológico

#### Frontend
- **Next.js 14+** (App Router) — SSR para carga inicial rápida, RSC para datos pesados
- **Tailwind CSS** + **Framer Motion** — diseño + animaciones profesionales
- **TanStack Table** — tablas con virtualización (renderiza 100k filas sin lag)
- **TanStack Query** — cache inteligente, invalidación, paginación infinita
- **Recharts** — gráficos interactivos con drill-down
- **React Hook Form + Zod** — formularios con validación tipada
- **Zustand** — estado global liviano (usuario, tema, notificaciones)
- **Socket.io client** — notificaciones en tiempo real

#### Backend
- **Node.js** con **Fastify** — 2-3x más rápido que Express, schema validation nativa
- **PostgreSQL 16** — JSONB para datos flexibles, particionamiento para tablas grandes
- **Prisma** — ORM con migraciones, tipado end-to-end con el frontend
- **Redis** — cache de stock en memoria (lecturas instantáneas), sesiones, rate limiting
- **Socket.io** — WebSockets para notificaciones push en tiempo real
- **JWT + Refresh tokens** — autenticación segura con rotación de tokens
- **Bull/BullMQ** — colas para tareas pesadas (reportes Excel/PDF en background)
- **Winston** — logging estructurado

#### Infraestructura
- **Docker + Docker Compose** — un comando para levantar todo
- **Nginx** — reverse proxy, SSL, compresión gzip, cache de assets
- **PostgreSQL** con backups automáticos (pg_dump cron)
- **Redis** para cache y sesiones
- Preparado para escalar a **múltiples instancias** con load balancer

### Estrategias de escalabilidad

| Problema | Solución |
|----------|---------|
| Millones de movimientos | **Particionamiento por fecha** en tabla movimientos (1 partición/mes) |
| 1,000 productos hoy, 100k+ a futuro | **Virtualización** en frontend + **paginación cursor-based** en API |
| Reportes pesados | **Colas async** — se generan en background, se notifica al usuario al terminar |
| Stock consultado constantemente | **Redis cache** — stock en memoria, se actualiza con cada movimiento |
| Búsquedas complejas | **Índices GIN** en PostgreSQL para búsqueda full-text en productos |
| N depósitos dinámicos | **Tabla `puntos_stock`** sin límite, permisos por relación user↔punto |
| N clasificaciones | **Tabla catálogo** — el admin crea las que quiera |
| Multi-empresa (futuro) | Agregar `tenant_id` a cada tabla + Row Level Security de PostgreSQL |

---

## 10. Estructura de Base de Datos

### Diagrama de relaciones

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   tenants    │────►│    users      │────►│  user_permisos   │
│  (futuro)    │     │              │     │  user↔punto_stock│
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────┴───────┐
                    ▼              ▼
             ┌────────────┐  ┌──────────────┐
             │ puntos_stock│  │ notificaciones│
             └─────┬──────┘  └──────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  ┌──────────┐ ┌────────┐ ┌────────────┐
  │stock_punto│ │productos│ │solicitudes │
  └──────────┘ └────┬───┘ └─────┬──────┘
                    │           │
                    ▼           ▼
              ┌──────────┐ ┌────────────────┐
              │movimientos│ │solicitud_detalle│
              └─────┬────┘ └────────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │movimiento_detalle │
            └──────────────────┘
```

### Tablas principales

```sql
-- ============================================
-- CATÁLOGOS (configurables desde admin)
-- ============================================

clasificaciones
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── nombre        VARCHAR(100) NOT NULL UNIQUE   -- "Tóxico", "No tóxico", "Líquido", etc.
├── color         VARCHAR(7)                     -- "#EF4444" para UI
├── icono         VARCHAR(50)                    -- "skull", "droplet", etc.
├── requiere_manejo_especial  BOOLEAN DEFAULT false
├── orden         INT DEFAULT 0                  -- para ordenar en UI
├── activo        BOOLEAN DEFAULT true
├── created_at    TIMESTAMPTZ DEFAULT NOW()
└── updated_at    TIMESTAMPTZ DEFAULT NOW()

unidades_medida
├── id            UUID PRIMARY KEY
├── nombre        VARCHAR(50) NOT NULL UNIQUE    -- "Kilogramos", "Litros", "Unidades"
├── abreviatura   VARCHAR(10) NOT NULL           -- "kg", "L", "un", "cj"
├── activo        BOOLEAN DEFAULT true
└── created_at    TIMESTAMPTZ DEFAULT NOW()

tipos_movimiento
├── id            UUID PRIMARY KEY
├── nombre        VARCHAR(100) NOT NULL          -- "Compra", "Salida", "Consumo/Producción"
├── codigo        VARCHAR(20) NOT NULL UNIQUE    -- "COMPRA", "SALIDA", "CONSUMO_PROD"
├── efecto_origen  VARCHAR(10)                   -- "SUMA", "RESTA", NULL
├── efecto_destino VARCHAR(10)                   -- "SUMA", "RESTA", NULL
├── requiere_aprobacion  BOOLEAN DEFAULT false
├── genera_ticket  BOOLEAN DEFAULT false
├── activo        BOOLEAN DEFAULT true
└── created_at    TIMESTAMPTZ DEFAULT NOW()

-- ============================================
-- CORE
-- ============================================

users
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── nombre        VARCHAR(200) NOT NULL
├── email         VARCHAR(255) NOT NULL UNIQUE
├── password_hash VARCHAR(255) NOT NULL
├── avatar_url    VARCHAR(500)
├── activo        BOOLEAN DEFAULT true
├── ultimo_login  TIMESTAMPTZ
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── updated_at    TIMESTAMPTZ DEFAULT NOW()
└── deleted_at    TIMESTAMPTZ                    -- soft delete

roles
├── id            UUID PRIMARY KEY
├── nombre        VARCHAR(100) NOT NULL UNIQUE   -- "Administrador", "Encargado Depósito", "Operador"
├── descripcion   TEXT
├── es_admin      BOOLEAN DEFAULT false
├── puede_aprobar BOOLEAN DEFAULT false          -- solo depósitos aprueban
├── puede_crear_productos BOOLEAN DEFAULT true
├── puede_ver_reportes    BOOLEAN DEFAULT false
├── puede_gestionar_usuarios BOOLEAN DEFAULT false
└── created_at    TIMESTAMPTZ DEFAULT NOW()

user_roles
├── id            UUID PRIMARY KEY
├── user_id       UUID NOT NULL REFERENCES users(id)
├── rol_id        UUID NOT NULL REFERENCES roles(id)
└── UNIQUE(user_id, rol_id)

puntos_stock
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── nombre        VARCHAR(200) NOT NULL
├── codigo        VARCHAR(20) NOT NULL UNIQUE    -- "DEP1", "INY", "PROD", etc.
├── tipo          VARCHAR(50) NOT NULL           -- "deposito", "area_productiva"
├── descripcion   TEXT
├── ubicacion     VARCHAR(200)
├── puede_aprobar BOOLEAN DEFAULT false          -- true solo para depósitos
├── color         VARCHAR(7)                     -- para diferenciar en UI
├── icono         VARCHAR(50)
├── orden         INT DEFAULT 0
├── activo        BOOLEAN DEFAULT true
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── updated_at    TIMESTAMPTZ DEFAULT NOW()
└── deleted_at    TIMESTAMPTZ

user_punto_stock (N:N — un usuario puede estar en varios puntos)
├── id            UUID PRIMARY KEY
├── user_id       UUID NOT NULL REFERENCES users(id)
├── punto_stock_id UUID NOT NULL REFERENCES puntos_stock(id)
├── es_encargado  BOOLEAN DEFAULT false          -- el encargado principal
├── UNIQUE(user_id, punto_stock_id)
└── INDEX(punto_stock_id)

-- ============================================
-- PRODUCTOS Y STOCK
-- ============================================

productos
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── codigo        VARCHAR(10) NOT NULL UNIQUE    -- auto "0001"-"9999", expandible
├── descripcion   VARCHAR(500) NOT NULL
├── clasificacion_id UUID REFERENCES clasificaciones(id)
├── unidad_id     UUID NOT NULL REFERENCES unidades_medida(id)
├── costo_compra  DECIMAL(15,2) DEFAULT 0
├── costo_venta   DECIMAL(15,2) DEFAULT 0
├── stock_minimo  DECIMAL(15,3) DEFAULT 0        -- alerta cuando baja de esto
├── imagen_url    VARCHAR(500)
├── notas         TEXT
├── creado_por_punto_id UUID REFERENCES puntos_stock(id)  -- qué punto lo creó
├── activo        BOOLEAN DEFAULT true
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── updated_at    TIMESTAMPTZ DEFAULT NOW()
├── deleted_at    TIMESTAMPTZ
├── INDEX(clasificacion_id)
├── INDEX(creado_por_punto_id)
└── INDEX(descripcion) usando GIN para full-text search

stock_por_punto
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── producto_id   UUID NOT NULL REFERENCES productos(id)
├── punto_stock_id UUID NOT NULL REFERENCES puntos_stock(id)
├── cantidad      DECIMAL(15,3) NOT NULL DEFAULT 0  -- decimal para kg/litros
├── updated_at    TIMESTAMPTZ DEFAULT NOW()
├── UNIQUE(producto_id, punto_stock_id)
├── INDEX(punto_stock_id)
├── INDEX(producto_id)
└── CHECK(cantidad >= 0)                         -- nunca stock negativo

-- ============================================
-- PROVEEDORES
-- ============================================

proveedores
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── nombre        VARCHAR(300) NOT NULL
├── ruc           VARCHAR(20)
├── telefono      VARCHAR(50)
├── email         VARCHAR(255)
├── direccion     TEXT
├── contacto_nombre VARCHAR(200)                 -- persona de contacto
├── notas         TEXT
├── activo        BOOLEAN DEFAULT true
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── updated_at    TIMESTAMPTZ DEFAULT NOW()
└── deleted_at    TIMESTAMPTZ

-- ============================================
-- MOVIMIENTOS (tabla particionada por fecha)
-- ============================================

movimientos  PARTITION BY RANGE (fecha)
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── tipo_movimiento_id UUID NOT NULL REFERENCES tipos_movimiento(id)
├── fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW()
├── punto_origen_id  UUID REFERENCES puntos_stock(id)
├── punto_destino_id UUID REFERENCES puntos_stock(id)
├── proveedor_id  UUID REFERENCES proveedores(id)
├── flete         DECIMAL(15,2) DEFAULT 0        -- costo de flete manual
├── observacion   TEXT
├── usuario_id    UUID NOT NULL REFERENCES users(id)
├── ticket_numero VARCHAR(20) UNIQUE             -- "TKT-2026-000001"
├── solicitud_id  UUID REFERENCES solicitudes(id) -- si vino de una solicitud
├── anulado       BOOLEAN DEFAULT false
├── anulado_por   UUID REFERENCES users(id)
├── anulado_motivo TEXT
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── INDEX(tipo_movimiento_id)
├── INDEX(punto_origen_id)
├── INDEX(punto_destino_id)
├── INDEX(usuario_id)
├── INDEX(fecha)
└── INDEX(ticket_numero)

-- Particiones automáticas por mes:
-- movimientos_2026_01, movimientos_2026_02, etc.

movimiento_detalle
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── movimiento_id UUID NOT NULL REFERENCES movimientos(id) ON DELETE CASCADE
├── producto_id   UUID NOT NULL REFERENCES productos(id)
├── cantidad      DECIMAL(15,3) NOT NULL
├── costo_unitario DECIMAL(15,2) DEFAULT 0
├── subtotal      DECIMAL(15,2) GENERATED ALWAYS AS (cantidad * costo_unitario)
├── tipo_linea    VARCHAR(20) NOT NULL DEFAULT 'movimiento'
│                 -- 'movimiento' (normal), 'consumo' (se gastó), 'produccion' (se creó)
├── INDEX(movimiento_id)
└── INDEX(producto_id)

-- ============================================
-- SOLICITUDES
-- ============================================

solicitudes
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── numero        VARCHAR(20) NOT NULL UNIQUE    -- "SOL-2026-000001"
├── tipo          VARCHAR(20) NOT NULL           -- "pedido", "envio", "devolucion", "transferencia"
├── solicitante_id UUID NOT NULL REFERENCES users(id)
├── punto_origen_id UUID NOT NULL REFERENCES puntos_stock(id)  -- de dónde sale/quién pide
├── punto_destino_id UUID NOT NULL REFERENCES puntos_stock(id) -- a dónde va/quién aprueba
├── estado        VARCHAR(20) NOT NULL DEFAULT 'pendiente'
│                 -- pendiente, aprobada, rechazada, entregada, cancelada
├── prioridad     VARCHAR(10) DEFAULT 'normal'   -- baja, normal, alta, urgente
├── observacion_solicitud  TEXT
├── observacion_respuesta  TEXT
├── aprobado_por_id UUID REFERENCES users(id)
├── fecha_solicitud  TIMESTAMPTZ DEFAULT NOW()
├── fecha_respuesta  TIMESTAMPTZ
├── fecha_entrega    TIMESTAMPTZ
├── movimiento_id UUID REFERENCES movimientos(id) -- movimiento generado al aprobar
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── updated_at    TIMESTAMPTZ DEFAULT NOW()
├── INDEX(estado)
├── INDEX(punto_origen_id)
├── INDEX(punto_destino_id)
├── INDEX(solicitante_id)
└── INDEX(fecha_solicitud)

solicitud_detalle
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── solicitud_id  UUID NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE
├── producto_id   UUID NOT NULL REFERENCES productos(id)
├── cantidad_solicitada  DECIMAL(15,3) NOT NULL
├── cantidad_aprobada    DECIMAL(15,3)           -- puede ser menos de lo pedido
├── observacion   TEXT
├── INDEX(solicitud_id)
└── INDEX(producto_id)

-- ============================================
-- NOTIFICACIONES
-- ============================================

notificaciones
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── usuario_id    UUID NOT NULL REFERENCES users(id)
├── titulo        VARCHAR(200) NOT NULL
├── mensaje       TEXT
├── tipo          VARCHAR(50) NOT NULL           -- "solicitud_nueva", "aprobada", "stock_bajo", etc.
├── referencia_tipo VARCHAR(50)                  -- "solicitud", "movimiento", "producto"
├── referencia_id UUID                           -- ID del objeto relacionado
├── leida         BOOLEAN DEFAULT false
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── INDEX(usuario_id, leida)                     -- para "mis notificaciones no leídas"
└── INDEX(created_at)

-- ============================================
-- AUDITORÍA
-- ============================================

log_auditoria
├── id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
├── usuario_id    UUID REFERENCES users(id)
├── accion        VARCHAR(50) NOT NULL           -- "CREATE", "UPDATE", "DELETE", "LOGIN", "APPROVE"
├── tabla_afectada VARCHAR(100)
├── registro_id   UUID
├── datos_anteriores JSONB                       -- estado antes del cambio
├── datos_nuevos  JSONB                          -- estado después del cambio
├── ip            VARCHAR(45)                    -- IPv4 o IPv6
├── user_agent    VARCHAR(500)
├── created_at    TIMESTAMPTZ DEFAULT NOW()
├── INDEX(usuario_id)
├── INDEX(tabla_afectada, registro_id)
└── INDEX(created_at)
-- Particionada por mes igual que movimientos

-- ============================================
-- CONFIGURACIÓN
-- ============================================

configuracion
├── id            UUID PRIMARY KEY
├── clave         VARCHAR(100) NOT NULL UNIQUE   -- "moneda", "formato_ticket", "stock_alerta_email"
├── valor         JSONB NOT NULL                 -- flexible: strings, numbers, objects
├── descripcion   TEXT
└── updated_at    TIMESTAMPTZ DEFAULT NOW()
```

### Índices y performance

```sql
-- Full-text search en productos (búsqueda rápida)
CREATE INDEX idx_productos_busqueda ON productos
  USING GIN (to_tsvector('spanish', descripcion));

-- Stock bajo (para alertas del dashboard)
CREATE INDEX idx_stock_bajo ON stock_por_punto (punto_stock_id)
  WHERE cantidad <= 0;

-- Solicitudes pendientes (consulta más frecuente de encargados)
CREATE INDEX idx_solicitudes_pendientes ON solicitudes (punto_destino_id)
  WHERE estado = 'pendiente';

-- Notificaciones no leídas
CREATE INDEX idx_notificaciones_no_leidas ON notificaciones (usuario_id)
  WHERE leida = false;

-- Movimientos recientes por punto
CREATE INDEX idx_movimientos_punto_fecha ON movimientos (punto_origen_id, fecha DESC);
```

---

## 11. Fases de Desarrollo

### Fase 1 - Base (Semana 1-2)
- [ ] Setup del proyecto (frontend + backend + DB)
- [ ] Autenticación y roles
- [ ] CRUD de depósitos
- [ ] CRUD de productos con código auto-generado
- [ ] Stock por depósito
- [ ] Layout principal con sidebar y animaciones

### Fase 2 - Movimientos (Semana 3-4)
- [ ] Registro de movimientos (los 7 tipos)
- [ ] Actualización automática de stock
- [ ] Campo de flete por movimiento
- [ ] Generación de tickets de salida
- [ ] Historial de movimientos con filtros
- [ ] CRUD de proveedores

### Fase 3 - Solicitudes (Semana 5-6)
- [ ] Módulo de solicitudes (crear, listar, detalle)
- [ ] Flujo de aprobación/rechazo
- [ ] Vinculación solicitud → ticket de salida
- [ ] Notificaciones en tiempo real
- [ ] Vista diferenciada por rol

### Fase 4 - Reportes y Dashboard (Semana 7-8)
- [ ] Dashboard administrador con KPIs y gráficos
- [ ] Dashboard encargado
- [ ] Todos los reportes listados en sección 7.10
- [ ] Exportación Excel/PDF
- [ ] Kardex por producto

### Fase 5 - Pulido y Deploy (Semana 9-10)
- [ ] Animaciones y micro-interacciones
- [ ] Optimización de rendimiento
- [ ] Testing completo
- [ ] Deploy en servidor
- [ ] Capacitación a usuarios
- [ ] Documentación de uso

---

## 12. Funcionalidades Comerciales (para venta del sistema)

Estas features hacen que el sistema sea más atractivo para vender:

- **Dashboard ejecutivo** con métricas en tiempo real
- **Notificaciones push** en el navegador
- **Log de auditoría completo** (quién hizo qué y cuándo)
- **Exportación a Excel/PDF** en todos los módulos
- **Búsqueda global** (buscar cualquier producto, movimiento, solicitud)
- **Modo oscuro/claro** toggle
- **Multi-idioma** preparado (ES/PT para Brasil)
- **Alertas configurables** de stock mínimo
- **Trazabilidad completa** del producto desde materia prima hasta despacho
- **Reportes gráficos** interactivos con drill-down
- **Impresión de tickets** con diseño profesional
- **Responsive design** para uso en tablets en depósito
- **Sistema de backup** automático de base de datos

---

## Notas adicionales
- El sistema NO maneja clientes externos, es 100% interno
- La exportación es a Brasil (considerar futuro soporte para portugués)
- Todos los depósitos están en la misma ubicación física
- El flete se registra manualmente por el encargado en cada movimiento de compra
