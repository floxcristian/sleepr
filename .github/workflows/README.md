# 🔄 GitHub Actions Workflows

## 📁 Estructura de Workflows

| Archivo                                              | Ambiente      | Branch    | Descripción                         |
| ---------------------------------------------------- | ------------- | --------- | ----------------------------------- |
| [`deploy-production.yml`](./deploy-production.yml)   | 🏭 Producción | `main`    | Deploy a GCP Artifact Registry      |
| [`deploy-development.yml`](./deploy-development.yml) | 🔧 Desarrollo | `develop` | Deploy a infraestructura On-Premise |

## 🎯 Triggers

### Automáticos

- **Push a `main`** → Deploy producción (todos los países)
- **Push a `develop`** → Deploy desarrollo (todos los países)
- **PR hacia `main/develop`** → Solo validación (build + tests)

### Manuales

- **Workflow Dispatch** → Deploy selectivo por país(es)

## 🌍 Matrix Strategy

Cada workflow ejecuta **12 jobs** en paralelo:

- ✅ 3 países: `chile`, `peru`, `spain`
- ✅ 4 servicios: `auth`, `reservation`, `notification`, `payment`

## 🔧 Configuración Requerida

### 📋 GitHub Environments

```
production-chile    → Variables y Secrets para GCP Chile
production-peru     → Variables y Secrets para GCP Perú
production-spain    → Variables y Secrets para GCP España
development-chile   → Variables y Secrets para On-Premise Chile
development-peru    → Variables y Secrets para On-Premise Perú
development-spain   → Variables y Secrets para On-Premise España
```

### 🔑 Variables por Environment (Ejemplo)

**Producción**:

```bash
PROJECT_ID=sleepr-chile-463202
REGISTRY=southamerica-west1-docker.pkg.dev
GAR_LOCATION=southamerica-west1
```

**Desarrollo**:

```bash
REGISTRY=registry.sleepr-dev.local
SERVER_HOST=dev-chile.sleepr.local
DEPLOY_PATH=/opt/sleepr/development/chile
```

## 📖 Documentación Completa

👉 **Guía detallada**: [`docs/github-actions-multi-environment-guide.md`](../../docs/github-actions-multi-environment-guide.md)

- ✅ Setup paso a paso
- ✅ Configuración de secrets/variables
- ✅ Troubleshooting
- ✅ Mejores prácticas
- ✅ Monitoreo y verificación

## 🚀 Uso Rápido

### Deploy Manual a Producción

1. **Actions** → **Build and Deploy to GCP Artifact Registry (Production)**
2. **Run workflow** → Seleccionar países
3. ✅ Deploy a `production-{country}` environments

### Deploy Manual a Desarrollo

1. **Actions** → **Build and Deploy to On-Premise Infrastructure (Development)**
2. **Run workflow** → Seleccionar países
3. ✅ Deploy a `development-{country}` environments

## ⚡ Status Check

### ✅ Producción Working

- Todos los secrets/variables configurados
- WIF Authentication funcionando
- Artifact Registry accesible
- Health checks OK

### ✅ Desarrollo Working

- SSH access configurado
- Registry on-premise accesible
- Docker Compose funcionando
- Health checks OK

---

**💡 Tip**: Siempre verificar los environments antes de hacer merge a `main` o `develop`
