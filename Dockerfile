# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Scripts are skipped here because `nuxt prepare` (postinstall) needs the sources;
# `npm run build` below prepares the project anyway.
RUN npm ci --ignore-scripts

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy built application from build stage
COPY --from=build /app/.output ./

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server/index.mjs"]