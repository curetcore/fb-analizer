-- Script para arreglar el usuario y ejecutar sincronización

-- 1. Verificar que existe el usuario admin
SELECT id, email, name, role, account_ids FROM users WHERE email = 'admin@curetcore.com';

-- 2. Actualizar contraseña del usuario admin (Curetcore2017)
UPDATE users 
SET password_hash = '$2a$10$XQxqKJBqkF8mHFQjGXKwQu2kMjYKNXBvzQoLfFcJqtqKWF9s7/zs6'
WHERE email = 'admin@curetcore.com';

-- 3. Darle acceso a todas las cuentas (por ahora darle acceso a IDs 1-10)
UPDATE users 
SET account_ids = ARRAY[1,2,3,4,5,6,7,8,9,10],
    role = 'admin'
WHERE email = 'admin@curetcore.com';

-- 4. Limpiar sesiones antiguas
DELETE FROM user_sessions WHERE user_id = (SELECT id FROM users WHERE email = 'admin@curetcore.com');

-- 5. Verificar estado actualizado
SELECT id, email, name, role, account_ids FROM users WHERE email = 'admin@curetcore.com';

-- 6. Verificar si hay cuentas sincronizadas
SELECT COUNT(*) as total_accounts FROM accounts;

-- 7. Verificar si hay campañas sincronizadas
SELECT COUNT(*) as total_campaigns FROM campaigns;

-- 8. Verificar si hay métricas sincronizadas
SELECT COUNT(*) as total_metrics FROM metrics_daily;