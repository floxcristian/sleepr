# 🏆 Configuración del Workflow de Github Actions para el Despliegue a Producción

## 📖 Guía detallada

Las siguientes instrucciones muestran cómo configurar la autenticación de GitHub a Google Cloud vía Direct Workload Identity Federation (WIF).

### 🛠️ Requisitos previos

- Herramienta de línea de comandos `gcloud` instalada y configurada

### Paso 1: Obtener el ID del proyecto de Google

El `PROJECT_ID` lo sacamos de Google Cloud Console:

<img src="/docs/images/gcp/project_id.png">

### Paso 2: Crear un Workload Identity Provider

```bash
# TODO: reemplaza ${PROJECT_ID} y ${GITHUB_ORG} con tus valores
gcloud iam workload-identity-pools providers create-oidc "my-repo" \
 --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="My GitHub repo Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
 --issuer-uri="https://token.actions.githubusercontent.com"
```

- Si trabajas con Powershell tendrás que usar el comando sin salto de línea:

```bash
gcloud iam workload-identity-pools providers create-oidc "my-repo" --project="${PROJECT_ID}" --location="global" --workload-identity-pool="github" --display-name="My GitHub repo Provider" --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" --issuer-uri="https://token.actions.githubusercontent.com"
```

- Usamos el `PROJECT_ID` de antes y en `GITHUB_ORG` ponemos el username de github de la organización o del propietario. En mi caso es mi cuenta personal:
  <img src="/docs/images/github/personal_account.png">

- Entonces, para nuestro ejemplo quedaría así:

```bash
gcloud iam workload-identity-pools providers create-oidc "my-repo" --project="sleepr-463202" --location="global" --workload-identity-pool="github" --display-name="My GitHub repo Provider" --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" --attribute-condition="assertion.repository_owner == 'floxcristian'" --issuer-uri="https://token.actions.githubusercontent.com"
```

**Formato esperado del resultado:**

```
Created workload identity pool provider [my-repo].
```

**Comprobación**

- Si presionamos sobre el Grupo de Workload Identity creado:
  <img src="/docs/images/gcp/wip_created.png">
- Luego deberíamos poder ver nuestro proveedor configurado:
  <img src="/docs/images/gcp/github_repo_provider.png">

### 📤 Paso 4: Extraer el nombre del recurso Workload Identity Provider

```bash
# TODO: reemplaza ${PROJECT_ID} con tu valor
gcloud iam workload-identity-pools providers describe "my-repo" \
 --project="${PROJECT_ID}" \
 --location="global" \
 --workload-identity-pool="github" \
 --format="value(name)"
```

- Si trabajas con Powershell tendrás que usar el comando sin salto de línea:

```bash
gcloud iam workload-identity-pools providers describe "my-repo" --project="${PROJECT_ID}" --location="global" --workload-identity-pool="github" --format="value(name)"
```

- Entonces, para nuestro ejemplo quedaría así:

```bash
gcloud iam workload-identity-pools providers describe "my-repo" --project="sleepr-463202" --location="global" --workload-identity-pool="github" --format="value(name)"
```

**Formato esperado del resultado:**

```
projects/171529469407/locations/global/workloadIdentityPools/github/providers/my-repo
```

**Nota**

- Este resultado `WIF_PROVIDER` lo usaremos en el siguiente comando y también en el workflow de Github Actions.

### 🔐 Paso 5: Conceder permisos de escritura en Artifact Registry

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="principalSet://iam.googleapis.com/${WIF_PROVIDER}/attribute.repository/${REPO}" --role="roles/artifactregistry.writer"
```

¿Cómo obtengo el valor de REPO?

- Entonces, para nuestro ejemplo quedaría así:

```bash
gcloud projects add-iam-policy-binding "sleepr-463202" --member="principalSet://iam.googleapis.com/projects/171529469407/locations/global/workloadIdentityPools/github
/attribute.repository/floxcristian/sleepr" --role="roles/artifactregistry.writer"
```

### 🔗 Paso 6: Configurar GitHub Actions

```yaml
- uses: 'google-github-actions/auth@v2'
  with:
    project_id: ${PROJECT_ID}
    workload_identity_provider: ${WIF_PROVIDER}
```

# Usando un script

https://dev.to/filip-lindqvist/google-cloud-artifact-registry-with-github-actions-using-workload-identity-2h8c

```bash
#!/bin/bash

# ===============================================================
# 1. CONFIGURACIÓN INICIAL
# ===============================================================

