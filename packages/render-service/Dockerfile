FROM node:22-slim

# Chromium headless dependencies for Remotion rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libx11-xcb1 libdrm2 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libasound2 libcups2 \
    fonts-liberation curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root manifests + render-service package
COPY package.json package-lock.json ./
COPY packages/render-service/package.json packages/render-service/
# Web workspace must exist for npm ci to resolve all workspaces
COPY packages/web/package.json packages/web/

RUN npm ci

# Copy source after npm ci to leverage Docker layer cache for dependencies
COPY packages/render-service/src packages/render-service/src
# Remotion compositions + shared render scripts
COPY src src
COPY scripts scripts
COPY remotion.config.ts tsconfig.json ./

# Download Chromium for Remotion
RUN npx remotion browser ensure

EXPOSE 3100

CMD ["npm", "run", "--workspace=packages/render-service", "start"]
