const path = require('node:path');
const esbuild = require('esbuild');
const pkg = require('../package.json');

const rootDir = path.resolve(__dirname, '..');

async function build() {
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'lib', 'Aimara.js')],
    outfile: path.join(rootDir, 'dist', 'Aimara.min.js'),
    bundle: false,
    minify: true,
    sourcemap: true,
    target: ['es2017'],
    legalComments: 'none',
    banner: {
      js: `/*! ${pkg.name} v${pkg.version} | ${pkg.author} | ${pkg.license} */`,
    },
  });
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
