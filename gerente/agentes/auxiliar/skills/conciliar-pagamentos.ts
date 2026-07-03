import { lerPlanilha, acharCol, toNum, listarColunas, Linha } from '../src/LeitorPlanilha';
import * as fs from 'fs';
import * as path from 'path';

const COL_ID = [
  'Número do pedido', 'Numero do pedido', 'N do pedido', 'N° do pedido',
  'ID do pedido', 'Pedido', 'Order ID', 'OrderID', 'Nro pedido',
];

const COL_VALOR_PEDIDO = [
  'Valor total', 'Total', 'Valor do produto',
  'Total Amount', 'Valor total do pedido', 'Order Total', 'Valor pedido',
];

const COL_VALOR_REPASSE = [
  'Valor liberado', 'Valor recebido', 'Valor', 'Total recebido',
  'Amount Released to Seller', 'Quantia liberada para o vendedor',
  'Net Amount', 'Valor repasse', 'Valor liquido', 'Valor líquido',
];

function parseArgs(args: string[]) {
  const r: { pedidos?: string; repasses?: string; marketplace?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pedidos') r.pedidos = args[++i];
    else if (args[i] === '--repasses') r.repasses = args[++i];
    else if (args[i] === '--marketplace') r.marketplace = args[++i];
    else if (!r.pedidos) r.pedidos = args[i];
    else if (!r.repasses) r.repasses = args[i];
    else r.marketplace = args[i];
  }
  return r;
}

