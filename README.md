# Punto de Venta (POS)

Sistema POS offline para Windows — Electron + React + SQLite.

## Fase 7 (actual)

- **Reportes** con filtro por fechas (hoy, 7 y 30 días)
- Exportación **PDF** (pdfmake) y **Excel** (ExcelJS)
- Ventas del día/período, ganancias, top productos, anulaciones
- **Anular ventas** con restauración de stock

## Fase 6

- **Etiquetas** con JsBarcode (CODE128)
- Código existente o generación automática única
- Cola de impresión con copias múltiples (hasta 500)
- Impresión térmica vía `printer_labels` (Configuración)
- Asignar código generado a un producto

## Fase 5

- **Dashboard** con KPIs reales del día
- Ventas, ganancias, tickets, caja abierta/cerrada
- Top productos vendidos hoy y alertas de stock bajo
- Resumen del turno de caja actual

## Fase 4

- **Configuración**: empresa, logo, dirección
- Detección de impresoras Windows y selección ticket / etiquetas
- Ticket de prueba, sonidos on/off, tema claro/oscuro, símbolo moneda

## Fase 3

- **POS**: escáner USB, búsqueda manual, carrito, modal cantidad
- Precio menor / mayor (F3), cobro con vuelto, descuento de stock
- Ticket térmico (`electron-pos-printer`), sonidos escaneo/cobro
- Bloqueo si caja cerrada

## Fase 2

- **Caja**: apertura, cierre, ingresos, egresos, historial
- Cálculo de efectivo esperado, diferencia al cierre, ganancia de ventas
- **POS bloqueado** si la caja está cerrada
- Dashboard con estado de caja y KPIs del turno

## Fase 1

- CRUD **Categorías** y **Productos**
- Filtros de productos (búsqueda, categoría, stock bajo)
- Imágenes en `userData/images/`

## Fase 0

- Proyecto base con arquitectura modular (main / preload / renderer / shared)
- SQLite con esquema completo y montos `DECIMAL(12, 2)` (2 decimales)
- Login con usuario local único
- Tema claro / oscuro persistente

## Requisitos

- Node.js 20+
- Windows (desarrollo también posible en Linux con Electron)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Credenciales por defecto

| Campo      | Valor      |
|-----------|------------|
| Usuario   | `admin`    |
| Contraseña| `admin123` |

Cámbialas en una fase posterior desde Configuración.

## Build

```bash
npm run build
```

## Moneda

- Almacenamiento: `DECIMAL(12, 2)` en SQLite
- UI: utilidades en `src/shared/lib/currency.ts` (`formatMoney`, `roundMoney`, `parseMoneyInput`)
- Símbolo configurable: `S/` (settings `currency_symbol`)

## Estructura

```
src/main/       → DB, IPC, lógica de negocio
src/preload/    → Puente seguro window.api
src/renderer/   → React UI
src/shared/     → Tipos y utilidades compartidas
database/       → Migraciones SQL
```

## Próxima fase

**Fase 8** — Backups automáticos y restauración
# Punto_Venta_Elmer
