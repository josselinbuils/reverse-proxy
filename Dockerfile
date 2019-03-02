FROM node:10
COPY . reverse-proxy
WORKDIR reverse-proxy
RUN yarn install --production --frozen-lockfile
CMD ["yarn", "start"]
