import { run as analisarMensal } from './skills/analisar-mensal';
import { run as analisarAnual } from './skills/analisar-anual';
import { run as calcularPreco } from './skills/calcular-preco';

const SKILLS: Record<string, (args: string[]) => Promise<void>> = {
  'analisar-mensal': analisarMensal,
  'analisar-anual': analisarAnual,
  'calcular-preco': calcularPreco,
};

export async function run(args: string[]) {
  const [skill, ...rest] = args;

  if (!skill || skill === 'help') {
    console.log('\nAgente: precificador');
    console.log('Skills disponíveis:');
    console.log('  analisar-mensal [YYYY-MM]   → analisa o mês (padrão: mais recente)');
    console.log('  analisar-anual              → analisa todos os meses do site');
    console.log('  calcular-preco <custo> <%>  → calcula preço ideal por marketplace');
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
