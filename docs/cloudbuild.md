- Se vuelve engorroso tener que buildear, taggear y pushear manualmente cada una de las imagenes.
- Podemos usar gcloud para configurar un pipeline CI/CD y hacer que nuestro proceso de build y deploy sea completamente automático, de modo que tengamos imagenes que se buildean automaticamente cada vez que hacemos un push o commit a nuestro repositorio.

## Migración a GitHub Actions

**¿Por qué migrar de Cloud Build a GitHub Actions?**

### Ventajas de GitHub Actions:
- ✅ **Integración nativa**: Está directamente integrado con tu repositorio de GitHub
- ✅ **Gratuito**: 2000 minutos/mes gratis para repositorios públicos, ilimitado para públicos
- ✅ **Mayor flexibilidad**: Más opciones de runners y configuraciones
- ✅ **Mejor ecosistema**: Miles de actions predefinidas en el marketplace
- ✅ **Configuración más sencilla**: No requiere configurar triggers externos
- ✅ **Mejor debugging**: Logs más claros y interfaz más amigable
- ✅ **Matrix builds**: Fácil construcción paralela de múltiples servicios

### Configuración del Workflow

El archivo `.github/workflows/deploy.yml` automatiza:

1. **Build paralelo** de las 4 imágenes Docker (reservation, auth, notification, payment)
2. **Push automático** a Google Cloud Artifact Registry
3. **Autenticación** con service account de GCP
4. **Verificación** del deployment

### Configuración requerida:

1. **Service Account de GCP**: Crear un service account con permisos para Artifact Registry
2. **Secret en GitHub**: Agregar la clave JSON del service account como `GCP_SA_KEY`

## 🔐 ¿Qué es un Service Account?

**❌ NO es tu cuenta personal de Google Cloud**
- Tu cuenta personal (ej: `tucorreo@gmail.com`) tiene permisos de administrador
- **NUNCA uses tu cuenta personal en CI/CD** por seguridad

**✅ ES una cuenta especial para aplicaciones/servicios**
- Es un "robot" o "usuario técnico" con permisos específicos y limitados
- Email formato: `github-actions-sa@tu-proyecto.iam.gserviceaccount.com`
- Solo tiene los permisos mínimos necesarios (principio de menor privilegio)

### 🎯 ¿Por qué usar Service Account?

| Aspecto | Cuenta Personal | Service Account |
|---------|----------------|-----------------|
| **Seguridad** | ❌ Acceso completo a GCP | ✅ Solo permisos específicos |
| **Auditoría** | ❌ Difícil rastrear acciones automatizadas | ✅ Fácil identificar acciones de CI/CD |
| **Rotación** | ❌ Cambiar afecta todo tu acceso | ✅ Revocar solo afecta el CI/CD |
| **Buenas prácticas** | ❌ Viola principios de seguridad | ✅ Estándar de la industria |

### 🛡️ Permisos del Service Account

El Service Account **SOLO** tendrá este permiso:
```bash
roles/artifactregistry.writer
```

**Esto le permite únicamente:**
- ✅ Subir imágenes Docker a Artifact Registry
- ✅ Autenticarse con Docker

**NO puede hacer:**
- ❌ Crear/eliminar proyectos de GCP
- ❌ Acceder a otras partes de GCP (Compute Engine, Storage, etc.)
- ❌ Ver billing o configuraciones del proyecto
- ❌ Modificar IAM o permisos

### Configuración paso a paso:

#### 1. Crear Service Account en Google Cloud

> 💡 **Nota importante**: Usarás tu cuenta personal para CREAR el Service Account, pero GitHub Actions usará las credenciales del Service Account (no las tuyas).

