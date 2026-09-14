# VAERS Modernized Reporting Prototype (Tab 2-2)
# Static site on nginx:unprivileged (alpine). No backend by design —
# nothing in the demo transmits data. Synthetic data only.
FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/proto.conf
COPY site/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

USER 101
CMD ["nginx", "-g", "daemon off;"]