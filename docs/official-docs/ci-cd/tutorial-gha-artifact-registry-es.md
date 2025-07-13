# 📦 Enviar código con GitHub Actions a Google Cloud Artifact Registry

Esta guía te muestra cómo enviar tu aplicación desde GitHub a un registry de Docker utilizando **GitHub Actions** y **Google Cloud Artifact Registry**, sin usar service account keys mediante **Google Cloud Workload Identity Federation**.

## 📋 Requisitos previos

Antes de comenzar, necesitas tener configurado lo siguiente:

### ✅ **Google Cloud Project**

- Un proyecto en Google Cloud donde crearemos los recursos
- Habilitar las APIs de:
  - **IAM Service Account Credentials**
  - **Artifact Registry**

### ✅ **Google Cloud CLI**

- Instalar `gcloud` CLI en tu máquina local
- O usar Cloud Shell desde la consola de Google Cloud (ya viene con `gcloud` preinstalado)

### ✅ **GitHub Repository**

- Un repositorio en GitHub con un `Dockerfile` válido para construir y enviar tu imagen de contenedor

---

## 🔧 Configuración paso a paso

### **Paso 1: Archivo de workflow de GitHub Actions**

Los workflows de GitHub Actions se almacenan como archivos YAML en el directorio `.github/workflows/` de tu repositorio.

Aquí está el archivo de workflow base que usaremos:

```yaml
name: Push to Artifact Registry

on:
  push:
    branches: ['main']

env:
  IMAGE_NAME: ''
  PROJECT_ID: ''
  AR_REPO_LOCATION: ''
  AR_URL: ''
  SERVICE_ACCOUNT: ''
  WORKLOAD_IDENTITY_PROVIDER: ''

jobs:
  push_to_ar:
    permissions:
      contents: 'read'
      id-token: 'write'

    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Google Auth
        id: auth
        uses: 'google-github-actions/auth@v2'
        with:
          token_format: 'access_token'
          project_id: ${{ env.PROJECT_ID }}
          service_account: ${{ env.SERVICE_ACCOUNT }}
          workload_identity_provider: ${{ env.WORKLOAD_IDENTITY_PROVIDER }}

      - name: Docker Auth
        id: docker-auth
        uses: 'docker/login-action@v1'
        with:
          username: 'oauth2accesstoken'
          password: '${{ steps.auth.outputs.access_token }}'
          registry: '${{ env.AR_REPO_LOCATION }}-docker.pkg.dev'

      - name: Build and Push Container
        run: |-
          docker build -t "${{ env.AR_URL }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" ./
          docker push "${{ env.AR_URL }}/${{ env.IMAGE_NAME }}:${{ github.sha }}"
```

#### 🔑 **Variables de entorno iniciales**

Primero, completa estas variables con tus valores:

```yaml
env:
  IMAGE_NAME: 'mi-app-imagen' # Nombre de tu imagen (se creará automáticamente)
  PROJECT_ID: 'mi-proyecto-id' # Tu ID de proyecto en Google Cloud
  AR_REPO_LOCATION: '' # Completaremos después
  AR_URL: '' # Completaremos después
  SERVICE_ACCOUNT: '' # Completaremos después
  WORKLOAD_IDENTITY_PROVIDER: '' # Completaremos después
```

---

### **Paso 2: Crear repositorio de Artifact Registry**

**Artifact Registry** es la solución de Google Cloud para gestionar artefactos de build. Soporta varios tipos de repositorios como apt, Maven, Python. Para nuestro caso, necesitamos un repositorio de Docker.

#### 🚀 **Crear el repositorio**

```bash
gcloud artifacts repositories create mi-ar-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Repositorio Docker de ejemplo"
```

Este comando crea un repositorio Docker llamado `mi-ar-repo` en la región `us-central1`.

#### � **Obtener la URL del registry**

```bash
gcloud artifacts repositories describe mi-ar-repo --location=us-central1
```

**Salida esperada:**

```
Encryption: Google-managed key
Registry URL: us-central1-docker.pkg.dev/mi-proyecto-id/mi-ar-repo
Repository Size: 5026.459MB
createTime: '2024-03-13T23:19:57.701232Z'
description: Repositorio Docker de ejemplo
format: DOCKER
mode: STANDARD_REPOSITORY
name: projects/mi-proyecto-id/locations/us-central1/repositories/mi-ar-repo
updateTime: '2024-03-18T17:08:49.658081Z'
```

