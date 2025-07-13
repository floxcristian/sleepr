# Guía de Imágenes para Documentación

## 📁 Estructura de Carpetas

```
docs/images/
├── architecture/     # Diagramas de arquitectura del sistema
├── workflows/       # Screenshots de GitHub Actions
├── gcp/            # Capturas de Google Cloud Platform
└── setup/          # Imágenes de configuración paso a paso
```

## 📝 Convenciones de Nombres

### **Formato sugerido:**

```
{categoria}-{descripcion}-{numero}.{extension}

Ejemplos:
- architecture-microservices-overview.png
- workflow-github-actions-matrix.png
- gcp-artifact-registry-setup.png
- setup-service-account-creation.png
```

### **Buenas prácticas:**

- ✅ Usar **kebab-case** (guiones)
- ✅ Nombres **descriptivos** y claros
- ✅ Incluir **número** si es una secuencia
- ✅ Formatos: `.png` para screenshots, `.svg` para diagramas

## 🔗 Uso en Markdown

### **Rutas relativas desde docs/:**

```markdown
# Desde ci-cd.md o cualquier archivo en docs/

![Arquitectura](images/architecture/microservices-overview.png)

# Desde archivos en docs/official-docs/

![Setup](../images/setup/service-account-creation.png)
```

### **Con texto alternativo:**

```markdown
![Arquitectura de Microservicios](images/architecture/microservices-overview.png)
_Figura 1: Arquitectura general del sistema Sleepr_
```

## 📋 Tipos de Imágenes Sugeridas

### **📐 Architecture/**

- `microservices-overview.png` - Diagrama general
- `service-communication.png` - Comunicación entre servicios
- `database-schema.png` - Esquemas de BD

### **⚙️ Workflows/**

- `github-actions-matrix.png` - Ejecución en paralelo
- `pipeline-success.png` - Build exitoso
- `pipeline-failure.png` - Ejemplo de error

### **☁️ GCP/**

- `artifact-registry-repos.png` - Lista de repositorios
- `service-account-permissions.png` - Configuración IAM
- `docker-images-list.png` - Imágenes subidas

### **🔧 Setup/**

- `github-secrets-config.png` - Configuración de secrets
- `gcloud-auth-setup.png` - Configuración de autenticación
- `project-structure.png` - Estructura del proyecto
