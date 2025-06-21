FROM node:alpine AS development

WORKDIR /usr/src/app 

# Instalar pnpm
RUN npm install -g pnpm

# Copiar configuración de workspace
COPY pnpm-workspace.yaml ./

# Copiar archivos de configuración y dependencias del root
COPY package.json pnpm-lock.yaml ./

# Copiar package.json específico de la aplicación
COPY apps/notification/package.json ./apps/notification/

# Copiar archivos de configuración de TypeScript y NestJS
COPY tsconfig.json nest-cli.json ./

# Instalar solo dependencias necesarias para notification
RUN pnpm install --filter notification --frozen-lockfile

# Copiar código fuente completo (filtrado por .dockerignore)
COPY libs/ ./libs/
COPY apps/notification/ ./apps/notification/

# Build
RUN pnpm run build notification

FROM node:alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar configuración de workspace
COPY pnpm-workspace.yaml ./

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY apps/notification/package.json ./apps/notification/

# Instalar solo dependencias de producción para notification
RUN pnpm install --filter notification --prod --frozen-lockfile && pnpm store prune

# Copiar build desde etapa anterior
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/notification/main"]