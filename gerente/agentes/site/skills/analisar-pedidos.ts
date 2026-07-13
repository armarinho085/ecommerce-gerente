import { getOrders, getStore, NSOrder } from '../src/NuvemshopAPI';
import { analisarPedidos } from '../src/AnalistaSiteAI';
import { salvarRelatorio } from '../src/salvarRelatorio';

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  closed: 'Fechado',
  cancelled: 'Cancelado',
};

const PAY_LABELS: Record<string, string> = {
  pending: 'Pendente',
  authorized: 'Autorizado',
  paid: 'Pago',
  voided: 'Estornado',
  refunded: 'Reembolsado',
  abandoned: 'Abandonado',
};

export async function run(args: string[]) {
  if (args[0] === 'help') {
    console.log('\nSkill: analisar-pedidos');
    console.log('Analisa pedidos da loja Nuvemshop com insights por IA.\n');
    console.log('Uso:');
    console.log('  npx tsx gerente.ts site analisar-pedidos');
    console.log('  npx tsx gerente.ts site analisar-pedidos --dias 60');
    console.log('  npx tsx gerente.ts site analisar-pedidos --inicio 2026-06-01 --fim 2026-06-30');
    return;
  }

  let inicio: string | undefined;
  let fim: string | undefined;
  let dias = 30;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dias') dias = parseInt(args[i + 1] ?? '30');
    if (args[i] === '--inicio') inicio = args[i + 1];
    if (args[i] === '--fim') fim = args[i + 1];
  }

  if (!inicio) {
    const d = new Date();
    fim = d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - dias);
    inicio = d.toISOString().slice(0, 10);
  }

  console.log(`Buscando pedidos de ${inicio} a ${fim}...`);
  const [pedidos, loja] = await Promise.all([
    getOrders({ created_at_min: `${inicio}T00:00:00-03:00`, created_at_max: `${fim}T23:59:59-03:00` }),
    getStore(),
  ]);

  console.log(`${pedidos.length} pedidos encontrados.`);

  if (pedidos.length === 0) {
    console.log('Nenhum pedido no período informado.');
    return;
  }

  // ── Agregações ────────────────────────────────────────────────────────────

  const pagos = pedidos.filter(p => p.payment_status === 'paid');
  const receita = pagos.reduce((s, p) => s + parseFloat(p.total), 0);
  const ticket = pagos.length > 0 ? receita / pagos.length : 0;

  const porStatus: Record<string, number> = {};
  for (const p of pedidos) {
    const k = STATUS_LABELS[p.status] ?? p.status;
    porStatus[k] = (porStatus[k] ?? 0) + 1;
  }

  const porPagamento: Record<string, number> = {};
  for (const p of pedidos) {
    const k = PAY_LABELS[p.payment_status] ?? p.payment_status;
    porPagamento[k] = (porPagamento[k] ?? 0) + 1;
  }

  const produtosMap: Record<string, { nome: string; qty: number; receita: number }> = {};
  for (const p of pagos) {
    for (const item of (p.products ?? [])) {
      const key = String(item.product_id || item.name);
      if (!produtosMap[key]) produtosMap[key] = { nome: item.name, qty: 0, receita: 0 };
      produtosMap[key].qty += item.quantity;
      produtosMap[key].receita += parseFloat(item.price) * item.quantity;
    }
  }

  const topProdutos = Object.values(produtosMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // ── Relatório ─────────────────────────────────────────────────────────────

  const linhas: string[] = [
    `## Análise de Pedidos — ${loja.name}`,
    `**Período:** ${inicio} a ${fim}  `,
    `**Loja:** ${loja.url}`,
    '',
    '### Resumo Geral',
    `- Total de pedidos: **${pedidos.length}**`,
    `- Pedidos pagos: **${pagos.length}**`,
    `- Receita total (pagos): **${brl(receita)}**`,
    `- Ticket médio: **${brl(ticket)}**`,
    '',
    '### Por Status do Pedido',
    ...Object.entries(porStatus).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '### Por Status de Pagamento',
    ...Object.entries(porPagamento).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '### Top 10 Produtos (por quantidade vendida)',
    '| Produto | Qtd | Receita |',
    '|---------|-----|---------|',
    ...topProdutos.map(p => `| ${p.nome} | ${p.qty} | ${brl(p.receita)} |`),
    '',
  ];

  const dadosSummary = linhas.join('\n');

  console.log('\nAnalisando com IA...');
  const analiseIA = await analisarPedidos(dadosSummary);

  const relatorio = `${dadosSummary}\n---\n\n## Análise IA\n\n${analiseIA}`;
  const caminho = await salvarRelatorio('pedidos', relatorio);

  console.log(`\nRelatório salvo em: ${caminho}`);
  console.log(`\nResumo: ${pedidos.length} pedidos | ${pagos.length} pagos | Receita: ${brl(receita)} | Ticket: ${brl(ticket)}`);
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
