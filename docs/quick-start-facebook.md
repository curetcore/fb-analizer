# Guía Rápida: Configurar Facebook Ads

## Pasos para obtener tu Access Token

### 1. Accede a Facebook Business Manager
Ve a [business.facebook.com](https://business.facebook.com) y accede con tu cuenta.

### 2. Ve a Events Manager
- En el menú, busca "Events Manager" o "Administrador de eventos"
- Haz clic en "Conectar orígenes de datos"

### 3. Genera un Access Token
Opción más rápida:
1. Ve a [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecciona tu App (o crea una nueva)
3. En "Permissions", añade:
   - `ads_read`
   - `ads_management` 
   - `business_management`
4. Haz clic en "Generate Access Token"
5. Copia el token generado

### 4. Configura en Easypanel
1. Ve a tu servicio backend en Easypanel
2. En "Environment", añade:
   ```
   FACEBOOK_ACCESS_TOKEN=tu_token_largo_aqui
   ```
3. Haz clic en "Deploy" para reiniciar el servicio

### 5. Verifica la configuración
1. Accede a fbads.curetcore.com/settings
2. Deberías ver "Token de Facebook: Configurado" en verde
3. Haz clic en "Sincronizar ahora"

## Solución de problemas

### "Invalid OAuth 2.0 Access Token"
- El token ha expirado o es inválido
- Genera un nuevo token siguiendo los pasos anteriores

### "Insufficient permission to access the resource"
- Asegúrate de que el token tenga los permisos correctos
- Verifica que tengas acceso a las cuentas publicitarias

### No veo mis campañas
- La primera sincronización puede tardar varios minutos
- Verifica en la página de configuración cuántas cuentas y campañas se han sincronizado

## Token de larga duración (60 días)

Para obtener un token que dure 60 días:
1. Usa el token corto que generaste
2. Visita esta URL en tu navegador:
   ```
   https://graph.facebook.com/oauth/access_token?
   client_id=TU_APP_ID&
   client_secret=TU_APP_SECRET&
   grant_type=fb_exchange_token&
   fb_exchange_token=TU_TOKEN_CORTO
   ```
3. Usa el nuevo token en la configuración

## Notas importantes
- El token expira después de 60 días
- Necesitas ser administrador de las cuentas publicitarias
- Solo se sincronizan campañas con datos en los últimos 30 días