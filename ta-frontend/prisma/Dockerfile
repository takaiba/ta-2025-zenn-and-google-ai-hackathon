FROM node:18

WORKDIR /app

RUN yarn config set registry 'https://registry.npmmirror.com/'
RUN yarn add prisma

RUN npm install -g npm@10.9.2

COPY ./prisma ./prisma

ENTRYPOINT [ "npx", "prisma", "migrate" ,"deploy", "--schema", "./prisma/schema.prisma" ]
