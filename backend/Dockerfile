# Multi-stage build for Node.js TypeScript application
FROM node:18-alpine AS base

RUN apk add --no-cache openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/

# Install all dependencies (including devDependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --chown=nodejs:nodejs package*.json ./

# Generate Prisma client in production
RUN npx prisma generate

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check (disable for now to avoid startup issues)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application with proper signal handling
CMD ["node", "build/server.js"]