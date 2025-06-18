FROM node:alpine AS development

WORKDIR /usr/src/app 

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración y dependencias
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./ 

# Instalar dependencias
RUN pnpm install

# Copiar código fuente
COPY libs/ ./libs/
COPY apps/reservation/ ./apps/reservation/
# ANTES: COPY . .

# Build
RUN pnpm run build

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

CMD ["node", "dist/apps/reservation/main"]
#EXPOSE 3000