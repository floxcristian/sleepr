- gcloud config list

Información de mi cuenta??

### 2. Crear repositorio de Artifact Registry

**Artifact Registry** es la solución de Google Cloud para gestionar artefactos de build. Soporta varios tipos de repositorios como apt, Maven, Python. Para nuestro ejemplo, haremos un repositorio de Docker.

#### 🚀 Crear el repositorio

```bash
gcloud artifacts repositories create mi-ar-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Repositorio Docker de ejemplo"
```

Este comando crea un repositorio Docker llamado `mi-ar-repo` en la región `us-central1`.

#### 🔎 Obtener la URL del registry

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

### 3. Crear Service Account

Un **service account** sirve como identidad para realizar push a un repositorio de Artifact Registry, aunque se recomienda más usar el enfoque de WIF.

#### 🔐 Crear service account

```bash
gcloud iam service-accounts create github-actions-service-account \
  --description="Service account para uso en GitHub Actions workflow" \
  --display-name="GitHub Actions service account"
```

#### 4. Crear workload identity pool

Un **workload identity pool** es un recurso de Google Cloud usado para gestionar identidades externas.

```bash
gcloud iam workload-identity-pools create "mi-app-dev-pool" \
  --project=mi-proyecto-id \
  --location=global \
  --display-name="Identity pool para mi aplicación de prueba"
```

#### 5. Crear workload identity pool provider

Un **workload identity pool provider** describe la relación entre Google Cloud y un proveedor de identidad (IdP) que soporta OpenID Connect (OIDC).

#### 5.1. Crear el workload identity pool provider

```bash
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --location="global" \
  --workload-identity-pool="mi-app-dev-pool" \
  --display-name="Provider para GitHub Actions" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"
```

**Explicación de parámetros:**

- `create-oidc`: Indica que queremos crear un provider OpenID Connect (OIDC)
- `issuer-uri`: URL del proveedor según la documentación OIDC de GitHub
- `attribute-mapping`: Define cómo se mapean los valores del token externo a los atributos del token STS de Google

#### 5.2. Obtener el nombre completo del provider

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location=global \
  --workload-identity-pool="mi-app-dev-pool"
```

**Salida esperada:**

```
name: projects/123456789/locations/global/workloadIdentityPools/mi-app-dev-pool/providers/github-actions-provider
```
