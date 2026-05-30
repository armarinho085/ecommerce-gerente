import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { GeminiService } from '../src/GeminiService';

const OUTPUT_SIZE = 2048;

export async function run(args: string[]) {
  const [inputPath, hexColor] = args;
  if (!inputPath || !hexColor) throw new Error('Uso: editor change-color <imagem> <#hexcolor>');
  if (!/^#[0-9A-Fa-f]{6}$/.test(hexColor)) throw new Error(`Cor inválida: "${hexColor}". Use formato hex, ex: #BD162C`);

  const gemini = new GeminiService();
  const ext = path.extname(inputPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const inputBuffer = await fs.readFile(inputPath).catch(() => { throw new Error(`Arquivo não encontrado: ${inputPath}`); });

  const preprocessed = await sharp(inputBuffer)
    .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
    .png({ quality: 100 })
    .toBuffer();

  const colorSlug = hexColor.replace('#', '');
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.join(path.dirname(inputPath), `${baseName}-${colorSlug}.png`);

  console.log(`\nMudando cor para ${hexColor}...`);
  const start = Date.now();

  const result = await gemini.changeColor(preprocessed, hexColor, mimeType);
  const finalImage = await sharp(result)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(outputPath, finalImage);
  console.log(`Salvo: ${outputPath}`);
  console.log(`Tempo: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}
