FROM node:24-alpine

RUN npm install -g pnpm

WORKDIR /usr/source/app

COPY package.json ./

RUN pnpm install

COPY . .

CMD ["pnpm", "start:bot"]