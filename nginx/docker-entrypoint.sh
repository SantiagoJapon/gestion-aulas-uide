#!/bin/sh
# ============================================
# Entrypoint para Nginx - Gestion Aulas UIDE
# Reemplaza variables de entorno en la config
# ============================================

set -e

# Si DOMAIN está vacío, usar config sin SSL (solo HTTP)
if [ -z "$DOMAIN" ]; then
    echo "⚠️  DOMAIN no configurado — usando config sin SSL (solo HTTP)"
    cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location /api/ {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        client_max_body_size 10M;
    }

    location ~ ^/api/distribucion/(ejecutar|forzar) {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }

    location /health {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
    }

    location = /healthz {
        proxy_pass http://n8n:5678;
        proxy_set_header Host $host;
    }

    location /n8n/ {
        rewrite ^/n8n/(.*) /$1 break;
        proxy_pass http://n8n:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 75s;
        proxy_buffering off;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
else
    echo "✅ DOMAIN=${DOMAIN} — usando config SSL"
    export DOMAIN
    envsubst '${DOMAIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g "daemon off;"
