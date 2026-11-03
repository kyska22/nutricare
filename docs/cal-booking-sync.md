# Sincronización de reservas de Cal.com

El endpoint `POST /api/webhooks/cal` valida la firma SHA-256 de Cal.com y registra, reprograma o cancela la cita en `patient_appointments`. La reserva se asocia por el correo confirmado de la cuenta de paciente y el correo del anfitrión registrado en `nutritionists`.

## Configuración del servidor

Agrega estas variables al entorno de producción de la app:

- `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` del proyecto Supabase. Es privada y nunca debe llevar el prefijo `NEXT_PUBLIC_`.
- `CAL_WEBHOOK_SECRET`: secreto aleatorio generado para este webhook. Debe ser el mismo en Cal.com y en el hosting.

Aplica `supabase/migrations/014_cal_booking_webhook.sql` en el proyecto Supabase y despliega la app.

## Configuración de Cal.com

En el panel de Cal.com, crea un webhook para los tipos de evento `BOOKING_CREATED`, `BOOKING_RESCHEDULED` y `BOOKING_CANCELLED`.

- Subscriber URL: `https://<dominio-de-la-app>/api/webhooks/cal`
- Secret: el mismo valor configurado como `CAL_WEBHOOK_SECRET`
- Payload template: déjalo vacío para recibir el payload completo.

Cal.com firma el cuerpo con `X-Cal-Signature-256`; la app rechaza las solicitudes con firma inválida.

## Requisitos de asociación

El paciente debe reservar usando el mismo correo confirmado que usa para entrar al portal. El correo del anfitrión de Cal.com debe coincidir con el correo de esa nutricionista en `nutritionists.email`. Si esos datos no coinciden, la reserva no se asociará automáticamente.
