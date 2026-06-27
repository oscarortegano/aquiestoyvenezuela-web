# =========================================================================
# DOCKERFILE - DESPLIEGUE EN SERVIDORES LINUX
# Usa Nginx Alpine (servidor web ultraligero y seguro de ~5MB de peso)
# =========================================================================

FROM nginx:alpine

# Limpiar directorio web por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar el archivo HTML principal al directorio raíz de Nginx
COPY index.html /usr/share/nginx/html/index.html

# Copiar la carpeta static (JS y CSS)
COPY static /usr/share/nginx/html/static

# Copiar opcionalmente el script de base de datos como referencia
COPY schema.sql /usr/share/nginx/html/schema.sql

# Copiar la configuracion de Nginx del sitio
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto estándar HTTP
EXPOSE 80 443

# Comando para iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
