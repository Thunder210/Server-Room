FROM node:20 AS client-build
WORKDIR /client
COPY serwerownia-client/package*.json ./
RUN npm ci
COPY serwerownia-client .
RUN npm run build

FROM node:20
WORKDIR /app
COPY serwerownia-server/package*.json ./
RUN npm ci
COPY serwerownia-server .
COPY --from=client-build /client/dist ./public
EXPOSE 8080
CMD ["node","index.js"]