```bash
# 1. Asegúrate de estar logueado con tu cuenta personal y tener el proyecto correcto
gcloud auth list
gcloud config get-value project

# 2. Crear service account (usuario técnico para GitHub Actions)
gcloud iam service-accounts create github-actions-sa \
    --description="Service Account for GitHub Actions CI/CD" \
    --display-name="GitHub Actions SA"

# 3. Obtener el email del service account recién creado
export SA_EMAIL=$(gcloud iam service-accounts list \
    --filter="displayName:GitHub Actions SA" \
    --format="value(email)")

# 4. Verificar que se creó correctamente
echo "Service Account email: $SA_EMAIL"

# 5. Asignar ÚNICAMENTE el permiso mínimo necesario
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer"

# 6. Crear y descargar la clave JSON (credenciales para GitHub)
gcloud iam service-accounts keys create github-sa-key.json \
    --iam-account=$SA_EMAIL

# 7. Verificar que el archivo se creó
ls -la github-sa-key.json
```

**⚠️ Importante**: 
- El archivo `github-sa-key.json` contiene credenciales sensibles
- **NO lo subas al repositorio**
- Úsalo solo para configurar el secret en GitHub
- Bórralo después de configurar el secret

#### 2. Configurar Secrets en GitHub

> 🔐 **Objetivo**: GitHub Actions necesita las credenciales del Service Account para autenticarse con GCP

**Pasos en GitHub:**

1. **Ve a tu repositorio en GitHub**
2. **Settings** → **Secrets and variables** → **Actions**
3. **Click en "New repository secret"**
4. **Configurar el secret:**
   - **Name**: `GCP_SA_KEY`
   - **Value**: Contenido completo del archivo `github-sa-key.json`

**💡 Cómo copiar el contenido del JSON:**

```bash
# En Windows (PowerShell):
Get-Content github-sa-key.json | Set-Clipboard

# En Mac/Linux:
cat github-sa-key.json | pbcopy  # Mac
cat github-sa-key.json | xclip   # Linux
```

**Después de configurar:**
```bash
# Eliminar el archivo local por seguridad
rm github-sa-key.json
```

**✅ Verificación**: En GitHub, deberías ver el secret `GCP_SA_KEY` listado (el valor se oculta automáticamente).

#### 3. Personalizar el workflow

Si tu proyecto tiene diferentes nombres o configuraciones, puedes modificar estas variables en `.github/workflows/deploy.yml`:

```yaml
env:
  PROJECT_ID: tu-proyecto-id        # Cambiar por tu Project ID
  GAR_LOCATION: us-east4           # Cambiar región si es diferente
  REGISTRY: us-east4-docker.pkg.dev
```

#### 4. Verificar que los repositorios existen en Artifact Registry

```bash
# Listar repositorios existentes
gcloud artifacts repositories list

# Crear repositorios si no existen (ejecutar para cada servicio)
for service in reservation auth notification payment; do
  gcloud artifacts repositories create $service \
    --repository-format=docker \
    --location=$GAR_LOCATION \
    --description="Docker repository for $service service"
done
```

### Workflow Features:

- **✅ Builds paralelos**: Usa matrix strategy para construir los 4 servicios simultáneamente
- **✅ Cache inteligente**: Docker Buildx optimiza las capas de imagen
- **✅ Trigger flexible**: Se ejecuta en push a main/master y en pull requests
- **✅ Verificación automática**: Confirma que las imágenes se subieron correctamente
- **✅ Logs detallados**: Fácil debugging en caso de errores

### Ventajas adicionales:

1. **No más comandos manuales**: Adiós a `docker build`, `docker tag`, `docker push`
2. **Rollback fácil**: Cada commit genera una imagen etiquetada
3. **Testing automático**: Puedes agregar steps de pruebas antes del build
4. **Notificaciones**: GitHub notifica automáticamente si el deployment falla

### Comparación con Cloud Build:

| Aspecto | Cloud Build | GitHub Actions |
|---------|------------|----------------|
| Configuración | Más compleja | Más simple |
| Integración | Externa | Nativa |
| Costo | Pago por uso | 2000 min gratis |
| Debugging | Básico | Excelente |
| Paralelización | Manual | Automática (matrix) |
| Ecosystem | Limitado | Marketplace gigante |
| Secrets Management | Cloud Secret Manager | GitHub Secrets (nativo) |