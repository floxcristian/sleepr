# Subir código con GitHub Actions a Google Cloud Artifact Registry

Si tienes código de aplicación en GitHub y necesitas subirlo a un registro Docker, hay muchas opciones. Este artículo va a cubrir solo una: subir a Google Cloud Artifact Registry usando GitHub Actions. Y lo vamos a hacer sin usar claves de service account aprovechando Google Cloud Workload Identity Federation (WIF).

## Por dónde empezar
### Algunas cosas que necesitamos primero
Para seguir lo que voy a demostrar, necesitas un par de cosas:

**☑️ Un proyecto de Google Cloud:** este será el proyecto donde crearemos nuestros recursos, que incluye un repositorio de Artifact Registry y algunos recursos IAM. Habilita las APIs de IAM Service Account Credentials y Artifact Registry en este proyecto.

**☑️ Google Cloud CLI:** usaremos el CLI de gcloud para interactuar con Google Cloud. Si no quieres instalarlo en tu máquina local, puedes usar Cloud Shell en la consola de Google Cloud que tiene gcloud integrado.

**☑️ Un repositorio de GitHub:** necesitarás un repositorio de GitHub con un Dockerfile para que puedas construir y subir tu imagen de contenedor al Artifact Registry.

### Archivo de workflow de GitHub Actions
Los workflows de GitHub Actions típicamente se almacenan como archivos yaml en el directorio .github/workflows/ de tu repositorio. Aquí está el archivo de workflow de GitHub Actions con el que estamos trabajando:

```yaml
name: Push to Artifact Registry

on:
    push:
      branches: [ "main" ]

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

Este workflow se autenticará con Google Cloud usando la GitHub Action de autenticación de Google Cloud y usará Docker para autenticarse y subir al registro. Para hacer que este workflow funcione necesitamos configurar algunos recursos de Google Cloud y agregar esos valores para nuestras variables de entorno. Asegúrate de agregar el valor para PROJECT_ID donde tengas permisos para crear recursos. El valor para IMAGE_NAME puede ser cualquier cosa — se creará la primera vez que este workflow se ejecute:

```yaml
...
env:
  IMAGE_NAME: 'my-app-image'
  PROJECT_ID: 'my-project-id'
  AR_REPO_LOCATION: ''
  AR_URL: ''
  SERVICE_ACCOUNT: '' 
  WORKLOAD_IDENTITY_PROVIDER: ''
...
```

¡Buen comienzo! A continuación necesitaremos un repositorio de Artifact Registry.

## Repositorio de Artifact Registry
Artifact Registry es la solución de gestión de artefactos de construcción de Google Cloud. Soporta varios tipos de repositorios como apt, Maven y Python. Para nuestros propósitos, queremos un repositorio Docker. Puedes usar uno existente, o crear uno nuevo con este comando gcloud:

```bash
gcloud artifacts repositories create my-ar-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Example Docker repository"
```

Esto creará un repositorio Docker llamado my-ar-repo en la región us-central1. Puedes verlo en la consola en la página de repositorios de Artifact Registry. Para nuestro archivo YAML de workflow, necesitamos la URL del Artifact Registry. Recuperemos eso con el siguiente comando:

```bash
gcloud artifacts repositories describe my-ar-repo --location=us-central1
```

La salida se verá así:

```
Encryption: Google-managed key
Registry URL: us-central1-docker.pkg.dev/my-project-id/my-ar-repo
Repository Size: 5026.459MB
createTime: '2024-03-13T23:19:57.701232Z'
description: Example Docker repository
format: DOCKER
mode: STANDARD_REPOSITORY
name: projects/my-project-id/locations/us-central1/repositories/my-ar-repo
updateTime: '2024-03-18T17:08:49.658081Z'
```

Tomemos ese valor para la Registry URL y pongámoslo en nuestro archivo de workflow de GitHub Actions, junto con la ubicación del repositorio:

```yaml
...
env:
  IMAGE_NAME: 'my-app-image'
  PROJECT_ID: 'my-project-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/my-project-id/my-ar-repo'
  SERVICE_ACCOUNT: '' 
  WORKLOAD_IDENTITY_PROVIDER: ''
