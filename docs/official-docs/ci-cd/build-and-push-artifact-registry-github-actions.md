# Guía: Build y Push a Google Artifact Registry con GitHub Actions

## Introducción

En esta guía, exploraremos cómo configurar un workflow de CI/CD usando GitHub Actions para automatizar el proceso de build y deployment, y subir artefactos a Google Artifact Registry. Cubriremos los siguientes temas:

- Configuración del workflow
- Integración de GitHub Actions con Google Cloud
- Gestión segura de autenticación

Siguiendo esta guía, podrás optimizar tu workflow de desarrollo y mejorar la consistencia del deployment.

## Prerrequisitos

Antes de comenzar, asegúrate de tener los siguientes prerrequisitos:

- Una cuenta de GitHub
- Una cuenta de Google Cloud
- Un proyecto de Google Cloud
- Un repositorio de Google Cloud Artifact Registry

## Paso 1: Configurar el workflow

Ahora que tenemos nuestro repositorio y repositorio de Artifact Registry configurados, podemos configurar el workflow. Usaremos los siguientes pasos para configurar el workflow:

1. Crea un nuevo archivo llamado `.github/workflows/build.yml` en la raíz de tu repositorio.
2. Añade el siguiente código al archivo:

```yaml
name: Build y Deploy

on:
  push:
    tags:
      - '*'

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      IMAGE_NAME: api # nombre de tu imagen
      PROJECT_ID: membagii # id de tu proyecto
      ARTIFACT_REGION: asia-southeast2-docker.pkg.dev # Región del Artifact Registry
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Github Tag Release Version # establecer versión de release desde el nombre del tag
        id: latestTag
        run: |-
          echo "Tag name from GITHUB_REF_NAME: $GITHUB_REF_NAME"
          echo "RELEASE_VERSION=release-${{ github.ref_name }}" >> $GITHUB_ENV

      - name: Google Cloud Platform Auth
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.SERVICE_ACCOUNT_KEY }}'

      - name: 'Set up Cloud SDK'
        uses: google-github-actions/setup-gcloud@v1

      - name: Build Docker Image
        run: |-
          docker build -t ${{ env.IMAGE_NAME }}:latest .

      - name: Configure Docker Client
        run: |-
          gcloud auth configure-docker --quiet
          gcloud auth configure-docker ${{ env.ARTIFACT_REGION }} --quiet

      - name: Push Docker Image to Artifact Registry
        run: |-
          docker tag ${{ env.IMAGE_NAME }}:latest ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}:latest
          docker tag ${{ env.IMAGE_NAME }}:latest ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}:release
          docker tag ${{ env.IMAGE_NAME }}:latest ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}:${{ env.RELEASE_VERSION }}
          docker push ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}:latest
          docker push ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}:release
          docker push ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}:${{ env.RELEASE_VERSION }}

      - name: Call Webhook # opcional
        uses: joelwmale/webhook-action@2.3.2
        env:
          IMAGE_REGISTRY: Google Cloud Artifact
          IMAGE_REPOSITORY: ${{ env.ARTIFACT_REGION }}/${{ env.PROJECT_ID }}/images/${{ env.IMAGE_NAME }}
          IMAGE_TAG: ${{ env.RELEASE_VERSION }}
        with:
          url: ${{ secrets.WEBHOOK_URL }}/api/v1/workflow-github?telegram_chat_id=${{ env.TELEGRAM_CHAT_ID }}&slack_channel=${{ env.SLACK_CHANNEL_ID }}&registry=${{ env.IMAGE_REGISTRY }}
          body: '{"push_data":{"tag":"${{ env.IMAGE_TAG }}"},"repository":{"name":"${{ env.IMAGE_REPOSITORY }}"}}'
```

> **ℹ️ Información:** Este workflow se activará cada vez que se haga un push con etiquetado de versión al repositorio. Primero hará checkout del código del repositorio. Luego, configurará Docker, que es una herramienta para hacer build y push de imágenes Docker. A continuación, se autenticará en Google Artifact Registry usando las credenciales proporcionadas. Finalmente, hará build y push de la imagen Docker al Artifact Registry.

## Paso 2: Integrar GitHub Actions con Google Cloud

Para integrar GitHub Actions con Google Cloud, necesitarás crear un Service Account y generar un archivo de clave JSON. Puedes hacer esto siguiendo estos pasos:

### 5.1 Crear cuenta de servicio

