# 🔐 Autenticarse en Google Cloud desde GitHub Actions usando Workload Identity Federation (WIF)

## 📖 Descripción general

Esta GitHub Action se autentica con Google Cloud. Soporta autenticación mediante:

- **Google Cloud Service Account Key JSON**
- **Workload Identity Federation**

### 🏆 ¿Por qué Workload Identity Federation?

**Workload Identity Federation** es recomendado sobre Service Account Keys porque:

- ✅ Elimina la necesidad de exportar credenciales de larga duración
- ✅ Establece una relación de delegación de confianza entre una invocación específica del workflow de GitHub Actions y los permisos en Google Cloud
- ✅ Mayor seguridad y gestión simplificada

## 🎯 Métodos de autenticación disponibles

Hay **tres formas** de configurar esta GitHub Action para autenticarse con Google Cloud:

1. **🥇 (Recomendado) Direct Workload Identity Federation (WIF)**
2. **🥈 Workload Identity Federation through a Service Account**
3. **🥉 Service Account Key JSON**

## ⚠️ Consideraciones importantes

### 📝 Sobre gsutil

> **Importante:** El comando `gsutil` **NO** usará las credenciales exportadas por esta GitHub Action. Los usuarios deben usar `gcloud storage` en su lugar.

## 🛠️ Requisitos previos

### 1. ✅ Checkout obligatorio

Ejecuta el paso `actions/checkout@v4` **ANTES** de esta action:

```yaml
- uses: actions/checkout@v4
```

> ⚠️ **Advertencia:** Omitir el paso checkout o ponerlo después de auth causará que los pasos futuros no puedan autenticarse.

### 2. 🔒 Ignorar credenciales generadas

Para crear binarios, contenedores, pull requests u otros releases, agrega lo siguiente a tus archivos `.gitignore`, `.dockerignore` y similares para prevenir commits accidentales de credenciales:

```gitignore
# Ignore generated credentials from google-github-actions/auth
gha-creds-*.json
```

### 3. 🟢 Versión de Node.js

Esta action se ejecuta usando **Node 20**. Usa una versión de runner que soporte esta versión de Node o más nueva.

## 💻 Ejemplo de uso básico

```yaml
jobs:
  job_id:
    # Cualquier runner que soporte Node 20 o más nuevo
    runs-on: ubuntu-latest

    # Agregar "id-token" con los permisos necesarios
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
      - uses: 'actions/checkout@v4'

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'my-project'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider'
```

> **Nota:** Cambiar el bloque de permisos puede remover algunos permisos por defecto. Consulta la [documentación de permisos](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token) para más información.

