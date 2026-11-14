FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js styles.css ./
COPY src/ ./src/
COPY assets/ ./assets/
COPY server/data/ ./server/data/
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server/ ./server/
COPY scripts/ ./scripts/
USER node
EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:8001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