Crea una nueva cuenta de servicio en la consola de Google Cloud. Puedes hacer esto navegando a la sección **IAM y administración** de la consola de Google Cloud y haciendo clic en el botón **"Create service account"**. Sigue las instrucciones para crear una nueva cuenta de servicio con el nombre y permisos deseados.

![Create Service Account](Create%20Service%20Account)

### 5.2 Otorgar permisos

Otorga a la cuenta de servicio los permisos necesarios para acceder al Artifact Registry. Puedes hacer esto navegando a la sección Artifact Registry de la consola de Google Cloud y haciendo clic en el botón **"Add member"**. Sigue las instrucciones para añadir la cuenta de servicio con los permisos deseados.

![Grant Access IAM](Grant%20Access%20IAMGrant%20Access%20IAM)

![Grant Access Repository Artifact](Grant%20Access%20Repo%20ArtifactGrant%20Access%20Repository%20Artifact)

### 5.3 Generar clave JSON

Genera un archivo de clave JSON para la cuenta de servicio. Puedes hacer esto navegando a la sección de cuentas de servicio de la consola de Google Cloud y haciendo clic en la pestaña **"Keys"**. Sigue las instrucciones para generar un nuevo archivo de clave JSON para la cuenta de servicio.

![Create New Service Key](Create%20New%20Service%20Key)

### 5.4 Añadir credenciales a GitHub

Una vez que hayas creado la cuenta de servicio y generado el archivo de clave JSON, puedes añadir las credenciales a tu repositorio de GitHub. Puedes hacer esto navegando a la pestaña **"Settings"** de tu repositorio en el sitio web de GitHub y haciendo clic en el botón **"Secrets"**. Sigue las instrucciones para añadir el archivo de clave JSON como un secreto con el nombre `SERVICE_ACCOUNT_KEY`.

## Paso 6: Gestionar la autenticación de forma segura

Para gestionar la autenticación de forma segura, puedes usar los **secrets** de GitHub Actions. Los secrets son variables de entorno cifradas a las que puede acceder tu workflow. Puedes hacer esto siguiendo estos pasos:

### 6.1 Crear secret en GitHub

Crea un nuevo secret en tu repositorio de GitHub. Puedes hacer esto navegando a la pestaña **"Settings"** de tu repositorio en el sitio web de GitHub y haciendo clic en el botón **"Secrets"**. Sigue las instrucciones para crear un nuevo secret con el nombre y valor deseados. En este caso, usaremos el archivo de clave JSON como valor.

![Github Action Secret](Github%20Action%20SecretGithub%20Actions)

### 6.2 Añadir secret al workflow

Añade el secret a tu workflow. Puedes hacer esto añadiendo el siguiente código al job de build en tu workflow:

```yaml
- name: Google Cloud Platform Auth
  uses: 'google-github-actions/auth@v1'
  with:
    credentials_json: '${{ secrets.SERVICE_ACCOUNT_KEY }}'

- name: 'Set up Cloud SDK'
  uses: google-github-actions/setup-gcloud@v1
```

> **🔒 Seguridad:** Esto asegurará que el archivo de clave JSON se almacene y use de forma segura en tu workflow.

![Setup Instruction](Setup%20Instruction)

## Conclusión

Siguiendo esta guía, has aprendido cómo configurar un workflow de CI/CD usando GitHub Actions para automatizar el proceso de build y deployment, y subir artefactos a Google Artifact Registry. También has aprendido cómo integrar GitHub Actions con Google Cloud y gestionar la autenticación de forma segura.

### Beneficios obtenidos:

- ✅ **Automatización completa** del proceso de build y deployment
- ✅ **Integración segura** con Google Cloud Platform
- ✅ **Gestión de versiones** mediante tags de Git
- ✅ **Almacenamiento eficiente** de artefactos en Artifact Registry

Esto asegura un proceso de deployment fluido, permitiendo el almacenamiento y recuperación eficiente de artefactos para tu aplicación.

# Referencias

- Usar Service Account pero sin usar las claves de Service Account, en su lugar, usar Service Account para crear tokens federados de corta duración
- Método directo

[Workload Identity Federation](https://www.youtube.com/watch?v=jNb2CFsHjsY)
[Usar WIF desde Service Account usando método directo](https://github.com/google-github-actions/auth?tab=readme-ov-file#preferred-direct-workload-identity-federation)
