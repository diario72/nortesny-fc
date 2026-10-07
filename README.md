# Nortesny FC

Web del equipo y panel de administración en Cloudflare Workers.

## Conexión inicial

1. Crea un repositorio privado `nortesny-fc` en GitHub.
2. Sube el contenido de esta carpeta a la raíz del repositorio, incluidos public/, scripts/ y tests/. No subas la carpeta contenedora ni el ZIP.
3. Cloudflare: Workers & Pages → nortesnyfc → Settings → Builds → Connect.
4. Conecta solo este repositorio. Rama: main. Directorio raíz: /.
5. Build command: npm run check && npm test
6. Deploy command: npm run deploy
7. Usa la autenticación de Builds que configura Cloudflare. No pegues tokens en archivos ni chats.
8. Guarda y comprueba que el primer build termine correctamente.

Se conecta el Worker existente; no se crea otro Worker ni otra base de datos.
wrangler.json conserva DATA y LOGIN_GUARD. Si tu DATA tiene otro ID, conserva el ID desplegado.
ADMIN_USERNAME y ADMIN_PASSWORD siguen siendo secretos del Worker; no van en GitHub.
Los partidos, usuarios adicionales y visitas siguen guardados en Cloudflare.
initial.json es la base de inicio, no una copia actual del almacenamiento.

## Cambios posteriores

Un commit en main activa la comprobación y el despliegue automático.
Para que el asistente publique necesita una integración de GitHub con permiso de escritura al repositorio.
Comprueba el estado en Builds: un commit no demuestra que el despliegue terminó.
El panel sigue actualizando datos sin commits ni builds.

## Desarrollo local

npm ci
npm run check
npm test
npm run dev

Para acceso local, define ADMIN_USERNAME y ADMIN_PASSWORD en .dev.vars, ignorado por Git.
El desarrollo usa almacenamiento local, sin remote: true.
No subas contraseñas, tokens, datos de visitas ni .dev.vars.

## Documentación

https://developers.cloudflare.com/workers/ci-cd/builds/
https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
