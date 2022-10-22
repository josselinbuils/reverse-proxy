FROM node:18

COPY . reverse-proxy

WORKDIR reverse-proxy

RUN yarn install --production --frozen-lockfile && \
    yarn build

CMD ["yarn", "start"]
