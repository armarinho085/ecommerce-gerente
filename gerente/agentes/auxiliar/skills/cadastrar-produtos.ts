import { lerPlanilha, acharCol, toNum, listarColunas } from '../src/LeitorPlanilha';
import * as fs from 'fs';
import * as path from 'path';

export interface Produto {
  sku: string;
  nome: string;
  categoria?: string;
  descricao?: string;
  custo?: number;
  cor?: string;
  tamanho?: string;
  estoque?: number;
  precoML?: number;
  precoShopee?: number;
  precoAmazon?: number;
  precoSite?: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export const CATALOGO_PATH = path.resolve(__dirname, '../../../../output/catalogo/produtos.json');

export function carregarCatalogo(): Record<string, Produto> {
  if (!fs.existsSync(CATALOGO_PATH)) return {};
  return JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf-8'));
}

export function salvarCatalogo(catalogo: Record<string, Produto>) {
  fs.mkdirSync(path.dirname(CATALOGO_PATH), { recursive: true });
  fs.writeFileSync(CATALOGO_PATH, JSON.stringify(catalogo, null, 2), 'utf-8');
}

const COL_SKU       = ['SKU', 'Código', 'Codigo', 'Ref', 'Referência', 'Referencia', 'Cod', 'Cód'];
const COL_NOME      = ['Nome', 'Produto', 'Título', 'Titulo', 'Name', 'Descrição', 'Descricao'];
const COL_CATEGORIA = ['Categoria', 'Category', 'Cat', 'Tipo'];
const COL_DESCRICAO = ['Descrição completa', 'Descricao completa', 'Observação', 'Observacao', 'Obs', 'Description'];
const COL_CUSTO     = ['Custo', 'Preço de custo', 'Preco de custo', 'Preço custo', 'Preco custo', 'Cost'];
const COL_COR       = ['Cor', 'Color', 'Colour'];
const COL_TAMANHO   = ['Tamanho', 'Size', 'Tam'];
const COL_ESTOQUE   = ['Estoque', 'Quantidade', 'Qty', 'Stock', 'Qtd'];
const COL_PRECO_ML  = ['Preço ML', 'Preco ML', 'Mercado Livre', 'Preço Mercado Livre', 'Preco Mercado Livre'];
const COL_PRECO_SHOPEE  = ['Preço Shopee', 'Preco Shopee', 'Shopee'];
const COL_PRECO_AMAZON  = ['Preço Amazon', 'Preco Amazon', 'Amazon'];
const COL_PRECO_SITE    = ['Preço Site', 'Preco Site', 'Site', 'Preço Próprio', 'Preco Proprio'];

export async function run(args: string[]) {
  const [arquivo] = args;

  if (!arquivo || arquivo === 'help') {
    console.log('\nUso: auxiliar cadastrar-produtos <planilha.xlsx>');
    console.log('\nColunas reconhecidas (auto-detectadas):');
    console.log('  OBRIGATÓRIAS: SKU/Código, Nome/Produto');
    console.log('  OPCIONAIS: Categoria, Custo, Cor, Tamanho, Estoque');
    console.log('             Preço ML, Preço Shopee, Preço Amazon, Preço Site');
    console.log('\nProdutos são identificados pelo SKU (upsert — cria ou atualiza).');
    return;
  }

  console.log(`\nLendo planilha: ${arquivo}`);
  const linhas = lerPlanilha(arquivo);
  console.log(`  → ${linhas.length} linha(s)`);

  const colSku  = acharCol(linhas, COL_SKU);
  const colNome = acharCol(linhas, COL_NOME);

  if (!colSku) {
    console.error('\nERRO: Coluna de SKU/Código não encontrada.');
    console.error(`Colunas disponíveis:\n${listarColunas(linhas)}`);
    process.exit(1);
  }
  if (!colNome) {
    console.error('\nERRO: Coluna de Nome/Produto não encontrada.');
    console.error(`Colunas disponíveis:\n${listarColunas(linhas)}`);
    process.exit(1);
  }

  const colCat      = acharCol(linhas, COL_CATEGORIA);
  const colDesc     = acharCol(linhas, COL_DESCRICAO);
  const colCusto    = acharCol(linhas, COL_CUSTO);
  const colCor      = acharCol(linhas, COL_COR);
  const colTam      = acharCol(linhas, COL_TAMANHO);
  const colEstoque  = acharCol(linhas, COL_ESTOQUE);
  const colPrecoML  = acharCol(linhas, COL_PRECO_ML);
  const colPrecoSh  = acharCol(linhas, COL_PRECO_SHOPEE);
  const colPrecoAm  = acharCol(linhas, COL_PRECO_AMAZON);
  const colPrecoSt  = acharCol(linhas, COL_PRECO_SITE);

  console.log('\nColunas detectadas:');
  console.log(`  SKU: "${colSku}"   Nome: "${colNome}"`);
  if (colCat)     console.log(`  Categoria: "${colCat}"`);
  if (colCusto)   console.log(`  Custo: "${colCusto}"`);
  if (colCor)     console.log(`  Cor: "${colCor}"`);
  if (colTam)     console.log(`  Tamanho: "${colTam}"`);
  if (colEstoque) console.log(`  Estoque: "${colEstoque}"`);
  if (colPrecoML) console.log(`  Preço ML: "${colPrecoML}"`);
  if (colPrecoSh) console.log(`  Preço Shopee: "${colPrecoSh}"`);
  if (colPrecoAm) console.log(`  Preço Amazon: "${colPrecoAm}"`);
  if (colPrecoSt) console.log(`  Preço Site: "${colPrecoSt}"`);

  const catalogo = carregarCatalogo();
  const agora = new Date().toISOString();
  let criados = 0, atualizados = 0, erros = 0;
  const errosList: string[] = [];

  for (const linha of linhas) {
    const sku  = String(linha[colSku] ?? '').trim();
    const nome = String(linha[colNome] ?? '').trim();

    if (!sku)  { erros++; errosList.push(`Linha sem SKU: "${nome || '(sem nome)'}"`); continue; }
    if (!nome) { erros++; errosList.push(`SKU ${sku} sem nome`); continue; }

    const ex = catalogo[sku];

    const str = (col: string | null) => col ? String(linha[col] ?? '').trim() || undefined : undefined;
    const num = (col: string | null) => col ? toNum(linha[col]) ?? undefined : undefined;

    const produto: Produto = {
      sku,
      nome,
      categoria: str(colCat)   ?? ex?.categoria,
      descricao: str(colDesc)  ?? ex?.descricao,
      custo:     num(colCusto) ?? ex?.custo,
      cor:       str(colCor)   ?? ex?.cor,
      tamanho:   str(colTam)   ?? ex?.tamanho,
      estoque:   num(colEstoque) ?? ex?.estoque,
      precoML:   num(colPrecoML) ?? ex?.precoML,
      precoShopee: num(colPrecoSh) ?? ex?.precoShopee,
      precoAmazon: num(colPrecoAm) ?? ex?.precoAmazon,
      precoSite:   num(colPrecoSt) ?? ex?.precoSite,
      ativo:      true,
      criadoEm:   ex?.criadoEm ?? agora,
      atualizadoEm: agora,
    };

    // Remove undefined para manter JSON limpo
    (Object.keys(produto) as (keyof Produto)[]).forEach(k => {
      if (produto[k] === undefined) delete produto[k];
    });

    if (ex) atualizados++; else criados++;
    catalogo[sku] = produto;
  }

  salvarCatalogo(catalogo);

  console.log('\n' + '═'.repeat(42));
  console.log('  RESULTADO DO CADASTRO');
  console.log('═'.repeat(42));
  console.log(`  ✅ Criados:      ${criados}`);
  console.log(`  🔄 Atualizados:  ${atualizados}`);
  if (erros > 0) {
    console.log(`  ❌ Com erro:     ${erros}`);
    for (const e of errosList) console.log(`     • ${e}`);
  }
  console.log('═'.repeat(42));
  console.log(`\nCatálogo em: ${CATALOGO_PATH}`);
  console.log(`Total de produtos: ${Object.keys(catalogo).length}`);
}
