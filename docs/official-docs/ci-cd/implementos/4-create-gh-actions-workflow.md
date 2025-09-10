## Paso 1: Configurar el workflow

Usaremos los siguientes pasos para configurar el workflow:

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

### 🚀 **Activar el workflow**

1. Haz push del archivo a la rama `main` de tu repositorio
2. El workflow se ejecutará automáticamente
3. Si todo está configurado correctamente, tendrás tu imagen en Artifact Registry
4. Verifica visitando la página de Artifact Registry en la consola de Google Cloud
