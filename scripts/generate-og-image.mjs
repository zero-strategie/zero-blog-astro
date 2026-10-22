import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SOURCE = new URL('./og-default.svg', import.meta.url);
const TARGET = new URL('../public/og-default.png', import.meta.url);

await sharp(fileURLToPath(SOURCE)).png().toFile(fileURLToPath(TARGET));
console.log(`écrit ${fileURLToPath(TARGET)}`);
