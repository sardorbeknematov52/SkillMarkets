FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src

# Prisma needs openssl on alpine sometimes
RUN apk add --no-cache openssl

EXPOSE 4000

# При старте контейнера:
# 1) генерим клиент
# 2) делаем migrate
# 3) сидим БД (без падения, если уже сидили)
# 4) запускаем API
CMD sh -c "npx prisma generate && npx prisma migrate dev --name init && node prisma/seed.js || true && node src/index.js"
