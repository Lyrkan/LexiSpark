# Stage 1: Building the code
FROM node:22 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
# Copy all other source code to work directory
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Stage 2: Run the application
FROM node:22-slim AS runner

WORKDIR /app

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs
RUN mkdir -p /home/nextjs && chown nextjs:nodejs /home/nextjs

# Copy only the necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy data directory and scripts
COPY --chown=nextjs:nodejs data ./data
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs lib ./lib
COPY --chown=nextjs:nodejs prisma ./prisma

# Make sure the database directory is created and owned by the nextjs user
RUN mkdir -p /app/prisma/db
RUN chown -R nextjs:nodejs /app/prisma/db

# Create startup script
RUN echo '#!/bin/bash\n\
npx prisma migrate deploy\n\
npm run load-words\n\
exec node server.js' > ./start.sh && \
chmod +x ./start.sh

# Set the correct permission for prerender cache
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV HOME=/home/nextjs

CMD ["./start.sh"] 
