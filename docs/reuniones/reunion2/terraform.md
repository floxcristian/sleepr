- Se usará un CI para desplegar arquitectura como codigo. Con eso será mas facil crear otro ambiente o crear otro cluster.
EL CI para los microservicios.

Proximos pasos:
- Conexiones, comuniacaciones, networking, dominios.

- Kubernetes maneja variables mediante los config map que se llaman en el archivo de manifiesto del deployment.
- Para las claves e información sensible se recomiendan los secrets de gh para tenerlos un poco mas confidencial.
- Hashicorp se usa para la infrastructura y los manifest vienen del lado del CI para los despliegues de los microservicios.
- El terraform va a deployar la infrastructura, va a crear los nodos pero luego en el gha vamos a desplegar.., hay que crear una configuración de autenticación para el cluster de gcp para poder hacer el apply de esos manifiestos y en esos manifiestos se inyectan las variables.
- Hay otras formas para hacerlo con secret manager, también se puede hacer inyección mednaite secret manager.


# Imagenes
- Dejamos las imagenes en el storage de Google o nos vamos por Cloudflare R2.