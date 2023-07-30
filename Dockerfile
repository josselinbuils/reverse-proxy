FROM node:18

COPY . reverse-proxy

WORKDIR reverse-proxy

RUN yarn install --emoji --frozen-lockfile --no-progress && \
    yarn build

CMD ["yarn", "start"]
