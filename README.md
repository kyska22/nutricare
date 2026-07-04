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
