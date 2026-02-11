FROM node:22-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

# Generate Prisma client
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# Build client
COPY client ./client
RUN npm run build --workspace=client

# Build server
COPY server ./server
RUN npm run build --workspace=server

# Production stage
FROM node:22-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/client/package.json ./client/
COPY --from=base /app/server/package.json ./server/
RUN npm ci --omit=dev

COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/client/dist ./client/dist
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/server/prisma ./server/prisma

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