Para más opciones de uso, consulta los [ejemplos adicionales](https://github.com/google-github-actions/auth/blob/main/docs/EXAMPLES.md).

---

# ⚙️ Inputs

## 🔐 Inputs: Workload Identity Federation

### ⚠️ Advertencias importantes

> **Warning:** Esta opción **NO** es soportada por Firebase Admin SDK. Usa autenticación con Service Account Key JSON en su lugar.

> **Warning:** Al momento de escribir esto, el token OIDC de GitHub expira en 5 minutos, lo que significa que cualquier credencial derivada también expira en 5 minutos.

### Parámetros para Workload Identity Federation

#### `workload_identity_provider` (Requerido)

El identificador completo del Workload Identity Provider, incluyendo el número de proyecto, nombre del pool y nombre del provider. Si se proporciona, debe ser el identificador completo que incluye todas las partes:

```
projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider
```

## 🔧 Inputs: Configuraciones diversas

Los siguientes inputs son para controlar el comportamiento de esta GitHub Action, independientemente del mecanismo de autenticación.

#### `project_id` (Opcional)

ID de proyecto personalizado a usar para autenticación y exportar a otros pasos. Si no se especifica, intentaremos extraer el project ID del Workload Identity Provider, email del Service Account, o el Service Account Key JSON. Si esto falla, necesitarás especificar el project ID manualmente.

#### `create_credentials_file` (Opcional)

Si es `true`, la action generará de manera segura un archivo de credenciales que puede usarse para autenticación vía gcloud y Google Cloud SDKs en otros pasos del workflow. El valor por defecto es `true`.

**📁 Ubicación del archivo:** El archivo de credenciales se exporta en `$GITHUB_WORKSPACE`, lo que lo hace disponible para todos los pasos futuros y sistemas de archivos (incluyendo GitHub Actions basadas en Docker). El archivo se remueve automáticamente al final del job vía una post action.

**✅ Requisito checkout:** Para usar credenciales exportadas, debes agregar el paso `actions/checkout` antes de llamar auth. Esto es debido a cómo GitHub Actions crea `$GITHUB_WORKSPACE`:

```yaml
jobs:
  job_id:
    steps:
      - uses: 'actions/checkout@v4' # ¡Debe ir primero!
      - uses: 'google-github-actions/auth@v2'
```

---

# 📤 Outputs (Salidas)

## Valores de salida disponibles

#### `project_id`

Valor proporcionado o extraído para el project ID de Google Cloud.

#### `credentials_file_path`

Ruta en el sistema de archivos local donde reside el archivo de credenciales generado. Esto solo está disponible si `"create_credentials_file"` fue configurado como `true`.

#### `auth_token`

El token federado de Google Cloud (para Workload Identity Federation) o JWT auto-firmado (para Service Account Key JSON). Esta salida siempre está disponible.

#### `access_token`

El access token de Google Cloud para llamar otras APIs de Google Cloud. Esto solo está disponible cuando `"token_format"` es `"access_token"`.

#### `id_token`

El ID token de Google Cloud. Esto solo está disponible cuando `"token_format"` es `"id_token"`.

# 🏆 Configuración

## 📋 Resumen

En esta configuración, el **Workload Identity Pool** tiene permisos IAM directos sobre los recursos de Google Cloud; no hay service accounts intermedios ni claves. Este método es preferido ya que autentica directamente las GitHub Actions con Google Cloud sin un recurso proxy.

### ⚠️ Limitaciones importantes

- No todos los recursos de Google Cloud soportan identidades `principalSet`
- El token resultante tiene una duración máxima de **10 minutos**
- Consulta la documentación de tu servicio específico de Google Cloud para más información

## 🎯 Objetivo

Autenticar a Google Cloud desde GitHub Actions usando Direct Workload Identity Federation

### 🚨 Importante

Para generar tokens de acceso OAuth 2.0 o ID tokens, debes:

- Proporcionar un email de service account
- El Workload Identity Pool debe tener permisos `roles/iam.workloadIdentityUser` en el Service Account de Google Cloud objetivo

> **Nota:** Si necesitas estas funcionalidades, sigue los pasos para Workload Identity Federation a través de un Service Account.

## 📖 Guía detallada

Las siguientes instrucciones muestran cómo configurar la autenticación de GitHub a Google Cloud vía Direct Workload Identity Federation.

### 🛠️ Requisitos previos

- Herramienta de línea de comandos `gcloud` instalada y configurada

### Paso 1: Obtener variables necesarias

El `PROJECT_ID` lo sacamos de Google Cloud Console:

<img src="/docs/images/gcp/project_id.png">

### 🔧 Paso 2: Crear un Workload Identity Pool

```bash
# TODO: replace ${PROJECT_ID} with your value below.

gcloud iam workload-identity-pools create "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

- Si trabajas con Powershell tendrás que usar el comando sin salto de línea:

```bash
# TODO: reemplaza ${PROJECT_ID} con tu valor
gcloud iam workload-identity-pools create "github" --project="${PROJECT_ID}" --location="global" --display-name="GitHub Actions Pool"
```

Entonces, para nuestro ejemplo quedaría así:

```bash
gcloud iam workload-identity-pools create "github" --project="sleepr-463202" --location="global" --display-name="GitHub Actions Pool"
```

**Formato esperado del resultado:**

```
Created workload identity pool [github].
```

**Comprobación**

- Lo podemos encontrar en este apartado del menú:
  <img src="/docs/images/gcp/wif_on_menu.png">
- Y aquí ya vemos el grupo de Workload Identity creado:
  <img src="/docs/images/gcp/wip_created.png">

### 🔍 Paso 3: Obtener el ID completo del Workload Identity Pool

```bash
# TODO: replace ${PROJECT_ID} with your value below.

gcloud iam workload-identity-pools describe "github" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(name)"
```

- Si trabajas con Powershell tendrás que usar el comando sin salto de línea:

```bash
gcloud iam workload-identity-pools describe "github" --project="${PROJECT_ID}" --location="global" --format="value(name)"
```

- Entonces, para nuestro ejemplo quedaría así:

```bash
gcloud iam workload-identity-pools describe "github" --project="sleepr-463202" --location="global" --format="value(name)"
```

**Formato esperado del resultado:**

```
projects/171529469407/locations/global/workloadIdentityPools/github
```

**Nota**

- Este valor lo usaremos mas adelante pero también lo podemos obtener desde Google Cloud si presionar sobre el Grupo de Workload Identity creado:
  <img src="/docs/images/gcp/wip_created.png">
- Y aquí podremos ver el id completo del Workload Identity Pool:
  <img src="/docs/images/gcp/wip_id.png">

### 🛡️ Paso 3: Crear un Workload Identity Provider

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

- Este resultado (Workload Identity Provider) lo usaremos en nuestro workflow de Github Actions como el `secrets.WIF_PROVIDER`.

### 🔗 Paso 5: Configurar GitHub Actions

Usa este valor como `workload_identity_provider` en tu archivo YAML de GitHub Actions:

```yaml
- uses: 'google-github-actions/auth@v2'
  with:
    project_id: ${PROJECT_ID}
    workload_identity_provider: ${WIF_PROVIDER}
```

- Entonces, para nuestro ejemplo quedaría así:

```yaml
- uses: 'google-github-actions/auth@v2'
  with:
    project_id: 'sleepr-463202'
    workload_identity_provider: 'projects/171529469407/locations/global/workloadIdentityPools/github/providers/my-repo'
```

### 🔐 Paso 6: Conceder acceso a recursos de Google Cloud

Según sea necesario, permite autenticaciones desde el Workload Identity Pool a recursos de Google Cloud. Estos pueden ser cualquier recurso de Google Cloud que soporte tokens de ID federados, y puede hacerse después de que la GitHub Action esté configurada.

#### 💡 Ejemplo: Acceso a Google Secret Manager

El siguiente ejemplo muestra cómo otorgar acceso desde una GitHub Action en un repositorio específico a un secreto en Google Secret Manager:

```bash
# TODO: reemplaza ${PROJECT_ID}, ${WORKLOAD_IDENTITY_POOL_ID}, y ${REPO}
# con tus valores
#
# ${REPO} es el nombre completo del repo incluyendo la organización padre de GitHub,
# como "mi-org/mi-repo".
#
# ${WORKLOAD_IDENTITY_POOL_ID} es el ID completo del pool, como
# "projects/123456789/locations/global/workloadIdentityPools/github".

gcloud secrets add-iam-policy-binding "my-secret" \
 --project="${PROJECT_ID}" \
  --role="roles/secretmanager.secretAccessor" \
  --member="principalSet://iam.googleapis.com/${WIF_PROVIDER}/attribute.repository/${REPO}"
```

#### Ejemplo: Escritura en Artifact Registry

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="principalSet://iam.googleapis.com/${WIF_PROVIDER}/attribute.repository/${REPO}" --role="roles/artifactregistry.writer"
```

```bash
gcloud projects add-iam-policy-binding "sleepr-463202" --member="principalSet://iam.googleapis.com/projects/171529469407/locations/global/workloadIdentityPools/github
/attribute.repository/floxcristian/sleepr" --role="roles/artifactregistry.writer"
```

#### Ejemplo: Subir capas de Docker

## 📚 Referencias adicionales

Revisa la [documentación de GitHub](https://docs.github.com/en/actions) para una lista completa de opciones y valores. Este repositorio de GitHub no busca enumerar todas las combinaciones posibles.

# 🚀 Ejemplos prácticos de uso

## 📦 Ejemplo 1: Deploy a Cloud Run

```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'

      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v2'

      - name: 'Build and Deploy'
        run: |
          gcloud builds submit --tag gcr.io/${{ env.PROJECT_ID }}/my-app
          gcloud run deploy my-app --image gcr.io/${{ env.PROJECT_ID }}/my-app --region us-central1
```

## 🐳 Ejemplo 2: Push a Artifact Registry

```yaml
name: Build and Push Docker Image
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'

      - name: 'Configure Docker'
        run: gcloud auth configure-docker us-central1-docker.pkg.dev

      - name: 'Build and Push'
        run: |
          docker build -t us-central1-docker.pkg.dev/${{ env.PROJECT_ID }}/my-repo/my-app:${{ github.sha }} .
          docker push us-central1-docker.pkg.dev/${{ env.PROJECT_ID }}/my-repo/my-app:${{ github.sha }}
```

## 🔑 Ejemplo 3: Acceso a Secret Manager

```yaml
name: Deploy with Secrets
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'

      - name: 'Get secrets'
        run: |
          DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url")
          API_KEY=$(gcloud secrets versions access latest --secret="api-key")
          echo "::add-mask::$DATABASE_URL"
          echo "::add-mask::$API_KEY"
```

# 🌟 Casos de uso avanzados

## 🔄 Ejemplo 4: Workflow con múltiples proyectos

```yaml
name: Multi-Project Deployment
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto-staging'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/staging'

      - name: 'Deploy to Staging'
        run: |
          gcloud run deploy my-app-staging \
            --image gcr.io/mi-proyecto-staging/my-app:${{ github.sha }} \
            --region us-central1

  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-staging

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto-prod'
          workload_identity_provider: 'projects/987654321/locations/global/workloadIdentityPools/github/providers/production'

      - name: 'Deploy to Production'
        run: |
          gcloud run deploy my-app \
            --image gcr.io/mi-proyecto-prod/my-app:${{ github.sha }} \
            --region us-central1
```

## 🎯 Ejemplo 5: Generación de access tokens con scopes específicos

```yaml
name: Custom API Access
on:
  workflow_dispatch:

jobs:
  custom-api-call:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        id: auth
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'
          service_account: 'api-caller@mi-proyecto.iam.gserviceaccount.com'
          token_format: 'access_token'
          access_token_lifetime: '300s'
          access_token_scopes: |
            https://www.googleapis.com/auth/bigquery
            https://www.googleapis.com/auth/storage.read_only

      - name: 'Use custom token'
        run: |
          echo "Token generado: ${{ steps.auth.outputs.access_token }}"
          # Usar el token para llamadas específicas a la API
          curl -H "Authorization: Bearer ${{ steps.auth.outputs.access_token }}" \
               "https://bigquery.googleapis.com/bigquery/v2/projects/mi-proyecto/datasets"
```

## 🔐 Ejemplo 6: Domain-Wide Delegation

```yaml
name: Domain-Wide Delegation Example
on:
  schedule:
    - cron: '0 9 * * 1' # Lunes a las 9 AM

jobs:
  admin-task:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        id: auth
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'
          service_account: 'domain-admin@mi-proyecto.iam.gserviceaccount.com'
          token_format: 'access_token'
          access_token_lifetime: '3600s'
          access_token_subject: 'admin@miempresa.com'
          access_token_scopes: |
            https://www.googleapis.com/auth/admin.directory.user
            https://www.googleapis.com/auth/admin.directory.group

      - name: 'Tarea administrativa'
        run: |
          # Ejemplo: listar usuarios del dominio
          curl -H "Authorization: Bearer ${{ steps.auth.outputs.access_token }}" \
               "https://admin.googleapis.com/admin/directory/v1/users?domain=miempresa.com"
```

## 💾 Ejemplo 7: Backup automatizado con Cloud Storage

```yaml
name: Automated Backup
on:
  schedule:
    - cron: '0 2 * * *' # Diario a las 2 AM

jobs:
  backup:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'

      - name: 'Create backup'
        run: |
          # Crear backup de la base de datos
          DATE=$(date +%Y%m%d_%H%M%S)
          BACKUP_FILE="backup_${DATE}.sql"

          # Simular creación de backup
          echo "-- Backup created on $(date)" > $BACKUP_FILE
          echo "SELECT * FROM users;" >> $BACKUP_FILE

          # Subir a Cloud Storage
          gcloud storage cp $BACKUP_FILE gs://mi-bucket-backups/

          # Limpiar archivos locales
          rm $BACKUP_FILE

      - name: 'Clean old backups'
        run: |
          # Mantener solo backups de los últimos 30 días
          CUTOFF_DATE=$(date -d '30 days ago' +%Y%m%d)
          gcloud storage ls gs://mi-bucket-backups/ | \
          grep "backup_" | \
          awk -v cutoff="$CUTOFF_DATE" '
          {
            if (match($0, /backup_([0-9]{8})/, arr)) {
              if (arr[1] < cutoff) {
                print $0
              }
            }
          }' | \
          xargs -r gcloud storage rm
```

## 🏗️ Ejemplo 8: Infrastructure as Code con Terraform

```yaml
name: Terraform Deploy
on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'
          service_account: 'terraform@mi-proyecto.iam.gserviceaccount.com'

      - name: 'Setup Terraform'
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: 'Terraform Init'
        working-directory: terraform
        run: terraform init

      - name: 'Terraform Plan'
        working-directory: terraform
        id: plan
        run: |
          terraform plan -no-color -out=tfplan
          terraform show -no-color tfplan > plan.txt

      - name: 'Comment PR with plan'
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('terraform/plan.txt', 'utf8');
            const output = `#### Terraform Plan 🏗️
            \`\`\`
            ${plan}
            \`\`\`
            *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      - name: 'Terraform Apply'
        if: github.ref == 'refs/heads/main'
        working-directory: terraform
        run: terraform apply -auto-approve tfplan
```

## 🔍 Ejemplo 9: Monitoreo y alertas

```yaml
name: Health Check and Monitoring
on:
  schedule:
    - cron: '*/15 * * * *' # Cada 15 minutos

jobs:
  health-check:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - uses: 'google-github-actions/auth@v2'
        with:
          project_id: 'mi-proyecto'
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/my-repo'

      - name: 'Check Cloud Run service'
        id: health
        run: |
          SERVICE_URL=$(gcloud run services describe mi-app \
            --region=us-central1 \
            --format='value(status.url)')

          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $SERVICE_URL/health)

          if [ $HTTP_CODE -eq 200 ]; then
            echo "status=healthy" >> $GITHUB_OUTPUT
          else
            echo "status=unhealthy" >> $GITHUB_OUTPUT
            echo "http_code=$HTTP_CODE" >> $GITHUB_OUTPUT
          fi

      - name: 'Send alert if unhealthy'
        if: steps.health.outputs.status == 'unhealthy'
        run: |
          # Enviar alerta a Slack/Discord/email
          gcloud logging write my-app-alerts \
            "Service health check failed with HTTP code: ${{ steps.health.outputs.http_code }}" \
            --severity=ERROR

          # También podríamos usar Secret Manager para obtener webhook URLs
          WEBHOOK_URL=$(gcloud secrets versions access latest --secret="slack-webhook-url")
          curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Health check failed for mi-app: HTTP ${{ steps.health.outputs.http_code }}\"}" \
            "$WEBHOOK_URL"
```

---

# 🛡️ Mejores prácticas de seguridad avanzadas

## 🔐 Configuración de roles con principio de menor privilegio

### Para diferentes tipos de deployment:

```bash
# Para aplicaciones web (Cloud Run)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}" \
  --role="roles/run.developer"

# Para microservicios (GKE)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}" \
  --role="roles/container.developer"

# Para funciones serverless
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}" \
  --role="roles/cloudfunctions.developer"

# Para manejo de datos
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${REPO}" \
  --role="roles/bigquery.dataEditor"
```

## 🎯 Conditional IAM con attribute mapping avanzado

```bash
# Restricción por rama específica
gcloud iam workload-identity-pools providers create-oidc "production-only" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="Production Branch Only" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.ref == 'refs/heads/main' && assertion.repository == '${GITHUB_ORG}/${REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Restricción por actor específico
gcloud iam workload-identity-pools providers create-oidc "trusted-actors" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="Trusted Actors Only" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.actor in ['admin1', 'admin2', 'deploy-bot']" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

## 📊 Monitoreo y auditoría

### Configurar alertas de IAM:

```yaml
- name: 'Setup IAM monitoring'
  run: |
    # Crear una alerta cuando se usen las credenciales
    gcloud alpha monitoring policies create --policy-from-file=- <<EOF
    {
      "displayName": "Workload Identity Usage Alert",
      "conditions": [
        {
          "displayName": "Authentication events",
          "conditionThreshold": {
            "filter": "resource.type=\"iam_workload_identity_pool\" AND protoPayload.methodName=\"google.iam.v1.WorkloadIdentityPools.GenerateTrustedIdentityAccessToken\"",
            "comparison": "COMPARISON_GREATER_THAN",
            "thresholdValue": 0
          }
        }
      ],
      "notificationChannels": ["${NOTIFICATION_CHANNEL}"],
      "alertStrategy": {
        "autoClose": "604800s"
      }
    }
    EOF
```

---

# 🐛 Troubleshooting avanzado

## 🔧 Scripts de diagnóstico

```yaml
- name: 'Diagnóstico completo'
  run: |
    echo "=== Información de autenticación ==="
    gcloud auth list --format="table(account,status,type)"

    echo "=== Configuración actual ==="
    gcloud config list --format="table(section.property,value)"

    echo "=== Test de permisos IAM ==="
    gcloud projects get-iam-policy ${{ steps.auth.outputs.project_id }} \
      --flatten="bindings[].members" \
      --filter="bindings.members:principalSet" \
      --format="table(bindings.role,bindings.members)"

    echo "=== Verificación de tokens ==="
    if [ -n "${{ steps.auth.outputs.access_token }}" ]; then
      echo "Access token presente: ✓"
      # Verificar expiración del token
      gcloud auth print-access-token --format="get()" | \
      python3 -c "
      import base64, json, sys
      token = sys.stdin.read().strip()
      # Decodificar JWT payload (simplificado)
      header, payload, signature = token.split('.')
      decoded = base64.urlsafe_b64decode(payload + '==')
      print('Token payload:', json.loads(decoded))
      "
    fi

    echo "=== Test de conectividad a APIs ==="
    curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
      "https://cloudresourcemanager.googleapis.com/v1/projects/${{ steps.auth.outputs.project_id }}" | \
      jq '.projectId // "ERROR: No se pudo acceder al proyecto"'
```

## 📋 Checklist de debugging

```markdown
### ✅ Checklist de troubleshooting

#### Configuración básica:

- [ ] `actions/checkout@v4` se ejecuta antes de auth
- [ ] Los permisos `id-token: write` están configurados
- [ ] El `workload_identity_provider` tiene el formato correcto
- [ ] El `project_id` es correcto

#### Workload Identity Pool:

- [ ] El pool existe y está activo
- [ ] El provider está configurado correctamente
- [ ] Los attribute mappings incluyen los claims necesarios
- [ ] Las attribute conditions permiten el acceso

#### IAM y permisos:

- [ ] El principalSet tiene los roles necesarios
- [ ] Los roles son suficientes para las operaciones requeridas
- [ ] No hay políticas organizacionales que bloqueen el acceso

#### GitHub Actions:

- [ ] El repositorio está en la organización correcta
- [ ] La rama coincide con las attribute conditions
- [ ] El actor tiene permisos en el repositorio
```
