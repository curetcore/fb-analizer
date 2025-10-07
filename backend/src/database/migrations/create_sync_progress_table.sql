-- Tabla para rastrear el progreso de sincronización
CREATE TABLE IF NOT EXISTS sync_progress (
  id INTEGER PRIMARY KEY DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'idle', -- idle, running, completed, failed
  total_steps INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  current_task TEXT,
  percentage INTEGER DEFAULT 0,
  details JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Solo permitir un registro de progreso
ALTER TABLE sync_progress ADD CONSTRAINT single_row CHECK (id = 1);

-- Insertar el registro inicial
INSERT INTO sync_progress (id, status) VALUES (1, 'idle') ON CONFLICT (id) DO NOTHING;