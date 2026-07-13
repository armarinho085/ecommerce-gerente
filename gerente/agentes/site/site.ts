import { run as auditarSeo } from './skills/auditar-seo';
import { run as auditarCatalogo } from './skills/auditar-catalogo';
import { run as analisarPedidos } from './skills/analisar-pedidos';
import { run as analisarLoja } from './skills/analisar-loja';
import { run as auditarLayout } from './skills/auditar-layout';
import { run as gerarBanners } from './skills/gerar-banners';

const SKILLS: Record<string, (args: string[]) => Promise<void>> = {
  'auditar-seo': auditarSeo,
  'auditar-catalogo': auditarCatalogo,
  'analisar-pedidos': analisarPedidos,
  'analisar-loja': analisarLoja,
  'auditar-layout': auditarLayout,
  'gerar-banners': gerarBanners,
};

export async function run(args: string[]) {
  const [skill, ...rest] = args;

  if (!skill || skill === 'help') {
    console.log('\nAgente: site');
    console.log('Skills disponíveis:');
    console.log('  auditar-seo       → auditoria de SEO de todos os produtos (title, description, handles)');
    console.log('  auditar-catalogo  → completude do catálogo (fotos, descrição, categoria, estoque, preço)');
    console.log('  analisar-pedidos  → análise de pedidos com insights de vendas (padrão: últimos 30 dias)');
    console.log('  analisar-loja     → auditoria da loja pública (SEO técnico, layout, UX) via navegador');
    console.log('  auditar-layout    → identifica o tema ativo e mapeia todos os slots de banner com dimensões reais');
    console.log('  gerar-banners     → gera PNGs placeholder com as dimensões exatas de cada slot de banner');
    console.log('\nUso:');
    console.log('  npx tsx gerente.ts site <skill>');
    console.log('  npx tsx gerente.ts site analisar-pedidos --dias 60');
    console.log('  npx tsx gerente.ts site analisar-pedidos --inicio 2026-06-01 --fim 2026-06-30');
    console.log('  npx tsx gerente.ts site gerar-banners                         → usa último audit-layout');
    console.log('  npx tsx gerente.ts site gerar-banners 1920x600:hero 768x400:mobile  → dimensões manuais');
    console.log('\nPré-requisitos (.env):');
    console.log('  NUVEMSHOP_STORE_ID      → ID numérico da sua loja');
    console.log('  NUVEMSHOP_ACCESS_TOKEN  → token de acesso OAuth');
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
