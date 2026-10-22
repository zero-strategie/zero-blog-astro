import sharp from 'sharp';

const SOURCE = new URL('./og-default.svg', import.meta.url);
const TARGET = new URL('../public/og-default.png', import.meta.url);

await sharp(SOURCE.pathname).png().toFile(TARGET.pathname);
console.log(`écrit ${TARGET.pathname}`);
