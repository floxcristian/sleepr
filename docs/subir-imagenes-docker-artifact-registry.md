- Instalamos el SDK de Google Cloud como se indica [aquí](https://cloud.google.com/sdk/docs/install-sdk?authuser=2&hl=es-419), que permitirá comunicarnos con Google Cloud desde nuestra CLI.
  -- Si tenemos Windows podemos usar el instalador o el script que indica la guía desde la Powershell:

```
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")

& $env:Temp\GoogleCloudSDKInstaller.exe
```

- Ejecutamos:

```
gcloud config configurations create sleepr
```

- Copiamos el ID del proyecto en Google Cloud y ejecutamos:

```
gcloud config set project <ID>
```

- Luego deberíamos loguearnos con para poder hacer pull o push de nuestras imagenes.

```
gcloud auth application-default login
```

- Después de loguearnos deberíamos poder ver nuestros repositorios con:

```
gcloud artifacts repositories list
```

- Peguemos el siguiente comando para configurar docker y nose quemas...

```
## En windows:
gcloud auth configure-docker us-east4-docker.pkg.dev

## En Mac/Linux:
```

gcloud auth configure-docker \
 us-east4-docker.pkg.dev

```

```

- Compilamos la app reservation desde la raiz con:

```
docker build -t reservation -f apps/reservation/Dockerfile .
```

- Tagueamos la imagen para subirla al Artifact Registry de Google Cloud pegando la ruta que sacamos del repositorio de GCP y al final le agregamos el nombre de la imagen:

```
docker tag reservation us-east4-docker.pkg.dev/sleepr-463202/reservation/production

```

- Pushiamos la imagen al Artifact Registry:

```
docker image push us-east4-docker.pkg.dev/sleepr-463202/reservation/production
```

Buildear la app auth:
docker build -t auth -f apps/auth/Dockerfile .

Buildear el servicio de notification:
docker build -t notification -f apps/notification/Dockerfile .

Buildear el servicio de payment:
docker build -t payment -f apps/payment/Dockerfile .
