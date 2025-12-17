# Google Calendar Integration Setup

Este documento describe cómo configurar la integración de Google Calendar para la plataforma 'tirame'.

## 📋 Requisitos Previos

1. Una cuenta de Google Cloud Console
2. Acceso a crear aplicaciones OAuth en Google Cloud
3. Variables de entorno configuradas en tu proyecto Wix

## 🔧 Pasos de Configuración

### 1. Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google Calendar:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Calendar API"
   - Haz clic en "Enable"

### 2. Crear Credenciales OAuth 2.0

1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth client ID"
3. Si es la primera vez, configura la pantalla de consentimiento:
   - Selecciona "External" como tipo de usuario
   - Completa la información requerida
   - Agrega los scopes: `https://www.googleapis.com/auth/calendar`
4. Crea el cliente OAuth:
   - Tipo: "Web application"
   - Nombre: "tirame Google Calendar"
   - URIs autorizados de JavaScript: 
     - `https://tu-dominio.com`
     - `http://localhost:3000` (para desarrollo)
   - URIs de redirección autorizados:
     - `https://tu-dominio.com/api/auth/google-callback`
     - `http://localhost:3000/api/auth/google-callback` (para desarrollo)

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env` o en la configuración de Wix:

```env
PUBLIC_GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
```

**Nota**: 
- `PUBLIC_GOOGLE_CLIENT_ID` es público (puede estar en el cliente)
- `GOOGLE_CLIENT_SECRET` debe ser privado (solo en el servidor)

### 4. Agregar Campos a la Colección de Providers

En Wix CMS, asegúrate de que la colección `providers` tenga el siguiente campo:

- **Campo**: `googleCalendarData`
- **Tipo**: Text
- **Descripción**: Almacena la configuración de Google Calendar (JSON)

### 5. Agregar Campos a la Colección de Appointments

En Wix CMS, asegúrate de que la colección `appointments` tenga el siguiente campo:

- **Campo**: `googleCalendarEventId`
- **Tipo**: Text
- **Descripción**: ID del evento en Google Calendar

## 🔄 Flujo de Integración

### Conexión de Google Calendar

1. El proveedor hace clic en "Connect Google Calendar" en el dashboard
2. Se redirige a Google para autorizar la aplicación
3. Google redirige de vuelta a `/api/auth/google-callback`
4. El endpoint intercambia el código de autorización por tokens
5. Se guarda la configuración en la base de datos
6. El proveedor es redirigido al dashboard con un mensaje de éxito

### Sincronización de Citas

1. Un cliente reserva a través de la página pública (`/p/:slug`)
2. Se crea la cita en la base de datos
3. Si el proveedor tiene Google Calendar conectado:
   - Se crea automáticamente un evento en Google Calendar
   - Se guarda el ID del evento en la cita
4. Se envían notificaciones (email y WhatsApp)

## 🛡️ Seguridad

### Token Management

- Los tokens se almacenan en la base de datos de forma segura
- El `refreshToken` se usa para renovar el `accessToken` cuando expira
- Los tokens expiran después de 1 hora (Google estándar)

### State Parameter

- Se usa un parámetro `state` para prevenir ataques CSRF
- El estado incluye el `providerId` y un timestamp
- El timestamp se valida (máximo 10 minutos de antigüedad)

### Scopes

- Solo se solicita el scope `https://www.googleapis.com/auth/calendar`
- Esto permite crear, leer y actualizar eventos de calendario
- No se solicitan permisos adicionales innecesarios

## 🐛 Troubleshooting

### "Missing Google OAuth credentials in environment"

**Solución**: Verifica que las variables de entorno estén configuradas correctamente en Wix.

### "Failed to exchange authorization code"

**Solución**: 
- Verifica que el `GOOGLE_CLIENT_SECRET` sea correcto
- Asegúrate de que el `redirectUri` coincida exactamente con lo configurado en Google Cloud

### "Failed to fetch calendar information"

**Solución**:
- Verifica que el token de acceso sea válido
- Asegúrate de que la API de Google Calendar esté habilitada

### El evento no aparece en Google Calendar

**Solución**:
- Verifica que el proveedor tenga Google Calendar conectado
- Revisa los logs del servidor para errores
- Asegúrate de que la cita tenga un `startAt` y `endAt` válidos

## 📚 Recursos Adicionales

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Astro API Routes Documentation](https://docs.astro.build/en/guides/endpoints/)

## 🔄 Renovación de Tokens

Actualmente, la renovación de tokens se maneja de forma manual. Para implementar renovación automática:

1. Crea un job que se ejecute periódicamente
2. Verifica si los tokens están próximos a expirar
3. Usa el `refreshToken` para obtener nuevos tokens
4. Actualiza la configuración en la base de datos

Ejemplo:

```typescript
export async function refreshGoogleCalendarToken(providerId: string): Promise<void> {
  const config = await getGoogleCalendarConfig(providerId);
  if (!config || !config.refreshToken) return;

  if (config.expiresAt > Date.now() + 5 * 60 * 1000) {
    // Token still valid for more than 5 minutes
    return;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const tokens = await response.json();
  await saveGoogleCalendarConfig(providerId, {
    accessToken: tokens.access_token,
    refreshToken: config.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    calendarId: config.calendarId,
  });
}
```

## ✅ Checklist de Configuración

- [ ] Proyecto creado en Google Cloud Console
- [ ] API de Google Calendar habilitada
- [ ] Credenciales OAuth 2.0 creadas
- [ ] Variables de entorno configuradas en Wix
- [ ] Campo `googleCalendarData` agregado a `providers`
- [ ] Campo `googleCalendarEventId` agregado a `appointments`
- [ ] URIs de redirección configuradas en Google Cloud
- [ ] Endpoint `/api/auth/google-callback` desplegado
- [ ] Pruebas realizadas en desarrollo
- [ ] Pruebas realizadas en producción
