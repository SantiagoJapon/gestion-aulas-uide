# ====================================
# Stage 1: Build frontend
# ====================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_API_URL vacio = rutas relativas (/api/...)
# Nginx se encarga del proxy al backend
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ====================================
# Stage 2: Serve with Nginx
# ====================================
FROM nginx:alpine

# Copiar build de produccion
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA: redirigir todas las rutas a index.html
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
