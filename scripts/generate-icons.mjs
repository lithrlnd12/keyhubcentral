import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const iconsDir = join(publicDir, 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  const inputPath = join(publicDir, 'logo.png');

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(inputPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 26, g: 26, b: 26, alpha: 1 } // #1A1A1A brand black
      })
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate favicon (32x32)
  await sharp(inputPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 26, g: 26, b: 26, alpha: 1 }
    })
    .png()
    .toFile(join(publicDir, 'favicon.png'));

  console.log('Generated: favicon.png');

  // Generate apple-touch-icon (180x180)
  await sharp(inputPath)
    .resize(180, 180, {
      fit: 'contain',
      background: { r: 26, g: 26, b: 26, alpha: 1 }
    })
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));

  console.log('Generated: apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
