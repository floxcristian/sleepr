# 🚀 Guía de GitHub Actions - Multi-País y Multi-Ambiente

> ⚠️ **NOTA IMPORTANTE**: Esta guía ha sido actualizada y migrada a una versión más completa.
>
> **📖 Nueva Guía Recomendada**: [`github-actions-multi-environment-guide.md`](./github-actions-multi-environment-guide.md)
>
> La nueva guía incluye:
>
> - ✅ Configuración completa de environments por país
> - ✅ Variables y secrets específicos por ambiente
> - ✅ Workflows de producción (GCP) y desarrollo (On-Premise)
> - ✅ Troubleshooting detallado y mejores prácticas
> - ✅ Monitoreo y verificación paso a paso
>
> Esta guía se mantiene para referencia histórica, pero recomendamos usar la nueva.

---

## 📖 Introducción (Versión Original)

Esta es la guía original para configurar workflows de GitHub Actions que permiten hacer deploy automático de microservicios para múltiples países (Chile, Perú, España) en diferentes ambientes.

- **🏭 Producción**: Deploy a Google Cloud Platform (GCP) con Artifact Registry
- **🔧 Desarrollo**: Deploy a infraestructura On-Premise

### 🎯 ¿Qué lograremos?

- ✅ Deploy automático de **producción** cuando se hace push a `main`
- ✅ Deploy automático de **desarrollo** cuando se hace push a `develop`
- ✅ Validación en Pull Requests sin deploy
- ✅ Deploy manual a países específicos por ambiente
- ✅ Imágenes Docker separadas por país, servicio y ambiente
- ✅ Configuración segura con secrets y variables por ambiente

---

## 🏗️ Arquitectura de los Workflows

### 📊 Estructura de Ambientes

| Ambiente       | Infraestructura       | Branch    | Países              | Workflow                 |
| -------------- | --------------------- | --------- | ------------------- | ------------------------ |
| **Producción** | Google Cloud Platform | `main`    | Chile, Perú, España | `deploy-production.yml`  |
| **Desarrollo** | On-Premise            | `develop` | Chile, Perú, España | `deploy-development.yml` |

### 📊 Matrix Strategy (Países × Servicios × Ambientes)

Cada workflow ejecuta un job para cada combinación de:

- **Países**: Chile, Perú, España
- **Servicios**: reservation, auth, notification, payment
- **Ambiente**: Producción O Desarrollo (workflows separados)

**Total por ambiente**: 12 jobs en paralelo (3 países × 4 servicios)

### 🖼️ Resultado Final

#### **Producción (GCP)**

Deploy a Google Cloud Platform con imágenes como:

```
southamerica-west1-docker.pkg.dev/sleepr-chile-463202/auth/production:latest
southamerica-east1-docker.pkg.dev/sleepr-peru-463202/reservation/production:v1.2.3
europe-west1-docker.pkg.dev/sleepr-spain-463202/payment/production:latest
```

#### **Desarrollo (On-Premise)**

Deploy a servidores locales con imágenes como:

```
registry.sleepr-dev.local/chile/auth/development:latest
registry.sleepr-dev.local/peru/reservation/development:v1.2.3
registry.sleepr-dev.local/spain/payment/development:latest
```

---

## 📋 Requisitos Previos

### 🏭 Para Ambiente de Producción (GCP)

#### 1. 🌐 Proyectos de Google Cloud

Debes tener **3 proyectos** separados en GCP:

- `sleepr-chile-463202` (Chile)
- `sleepr-peru-463202` (Perú)
- `sleepr-spain-463202` (España)

#### 2. 🐳 Artifact Registry

En cada proyecto GCP, crear repositories para cada servicio:

```bash
# Chile (región: southamerica-west1)
gcloud artifacts repositories create auth --repository-format=docker --location=southamerica-west1
gcloud artifacts repositories create reservation --repository-format=docker --location=southamerica-west1
gcloud artifacts repositories create notification --repository-format=docker --location=southamerica-west1
gcloud artifacts repositories create payment --repository-format=docker --location=southamerica-west1

# Perú (región: southamerica-east1)
gcloud artifacts repositories create auth --repository-format=docker --location=southamerica-east1
gcloud artifacts repositories create reservation --repository-format=docker --location=southamerica-east1
gcloud artifacts repositories create notification --repository-format=docker --location=southamerica-east1
gcloud artifacts repositories create payment --repository-format=docker --location=southamerica-east1

# España (región: europe-west1)
gcloud artifacts repositories create auth --repository-format=docker --location=europe-west1
gcloud artifacts repositories create reservation --repository-format=docker --location=europe-west1
gcloud artifacts repositories create notification --repository-format=docker --location=europe-west1
gcloud artifacts repositories create payment --repository-format=docker --location=europe-west1
```

#### 3. 🔐 Workload Identity Federation

Para cada país, seguir la [guía de Workload Identity](./official-docs/ci-cd/authenticate-gcloud-from-github-actions.md) para configurar:

