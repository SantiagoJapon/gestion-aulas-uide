FROM nginx:alpine

# Instalar envsubst (gettext)
RUN apk add --no-cache gettext

# Copiar template de configuracion
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copiar entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Crear directorio para certbot
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
