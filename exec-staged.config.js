module.exports = [
  {
    regex: /\.ts$/,
    commands: ['eslint'],
  },
  {
    regex: /\.(js|ts)$/,
    commands: ['prettier --write', 'git add'],
  },
];
