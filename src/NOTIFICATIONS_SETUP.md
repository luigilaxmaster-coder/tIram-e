# Notifications Setup Guide

Este documento explica cómo configurar las notificaciones automáticas de email y WhatsApp para las reservas de citas.

## 📋 Descripción General

El sistema ahora envía automáticamente:
1. **Email de confirmación** - Inmediatamente después de crear la cita
2. **Mensaje de WhatsApp** - Inmediatamente después de crear la cita (si el proveedor tiene número de WhatsApp)
3. **Recordatorio por email 24h** - 24 horas antes de la cita
4. **Recordatorio por email 2h** - 2 horas antes de la cita

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Necesitas agregar la siguiente variable de entorno a tu archivo `.env` o configuración de Wix:

```
WIX_API_KEY=your_wix_api_key_here
```

Para obtener tu API Key de Wix:
1. Ve a tu dashboard de Wix
2. Dirígete a Settings → API & Extensions
3. Crea una nueva API Key con permisos para:
   - Contacts (Email)
   - Contacts (WhatsApp)
4. Copia la clave y agrégala a tu configuración

### 2. Configuración de Email

El sistema usa la API de Wix para enviar emails. Asegúrate de que:
- Tu cuenta de Wix tiene un dominio de email configurado
- Los emails se enviarán desde tu dirección de email de Wix

### 3. Configuración de WhatsApp

Para enviar mensajes de WhatsApp:
1. Conecta tu cuenta de WhatsApp Business a Wix
2. Verifica que el número de WhatsApp esté configurado en el perfil del proveedor
3. El sistema enviará mensajes automáticamente a ese número

## 📁 Archivos Modificados

### `/src/backend/notifications.ts` (NUEVO)
Contiene todas las funciones de notificación:
- `sendConfirmationNotifications()` - Envía email y WhatsApp de confirmación
- `sendConfirmationEmail()` - Envía email de confirmación detallado
- `sendWhatsAppMessage()` - Envía mensaje de WhatsApp
- `sendReminderEmail()` - Envía recordatorios por email

### `/src/backend/appointments.ts` (MODIFICADO)
- Ahora importa `sendConfirmationNotifications`
- Llama automáticamente a `sendConfirmationNotifications()` después de crear una cita
- Obtiene datos del proveedor para incluir en las notificaciones

### `/src/backend/jobs.ts` (ACTUALIZADO)
Contiene trabajos programados para enviar recordatorios:
- `sendReminder24hEmails()` - Envía recordatorios 24h antes
- `sendReminder2hEmails()` - Envía recordatorios 2h antes

## 🚀 Cómo Funciona

### Flujo de Confirmación (Inmediato)

```
Usuario crea cita
    ↓
createAppointment() es llamado
    ↓
Se crea la cita en la base de datos
    ↓
sendConfirmationNotifications() es llamado
    ↓
Se envía email de confirmación
    ↓
Se envía mensaje de WhatsApp (si aplica)
    ↓
Respuesta de éxito al usuario
```

### Flujo de Recordatorios (Programado)

Los recordatorios deben ser enviados por un job programado (cron job):

```
Job se ejecuta cada hora
    ↓
Busca citas que necesitan recordatorio 24h
    ↓
Si la cita está a ~24h, envía email
    ↓
Marca la cita como "reminder24hSent"
    ↓
Repite para recordatorio 2h
```

## 📧 Contenido de Emails

### Email de Confirmación
Incluye:
- Detalles del servicio
- Información del proveedor
- Fecha y hora de la cita
- Información del cliente
- Notas del cliente (si las hay)
- Información de contacto del proveedor

### Email de Recordatorio
Incluye:
- Tipo de recordatorio (24h o 2h)
- Detalles de la cita
- Información de contacto del proveedor

## 💬 Contenido de WhatsApp

El mensaje de WhatsApp incluye:
- Saludo personalizado
- Detalles del servicio
- Información del proveedor
- Fecha y hora
- Duración y precio
- Confirmación de recordatorio

## ⚙️ Configuración de Jobs Programados

Para que los recordatorios funcionen, necesitas configurar un cron job que ejecute los trabajos periódicamente.

### Opción 1: Usando Wix Scheduler

```typescript
// En tu código de Wix
import { sendReminder24hEmails, sendReminder2hEmails } from '@/backend/jobs';

// Ejecutar cada hora
export async function hourlyReminders() {
  await sendReminder24hEmails();
  await sendReminder2hEmails();
}
```

### Opción 2: Usando un servicio externo

Puedes usar servicios como:
- AWS Lambda
- Google Cloud Functions
- Heroku Scheduler
- EasyCron

Configura una llamada HTTP POST a tu endpoint cada hora:
```
POST /api/jobs/send-reminders
```

## 🧪 Pruebas

Para probar las notificaciones:

1. **Crear una cita de prueba**
   - Ve a la página pública del proveedor
   - Completa el formulario de reserva
   - Deberías recibir un email de confirmación

2. **Verificar logs**
   - Revisa la consola del servidor para ver los logs de notificaciones
   - Busca mensajes como "Confirmation email sent to:"

3. **Probar WhatsApp**
   - Asegúrate de que el proveedor tiene un número de WhatsApp configurado
   - Crea una cita y verifica que se envíe el mensaje

## 🐛 Solución de Problemas

### No se envían emails
- Verifica que `WIX_API_KEY` esté configurada correctamente
- Revisa los logs del servidor para errores
- Asegúrate de que el email del cliente es válido

### No se envían mensajes de WhatsApp
- Verifica que el proveedor tiene un número de WhatsApp configurado
- Asegúrate de que la cuenta de WhatsApp Business está conectada a Wix
- Revisa los logs para errores de API

### Los recordatorios no se envían
- Verifica que el cron job está ejecutándose
- Revisa los logs del job programado
- Asegúrate de que las citas tienen `reminder24hSent` y `reminder2hSent` en false

## 📝 Notas Importantes

1. **Errores no bloqueantes**: Si falla el envío de notificaciones, la cita se crea de todas formas. Esto evita que los usuarios pierdan sus reservas.

2. **Validación de email**: El sistema valida que el email sea válido antes de enviar.

3. **Zona horaria**: Los recordatorios se basan en la zona horaria del servidor. Asegúrate de que esté configurada correctamente.

4. **Límites de API**: Ten en cuenta los límites de la API de Wix para envío de emails y WhatsApp.

## 🔐 Seguridad

- Nunca expongas tu `WIX_API_KEY` en el código del cliente
- Usa variables de entorno para almacenar claves sensibles
- Valida todos los datos de entrada antes de enviar notificaciones

## 📞 Soporte

Si tienes problemas con las notificaciones:
1. Revisa los logs del servidor
2. Verifica la configuración de API Key
3. Asegúrate de que los datos del proveedor están completos
4. Contacta al soporte de Wix si hay problemas con la API
