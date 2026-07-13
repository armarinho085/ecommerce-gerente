import { getProducts, getStore, ptField, stripHtml } from '../src/NuvemshopAPI';
import { analisarSEO } from '../src/AnalistaSiteAI';
import { salvarRelatorio } from '../src/salvarRelatorio';

export async function run(_args: string[]) {
  console.log('Buscando produtos da Nuvemshop...');
  const [produtos, loja] = await Promise.all([getProducts(), getStore()]);

  const publicados = produtos.filter(p => p.published);
  console.log(`${publicados.length} produtos publicados encontrados. Auditando SEO...`);

  const semSeoTitle: string[] = [];
  const semSeoDesc: string[] = [];
  const seoTitleCurto: string[] = [];
  const seoTitleLongo: string[] = [];
  const seoDescCurta: string[] = [];
  const seoDescLonga: string[] = [];
  const semDescricao: string[] = [];
  const urlEstranha: string[] = [];

  for (const p of publicados) {
    const nome = ptField(p.name as any) || `ID ${p.id}`;
    const seoTitle = ptField(p.seo_title as any);
    const seoDesc = ptField(p.seo_description as any);
    const descricao = stripHtml(ptField(p.description as any));
    const handle = ptField(p.handle as any);

    if (!seoTitle) {
      semSeoTitle.push(nome);
    } else {
      if (seoTitle.length < 30) seoTitleCurto.push(`${nome} (${seoTitle.length} chars: "${seoTitle}")`);
      if (seoTitle.length > 60) seoTitleLongo.push(`${nome} (${seoTitle.length} chars)`);
    }

    if (!seoDesc) {
      semSeoDesc.push(nome);
    } else {
      if (seoDesc.length < 80) seoDescCurta.push(`${nome} (${seoDesc.length} chars)`);
      if (seoDesc.length > 165) seoDescLonga.push(`${nome} (${seoDesc.length} chars)`);
    }

    if (!descricao || descricao.length < 20) semDescricao.push(nome);

    if (handle && /[A-Z]/.test(handle)) urlEstranha.push(`${nome} → "${handle}"`);
  }

  const completos = publicados.filter(p => {
    const t = ptField(p.seo_title as any);
    const d = ptField(p.seo_description as any);
    return t && t.length >= 30 && t.length <= 60 && d && d.length >= 80 && d.length <= 165;
  }).length;

  // ── Relatório estruturado ─────────────────────────────────────────────────

  const linhas: string[] = [
    `## Auditoria SEO — ${loja.name}`,
    `**Loja:** ${loja.url}  `,
    `**Total publicados:** ${publicados.length}  `,
    `**SEO completo e adequado:** ${completos} (${pct(completos, publicados.length)}%)`,
    '',
  ];

  const bloco = (titulo: string, itens: string[], desc: string) => {
    linhas.push(`### ${titulo} — ${itens.length} produtos`);
    if (desc) linhas.push(`_${desc}_`);
    if (itens.length === 0) {
      linhas.push('Nenhum problema encontrado.');
    } else {
      itens.forEach(i => linhas.push(`- ${i}`));
    }
    linhas.push('');
  };

  bloco('Sem SEO Title', semSeoTitle, 'O title aparece no Google — é o fator SEO mais importante');
  bloco('Sem SEO Description', semSeoDesc, 'A description influencia o CTR nos resultados de busca');
  bloco('SEO Title curto (< 30 chars)', seoTitleCurto, 'Ideal: 50–60 caracteres');
  bloco('SEO Title longo (> 60 chars)', seoTitleLongo, 'Será cortado pelo Google — ideal: até 60 chars');
  bloco('SEO Description curta (< 80 chars)', seoDescCurta, 'Ideal: 120–160 caracteres');
  bloco('SEO Description longa (> 165 chars)', seoDescLonga, 'Será cortada — ideal: até 160 chars');
  bloco('Sem descrição de produto', semDescricao, 'Descrição fraca prejudica SEO e conversão');
  bloco('Handle com maiúsculas (URL não amigável)', urlEstranha, 'URLs devem ser tudo minúsculo');

  const dadosSummary = linhas.join('\n');

  console.log('\nAnalisando com IA...');
  const analiseIA = await analisarSEO(dadosSummary);

  const relatorio = `${dadosSummary}\n---\n\n## Análise IA\n\n${analiseIA}`;
  const caminho = await salvarRelatorio('auditoria-seo', relatorio);

  console.log(`\nRelatório salvo em: ${caminho}`);
  console.log(`\nResumo: ${publicados.length} produtos | ${semSeoTitle.length} sem title | ${semSeoDesc.length} sem description | ${semDescricao.length} sem descrição`);
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
