DB_CONTAINER=postgres_ta

# NOTE: ローカルでも、https通信が必要となりました。理由はSlack連携の際にリダイレクトURLがhttpsでないとエラーが出るためです。
serve:
	pnpm next dev --turbopack --experimental-https

serve-db:
	docker compose up postgres_db

reserve-db:
	docker compose up postgres_db --build

studio:
	pnpm prisma studio

migrate:
	pnpm prisma-case-format --file prisma/schema.prisma --field-case camel --map-field-case snake
	pnpm prisma format --schema ./prisma/schema.prisma
	pnpm prisma migrate dev --schema ./prisma/schema.prisma
	pnpm prisma generate --schema ./prisma/schema.prisma

migrate-create-only:
	pnpm prisma-case-format --file prisma/schema.prisma --field-case camel --map-field-case snake
	pnpm prisma format --schema ./prisma/schema.prisma
	pnpm prisma migrate dev --create-only --schema ./prisma/schema.prisma

migrate-format:
	pnpm prisma-case-format --file prisma/schema.prisma --field-case camel --map-field-case snake
	pnpm prisma format --schema ./prisma/schema.prisma

check-type:
	pnpm tsc --pretty --noEmit
	pnpm tsc --pretty --noEmit --project ./src/server/api/routers/tsconfig.json

check-lint:
	pnpm next lint

fix-lint:
	pnpm next lint --fix

check-format:
	pnpm prettier --check './**/*.{js,jsx,ts,tsx,json,css}'

fix-format:
	pnpm prettier --write './**/*.{js,jsx,ts,tsx,json,css}'

# RLSを適用するアプリケーション側ユーザーを作成する
setup-db:
	docker exec -w /scripts ${DB_CONTAINER} /bin/bash -c "./setup.sh"

cronjob:
	curl -k https://127.0.0.1:3000/api/trpc/cronjob.createDefaultAdmin | jq .
	curl -k https://127.0.0.1:3000/api/trpc/cronjob.createDefaultDifyApps | jq .

reauth:
	gcloud auth application-default login
	
	# プロジェクトIDを指定
	gcloud config set project ta-project-and-dot

build-cursor-mode:
	pnpm tsx docs-agent/build-cursor-mode.ts
