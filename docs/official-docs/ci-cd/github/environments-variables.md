# Guía para Configurar Variables de Entorno y Secrets en GitHub (Producción)

Esta guía explica paso a paso cómo configurar variables de entorno y secrets para tus workflows de producción en GitHub Actions, siguiendo buenas prácticas para despliegues multi-país.

---

## 1. ¿Por qué usar Environments en GitHub?

Los **Environments** de GitHub te permiten:

- Aislar variables y secrets por ambiente (ej: `production-chile`, `production-peru`)
- Aplicar reglas de protección (aprobadores, temporizador de espera)
- Auditar y controlar los despliegues por país o región
- Cumplir con requisitos de seguridad y compliance empresarial

---

## 2. Acceder y Crear Environments en GitHub

1. Ingresa a tu repositorio en GitHub
2. Ve a **Settings** > **Environments**
3. Crea o selecciona el environment que deseas configurar (ejemplo: `production-chile`)
   - Repite este proceso para cada país o ambiente que necesites (ej: `production-peru`, `production-spain`)

---

## 3. Agregar Variables de Entorno (Variables)

1. Dentro del environment, haz clic en **Add variable**
2. Ingresa el nombre y valor de la variable (ver tabla de ejemplo)
3. Haz clic en **Save variable**

### Ejemplo de variables para producción (por país):

| Nombre de Variable | Valor de Ejemplo                    | Descripción                    |
| ------------------ | ----------------------------------- | ------------------------------ |
| `PROJECT_ID`       | `sleepr-chile-463202`               | ID del proyecto GCP            |
| `REGISTRY`         | `southamerica-west1-docker.pkg.dev` | Endpoint del Artifact Registry |
| `GAR_LOCATION`     | `southamerica-west1`                | Región del Artifact Registry   |
| `REGION`           | `southamerica-west1`                | Región de GCP                  |

> **Importante:** Repite este proceso para cada environment (ej: `production-peru`, `production-spain`) con los valores correspondientes a cada país.

---

## 4. Agregar Secrets (Datos Sensibles)

1. Dentro del environment, haz clic en **Add secret**
2. Ingresa el nombre y valor del secret (ejemplo: service account, workload identity provider)
3. Haz clic en **Save secret**

### Ejemplo de secrets:

| Nombre del Secret     | Descripción                                   |
| --------------------- | --------------------------------------------- |
| `WIF_PROVIDER`        | Nombre del recurso Workload Identity Provider |
| `WIF_SERVICE_ACCOUNT` | Email de la Service Account de GCP            |

> **Tip:** Los secrets son cifrados y solo accesibles por los workflows que usan ese environment.

---

## 5. Buenas Prácticas

- **Nunca** guardes secrets o datos sensibles directamente en el archivo YAML del workflow.
- Usa **un environment por país** para máximo aislamiento y trazabilidad.
- Rota los secrets periódicamente y revisa los permisos de acceso.
- Activa reglas de protección en environments de producción (aprobadores requeridos, temporizador de espera).
- Documenta los nombres y usos de cada variable y secret para el equipo.

---

## 6. Ejemplo: Cómo usa el workflow estas variables

```yaml
jobs:
  build-and-deploy:
    environment:
      name: production-${{ matrix.country }}
    steps:
      - name: Autenticación con Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
      - name: Build Docker image
        run: |
          docker build -t ${{ vars.REGISTRY }}/${{ vars.PROJECT_ID }}/... .
```

---

## 7. Solución de Problemas (Troubleshooting)

- Si una variable o secret no se encuentra, revisa el nombre del environment y la ortografía.
- Asegúrate de que el job del workflow referencia el environment correcto (ej: `production-chile`).
- Verifica que los nombres de las variables y secrets coincidan exactamente con los usados en el workflow.
- Consulta la [documentación oficial de GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) para más detalles.

---

**¡Listo! Ahora tus workflows de producción estarán seguros, auditables y listos para despliegues empresariales multi-país.**
