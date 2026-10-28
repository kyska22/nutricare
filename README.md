# NutriJenhFit

## Acceso administrativo con Supabase Auth

El panel administrativo estÃ¡ protegido con Supabase Auth. Para crear el primer usuario de la nutricionista:

1. Entra al dashboard de Supabase del proyecto.
2. Ve a `Authentication` > `Users`.
3. Selecciona `Add user` > `Create new user`.
4. Ingresa el email y la contraseÃ±a de la nutricionista.
5. Confirma que `.env.local` tenga configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Luego la nutricionista puede entrar desde `/admin/login`.

El área `/admin` y la generación de invitaciones están limitadas a usuarios presentes en `public.nutritionists` o con `app_metadata.role = "nutritionist"` establecido por un proceso administrativo confiable. No asignar ese rol desde metadatos editables por el usuario ni durante el registro público de pacientes.

## Acceso de pacientes

Las rutas `/pacientes/acceso`, `/pacientes/registro` y `/pacientes/recuperar` usan Supabase Auth en el navegador. La ruta `/` exige sesión cuando Supabase está configurado y conserva la invitación al redirigir al paciente a iniciar sesión o registrarse. El guardado de evaluación verifica la sesión en el servidor y llama al RPC con el JWT autenticado, en vez de usar una llamada anónima. La contraseña se envía directamente a Supabase Auth; la aplicación no la guarda. La recuperación redirige a `/pacientes/nueva-contrasena` para guardar una contraseña nueva con Auth. Configura estas rutas en las URL permitidas de Supabase Auth y confirma que el envío de correo esté habilitado antes de ofrecer registro o recuperación.

El guardado sigue dependiendo de que la base remota tenga el RPC `submit_public_evaluation`, que acepte el flujo autenticado por invitación y asigne correctamente el paciente y la nutricionista. Esa compatibilidad no se ha probado contra Supabase remoto.

El registro crea una identidad de Auth, pero no vincula esa identidad a un registro clínico. En el esquema documentado, `anonymous_patients` tiene `id`, `patient_code` y `created_at`; `evaluations.patient_id` apunta a ese registro anónimo. El formulario recoge correo y teléfono opcionales en `personalInformation`, y el guardado actual envía la evaluación completa al RPC público. No hay una tabla/columna documentada de contacto de paciente, preferencia de contacto ni relación del paciente con `auth.users`. Por eso el acceso de pacientes a evaluaciones todavía no está habilitado.

Antes de habilitar un portal clínico se requiere diseñar y revisar un cambio de esquema que vincule de manera controlada el `auth.users.id` con el paciente y defina almacenamiento protegido para correo, teléfono con prefijo internacional y preferencia de contacto. También se deben revisar las políticas RLS de pacientes, evaluaciones y el flujo de guardado; el código de acceso por sí solo no concede ni garantiza aislamiento de datos. Esta etapa no ejecuta migraciones, SQL ni cambios en Supabase remoto.
