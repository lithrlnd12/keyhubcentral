import sharp from 'sharp';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

// ICO file format constants
const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;

async function createIco(pngBuffers, outputPath) {
  // Calculate total file size
  let offset = ICO_HEADER_SIZE + (pngBuffers.length * ICO_ENTRY_SIZE);
  const entries = [];

  for (const { buffer, size } of pngBuffers) {
    entries.push({
      width: size === 256 ? 0 : size, // 256 is stored as 0 in ICO format
      height: size === 256 ? 0 : size,
      size: buffer.length,
      offset: offset
    });
    offset += buffer.length;
  }

  // Create ICO header
  const header = Buffer.alloc(ICO_HEADER_SIZE);
  header.writeUInt16LE(0, 0);           // Reserved
  header.writeUInt16LE(1, 2);           // Type: 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  // Create ICO directory entries
  const directory = Buffer.alloc(pngBuffers.length * ICO_ENTRY_SIZE);
  entries.forEach((entry, i) => {
    const entryOffset = i * ICO_ENTRY_SIZE;
    directory.writeUInt8(entry.width, entryOffset);       // Width
    directory.writeUInt8(entry.height, entryOffset + 1);  // Height
    directory.writeUInt8(0, entryOffset + 2);             // Color palette
    directory.writeUInt8(0, entryOffset + 3);             // Reserved
    directory.writeUInt16LE(1, entryOffset + 4);          // Color planes
    directory.writeUInt16LE(32, entryOffset + 6);         // Bits per pixel
    directory.writeUInt32LE(entry.size, entryOffset + 8); // Size of image data
    directory.writeUInt32LE(entry.offset, entryOffset + 12); // Offset of image data
  });

  // Combine all parts
  const imageData = Buffer.concat(pngBuffers.map(p => p.buffer));
  const ico = Buffer.concat([header, directory, imageData]);

  await writeFile(outputPath, ico);
}

async function generateFavicon() {
  const inputPath = join(publicDir, 'logo.png');
  const sizes = [16, 32, 48];

  const pngBuffers = await Promise.all(
    sizes.map(async (size) => {
      const buffer = await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 26, g: 26, b: 26, alpha: 1 }
        })
        .png()
        .toBuffer();
      return { buffer, size };
    })
  );

  await createIco(pngBuffers, join(publicDir, 'favicon.ico'));
  console.log('Generated: favicon.ico (16x16, 32x32, 48x48)');
}

generateFavicon().catch(console.error);