- Workload Identity Pool
- Workload Identity Provider
- Service Account
- Permisos IAM

### 🔧 Para Ambiente de Desarrollo (On-Premise)

#### 1. 🖥️ Servidores On-Premise

Debes tener servidores configurados para cada país:

- Servidor de desarrollo Chile
- Servidor de desarrollo Perú
- Servidor de desarrollo España

#### 2. 🔗 Conectividad

- **SSH/VPN**: Acceso desde GitHub Actions a servidores
- **Docker Registry Local**: Registry privado para imágenes de desarrollo
- **Networking**: Conectividad entre GitHub Actions y servidores

#### 3. 🔐 Autenticación

- **SSH Keys**: Para conexión a servidores
- **Registry Credentials**: Para push/pull de imágenes
- **Deployment Credentials**: Para aplicaciones en servidores

---

## 🔧 Configuración en GitHub

### Paso 1: Crear Environments

Los **Environments** en GitHub te permiten tener configuraciones separadas por país.

#### 1.1 Acceder a Environments

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (pestaña arriba)
3. En el menú izquierdo, click en **Environments**
4. Click en **New environment**

#### 1.2 Crear Environment "chile"

1. Nombre: `chile`
2. Click **Configure environment**
3. (Opcional) Agregar **Required reviewers** si quieres aprobación manual
4. (Opcional) Configurar **Deployment branches** para restringir ramas

#### 1.3 Repetir para otros países

Crear environments:

- `peru`
- `spain`

---

### Paso 2: Configurar Variables por Environment

Las **Variables** son valores de configuración no sensibles (regiones, URLs, etc.).

#### 2.1 Variables para Chile

1. Ve a **Settings** → **Environments** → **chile**
2. En la sección **Environment variables**, click **Add variable**
3. Agregar estas variables:

| Name           | Value                               |
| -------------- | ----------------------------------- |
| `PROJECT_ID`   | `sleepr-chile-463202`               |
| `REGISTRY`     | `southamerica-west1-docker.pkg.dev` |
| `GAR_LOCATION` | `southamerica-west1`                |

#### 2.2 Variables para Perú

Environment: **peru**

| Name           | Value                               |
| -------------- | ----------------------------------- |
| `PROJECT_ID`   | `sleepr-peru-463202`                |
| `REGISTRY`     | `southamerica-east1-docker.pkg.dev` |
| `GAR_LOCATION` | `southamerica-east1`                |

#### 2.3 Variables para España

Environment: **spain**

| Name           | Value                         |
| -------------- | ----------------------------- |
| `PROJECT_ID`   | `sleepr-spain-463202`         |
| `REGISTRY`     | `europe-west1-docker.pkg.dev` |
| `GAR_LOCATION` | `europe-west1`                |

---

### Paso 3: Configurar Secrets por Environment

Los **Secrets** son valores sensibles (credenciales, tokens, etc.).

#### 3.1 Secrets para Chile

1. Ve a **Settings** → **Environments** → **chile**
2. En la sección **Environment secrets**, click **Add secret**
3. Agregar estos secrets:

| Name                  | Value                                                                                       | Descripción                         |
| --------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| `WIF_PROVIDER`        | `projects/123456789/locations/global/workloadIdentityPools/github/providers/chile-provider` | Workload Identity Provider de Chile |
| `WIF_SERVICE_ACCOUNT` | `github-actions-chile@sleepr-chile-463202.iam.gserviceaccount.com`                          | Service Account de Chile            |

#### 3.2 Secrets para Perú

Environment: **peru**

| Name                  | Value                                                                                      | Descripción                        |
| --------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `WIF_PROVIDER`        | `projects/456789123/locations/global/workloadIdentityPools/github/providers/peru-provider` | Workload Identity Provider de Perú |
| `WIF_SERVICE_ACCOUNT` | `github-actions-peru@sleepr-peru-463202.iam.gserviceaccount.com`                           | Service Account de Perú            |

#### 3.3 Secrets para España

Environment: **spain**

| Name                  | Value                                                                                       | Descripción                          |
| --------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `WIF_PROVIDER`        | `projects/789123456/locations/global/workloadIdentityPools/github/providers/spain-provider` | Workload Identity Provider de España |
| `WIF_SERVICE_ACCOUNT` | `github-actions-spain@sleepr-spain-463202.iam.gserviceaccount.com`                          | Service Account de España            |

---

## 🎮 Cómo Usar el Workflow

### 🔄 Deploy Automático

**Trigger**: Push a la rama `main`

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

**Resultado**: Deploy automático a **todos los países** (12 jobs)

### 🔍 Validación en PR

**Trigger**: Crear/actualizar Pull Request hacia `main`

```bash
git checkout -b feature/nueva-funcionalidad
git add .
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad
# Crear PR en GitHub
```

**Resultado**: Build de todas las imágenes sin deploy (validación únicamente)

### 🎯 Deploy Manual Selectivo

**Trigger**: Ejecución manual con parámetros

