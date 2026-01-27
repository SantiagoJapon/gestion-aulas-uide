FROM node:20-alpine

# Instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Cambiar ownership del directorio
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Copiar archivos de dependencias
COPY --chown=nodejs:nodejs package*.json ./

# Instalar dependencias (solo producción en build final)
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY --chown=nodejs:nodejs . .

# Exponer puerto
EXPOSE 3000

# Usar dumb-init para manejo correcto de señales
CMD ["dumb-init", "node", "src/index.js"]