#### ✏️ **Actualizar variables de entorno**

Ahora actualiza tu archivo de workflow con estos valores:

```yaml
env:
  IMAGE_NAME: 'mi-app-imagen'
  PROJECT_ID: 'mi-proyecto-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/mi-proyecto-id/mi-ar-repo'
  SERVICE_ACCOUNT: '' # Completaremos después
  WORKLOAD_IDENTITY_PROVIDER: '' # Completaremos después
```

---

### **Paso 3: Crear Service Account**

Necesitamos un **service account** que servirá como la identidad que realizará el push al repositorio de Artifact Registry.

#### 🔐 **Crear el service account**

```bash
gcloud iam service-accounts create github-actions-service-account \
  --description="Service account para uso en GitHub Actions workflow" \
  --display-name="GitHub Actions service account"
```

#### 📧 **Obtener el email del service account**

El formato del email es: `NOMBRE_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com`

#### ✏️ **Actualizar variable SERVICE_ACCOUNT**

```yaml
env:
  IMAGE_NAME: 'mi-app-imagen'
  PROJECT_ID: 'mi-proyecto-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/mi-proyecto-id/mi-ar-repo'
  SERVICE_ACCOUNT: 'github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com'
  WORKLOAD_IDENTITY_PROVIDER: '' # Completaremos después
```

#### 🔑 **Otorgar permisos al service account**

Por defecto, el service account no tiene permisos. Necesitamos darle permisos para hacer push al repositorio de Artifact Registry:

```bash
gcloud artifacts repositories add-iam-policy-binding mi-ar-repo \
  --location=us-central1 \
  --role=roles/artifactregistry.createOnPushWriter \
  --member=serviceAccount:github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com
```

> **📝 Nota:** Usamos `roles/artifactregistry.createOnPushWriter` en lugar de `roles/artifactregistry.writer` porque en el primer push necesita crear la imagen inicial de la aplicación.

---

### **Paso 4: Configurar Workload Identity Federation**

**Workload Identity Federation** nos permite otorgar a identidades externas la capacidad de impersonar un service account sin la carga de gestionar service account keys.

#### 🎯 **¿Por qué no usar service account keys?**

- ❌ **Riesgo de seguridad**: Las keys JSON pueden ser comprometidas
- ❌ **Gestión compleja**: Rotación manual de keys
- ✅ **Workload Identity Federation**: Más seguro y sin gestión de keys

#### **Paso 4.1: Crear workload identity pool**

Un **workload identity pool** es un recurso de Google Cloud usado para gestionar identidades externas.

```bash
gcloud iam workload-identity-pools create "mi-app-dev-pool" \
  --project=mi-proyecto-id \
  --location=global \
  --display-name="Identity pool para mi aplicación de prueba"
```

#### **Paso 4.2: Crear workload identity pool provider**

Un **workload identity pool provider** describe la relación entre Google Cloud y un proveedor de identidad (IdP) que soporta OpenID Connect (OIDC).

```bash
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --location="global" \
  --workload-identity-pool="mi-app-dev-pool" \
  --display-name="Provider para GitHub Actions" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"
```

**🔍 Explicación de parámetros:**

- `create-oidc`: Indica que queremos crear un provider OpenID Connect (OIDC)
- `issuer-uri`: URL del proveedor según la documentación OIDC de GitHub
- `attribute-mapping`: Define cómo se mapean los valores del token externo a los atributos del token STS de Google

#### **Paso 4.3: Obtener el nombre completo del provider**

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location=global \
  --workload-identity-pool="mi-app-dev-pool"
```

**Salida esperada:**

```
name: projects/123456789/locations/global/workloadIdentityPools/mi-app-dev-pool/providers/github-actions-provider
```

#### ✏️ **Actualizar variable WORKLOAD_IDENTITY_PROVIDER**

```yaml
env:
  IMAGE_NAME: 'mi-app-imagen'
  PROJECT_ID: 'mi-proyecto-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/mi-proyecto-id/mi-ar-repo'
  SERVICE_ACCOUNT: 'github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com'
  WORKLOAD_IDENTITY_PROVIDER: 'projects/123456789/locations/global/workloadIdentityPools/mi-app-dev-pool/providers/github-actions-provider'
```

---

### **Paso 5: Configurar permisos de impersonación**

Necesitamos otorgar al workload identity provider permiso para actuar como el service account.

#### **Paso 5.1: Obtener el nombre del workload identity pool**

```bash
gcloud iam workload-identity-pools describe "mi-app-dev-pool" \
  --location=global
