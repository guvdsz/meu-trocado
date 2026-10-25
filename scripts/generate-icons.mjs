import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Next.js already ships Sharp for its image pipeline.
const requireFromNext = createRequire(import.meta.resolve("next/package.json"));
const sharp = requireFromNext("sharp");
const source = await readFile(
  new URL("../public/brand/icon.svg", import.meta.url),
);
const root = new URL("../", import.meta.url);
await mkdir(new URL("public/icons/", root), { recursive: true });
const png = (size) => sharp(source).resize(size, size).png().toBuffer();
for (const size of [192, 512]) {
  await writeFile(
    new URL(`public/icons/icon-${size}.png`, root),
    await png(size),
  );
}
await writeFile(
  new URL("public/icons/icon-maskable-512.png", root),
  await png(512),
);
await writeFile(new URL("src/app/apple-icon.png", root), await png(180));
await writeFile(new URL("src/app/icon.svg", root), source);

// ICO directory entries point to PNG payloads for crisp 16, 32 and 48px tabs.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(
  new URL("src/app/favicon.ico", root),
  Buffer.concat([header, ...images]),
);
console.log("Ícones do Meu Trocado gerados a partir de public/brand/icon.svg.");
