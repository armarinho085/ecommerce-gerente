import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { GeminiService } from './GeminiService';

const OUTPUT_SIZE = 1200;
const MAX_INPUT_SIZE = 1536;

export interface GenerateResult {
  inputPath: string;
  outputPath: string;
  originalSize: { width: number; height: number };
  timeMs: number;
  timeImageMs: number;
}

export class CatalogGenerator {
  private gemini: GeminiService;

  constructor() {
    this.gemini = new GeminiService();
  }

  async generate(inputPath: string, outputDir: string): Promise<GenerateResult> {
    const totalStart = Date.now();
    await fs.mkdir(outputDir, { recursive: true });

    const inputBuffer = await fs.readFile(inputPath);
    const meta = await sharp(inputBuffer).metadata();
    const originalSize = { width: meta.width ?? 0, height: meta.height ?? 0 };

    const preprocessed = await sharp(inputBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(MAX_INPUT_SIZE, MAX_INPUT_SIZE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const imageStart = Date.now();
    console.log('  [1/1] Gerando imagem profissional com Gemini...');
    const aiResult = await this.gemini.generateCatalogImage(preprocessed, 'image/jpeg');
    const timeImageMs = Date.now() - imageStart;

    const finalImage = await sharp(aiResult)
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${baseName}-catalogo.png`);
    await fs.writeFile(outputPath, finalImage);

    return { inputPath, outputPath, originalSize, timeMs: Date.now() - totalStart, timeImageMs };
  }

  async generateAll(inputDir: string, outputDir: string): Promise<GenerateResult[]> {
    const files = await fs.readdir(inputDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    if (imageFiles.length === 0) throw new Error(`Nenhuma imagem encontrada em: ${inputDir}`);

    const results: GenerateResult[] = [];
    for (const file of imageFiles) {
      console.log(`\nProcessando: ${file}`);
      const result = await this.generate(path.join(inputDir, file), outputDir);
      console.log(`  Concluído em ${(result.timeMs / 1000).toFixed(1)}s → ${result.outputPath}`);
      results.push(result);
    }

    return results;
  }
}
