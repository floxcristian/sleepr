FROM node:alpine AS development

WORKDIR /usr/src/app 

# Instalar pnpm
RUN npm install -g pnpm

# Copiar configuración de workspace
COPY pnpm-workspace.yaml ./

# Copiar archivos de configuración y dependencias del root
COPY package.json pnpm-lock.yaml ./

# Copiar package.json específico de la aplicación
COPY apps/reservation/package.json ./apps/reservation/

# Copiar archivos de configuración de TypeScript y NestJS
COPY tsconfig.json nest-cli.json ./

# Instalar todas las dependencias del workspace (compartidas)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY libs/ ./libs/
COPY apps/reservation/ ./apps/reservation/

# Build
RUN pnpm run build reservation

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
COPY apps/reservation/package.json ./apps/reservation/

# Instalar solo dependencias de producción para reservation
RUN pnpm install --filter reservation --prod --frozen-lockfile && pnpm store prune

# Copiar build desde etapa anterior
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/reservation/main"]