```

El valor estará en el formato: `projects/NUMERO_PROYECTO/locations/UBICACION_POOL/workloadIdentityPools/NOMBRE_POOL`

#### **Paso 5.2: Guardar en variable de entorno**

```bash
export WIP_POOL=projects/123456789/locations/global/workloadIdentityPools/mi-app-dev-pool
```

#### **Paso 5.3: Otorgar rol de Workload Identity User**

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member=principalSet://iam.googleapis.com/${WIP_POOL}/attribute.repository/PROPIETARIO_REPO_GITHUB/NOMBRE_REPO_GITHUB
```

> **⚠️ Importante:** Reemplaza `PROPIETARIO_REPO_GITHUB` y `NOMBRE_REPO_GITHUB` con los valores reales de tu repositorio de GitHub.

#### 🔒 **Configuración adicional de seguridad (Opcional)**

Puedes agregar una condición de atributo para restringir aún más el acceso:

```bash
gcloud iam workload-identity-pools providers update-oidc \
  github-actions-provider \
  --project=mi-proyecto-id \
  --location=global \
  --workload-identity-pool=mi-app-dev-pool \
  --attribute-condition="assertion.repository_owner == 'PROPIETARIO_REPO_GITHUB'"
```

---

## 🧪 Probar la configuración

### **Archivo final del workflow**

Crea el archivo `.github/workflows/push-to-ar.yml` en tu repositorio:

```yaml
name: Push to Artifact Registry

on:
  push:
    branches: ['main']

env:
  IMAGE_NAME: 'mi-app-imagen'
  PROJECT_ID: 'mi-proyecto-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/mi-proyecto-id/mi-ar-repo'
  SERVICE_ACCOUNT: 'github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com'
  WORKLOAD_IDENTITY_PROVIDER: 'projects/123456789/locations/global/workloadIdentityPools/mi-app-dev-pool/providers/github-actions-provider'

jobs:
  push_to_ar:
    permissions:
      contents: 'read'
      id-token: 'write'

    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Google Auth
        id: auth
        uses: 'google-github-actions/auth@v2'
        with:
          token_format: 'access_token'
          project_id: ${{ env.PROJECT_ID }}
          service_account: ${{ env.SERVICE_ACCOUNT }}
          workload_identity_provider: ${{ env.WORKLOAD_IDENTITY_PROVIDER }}

      - name: Docker Auth
        id: docker-auth
        uses: 'docker/login-action@v1'
        with:
          username: 'oauth2accesstoken'
          password: '${{ steps.auth.outputs.access_token }}'
          registry: '${{ env.AR_REPO_LOCATION }}-docker.pkg.dev'

      - name: Build and Push Container
        run: |-
          docker build -t "${{ env.AR_URL }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" ./
          docker push "${{ env.AR_URL }}/${{ env.IMAGE_NAME }}:${{ github.sha }}"
```

### 🚀 **Activar el workflow**

1. Haz push del archivo a la rama `main` de tu repositorio
2. El workflow se ejecutará automáticamente
3. Si todo está configurado correctamente, tendrás tu imagen en Artifact Registry
4. Verifica visitando la página de Artifact Registry en la consola de Google Cloud

---

## 🔮 Siguientes pasos

### **Ampliar funcionalidades**

El **Google Auth GitHub Action** es la estrella del show - es lo que usa el Workload Identity Provider y service account para acceder a tu proyecto de Google Cloud.

Si planeas hacer otras cosas con esta autenticación, asegúrate de que el service account tenga el acceso correcto a esas funciones:

#### 🔐 **Ejemplo: Secret Manager**

Si usas Secret Manager, otorga el rol:

```bash
# Para acceder a secrets desde Secret Manager
--role=roles/secretmanager.secretAccessor
```

#### 📚 **Recursos adicionales**

