FROM node:alpine AS development

WORKDIR /usr/src/app 

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración y dependencias
COPY package.json pnpm-lock.yaml ./

# Copiar archivos de configuración de TypeScript y NestJS
COPY tsconfig.json nest-cli.json ./

# Instalar dependencias
RUN pnpm install

# Copiar código fuente
COPY libs/ ./libs/
COPY apps/auth/ ./apps/auth/

# Instalar dependencias
# RUN pnpm install -r 

# Instalar dependencias específicas de la aplicación auth
RUN cd apps/auth && pnpm install

# Build
RUN pnpm run build auth

FROM node:alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --prod  && pnpm store prune

# Copiar build desde etapa anterior
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/apps/auth/main"]
#EXPOSE 3000