#### Desde GitHub UI:

1. Ve a **Actions** en tu repositorio
2. Click en el workflow **"Build and Deploy to GCP Artifact Registry"**
3. Click en **"Run workflow"**
4. En **"Países a deployar"**, ingresa:
   - `chile` (solo Chile)
   - `chile,peru` (Chile y Perú)
   - `all` (todos los países)
5. Click **"Run workflow"**

#### Desde CLI:

```bash
# Deploy solo a Chile
gh workflow run deploy.yml -f target_countries=chile

# Deploy a Chile y Perú
gh workflow run deploy.yml -f target_countries=chile,peru

# Deploy a todos los países
gh workflow run deploy.yml -f target_countries=all
```

---

## 📊 Monitoreo y Logs

### 🔍 Ver Ejecuciones

1. Ve a **Actions** en GitHub
2. Click en una ejecución específica
3. Verás la matrix de jobs:
   ```
   Build and Deploy - chile - auth
   Build and Deploy - chile - reservation
   Build and Deploy - peru - auth
   Build and Deploy - spain - payment
   ...
   ```

### 📋 Logs Detallados

Click en cualquier job para ver:

- ✅ Autenticación con GCP
- 🐳 Build de imagen Docker
- ⬆️ Push a Artifact Registry
- ✔️ Verificación de deployment

### 🚨 Troubleshooting

#### Error común: "Authentication failed"

- Verificar que los secrets `WIF_PROVIDER` y `WIF_SERVICE_ACCOUNT` sean correctos
- Verificar permisos IAM del Service Account

#### Error común: "Repository not found"

- Verificar que los repositories de Artifact Registry existan
- Verificar que las variables `REGISTRY` y `PROJECT_ID` sean correctas

---

## 🔐 Seguridad y Mejores Prácticas

### ✅ Variables vs Secrets

| Tipo          | Uso                            | Ejemplo                               |
| ------------- | ------------------------------ | ------------------------------------- |
| **Variables** | Configuración no sensible      | `REGISTRY`, `GAR_LOCATION`            |
| **Secrets**   | Credenciales y datos sensibles | `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` |

### 🛡️ Permisos Mínimos

Cada Service Account debe tener **solo** los permisos necesarios:

```bash
# Permisos mínimos para CI/CD
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 🌍 Environments con Protección

Para producción, configura:

- **Required reviewers**: Requiere aprobación manual
- **Wait timer**: Delay antes del deploy
- **Deployment branches**: Solo desde `main`

---

## 🚀 Extensiones Futuras

### 🇦🇷 Agregar Nuevo País (Argentina)

1. **Crear project GCP**: `sleepr-argentina-463202`
2. **Configurar Artifact Registry** en región `southamerica-east1`
3. **Environment en GitHub**: `argentina`
4. **Variables**:
   ```
   PROJECT_ID = sleepr-argentina-463202
   REGISTRY = southamerica-east1-docker.pkg.dev
   GAR_LOCATION = southamerica-east1
   ```
5. **Actualizar workflow**:
   ```yaml
   matrix:
     country: [chile, peru, spain, argentina]
   ```

### 📦 Agregar Nuevo Servicio

1. **Crear repositories** en todos los países:
   ```bash
   gcloud artifacts repositories create new-service --repository-format=docker --location=southamerica-west1
   ```
2. **Actualizar workflow**:
   ```yaml
   matrix:
     service: [reservation, auth, notification, payment, new-service]
   ```

### 🔄 Deploy por Etapas

```yaml
strategy:
  matrix:
    country: [chile, peru, spain]
    service: [reservation, auth, notification, payment]
    include:
      - environment: staging
        branch: develop
      - environment: production
        branch: main
```

---

## 📞 Soporte y Contacto

### 🆘 ¿Necesitas Ayuda?

1. **Documentación**: Revisa los logs en GitHub Actions
2. **Team Lead**: Contacta al líder técnico del proyecto
3. **DevOps**: Escala a DevOps para problemas de infraestructura

### 📚 Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Workload Identity](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)

---

## 📝 Checklist de Configuración

### ✅ Antes del Primer Deploy

- [ ] Proyectos GCP creados para los 3 países
- [ ] Artifact Registry repositories creados (12 total: 4 servicios × 3 países)
- [ ] Workload Identity Federation configurado para cada país
- [ ] Environments creados en GitHub (chile, peru, spain)
- [ ] Variables configuradas en cada environment
- [ ] Secrets configurados en cada environment
- [ ] Workflow file actualizado en el repositorio
- [ ] Permisos IAM verificados

### ✅ Test del Workflow

- [ ] Crear un PR y verificar que solo build (no deploy)
- [ ] Hacer push a main y verificar deploy a todos los países
- [ ] Probar deploy manual a un país específico
- [ ] Verificar imágenes en Artifact Registry
- [ ] Revisar logs para errores

---

**¡Listo! Tu equipo ya puede usar el workflow multi-país de forma segura y eficiente.** 🎉
