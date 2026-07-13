import { getProducts, getStore, ptField, stripHtml } from '../src/NuvemshopAPI';
import { analisarCatalogo } from '../src/AnalistaSiteAI';
import { salvarRelatorio } from '../src/salvarRelatorio';

export async function run(_args: string[]) {
  console.log('Buscando produtos da Nuvemshop...');
  const [produtos, loja] = await Promise.all([getProducts(), getStore()]);

  console.log(`${produtos.length} produtos encontrados. Auditando catálogo...`);

  const semImagem: string[] = [];
  const semDescricao: string[] = [];
  const semCategoria: string[] = [];
  const semEstoque: string[] = [];
  const precoZero: string[] = [];
  const naoPublicado: string[] = [];
  const semVariantes: string[] = [];

  for (const p of produtos) {
    const nome = ptField(p.name as any) || `ID ${p.id}`;
    const descricao = stripHtml(ptField(p.description as any));

    if (!p.published) naoPublicado.push(nome);
    if (!p.images || p.images.length === 0) semImagem.push(nome);
    if (!descricao || descricao.length < 20) semDescricao.push(nome);
    if (!p.categories || p.categories.length === 0) semCategoria.push(nome);

    if (!p.variants || p.variants.length === 0) {
      semVariantes.push(nome);
    } else {
      const precoValido = p.variants.some(v => parseFloat(v.price) > 0);
      if (!precoValido) precoZero.push(nome);

      const comEstoque = p.variants.some(v => {
        if (!v.stock_management) return true;
        return (v.stock ?? 0) > 0;
      });
      if (!comEstoque) semEstoque.push(nome);
    }
  }

  const publicados = produtos.filter(p => p.published).length;
  const completos = produtos.filter(p => {
    const desc = stripHtml(ptField(p.description as any));
    return (
      p.published &&
      p.images?.length > 0 &&
      desc?.length >= 20 &&
      p.categories?.length > 0 &&
      p.variants?.some(v => parseFloat(v.price) > 0)
    );
  }).length;

  // ── Relatório ─────────────────────────────────────────────────────────────

  const linhas: string[] = [
    `## Auditoria de Catálogo — ${loja.name}`,
    `**Loja:** ${loja.url}  `,
    `**Total de produtos:** ${produtos.length}  `,
    `**Publicados:** ${publicados}  `,
    `**Completos (publicados + imagem + descrição + categoria + preço):** ${completos} (${pct(completos, produtos.length)}%)`,
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

  bloco('Sem imagem', semImagem, 'Produto sem foto não vende — prioridade máxima');
  bloco('Sem descrição', semDescricao, 'Afeta SEO e decisão de compra do cliente');
  bloco('Sem categoria', semCategoria, 'Dificulta navegação e prejudica SEO de categoria');
  bloco('Sem estoque disponível', semEstoque, 'Produtos indisponíveis somem dos resultados de busca');
  bloco('Preço zerado', precoZero, 'Produto não pode ser comprado com preço R$ 0,00');
  bloco('Sem variantes cadastradas', semVariantes, 'Produto não tem nenhuma opção de compra');
  bloco('Não publicados (rascunho)', naoPublicado, 'Produtos ocultos para o cliente');

  const dadosSummary = linhas.join('\n');

  console.log('\nAnalisando com IA...');
  const analiseIA = await analisarCatalogo(dadosSummary);

  const relatorio = `${dadosSummary}\n---\n\n## Análise IA\n\n${analiseIA}`;
  const caminho = await salvarRelatorio('auditoria-catalogo', relatorio);

  console.log(`\nRelatório salvo em: ${caminho}`);
  console.log(`\nResumo: ${produtos.length} produtos | ${semImagem.length} sem foto | ${semDescricao.length} sem desc | ${semEstoque.length} sem estoque`);
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}
