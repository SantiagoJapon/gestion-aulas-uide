FROM nginx:alpine

# Copiar configuracion de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Crear directorio para certbot
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
