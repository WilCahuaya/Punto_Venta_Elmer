-- Tamaño de etiqueta por producto en el historial (lotes mixtos en A4)

ALTER TABLE label_print_job_items ADD COLUMN preset_id TEXT;
ALTER TABLE label_print_job_items ADD COLUMN width_mm REAL;
ALTER TABLE label_print_job_items ADD COLUMN height_mm REAL;
