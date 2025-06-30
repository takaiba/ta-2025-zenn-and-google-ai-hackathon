FROM node:20.18.3-alpine3.21 AS base

ENV PNPM_VERSION=9.12.0

FROM base AS deps

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

COPY package.json pnpm-lock.yaml prisma/ ./

# NOTE: The alpine docker image changes how and where openssl is downloaded (around 2024/12/10).
#  Prisma already fix it, and  this fix will be shipped in Prisma 6.1.0 on December 17th, and is already available in Prisma 6.1.0-dev.14.
#  Untile we upload prisma version, we need to use the following patch.
#  See for more information:  https://github.com/prisma/prisma/pull/25824
# RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3

RUN curl -f https://get.pnpm.io/v6.js | node - add --global pnpm@${PNPM_VERSION} \
  && pnpm install --frozen-lockfile

FROM base AS builder

RUN apk add --no-cache libc6-compat curl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN curl -f https://get.pnpm.io/v6.js | node - add --global pnpm@${PNPM_VERSION}

ENV POSTGRES_DB="xxx"
ENV POSTGRES_USER="xxx"
ENV POSTGRES_APP_USER="xxx"
ENV POSTGRES_PASSWORD="xxx"
ENV DATABASE_ROOT_URL="xxx"
ENV DATABASE_APP_URL="xxx"
ENV AUTH0_SECRET="xxx"
ENV APP_BASE_URL="http://localhost:3000"
ENV AUTH0_DOMAIN="xxx"
ENV AUTH0_CLIENT_ID="xxx"
ENV AUTH0_CLIENT_SECRET="xxx"
ENV DEFAULT_TENANT_ID="xxx"
ENV DEFAULT_ADMIN_EMAIL="xxx"
ENV SLACK_CLIENT_ID="xxx"
ENV SLACK_CLIENT_SECRET="xxx"

# NOTE: The alpine docker image changes how and where openssl is downloaded (around 2024/12/10).
#  Prisma already fix it, and  this fix will be shipped in Prisma 6.1.0 on December 17th, and is already available in Prisma 6.1.0-dev.14.
#  Untile we upload prisma version, we need to use the following patch.
#  See for more information:  https://github.com/prisma/prisma/pull/25824
# RUN ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3

RUN npx prisma generate --schema ./prisma/schema.prisma

RUN pnpm build

FROM base AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat curl \
  && curl -f https://get.pnpm.io/v6.js | node - add --global pnpm@${PNPM_VERSION}

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/server ./.next/server

EXPOSE 3000

CMD node server.js
