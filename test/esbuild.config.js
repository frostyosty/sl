require('esbuild').build({
    entryPoints: ['index.js'],
    bundle: true,
    outfile: 'bundle.js',
    platform: 'browser',
    format: 'esm',
    minify: true,
}).catch(() => process.exit(1));
