# Configuración de Notificaciones de Microsoft Teams

Este documento explica cómo configurar las notificaciones de Microsoft Teams para el workflow de deployment de producción.

## Prerrequisitos

- Acceso a Microsoft Teams
- Permisos para crear conectores en el canal de Teams
- Acceso a la configuración de secrets en GitHub

## 1. Configurar Webhook en Microsoft Teams

### Paso 1: Crear un Conector Webhook en Teams

1. Abre Microsoft Teams y navega al canal donde quieres recibir las notificaciones
2. Haz clic en los tres puntos (...) al lado del nombre del canal
3. Selecciona **"Conectores"** o **"Connectors"**
4. Busca **"Incoming Webhook"** y haz clic en **"Configurar"**
5. Asigna un nombre al webhook (ej: "Sleepr Production Deployments")
6. Opcionalmente, sube una imagen personalizada
7. Haz clic en **"Crear"**
8. **IMPORTANTE**: Copia la URL del webhook que se genera (la necesitarás en el siguiente paso)

### Paso 2: Configurar Secret en GitHub

1. Ve a tu repositorio en GitHub
2. Navega a **Settings > Environments**
3. Selecciona el environment **"production-chile"**
4. En la sección **Environment secrets**, haz clic en **"Add secret"**
5. Agrega un nuevo secret con:
   - **Name**: `TEAMS_WEBHOOK_URL`
   - **Value**: La URL del webhook que copiaste en el paso anterior

## 2. Tipos de Notificaciones

El workflow ahora enviará notificaciones en dos escenarios:

### ✅ Notificación de Éxito

Se envía cuando:

- El deploy del servicio se completa exitosamente
- La imagen se sube correctamente a Artifact Registry

**Información incluida:**

- Nombre del servicio desplegado
- Hash del commit
- URL de la imagen en Artifact Registry
- Usuario que ejecutó el deploy
- Enlaces directos a GitHub Actions y Artifact Registry

### ❌ Notificación de Error

Se envía cuando:

- Falla cualquier step del deployment
- Error al subir la imagen a Artifact Registry

**Información incluida:**

- Servicio que falló
- Hash del commit
- Usuario que ejecutó el deploy
- Enlace directo a los logs en GitHub Actions

## 3. Ejemplo de Notificación

Las notificaciones incluyen:

```
✅ Deploy Exitoso - Producción Chile

Servicio: auth
Ambiente: production-chile
Commit: abc123def456
Imagen: southamerica-west1-docker.pkg.dev/sleepr-chile-463202/auth/production:latest
Actor: usuario@ejemplo.com
Repositorio: floxcristian/sleepr

[Botón: Ver en GitHub] [Botón: Ver Artifact Registry]
```

## 4. Troubleshooting

### El webhook no funciona

- Verifica que la URL del webhook sea correcta
- Asegúrate de que el secret `TEAMS_WEBHOOK_URL` esté configurado en el environment correcto
- Confirma que el conector esté activo en Microsoft Teams

### No se reciben notificaciones

- Revisa los logs del workflow en GitHub Actions
- Verifica que el step de notificación se esté ejecutando
- Confirma que el canal de Teams tenga permisos para recibir webhooks

### Error en la URL de Artifact Registry

- Verifica que las variables `PROJECT_ID` y `REGISTRY` estén configuradas correctamente
- Confirma que el proyecto de GCP sea accesible

## 5. Personalización

Puedes personalizar las notificaciones modificando:

- **theme_color**: Color de la notificación (verde para éxito: `28a745`, rojo para error: `dc3545`)
- **title**: Título de la notificación
- **text**: Contenido principal del mensaje
- **sections**: Información adicional estructurada
- **actions**: Botones de acción con enlaces útiles

Para más información sobre el formato de mensajes de Teams, consulta la [documentación oficial de Microsoft Teams](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using).