# --- Variables de Entrada (¡ACTUALIZA ESTOS VALORES!) ---
GCP_PROJECT_ID="YOUR_GCP_PROJECT_ID" # sleepr-463202
GITHUB_ORG="YOUR_GITHUB_ORG" #floxcristian
GITHUB_REPO="YOUR_GITHUB_USERNAME/YOUR_GITHUB_REPO_NAME" #floxcristian/sleepr

# --- Opcional ---
# Nombres para la nueva service account, identity pool e identity provider
# Cambia si quieres/necesitas
GCP_IDENTITY_POOL="github-deployer-auth-pool" # github
GCP_IDENTITY_PROVIDER="github-deployer-auth-provider" # "my-repo"

echo "🚀 Iniciando configuración de Workload Identity Federation para:"
echo "   📁 Proyecto: ${GCP_PROJECT_ID}"
echo "   🐙 Repositorio: ${GITHUB_REPO}"


# ===============================================================
# 2. CREAR WORKLOAD IDENTITY POOL
# ===============================================================
echo "🏊 Creando Workload Identity Pool..."

gcloud iam workload-identity-pools create ${GCP_IDENTITY_POOL} \
  --project="${GCP_PROJECT_ID}" \
 --location="global" \
 --display-name="GitHub Actions Auth Pool"

if [ $? -eq 0 ]; then
    echo "✅ Workload Identity Pool creado"
else
    echo "ℹ️ Workload Identity Pool ya existe o hubo un error"
fi

# ===============================================================
# 3. OBTENER ID DEL WORKLOAD IDENTITY POOL
# ===============================================================
echo "🔍 Obteniendo ID del Workload Identity Pool..."

GCP_WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe ${GCP_IDENTITY_POOL} \
  --project="${GCP_PROJECT_ID}" \
 --location="global" \
 --format="value(name)")
if [ -z "${GCP_WORKLOAD_IDENTITY_POOL_ID}" ]; then
    echo "❌ Error obteniendo ID del Workload Identity Pool. Saliendo.";
    exit 1;
fi
echo "✅ ID del Pool obtenido: ${GCP_WORKLOAD_IDENTITY_POOL_ID}"

# ===============================================================
# 4. CREAR OIDC WORKLOAD IDENTITY PROVIDER
# ===============================================================
echo "🆔 Creando OIDC Workload Identity Provider..."

gcloud iam workload-identity-pools providers create-oidc ${GCP_IDENTITY_PROVIDER} \
  --project="${GCP_PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${GCP_IDENTITY_POOL}" \
  --display-name="GitHub Actions Auth Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_ORG}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

if [ $? -eq 0 ]; then
    echo "✅ OIDC Provider creado"
else
    echo "ℹ️ OIDC Provider ya existe o hubo un error"
fi

# ===============================================================
# 5. OBTENER ID DEL WORKLOAD IDENTITY PROVIDER
# ===============================================================
echo "🔍 Obteniendo ID del Workload Identity Provider..."

GCP_WORKLOAD_IDENTITY_PROVIDER_ID=$(gcloud iam workload-identity-pools providers describe ${GCP_IDENTITY_PROVIDER} \
    --project="${GCP_PROJECT_ID}" \
 --location="global" \
 --workload-identity-pool="${GCP_IDENTITY_POOL}" \
    --format="value(name)")
if [ -z "${GCP_WORKLOAD_IDENTITY_PROVIDER_ID}" ]; then
    echo "❌ Error obteniendo ID del Workload Identity Provider. Saliendo.";
    exit 1;
fi

# ===============================================================
# 6. CONCEDER PERMISOS DE ESCRITURA EN ARTIFACT REGISTRY
# ===============================================================
echo "🔨 Concediendo permisos de escritura en Artifact Registry..."

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" --member="principalSet://iam.googleapis.com/${GCP_WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_REPO}" --role="roles/artifactregistry.writer"

# ===============================================================
# 7. MOSTRAR SECRETS PARA GITHUB
# ===============================================================
echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 --- GitHub Secrets ---"
echo "Agrega estos secrets a tu repositorio de GitHub:"
echo ""
echo "🔑 GCP_PROJECT_ID: ${GCP_PROJECT_ID}"
echo "🔑 GCP_WORKLOAD_IDENTITY_PROVIDER_ID: ${GCP_WORKLOAD_IDENTITY_PROVIDER_ID}" #WIF_PROVIDER
echo ""
echo "📍 Para agregar secrets: GitHub repo → Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "✅ ¡Setup completo!"
```
