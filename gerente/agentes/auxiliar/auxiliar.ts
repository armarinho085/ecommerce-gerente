import { run as conciliarPagamentos } from './skills/conciliar-pagamentos';
import { run as cadastrarProdutos } from './skills/cadastrar-produtos';
import { run as corrigirProdutos } from './skills/corrigir-produtos';

const SKILLS: Record<string, (args: string[]) => Promise<void>> = {
  'conciliar-pagamentos': conciliarPagamentos,
  'cadastrar-produtos': cadastrarProdutos,
  'corrigir-produtos': corrigirProdutos,
};

export async function run(args: string[]) {
  const [skill, ...rest] = args;

  if (!skill || skill === 'help') {
    console.log('\nAgente: auxiliar');
    console.log('Skills disponíveis:');
    console.log('  conciliar-pagamentos  → bate pedidos entregues vs. repasses (Shopee/ML)');
    console.log('  cadastrar-produtos    → importa/atualiza produtos via planilha (upsert por SKU)');
    console.log('  corrigir-produtos     → aplica correções parciais via planilha (não sobrescreve vazios)');
    console.log('\nUso:');
    console.log('  npx tsx gerente.ts auxiliar <skill> [args...]');
    console.log('  npx tsx gerente.ts auxiliar <skill> help   → ajuda específica da skill');
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
