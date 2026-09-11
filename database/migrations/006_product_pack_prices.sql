-- Empaques de venta: docena (12 und.), plancha y cajón (cantidad configurable)
-- stock_quantity: unidades reales descontadas del inventario (puede diferir de quantity del ticket)

ALTER TABLE products ADD COLUMN price_dozen DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN plancha_qty REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN price_plancha DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN cajon_qty REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN price_cajon DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE sale_items ADD COLUMN stock_quantity REAL;
UPDATE sale_items SET stock_quantity = quantity WHERE stock_quantity IS NULL;