...
```

## Service account
A continuación, necesitamos un service account que sirva como la identidad que va a estar subiendo al repositorio de Artifact Registry. Crea un service account con gcloud:

```bash
gcloud iam service-accounts create github-actions-service-account \
 --description="A service account for use in a GitHub Actions workflow" \
 --display-name="GitHub Actions service account."
```

Ahora que tenemos un service account (véelo en la consola bajo IAM), agreguemos el email del service account a nuestro archivo YAML. El formato es SERVICE_ACCT_NAME@PROJECT_ID.iam.gserviceaccount.com:

```yaml
...
env:
  IMAGE_NAME: 'my-app-image'
  PROJECT_ID: 'my-project-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/my-project-id/my-ar-repo'
  SERVICE_ACCOUNT: 'github-actions-service-account@my-project-id.iam.gserviceaccount.com' 
  WORKLOAD_IDENTITY_PROVIDER: ''
...
```

Por defecto, el service account no tiene permisos en ningún recurso del proyecto. Solo necesitamos que pueda subir builds a nuestro repositorio de Artifact Registry. Hagámoslo posible:

```bash
gcloud artifacts repositories add-iam-policy-binding my-ar-repo \
  --location=us-central1 \
  --role=roles/artifactregistry.createOnPushWriter \
  --member=serviceAccount:github-actions-service-account@my-project-id.iam.gserviceaccount.com
```

El comando anterior otorga el rol IAM de Artifact Registry Create-on-Push Writer a nuestro service account, pero solo para nuestro repositorio particular de Artifact Registry. Podríamos otorgarlo en todo el proyecto agregando el binding IAM a la política IAM del proyecto, pero dado que los repositorios de Artifact Registry tienen sus propias políticas IAM, podemos practicar algunos privilegios mínimos y reducir el alcance a solo el que estamos usando.

Con eso, nuestro service account puede subir builds a nuestro Artifact Registry. Bueno, en realidad no — ahora necesitamos una forma de decirle que lo haga.

**Nota:** Si la imagen de aplicación ya existiera en nuestro repositorio, entonces roles/artifactregistry.writer sería suficiente. Estamos usando roles/artifactregistry.createOnPushWriter en su lugar porque en el primer push, necesita poder crear la imagen inicial para nuestra aplicación.

## Workload Identity Federation
Históricamente, una forma de acceder programáticamente a recursos con un service account ha sido usar claves JSON para autenticarse con sus credenciales. Eso sigue siendo posible, pero es altamente desaconsejado debido al riesgo de seguridad asociado con gestionarlas. Verás señales de precaución sobre eso en toda la consola y documentación de Google Cloud:

**TLDR: las claves de service account son malas**

Workload Identity Federation ofrece una alternativa. Nos permite otorgar a identidades externas la habilidad de suplantar un service account sin la carga de las claves de service account. Nuestro objetivo es crear un proveedor de workload identity pool para nuestro repositorio de GitHub para que podamos suplantar nuestro service account desde un workflow de GitHub Actions.

### Crear un workload identity pool
Antes de que podamos crear un proveedor, necesitamos crear un workload identity pool. Un workload identity pool es un recurso de Google Cloud que se usa para gestionar identidades externas. Google Cloud sugiere crear un nuevo pool para cada entorno no-Google Cloud que necesite acceder a recursos en nuestro proyecto. Para nuestro caso, creemos un workload identity pool para el entorno de desarrollo de nuestra app:

```bash
gcloud iam workload-identity-pools create "my-app-dev-pool" \
  --project=PROJECT_ID \
  --location=global \
  --display-name="Identity pool for my test app"
```

Esto crea un workload identity pool en tu proyecto. Véelo en la consola bajo IAM.

### Crear un proveedor de workload identity pool
Un proveedor de workload identity pool describe la relación entre Google Cloud y un proveedor de identidad (IdP) que soporta OpenID Connect (OIDC). Debe ser creado dentro de un workload identity pool:

```bash
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
 --location="global" \
 --workload-identity-pool="my-app-dev-pool" \
 --display-name="Provider for GitHub Actions" \
 --issuer-uri="https://token.actions.githubusercontent.com" \
 --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"
