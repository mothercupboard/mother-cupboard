const path = require('path');

// Resolve @shared/* imports to the monorepo shared/ directory
module.exports = [
  {
    name: 'shared-alias',
    setup(build) {
      build.onResolve({ filter: /^@shared\// }, (args) => ({
        path: path.resolve(__dirname, '..', 'shared', args.path.replace('@shared/', '')),
      }));
    },
  },
];
