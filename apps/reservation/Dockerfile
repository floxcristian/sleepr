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
COPY apps/reservation/ ./apps/reservation/

# Instalar dependencias
#RUN pnpm install -r

# Instalar dependencias específicas de la aplicación reservation
RUN cd apps/reservation && pnpm install

# Build
RUN pnpm run build reservation

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