```

El subcomando create-oidc indica que queremos crear un proveedor OpenID Connect (OIDC) en nuestro pool. GitHub usa OIDC para autenticarse con diferentes proveedores de nube (ver la documentación de GitHub sobre esto aquí). El parámetro issuer-uri especifica la URL del proveedor, como se indica en la documentación OIDC de GitHub.

El parámetro --attribute-mapping lista nuestro mapeo de atributos. El mapeo de atributos define cómo se derivan los valores de un token externo y se mapean a los atributos del token de Google Security Token Service (STS). El valor para este parámetro es una lista separada por comas de mapeos en la forma de TARGET_ATTRIBUTE=SOURCE_EXPRESSION. Estos atributos serán referenciados más tarde cuando configuremos permisos.

Aprende más sobre el mapeo de atributos en la documentación de Google Cloud sobre workload identity federation.

Con un proveedor de workload identity pool en su lugar podemos agregar el valor a nuestro archivo YAML de workflow. Primero, recupera el nombre completo del proveedor:

```bash
gcloud iam workload-identity-pools providers describe github-actions-provider \
  --location=global \
  --workload-identity-pool="my-app-dev-pool"
```

La salida incluirá el nombre que estará en el formato projects/PROJECT_NUMBER/locations/POOL_LOCATION/workloadIdentityPools/POOL_NAME/providers/PROVIDER_NAME. Eso es lo que necesitamos para la variable de entorno WORKLOAD_IDENTITY_PROVIDER:

```yaml
...
env:
  IMAGE_NAME: 'my-app-image'
  PROJECT_ID: 'my-project-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/my-project-id/my-ar-repo'
  SERVICE_ACCOUNT: 'github-actions-service-account@my-project-id.iam.gserviceaccount.com' 
  WORKLOAD_IDENTITY_PROVIDER: 'projects/123456789/locations/global/workloadIdentityPools/my-app-dev-pool/providers/github-actions-provider'
...
```

## Configurando permisos
Los únicos permisos que hemos otorgado hasta ahora han sido a nuestro service account para subir al repositorio de Artifact Registry. Ahora que tenemos un proveedor de workload identity, necesitamos otorgarle permiso para actuar como el service account.

Si quisiéramos otorgar permisos de suplantación de service account a una cuenta de usuario o principal de service account, otorgaríamos el rol Service Account Token Creator en la política IAM del service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-service-account@my-project-id.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator \
  --member=user:roger@myemail.com
```

Este comando permitiría a mi cuenta de usuario actuar como el service account y acceder a lo que sea que el service account pueda acceder. Con Workload Identity Federation, es el mismo concepto con 2 diferencias: el rol IAM y el principal (o el parámetro member en el comando anterior).

En lugar de otorgar el rol Service Account Token Creator (roles/iam.serviceAccountTokenCreator) a nuestro principal de workload identity pool, necesitamos otorgar el rol Workload Identity User (roles/iam.workloadIdentityUser) en su lugar. Este rol permite al principal suplantar service accounts desde workloads federados.

En cuanto al principal, los prefijos user y serviceAccount se usan para cuentas de usuario y service accounts, respectivamente, seguidos por una dirección de email:

```
user:roger@myemail.com

serviceAccount:my-service-account@my-project-id.iam.gserviceaccount.com
```

Workload Identity Federation sin embargo usa principalSet como prefijo, seguido por un identificador de miembro que incluye el identity pool y un atributo del mapeo de atributos del proveedor:

```
principalSet://iam.googleapis.com/WORKLOAD_IDENTITY_POOL_NAME/attribute.ATTRIBUTE_NAME/ATTRIBUTE_VALUE
```

Por ejemplo, el siguiente principal puede ser usado para otorgar acceso a identidades externas que vienen de cualquier repositorio de GitHub que tu organización posea:

```
principalSet://iam.googleapis.com/WORKLOAD_IDENTITY_POOL_NAME/attribute.owner/your-github-organization
```

Podemos usar cualquiera de los atributos que mapeamos en nuestro proveedor OIDC de workload identity federation anteriormente. El principal que usaremos, sin embargo, reducirá el acceso a identidades externas correspondientes con un repositorio particular de GitHub usando attribute.repository:

```
principalSet://iam.googleapis.com/WORKLOAD_IDENTITY_POOL_NAME/attribute.repository/github-repo-owner/github-repo-name
```

