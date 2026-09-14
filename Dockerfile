# VAERS Modernized Reporting Prototype (Tab 2-2)
# Static site on nginx:unprivileged (alpine). No backend by design —
# nothing in the demo transmits data. Synthetic data only.
FROM nginx:1.27-alpine

# nginx-unprivileged cache/temp dirs must be writable by uid 101
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp /var/run \
  && chown -R 101:101 /var/cache/nginx /var/run /etc/nginx/conf.d \
  && rm -f /etc/nginx/conf.d/default.conf \
  && sed -i 's|/run/nginx.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/proto.conf
COPY site/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

USER 101
CMD ["nginx", "-g", "daemon off;"]