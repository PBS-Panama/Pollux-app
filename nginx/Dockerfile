FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /srv/downloads
COPY downloads/ /srv/downloads/
EXPOSE 80