function fmt(v: number | null) {
  if (v === null) return '-';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function run(args: string[]) {
  const opts = parseArgs(args);

  if (!opts.pedidos || !opts.repasses) {
    console.log('\nUso: auxiliar conciliar-pagamentos --pedidos <arquivo> --repasses <arquivo> [--marketplace ml|shopee]');
    console.log('Ou:  auxiliar conciliar-pagamentos pedidos.xlsx repasses.xlsx [ml|shopee]\n');
    console.log('Exemplos:');
    console.log('  auxiliar conciliar-pagamentos relatorio-ml.xlsx repasses-ml.xlsx ml');
    console.log('  auxiliar conciliar-pagamentos relatorio-shopee.xlsx repasses-shopee.xlsx shopee');
    return;
  }

  console.log(`\nLendo pedidos:  ${opts.pedidos}`);
  const pedidos = lerPlanilha(opts.pedidos);
  console.log(`  → ${pedidos.length} linha(s)`);

  console.log(`Lendo repasses: ${opts.repasses}`);
  const repasses = lerPlanilha(opts.repasses);
  console.log(`  → ${repasses.length} linha(s)`);

  const colIdPedido    = acharCol(pedidos, COL_ID);
  const colValorPedido = acharCol(pedidos, COL_VALOR_PEDIDO);
  const colIdRepasse   = acharCol(repasses, COL_ID);
  const colValorRepasse = acharCol(repasses, COL_VALOR_REPASSE);

  let erro = false;
  if (!colIdPedido) {
    console.error(`\nERRO: Coluna de ID do pedido não encontrada em "${opts.pedidos}"`);
    console.error(`Colunas disponíveis:\n${listarColunas(pedidos)}`);
    erro = true;
  }
  if (!colValorPedido) {
    console.error(`\nERRO: Coluna de valor não encontrada em "${opts.pedidos}"`);
    if (!erro) console.error(`Colunas disponíveis:\n${listarColunas(pedidos)}`);
    erro = true;
  }
  if (!colIdRepasse) {
    console.error(`\nERRO: Coluna de ID do pedido não encontrada em "${opts.repasses}"`);
    console.error(`Colunas disponíveis:\n${listarColunas(repasses)}`);
    erro = true;
  }
  if (!colValorRepasse) {
    console.error(`\nERRO: Coluna de valor liberado não encontrada em "${opts.repasses}"`);
    if (!erro) console.error(`Colunas disponíveis:\n${listarColunas(repasses)}`);
    erro = true;
  }
  if (erro) {
    console.error('\nDica: renomeie as colunas da planilha para nomes como "Número do pedido", "Valor total", "Valor liberado".');
    process.exit(1);
  }

  console.log(`\nColunas detectadas:`);
  console.log(`  Pedidos  → ID: "${colIdPedido}"   Valor: "${colValorPedido}"`);
  console.log(`  Repasses → ID: "${colIdRepasse}"   Valor: "${colValorRepasse}"`);

  // Monta mapa de repasses por ID
  const mapRepasse = new Map<string, { linha: Linha; valor: number | null }>();
  for (const r of repasses) {
    const id = String(r[colIdRepasse!] ?? '').trim();
    if (id) mapRepasse.set(id, { linha: r, valor: toNum(r[colValorRepasse!]) });
  }

  interface Resultado {
    id: string;
    valorPedido: number | null;
    valorRepasse: number | null;
    status: 'ok' | 'divergente' | 'sem_repasse';
    diferenca: number;
  }

  const resultados: Resultado[] = [];
  const idsProcessados = new Set<string>();
  const TOLERANCIA = 0.05;

  for (const p of pedidos) {
    const id = String(p[colIdPedido!] ?? '').trim();
    if (!id) continue;

    const valorPedido = toNum(p[colValorPedido!]);
    const repasse = mapRepasse.get(id);
    idsProcessados.add(id);

    if (!repasse) {
      resultados.push({ id, valorPedido, valorRepasse: null, status: 'sem_repasse', diferenca: valorPedido ?? 0 });
    } else {
      const diff = Math.abs((valorPedido ?? 0) - (repasse.valor ?? 0));
      resultados.push({
        id,
        valorPedido,
        valorRepasse: repasse.valor,
        status: diff <= TOLERANCIA ? 'ok' : 'divergente',
        diferenca: diff,
      });
    }
  }

  const semPedido: string[] = [];
  for (const [id] of mapRepasse) {
    if (!idsProcessados.has(id)) semPedido.push(id);
  }

  const ok         = resultados.filter(r => r.status === 'ok');
  const divergentes = resultados.filter(r => r.status === 'divergente');
  const semRepasse  = resultados.filter(r => r.status === 'sem_repasse');

  console.log('\n' + '═'.repeat(62));
  console.log('  RESULTADO DA CONCILIAÇÃO');
  console.log('═'.repeat(62));
  console.log(`  ✅ Conciliados corretamente:    ${ok.length}`);
  console.log(`  ⚠️  Com divergência de valor:   ${divergentes.length}`);
  console.log(`  ❌ Pedidos sem repasse:          ${semRepasse.length}`);
  console.log(`  ❓ Repasses sem pedido:          ${semPedido.length}`);
  console.log('═'.repeat(62));

  if (divergentes.length > 0) {
    console.log('\n⚠️  DIVERGÊNCIAS DE VALOR:');
    console.log('─'.repeat(62));
    for (const r of divergentes) {
      console.log(`  Pedido: ${r.id}`);
      console.log(`    Pedido: ${fmt(r.valorPedido)}  |  Repasse: ${fmt(r.valorRepasse)}  |  Diferença: ${fmt(r.diferenca)}`);
    }
  }

  if (semRepasse.length > 0) {
    console.log('\n❌ PEDIDOS SEM REPASSE:');
    console.log('─'.repeat(62));
    for (const r of semRepasse) {
      console.log(`  Pedido ${r.id} — Valor: ${fmt(r.valorPedido)}`);
    }
  }

  if (semPedido.length > 0) {
    console.log('\n❓ REPASSES SEM PEDIDO CORRESPONDENTE:');
    console.log('─'.repeat(62));
    for (const id of semPedido) {
      const r = mapRepasse.get(id)!;
      console.log(`  Pedido ${id} — Valor liberado: ${fmt(r.valor)}`);
    }
  }

  // Salva relatório
  const OUTPUT_DIR = path.resolve(__dirname, '../../../../output/conciliacao');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const now   = new Date();
  const data  = now.toISOString().slice(0, 10);
  const hora  = now.toTimeString().slice(0, 5).replace(':', 'h');
  const label = opts.marketplace?.toUpperCase() ?? 'MARKETPLACE';
  const arquivo = path.join(OUTPUT_DIR, `${data}_${hora}_conciliacao_${label}.md`);

  let md = `# Conciliação de Pagamentos — ${label}\n_Gerada em ${now.toLocaleString('pt-BR')}_\n\n---\n\n`;
  md += `**Pedidos:** \`${opts.pedidos}\`  \n`;
  md += `**Repasses:** \`${opts.repasses}\`\n\n`;
  md += `## Resumo\n\n| Status | Quantidade |\n|--------|------------|\n`;
  md += `| ✅ Conciliados | ${ok.length} |\n`;
  md += `| ⚠️ Divergentes | ${divergentes.length} |\n`;
  md += `| ❌ Sem repasse | ${semRepasse.length} |\n`;
  md += `| ❓ Repasse sem pedido | ${semPedido.length} |\n\n`;

  if (divergentes.length > 0) {
    md += `## ⚠️ Divergências de Valor\n\n| Pedido | Valor Pedido | Valor Repasse | Diferença |\n|--------|-------------|--------------|----------|\n`;
    for (const r of divergentes)
      md += `| ${r.id} | ${fmt(r.valorPedido)} | ${fmt(r.valorRepasse)} | ${fmt(r.diferenca)} |\n`;
    md += '\n';
  }

  if (semRepasse.length > 0) {
    md += `## ❌ Pedidos sem Repasse\n\n| Pedido | Valor Pedido |\n|--------|-------------|\n`;
    for (const r of semRepasse) md += `| ${r.id} | ${fmt(r.valorPedido)} |\n`;
    md += '\n';
  }

  if (semPedido.length > 0) {
    md += `## ❓ Repasses sem Pedido\n\n| Pedido | Valor Liberado |\n|--------|---------------|\n`;
    for (const id of semPedido) md += `| ${id} | ${fmt(mapRepasse.get(id)!.valor)} |\n`;
    md += '\n';
  }

  fs.writeFileSync(arquivo, md, 'utf-8');
  console.log(`\nRelatório salvo em: ${arquivo}`);
}
