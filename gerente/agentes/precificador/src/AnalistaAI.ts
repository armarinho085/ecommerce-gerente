import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarResumoMes(m: any): string {
  const r = m.resumo;
  const lines = [
    `## ${m.mesReferencia}`,
    `- Pedidos: ${r.totalPedidos} | Ticket médio: ${formatBRL(r.ticketMedio)}`,
    `- Receita: ${formatBRL(r.receitaTotal)} | Lucro bruto: ${formatBRL(r.lucroTotal)} (${r.margemGeral?.toFixed(1)}%)`,
  ];
  if (r.custoOperacional > 0) {
    lines.push(`- Custo operacional: ${formatBRL(r.custoOperacional)} | Lucro líquido: ${formatBRL(r.lucroLiquido)} (${r.margemLiquida?.toFixed(1)}%)`);
  }
  lines.push(`- Pedidos lucrativos: ${r.pedidosLucrativos} | Prejuízo: ${r.pedidosPrejuizo}`);
  if (m.porEcommerce?.length) {
    lines.push('- Por canal:');
    m.porEcommerce.forEach((e: any) => {
      lines.push(`  · ${e.ecommerce}: ${e.pedidos} pedidos | ${formatBRL(e.receitaTotal)} | margem ${e.margem.toFixed(1)}%`);
    });
  }
  return lines.join('\n');
}

export async function analisarMes(dados: any[]): Promise<string> {
  const resumo = dados.map(formatarResumoMes).join('\n\n');

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Você é um analista financeiro especialista em ecommerce de produtos para confecção, têxtil e artesanato.

Analise os dados abaixo e forneça:
1. Resumo da performance do período
2. Pontos de atenção (margens baixas, canais com prejuízo, tendências ruins)
3. Recomendações práticas e diretas

Dados:
${resumo}

Responda em português, de forma direta e objetiva.`,
    }],
  });

  return (resp.content[0] as any).text;
}

export async function analisarAnual(dados: any[]): Promise<string> {
  const resumo = dados.map(formatarResumoMes).join('\n\n');

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Você é um analista financeiro especialista em ecommerce de produtos para confecção, têxtil e artesanato.

Analise a evolução mensal abaixo e forneça:
1. Tendência geral (crescimento, queda, sazonalidade)
2. Melhores e piores meses e por quê
3. Canais mais e menos rentáveis ao longo do período
4. Recomendações estratégicas para os próximos meses

Dados mensais:
${resumo}

Responda em português, de forma direta e objetiva.`,
    }],
  });

  return (resp.content[0] as any).text;
}
