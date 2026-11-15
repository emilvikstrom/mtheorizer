# Stage 1: install dependencies (also used as the base for the dev service).
FROM node:24.22.3-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: typecheck, test and build. The image build fails if any test fails.
FROM deps AS build
COPY . .
RUN npm run typecheck && npm test && npm run build

# Stage 3: serve the static build with nginx.
FROM nginx:1.30.6-alpine3.24 AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
