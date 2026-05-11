FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root manifests + web package
COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/
# Render-service workspace must exist for npm ci to resolve all workspaces
COPY packages/render-service/package.json packages/render-service/

RUN npm ci

EXPOSE 5173

CMD ["npx", "--workspace=packages/web", "vite", "--host", "0.0.0.0"]