- Explora todas las acciones disponibles en la [organización de GitHub Actions de Google](https://github.com/google-github-actions)
- Revisa la documentación oficial de [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)

---

## 📝 Resumen de comandos ejecutados

```bash
# 1. Crear repositorio de Artifact Registry
gcloud artifacts repositories create mi-ar-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Repositorio Docker de ejemplo"

# 2. Crear service account
gcloud iam service-accounts create github-actions-service-account \
  --description="Service account para uso en GitHub Actions workflow" \
  --display-name="GitHub Actions service account"

# 3. Otorgar permisos al service account
gcloud artifacts repositories add-iam-policy-binding mi-ar-repo \
  --location=us-central1 \
  --role=roles/artifactregistry.createOnPushWriter \
  --member=serviceAccount:github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com

# 4. Crear workload identity pool
gcloud iam workload-identity-pools create "mi-app-dev-pool" \
  --project=mi-proyecto-id \
  --location=global \
  --display-name="Identity pool para mi aplicación de prueba"

# 5. Crear workload identity pool provider
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --location="global" \
  --workload-identity-pool="mi-app-dev-pool" \
  --display-name="Provider para GitHub Actions" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"

# 6. Otorgar permisos de impersonación
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-service-account@mi-proyecto-id.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member=principalSet://iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/mi-app-dev-pool/attribute.repository/PROPIETARIO_REPO_GITHUB/NOMBRE_REPO_GITHUB
```

¡Con esta configuración tendrás un pipeline de CI/CD seguro y automatizado para enviar tus imágenes Docker a Google Cloud Artifact Registry! 🎉

Aquí tienes un script que configura todo lo que necesitas:

```bash
#!/bin/bash

# ================================
# 1. CONFIGURACIÓN INICIAL
# ================================

# --- Variables de Entrada (¡ACTUALIZA ESTOS VALORES!) ---
GCLOUD_PROJECT="your-gcp-project-id"
GITHUB_REPO="your-github-username/your-github-repo-name"

# --- Opcional ---
# Nombres para la nueva service account, identity pool e identity provider
# Cambia si quieres/necesitas
GCLOUD_SERVICE_ACCOUNT="github-deployer-account"
GCLOUD_IDENTITY_POOL="github-deployer-auth-pool"
GCLOUD_IDENTITY_PROVIDER="github-deployer-auth-provider"

GCLOUD_SERVICE_ACCOUNT_EMAIL="${GCLOUD_SERVICE_ACCOUNT}@${GCLOUD_PROJECT}.iam.gserviceaccount.com"

echo "🚀 Iniciando configuración de Workload Identity Federation para:"
echo "   📁 Proyecto: ${GCLOUD_PROJECT}"
echo "   🐙 Repositorio: ${GITHUB_REPO}"

# ================================
# 2. HABILITAR IAM CREDENTIALS API
# ================================
echo "📡 Habilitando IAM Credentials API..."

gcloud services enable iamcredentials.googleapis.com \
 --project "${GCLOUD_PROJECT}"
if [ $? -ne 0 ]; then
    echo "❌ Error habilitando IAM Credentials API. Saliendo.";
    exit 1;
fi
echo "✅ IAM Credentials API habilitada"

# ================================
# 3. CREAR SERVICE ACCOUNT
# ================================
echo "👤 Creando nueva service account..."

gcloud iam service-accounts create ${GCLOUD_SERVICE_ACCOUNT} \
  --project "${GCLOUD_PROJECT}" \
 --display-name="GitHub Actions Deployer Account for ${GITHUB_REPO}"

if [ $? -eq 0 ]; then
    echo "✅ Service account creada: ${GCLOUD_SERVICE_ACCOUNT_EMAIL}"
else
    echo "ℹ️ Service account ya existe o hubo un error"
fi

# ================================
# 4. OTORGAR PERMISOS ARTIFACT REGISTRY
# ================================
echo "🔐 Otorgando permisos de Artifact Registry..."

gcloud projects add-iam-policy-binding "${GCLOUD_PROJECT}" \
    --member="serviceAccount:${GCLOUD_SERVICE_ACCOUNT_EMAIL}" \
 --role="roles/artifactregistry.writer"
if [ $? -ne 0 ]; then
    echo "❌ Error otorgando rol de Artifact Registry Writer. Saliendo.";
    exit 1;
fi
echo "✅ Permisos de Artifact Registry otorgados"

# ================================
# 5. CREAR WORKLOAD IDENTITY POOL
# ================================
echo "🏊 Creando Workload Identity Pool..."

gcloud iam workload-identity-pools create ${GCLOUD_IDENTITY_POOL} \
  --project="${GCLOUD_PROJECT}" \
 --location="global" \
 --display-name="GitHub Actions Auth Pool"

if [ $? -eq 0 ]; then
    echo "✅ Workload Identity Pool creado"
else
    echo "ℹ️ Workload Identity Pool ya existe o hubo un error"
fi

# ================================
# 6. OBTENER ID DEL WORKLOAD IDENTITY POOL
# ================================
echo "🔍 Obteniendo ID del Workload Identity Pool..."

GCLOUD_WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe ${GCLOUD_IDENTITY_POOL} \
  --project="${GCLOUD_PROJECT}" \
 --location="global" \
 --format="value(name)")
if [ -z "${GCLOUD_WORKLOAD_IDENTITY_POOL_ID}" ]; then
    echo "❌ Error obteniendo ID del Workload Identity Pool. Saliendo.";
    exit 1;
fi
echo "✅ ID del Pool obtenido: ${GCLOUD_WORKLOAD_IDENTITY_POOL_ID}"

# ================================
# 7. CREAR OIDC WORKLOAD IDENTITY PROVIDER
# ================================
echo "🆔 Creando OIDC Workload Identity Provider..."

gcloud iam workload-identity-pools providers create-oidc ${GCLOUD_IDENTITY_PROVIDER} \
  --project="${GCLOUD_PROJECT}" \
 --location="global" \
 --workload-identity-pool="${GCLOUD_IDENTITY_POOL}" \
 --display-name="GitHub Actions Auth Provider" \
 --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
 --issuer-uri="https://token.actions.githubusercontent.com"

if [ $? -eq 0 ]; then
    echo "✅ OIDC Provider creado"
else
    echo "ℹ️ OIDC Provider ya existe o hubo un error"
fi

# ================================
# 8. PERMITIR AUTENTICACIÓN DESDE GITHUB
# ================================
echo "🔗 Vinculando GitHub repo con service account..."

gcloud iam service-accounts add-iam-policy-binding "${GCLOUD_SERVICE_ACCOUNT_EMAIL}" \
  --project="${GCLOUD_PROJECT}" \
 --role="roles/iam.workloadIdentityUser" \
 --member="principalSet://iam.googleapis.com/${GCLOUD_WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_REPO}"
if [ $? -ne 0 ]; then
    echo "❌ Error vinculando service account para impersonation. Saliendo.";
    exit 1;
fi
echo "✅ Vinculación completada"

# ================================
# 9. OBTENER ID DEL WORKLOAD IDENTITY PROVIDER
# ================================
echo "🔍 Obteniendo ID del Workload Identity Provider..."

GCP_WORKLOAD_IDENTITY_PROVIDER_ID=$(gcloud iam workload-identity-pools providers describe ${GCLOUD_IDENTITY_PROVIDER} \
    --project="${GCLOUD_PROJECT}" \
 --location="global" \
 --workload-identity-pool="${GCLOUD_IDENTITY_POOL}" \
    --format="value(name)")
if [ -z "${GCP_WORKLOAD_IDENTITY_PROVIDER_ID}" ]; then
    echo "❌ Error obteniendo ID del Workload Identity Provider. Saliendo.";
    exit 1;
fi

# ================================
# 10. MOSTRAR SECRETS PARA GITHUB
# ================================
echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 --- GitHub Secrets ---"
echo "Agrega estos secrets a tu repositorio de GitHub:"
echo ""
echo "🔑 GCP_PROJECT_ID: ${GCLOUD_PROJECT}"
echo "🔑 GCP_WORKLOAD_IDENTITY_PROVIDER_ID: ${GCP_WORKLOAD_IDENTITY_PROVIDER_ID}"
echo "🔑 GCP_SERVICE_ACCOUNT_EMAIL: ${GCLOUD_SERVICE_ACCOUNT_EMAIL}"
echo ""
echo "📍 Para agregar secrets: GitHub repo → Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "✅ ¡Setup completo!"
```

### 🔍 ¿Qué hace este script?

| Paso                                         | Descripción                                                                                                                                                                                                                                      | Propósito                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **1. Setup**                                 | `GCLOUD_PROJECT`: Debes configurar esto con tu Google Cloud Project ID<br>`GITHUB_REPO`: Debes configurar esto con tu repositorio GitHub en formato `username/repository-name`                                                                   | Configuración inicial de variables  |
| **2. Habilitar IAM Credentials API**         | Esta API es necesaria para que tu GitHub Action genere credenciales de corta duración para la service account                                                                                                                                    | Permitir generación de tokens       |
| **3. Crear Service Account**                 | Esta es la identidad de Google Cloud que tu GitHub Action impersonará. Es como un usuario robot para tu automatización                                                                                                                           | Crear identidad para automatización |
| **4. Otorgar permisos Artifact Registry**    | Esto le da a la service account recién creada permiso para subir imágenes a Google Cloud Artifact Registry                                                                                                                                       | Permitir push de imágenes           |
| **5. Crear Workload Identity Pool**          | Este pool es un contenedor para identity providers. Ayuda a organizar cómo se manejan las identidades externas (como las de GitHub)                                                                                                              | Organizar identidades externas      |
| **6. Obtener ID del Workload Identity Pool** | Esto recupera el identificador único del pool, que se necesita en pasos posteriores                                                                                                                                                              | Obtener referencia del pool         |
| **7. Crear OIDC Workload Identity Provider** | Esta es la parte clave. Le dice a Google Cloud que confíe en tokens OIDC emitidos por GitHub Actions. El `attribute-mapping` le dice a Google Cloud cómo mapear información del token OIDC de GitHub a atributos que Google Cloud puede entender | Establecer confianza con GitHub     |
| **8. Permitir impersonación**                | Este paso crucial conecta todo. Dice que principals que se autentican a través del OIDC provider pueden impersonar la service account que creamos                                                                                                | Autorizar impersonación             |
| **9. Obtener IDs para GitHub Secrets**       | El script imprimirá los IDs necesarios que debes agregar como secrets en tu repositorio GitHub                                                                                                                                                   | Configurar secrets                  |

### 🔐 Configurar GitHub Secrets

Después de ejecutar el script exitosamente, ve a tu repositorio GitHub:

1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Agrega estos tres secrets:

| Secret Name                         | Value                       | Descripción                                                                           |
| ----------------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`                    | Tu Google Cloud Project ID  | Identifica tu proyecto GCP                                                            |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_ID` | Full path del provider      | Ruta completa como `projects/your-project/locations/global/workloadIdentityPools/...` |
| `GCP_SERVICE_ACCOUNT_EMAIL`         | Email de la service account | Email generado automáticamente                                                        |

## 🔄 Paso 1: Configurar GitHub Actions Workflow

Ahora configuremos el archivo YAML del workflow de GitHub Actions.

### 📁 Estructura básica

```yaml
name: Build Container

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    # ⚠️ Permisos importantes para que workload identity federation funcione
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
    # ... nuestros steps irán aquí
```

### 🔑 Permisos importantes

| Permiso             | Propósito                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `contents: 'read'`  | Permite que la action lea el contenido de tu repositorio (que `actions/checkout` hace)                         |
| `id-token: 'write'` | **Crucial**: Permite que el runner de GitHub Actions solicite un token OIDC para autenticarse con Google Cloud |

### 📋 Steps del Workflow

#### **Step 1: Checkout y Setup Docker**

```yaml
- name: 📥 Checkout code
  uses: actions/checkout@v4

- name: 🐳 Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
```

**¿Qué hace?**

- `actions/checkout@v4`: Descarga tu repositorio
- `docker/setup-buildx-action@v3`: Instala y configura Docker Buildx

#### **Step 2: Autenticación con Google Cloud**

```yaml
- name: 🔐 Authenticate to Google Cloud
  uses: 'google-github-actions/auth@v2'
  id: auth
  with:
    token_format: access_token
    project_id: ${{ secrets.GCP_PROJECT_ID }}
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER_ID }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT_EMAIL }}
```

**Parámetros explicados:**

| Parámetro                    | Descripción                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `id: auth`                   | Damos a este step un ID para referenciar su output después    |
| `token_format: access_token` | Solicitamos un OAuth2 access token                            |
| `project_id`                 | Tu Google Cloud Project ID desde secrets                      |
| `workload_identity_provider` | El identificador completo de tu Workload Identity Provider    |
| `service_account`            | El email de la service account que GitHub Actions impersonará |

#### **Step 3: Login a Artifact Registry**

```yaml
- name: 🔑 Log in to Artifact Registry
  uses: docker/login-action@v3
  with:
    registry: europe-docker.pkg.dev
    username: oauth2accesstoken
    password: '${{ steps.auth.outputs.access_token }}'
```

**Parámetros explicados:**

| Parámetro  | Descripción                                             |
| ---------- | ------------------------------------------------------- |
| `registry` | Hostname del Artifact Registry (ajusta según tu región) |
| `username` | Siempre `oauth2accesstoken` para OAuth2 access tokens   |
| `password` | El access token del step anterior                       |

#### **Step 4: Build y Push de imagen Docker**

```yaml
- name: 🏗️ Build and push Docker image
  uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: ${{ github.ref == 'refs/heads/main' && github.event_name != 'pull_request' }}
    tags: europe-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/images/my-container-name:latest
```

**Parámetros explicados:**

| Parámetro    | Descripción                                   |
| ------------ | --------------------------------------------- |
| `context: .` | Usa el directorio raíz como contexto de build |
| `platforms`  | Construye para múltiples arquitecturas        |
| `push`       | Solo push en main branch y no en PRs          |
| `tags`       | Tag de la imagen Docker                       |

## ⚡ Paso 2: Optimización con Caché

Los builds de Docker pueden ser lentos. El caché puede acelerar significativamente este proceso reutilizando layers de builds anteriores.

### 🚀 Actualizar step de build con caché

```yaml
- name: 🏗️ Build and push Docker image
  uses: docker/build-push-action@v6
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: ${{ github.ref == 'refs/heads/main' && github.event_name != 'pull_request' }}
    tags: europe-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/images/my-container-name:latest
    # 🚀 Configuración de caché
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Configuración de caché:**

| Parámetro                     | Descripción                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `cache-from: type=gha`        | Intenta extraer layers de caché del GitHub Actions cache                           |
| `cache-to: type=gha,mode=max` | Guarda el build cache en GitHub Actions cache. `mode=max` incluye todos los layers |

## 📝 Workflow Completo

Aquí está nuestro YAML final para GitHub Actions:

```yaml
name: 🚀 Build Container

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    # ⚠️ Permisos importantes para workload identity federation
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🐳 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔐 Authenticate to Google Cloud
        uses: 'google-github-actions/auth@v2'
        id: auth
        with:
          token_format: access_token
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER_ID }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT_EMAIL }}

      - name: 🔑 Log in to Artifact Registry
        uses: docker/login-action@v3
        with:
          registry: europe-docker.pkg.dev
          username: oauth2accesstoken
          password: '${{ steps.auth.outputs.access_token }}'

      - name: 🏗️ Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.ref == 'refs/heads/main' && github.event_name != 'pull_request' }}
          tags: europe-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/images/my-container-name:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## ✅ Checklist Final

