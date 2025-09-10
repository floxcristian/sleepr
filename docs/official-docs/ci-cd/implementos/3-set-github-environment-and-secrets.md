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