**Nota:** Además de atributos, puedes otorgar permisos a identidades externas por sujeto y por grupo. Aprende más sobre eso aquí.

Así que tenemos un rol IAM y un principal al cual otorgárselo. Agreguemos un binding IAM a la política IAM de nuestro service account. Primero, recupera el nombre del workload identity pool:

```bash
gcloud iam workload-identity-pools describe "my-app-dev-pool" \
  --location=global
```

El valor estará en el formato projects/PROJECT_NUMBER/locations/POOL_LOCATION/workloadIdentityPools/POOL_NAME

Es una cadena larga, así que pongamos esto en una variable de entorno:

```bash
export WIP_POOL=projects/123456789/locations/global/workloadIdentityPools/my-app-dev-pool
```

Y finalmente, agreguemos el binding a la política IAM del service account. Asegúrate de actualizar los valores para GITHUB_REPO_OWNER y GITHUB_REPO_NAME con valores para el repositorio de GitHub desde el que planeas ejecutar el workflow:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-service-account@my-project-id.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member=principalSet://iam.googleapis.com/${WIP_POOL}/attribute.repository/GITHUB_REPO_OWNER/GITHUB_REPO_NAME
```

Con este binding en su lugar, GitHub Actions puede usar Workload Identity Federation para autenticarse como tu service account y subir builds a tu Artifact Registry. Hay una cosa más que podemos hacer para reducir aún más el alcance del acceso: especificar una condición de atributo en el proveedor de identity pool.

Una condición de atributo es una expresión que verifica un atributo y debe evaluarse como verdadera para una credencial dada para que sea aceptada. Por ejemplo, podemos definir una condición de atributo que verifique si el atributo repository_owner coincide con una organización de GitHub o usuario de GitHub que posee un repositorio:

```bash
gcloud iam workload-identity-pools providers update-oidc \
  github-actions-provider \
  --project=PROJECT_ID \
  --location=global \
  --workload-identity-pool=my-app-dev-pool \
  --attribute-condition="assertion.repository_owner == 'GITHUB_REPO_OWNER'"
```

En este ejemplo, la restricción agregada por esta condición de atributo es redundante, ya que el binding de política IAM ya está limitado a un propietario de repositorio particular. Sin embargo, si por alguna razón la política IAM alguna vez cambia para ser más amplia, esto seguirá restringiendo el acceso al propietario de repositorio de GitHub especificado.

## Vamos a probar
Antes de que podamos probar esto, necesitarás un repositorio con un Dockerfile válido.

Aquí está el archivo yaml final para nuestro workflow:

```yaml
name: Push to Artifact Registry

on:
    push:
      branches: [ "main" ]

env:
  IMAGE_NAME: 'my-app-image'
  PROJECT_ID: 'my-project-id'
  AR_REPO_LOCATION: 'us-central1'
  AR_URL: 'us-central1-docker.pkg.dev/my-project-id/my-ar-repo'
  SERVICE_ACCOUNT: 'github-actions-service-account@my-project-id.iam.gserviceaccount.com' 
  WORKLOAD_IDENTITY_PROVIDER: 'projects/123456789/locations/global/workloadIdentityPools/my-app-dev-pool/providers/github-actions-provider'

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

Pondremos esta configuración en nuestro repositorio de GitHub en .github/workflows/push-to-ar.yml. Tan pronto como hagas merge de este archivo en tu rama main, iniciará el workflow y si todos los permisos y recursos están en su lugar, tendrás un build de tu aplicación en tu Artifact Registry. Verifica visitando la página de Artifact Registry en la Consola de Google Cloud.

## ¿Qué sigue?
Podríamos decir que la estrella del espectáculo es la GitHub Action de Google Auth - eso es lo que está usando el Workload Identity Provider y el service account para acceder a tu proyecto de Google Cloud. Si planeas hacer otras cosas con esta autenticación, solo asegúrate de usar un service account que tenga el acceso correcto a esas cosas. Por ejemplo, si estás usando la GitHub Action de Secret Manager para acceder a secretos de Secret Manager, asegúrate de que el service account tenga el rol IAM Secret Manager Secret Accessor en el proyecto o secreto. Para echar un vistazo a todas las actions disponibles, revisa los repositorios disponibles en la organización de GitHub de Google GitHub Actions.
