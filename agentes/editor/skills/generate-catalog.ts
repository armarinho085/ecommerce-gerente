import path from 'path';
import { CatalogGenerator } from '../src/CatalogGenerator';

export async function run(args: string[]) {
  const [inputPath] = args;
  if (!inputPath) throw new Error('Uso: editor generate-catalog <imagem>');

  const gen = new CatalogGenerator();
  const productName = path.basename(path.dirname(inputPath));
  const outputDir = path.join(path.dirname(inputPath), '..', '..', 'output', productName);

  console.log(`\nProduto: ${productName}`);
  const result = await gen.generate(inputPath, outputDir);
  console.log(`Salvo: ${result.outputPath}`);
  console.log(`Tempo: ${(result.timeMs / 1000).toFixed(1)}s`);
}
