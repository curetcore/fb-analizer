# Configurar Token de Facebook

## Tu token:
```
EAAQGqO8VHA8BPomgZAd1u10kt4riPDDbFq558ZBBXxpsmyZCRPgzHygRufE4M3stsTUpWcCZAA0UvJyd8oF3M5eeBaWNO6evUcSuPd2qZBexlvogVUD2b8iOGH6W4RDuJMb8ZC5RoBYGbR7JNhSwTEk47pjLKqUQNZASYlo21YVhKJiMt2uFDWksyiq0ne6OrAwauQe
```

## Pasos para configurar:

### 1. En Easypanel:

1. Ve a tu servicio **backend** en Easypanel
2. En la sección "Environment Variables", añade:
   ```
   FACEBOOK_ACCESS_TOKEN=EAAQGqO8VHA8BPomgZAd1u10kt4riPDDbFq558ZBBXxpsmyZCRPgzHygRufE4M3stsTUpWcCZAA0UvJyd8oF3M5eeBaWNO6evUcSuPd2qZBexlvogVUD2b8iOGH6W4RDuJMb8ZC5RoBYGbR7JNhSwTEk47pjLKqUQNZASYlo21YVhKJiMt2uFDWksyiq0ne6OrAwauQe
   ```
3. Haz clic en "Deploy" para reiniciar el servicio

### 2. Verificar en la aplicación:

1. Ve a https://fbads.curetcore.com/settings
2. Deberías ver "Token de Facebook: Configurado" en verde
3. Haz clic en "Sincronizar ahora"

### 3. Primera sincronización:

La primera vez puede tardar varios minutos dependiendo de:
- Cantidad de cuentas publicitarias
- Número de campañas
- Historial de datos (últimos 30 días)

### 4. Monitorear el progreso:

En la página de configuración verás:
- Número de cuentas encontradas
- Campañas sincronizadas
- Últimos registros procesados

## Solución de problemas:

### Si ves "Token inválido":
- El token puede haber expirado
- Genera uno nuevo en Graph API Explorer

### Si no ves datos:
- Verifica que tienes campañas activas con datos
- Revisa los logs del backend en Easypanel

### Si ves error de permisos:
- Asegúrate de tener los permisos:
  - ads_read
  - read_insights
  - business_management

## Próximos pasos:

1. Una vez configurado, los datos reales reemplazarán los mockeados
2. La sincronización automática se ejecutará cada hora
3. Podrás ver métricas reales en el dashboard

¡Tu dashboard está listo para mostrar datos reales!