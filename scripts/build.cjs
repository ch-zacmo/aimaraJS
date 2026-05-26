const path = require('node:path');
const fs = require('node:fs/promises');
const esbuild = require('esbuild');
const pkg = require('../package.json');

const rootDir = path.resolve(__dirname, '..');
const entryPoint = path.join(rootDir, 'lib', 'Aimara.js');
const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.author} | ${pkg.license} */`;

async function build() {
  await esbuild.build({
    entryPoints: [entryPoint],
    outfile: path.join(rootDir, 'dist', 'Aimara.min.js'),
    bundle: false,
    minify: true,
    sourcemap: true,
    target: ['es2017'],
    legalComments: 'none',
    banner: {
      js: banner,
    },
  });

  await Promise.all([
    fs.rm(path.join(rootDir, 'dist', 'Aimara.mjs'), { force: true }),
    fs.rm(path.join(rootDir, 'dist', 'Aimara.mjs.map'), { force: true }),
  ]);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
