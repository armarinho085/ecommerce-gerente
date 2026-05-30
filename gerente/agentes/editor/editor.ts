import { run as generateCatalog } from './skills/generate-catalog';
import { run as changeColor } from './skills/change-color';
import { run as changeColorBatch } from './skills/change-color-batch';

const SKILLS: Record<string, (args: string[]) => Promise<void>> = {
  'generate-catalog': generateCatalog,
  'change-color': changeColor,
  'change-color-batch': changeColorBatch,
};

export async function run(args: string[]) {
  const [skill, ...rest] = args;

  if (!skill || skill === 'help') {
    console.log('\nAgente: editor');
    console.log('Skills disponíveis:');
    console.log('  generate-catalog   <imagem>                  → gera foto profissional de catálogo');
    console.log('  change-color       <imagem> <#hex>           → muda cor de uma imagem');
    console.log('  change-color-batch <imagem> <cores.txt>      → muda várias cores em lote');
    return;
  }

  const fn = SKILLS[skill];
  if (!fn) {
    console.error(`Skill desconhecida: "${skill}"`);
    console.error(`Skills disponíveis: ${Object.keys(SKILLS).join(', ')}`);
    process.exit(1);
  }

  await fn(rest);
}