Antes de ejecutar tu workflow, asegúrate de:

- [ ] ✅ Ejecutar el script de setup (Paso 0) en tu entorno Google Cloud
- [ ] ✅ Configurar los GitHub Secrets necesarios
- [ ] ✅ Reemplazar valores placeholder como:
  - `europe-docker.pkg.dev` (ajustar según tu región)
  - `my-container-name` (usar tu nombre de contenedor)
- [ ] ✅ Asegurar que tu `Dockerfile` está en la raíz del repositorio (`context: .`) o ajustar la ruta
- [ ] ✅ Verificar que tu Artifact Registry está creado en GCP

## 🔧 Troubleshooting

### Errores Comunes

| Error                                  | Solución                                                    |
| -------------------------------------- | ----------------------------------------------------------- |
| **"Permission denied"**                | Verificar que los secrets están configurados correctamente  |
| **"Workload Identity Pool not found"** | Ejecutar nuevamente el script de setup                      |
| **"Registry not found"**               | Crear el Artifact Registry en GCP primero                   |
| **"Token expired"**                    | El workflow se ejecutará automáticamente con tokens frescos |

### 🔍 Verificar configuración

```bash
# Verificar service account
gcloud iam service-accounts list --project=YOUR_PROJECT_ID

# Verificar workload identity pools
gcloud iam workload-identity-pools list --location=global --project=YOUR_PROJECT_ID

# Verificar artifact registry
gcloud artifacts repositories list --project=YOUR_PROJECT_ID
```

## 🎉 ¡Y eso es todo!

Este setup proporciona una forma **segura** y **eficiente** de manejar tus despliegues de imágenes Docker a Google Cloud.

### 🔄 Flujo de trabajo resultante:

1. **Push a main** → Workflow se ejecuta automáticamente
2. **Checkout código** → Descarga tu repositorio
3. **Autenticación** → Se conecta seguramente a Google Cloud
4. **Build imagen** → Construye tu contenedor Docker
5. **Push a registry** → Sube la imagen a Artifact Registry
6. **Caché** → Acelera builds futuros

¡Ahora tienes un pipeline completamente automatizado y seguro! 🚀
