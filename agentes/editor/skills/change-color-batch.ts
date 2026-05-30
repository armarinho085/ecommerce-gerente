import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { GeminiService } from '../src/GeminiService';

const OUTPUT_SIZE = 2048;

export async function run(args: string[]) {
  const [inputPath, colorsFile] = args;
  if (!inputPath || !colorsFile) throw new Error('Uso: editor change-color-batch <imagem> <cores.txt>');

  const colorsRaw = await fs.readFile(colorsFile, 'utf-8').catch(() => { throw new Error(`Arquivo de cores não encontrado: ${colorsFile}`); });
  const colors = colorsRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const invalid = colors.filter(c => !/^#[0-9A-Fa-f]{6}$/.test(c));
  if (invalid.length > 0) throw new Error(`Cores inválidas: ${invalid.join(', ')}`);

  const gemini = new GeminiService();
  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const outputDir = path.dirname(inputPath);

  const inputBuffer = await fs.readFile(inputPath).catch(() => { throw new Error(`Arquivo não encontrado: ${inputPath}`); });
  const preprocessed = await sharp(inputBuffer)
    .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
    .png({ quality: 100 })
    .toBuffer();

  console.log(`\nProduto: ${path.basename(inputPath)}`);
  console.log(`Cores: ${colors.join(', ')}`);
  console.log(`Total: ${colors.length} variações\n`);

  const totalStart = Date.now();
  const results: { color: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < colors.length; i++) {
    const hexColor = colors[i];
    const colorSlug = hexColor.replace('#', '');
    const outputPath = path.join(outputDir, `${baseName}-${colorSlug}.png`);
    const start = Date.now();

    try {
      console.log(`  [${i + 1}/${colors.length}] ${hexColor} — gerando...`);
      const result = await gemini.changeColor(preprocessed, hexColor, 'image/png');
      const finalImage = await sharp(result)
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer();
      await fs.writeFile(outputPath, finalImage);
      console.log(`  [${i + 1}/${colors.length}] ${hexColor} — ${((Date.now() - start) / 1000).toFixed(1)}s → ${outputPath}`);
      results.push({ color: hexColor, ok: true });
    } catch (e: any) {
      console.error(`  [${i + 1}/${colors.length}] ${hexColor} — ERRO: ${e.message}`);
      results.push({ color: hexColor, ok: false, error: e.message });
    }
  }

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`\n━━━ Concluído em ${((Date.now() - totalStart) / 1000).toFixed(1)}s ━━━`);
  console.log(`✓ ${ok}/${colors.length} geradas com sucesso`);
  if (failed.length > 0) failed.forEach(r => console.error(`✗ ${r.color}: ${r.error}`));
}
