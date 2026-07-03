import { lerPlanilha, acharCol, toNum, listarColunas } from '../src/LeitorPlanilha';
import { carregarCatalogo, salvarCatalogo, Produto, CATALOGO_PATH } from './cadastrar-produtos';

const COL_SKU       = ['SKU', 'Código', 'Codigo', 'Ref', 'Referência', 'Referencia', 'Cod', 'Cód'];
const COL_NOME      = ['Nome', 'Produto', 'Título', 'Titulo', 'Name'];
const COL_CATEGORIA = ['Categoria', 'Category', 'Cat', 'Tipo'];
const COL_DESCRICAO = ['Descrição completa', 'Descricao completa', 'Observação', 'Observacao', 'Obs', 'Description'];
const COL_CUSTO     = ['Custo', 'Preço de custo', 'Preco de custo', 'Preço custo', 'Preco custo'];
const COL_COR       = ['Cor', 'Color', 'Colour'];
const COL_TAMANHO   = ['Tamanho', 'Size', 'Tam'];
const COL_ESTOQUE   = ['Estoque', 'Quantidade', 'Qty', 'Stock', 'Qtd'];
const COL_PRECO_ML  = ['Preço ML', 'Preco ML', 'Mercado Livre'];
const COL_PRECO_SH  = ['Preço Shopee', 'Preco Shopee', 'Shopee'];
const COL_PRECO_AM  = ['Preço Amazon', 'Preco Amazon', 'Amazon'];
const COL_PRECO_ST  = ['Preço Site', 'Preco Site', 'Site'];

export async function run(args: string[]) {
  const [arquivo] = args;

  if (!arquivo || arquivo === 'help') {
    console.log('\nUso: auxiliar corrigir-produtos <planilha.xlsx>');
    console.log('\nA planilha deve ter a coluna SKU/Código para identificar o produto.');
    console.log('Apenas campos NÃO VAZIOS da planilha são aplicados (correção parcial).');
    console.log('Produtos inexistentes no catálogo são ignorados (use cadastrar-produtos para criar).');
    return;
  }

  console.log(`\nLendo planilha de correções: ${arquivo}`);
  const linhas = lerPlanilha(arquivo);
  console.log(`  → ${linhas.length} linha(s)`);

  const colSku = acharCol(linhas, COL_SKU);
  if (!colSku) {
    console.error('\nERRO: Coluna de SKU/Código não encontrada.');
    console.error(`Colunas disponíveis:\n${listarColunas(linhas)}`);
    process.exit(1);
  }

  const colNome   = acharCol(linhas, COL_NOME);
  const colCat    = acharCol(linhas, COL_CATEGORIA);
  const colDesc   = acharCol(linhas, COL_DESCRICAO);
  const colCusto  = acharCol(linhas, COL_CUSTO);
  const colCor    = acharCol(linhas, COL_COR);
  const colTam    = acharCol(linhas, COL_TAMANHO);
  const colEst    = acharCol(linhas, COL_ESTOQUE);
  const colML     = acharCol(linhas, COL_PRECO_ML);
  const colSh     = acharCol(linhas, COL_PRECO_SH);
  const colAm     = acharCol(linhas, COL_PRECO_AM);
  const colSt     = acharCol(linhas, COL_PRECO_ST);

  const catalogo = carregarCatalogo();
  const agora = new Date().toISOString();
  let corrigidos = 0, naoEncontrados = 0, semAlteracao = 0;
  const naoEncontradosList: string[] = [];

  interface Mudanca { campo: string; de: string; para: string }
  const relatorio: { sku: string; mudancas: Mudanca[] }[] = [];

  for (const linha of linhas) {
    const sku = String(linha[colSku] ?? '').trim();
    if (!sku) continue;

    const produto = catalogo[sku];
    if (!produto) {
      naoEncontrados++;
      naoEncontradosList.push(sku);
      continue;
    }

    const mudancas: Mudanca[] = [];

    function aplicar<K extends keyof Produto>(campo: K, novoValor: string | number | undefined) {
      if (novoValor === undefined || novoValor === '') return;
      const antigo = produto[campo];
      if (String(antigo) !== String(novoValor)) {
        mudancas.push({ campo: String(campo), de: String(antigo ?? '-'), para: String(novoValor) });
        (produto as any)[campo] = novoValor;
      }
    }

    const str = (col: string | null) => { if (!col) return undefined; const v = String(linha[col] ?? '').trim(); return v || undefined; };
    const num = (col: string | null) => { if (!col) return undefined; return toNum(linha[col]) ?? undefined; };

    aplicar('nome',        str(colNome));
    aplicar('categoria',   str(colCat));
    aplicar('descricao',   str(colDesc));
    aplicar('custo',       num(colCusto));
    aplicar('cor',         str(colCor));
    aplicar('tamanho',     str(colTam));
    aplicar('estoque',     num(colEst));
    aplicar('precoML',     num(colML));
    aplicar('precoShopee', num(colSh));
    aplicar('precoAmazon', num(colAm));
    aplicar('precoSite',   num(colSt));

    if (mudancas.length > 0) {
      produto.atualizadoEm = agora;
      corrigidos++;
      relatorio.push({ sku, mudancas });
    } else {
      semAlteracao++;
    }
  }

  if (corrigidos > 0) salvarCatalogo(catalogo);

  console.log('\n' + '═'.repeat(42));
  console.log('  RESULTADO DAS CORREÇÕES');
  console.log('═'.repeat(42));
  console.log(`  ✅ Produtos corrigidos:   ${corrigidos}`);
  console.log(`  ➖ Sem alteração:          ${semAlteracao}`);
  console.log(`  ❌ Não encontrados:        ${naoEncontrados}`);
  console.log('═'.repeat(42));

  if (relatorio.length > 0) {
    console.log('\nDETALHE DAS ALTERAÇÕES:');
    for (const r of relatorio) {
      console.log(`\n  SKU: ${r.sku}`);
      for (const m of r.mudancas) {
        console.log(`    ${m.campo}: "${m.de}" → "${m.para}"`);
      }
    }
  }

  if (naoEncontradosList.length > 0) {
    console.log('\n❌ SKUs não encontrados no catálogo:');
    for (const s of naoEncontradosList) console.log(`   • ${s}`);
    console.log('\n   Dica: use "auxiliar cadastrar-produtos" para criar novos produtos.');
  }

  if (corrigidos > 0) {
    console.log(`\nCatálogo atualizado em: ${CATALOGO_PATH}`);
  } else {
    console.log('\nNenhuma alteração foi feita no catálogo.');
  }
}
