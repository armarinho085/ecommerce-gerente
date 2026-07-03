import { run as editor } from './agentes/editor/editor';
import { run as precificador } from './agentes/precificador/precificador';

const AGENTES: Record<string, (args: string[]) => Promise<void>> = {
  editor,
  precificador,
};

async function main() {
  const [, , agente, ...args] = process.argv;

  if (!agente || agente === 'help') {
    console.log('\n╔══════════════════════════════════╗');
    console.log('║         GERENTE E-COMMERCE       ║');
    console.log('╚══════════════════════════════════╝');
    console.log('\nAgentes disponíveis:');
    console.log('  editor       → edição e geração de fotos de produto');
  console.log('  precificador → análise financeira e precificação por marketplace');
    console.log('\nUso:');
    console.log('  npx tsx gerente.ts <agente> <skill> [args...]');
    console.log('\nExemplos:');
    console.log('  npx tsx gerente.ts editor generate-catalog agentes/editor/inputs/primavera.png');
    console.log('  npx tsx gerente.ts editor change-color output/primavera-catalogo.png "#BD162C"');
    console.log('  npx tsx gerente.ts editor change-color-batch output/primavera-catalogo.png cores.txt');
    console.log('\n  npx tsx gerente.ts editor help   → lista skills do editor');
    return;
  }

  const fn = AGENTES[agente];
  if (!fn) {
    console.error(`Agente desconhecido: "${agente}"`);
    console.error(`Agentes disponíveis: ${Object.keys(AGENTES).join(', ')}`);
    process.exit(1);
  }

  await fn(args);
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
