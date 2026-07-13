import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

export async function analisarSEO(dados: string): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Você é um especialista em SEO para lojas de ecommerce de moda e têxtil.

Analise os dados de auditoria SEO abaixo e forneça:
1. Diagnóstico geral (nota de 0 a 10 e por quê)
2. Prioridades imediatas (os 3 problemas mais críticos para corrigir primeiro)
3. Padrões identificados (erros recorrentes no catálogo)
4. Recomendações práticas com exemplos reais de como melhorar titles e descriptions

Dados:
${dados}

Responda em português, de forma direta e prática. Dê exemplos concretos.`,
    }],
  });
  return (resp.content[0] as any).text;
}

export async function analisarCatalogo(dados: string): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Você é um especialista em gestão de catálogo para ecommerce de moda e artesanato.

Analise os problemas de completude do catálogo abaixo e forneça:
1. Impacto estimado de cada categoria de problema nas vendas
2. Ordem de prioridade para correção
3. Dicas práticas para preencher as informações faltantes com eficiência

Dados:
${dados}

Responda em português, de forma direta e objetiva.`,
    }],
  });
  return (resp.content[0] as any).text;
}

export async function analisarPedidos(dados: string): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Você é um analista de ecommerce especialista em moda, têxtil e artesanato.

Analise os dados de pedidos abaixo e forneça:
1. Performance geral do período
2. Produtos destaque (mais vendidos e mais rentáveis)
3. Pontos de atenção (produtos parados, ticket baixo, etc.)
4. Recomendações de ação (estoque, promoção, mix de produtos)

Dados:
${dados}

Responda em português, de forma direta e prática.`,
    }],
  });
  return (resp.content[0] as any).text;
}

export async function analisarLayout(dados: string): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Você é um especialista em design e UX para lojas virtuais de moda e artesanato.

Analise o levantamento de layout abaixo e forneça:
1. **Diagnóstico do tema** — avalie o tema detectado (pontos fortes e limitações para ecommerce de moda)
2. **Análise dos slots de banner** — para cada slot identificado:
   - Se está vazio ou mal aproveitado
   - Que conteúdo colocar (promoção, coleção, categoria, branding)
   - Sugestão de texto principal e CTA (chamada para ação)
3. **Hierarquia visual recomendada** — o que o cliente deve ver primeiro, segundo e terceiro ao entrar na loja
4. **Melhorias prioritárias** — top 5 ações concretas, ordenadas por impacto nas conversões
5. **Próximos passos** — o que fazer primeiro para melhorar o visual da loja esta semana

Dados do levantamento:
${dados}

Responda em português, de forma direta e acionável. Use exemplos de texto reais para os banners.`,
    }],
  });
  return (resp.content[0] as any).text;
}

export async function analisarLoja(dados: string): Promise<string> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1800,
    messages: [{
      role: 'user',
      content: `Você é um especialista em UX, SEO técnico e otimização de lojas virtuais de moda e artesanato.

Analise a estrutura da loja abaixo e forneça:
1. Diagnóstico de SEO técnico (título, meta description, headings, imagens)
2. Diagnóstico de experiência do usuário (navegação, estrutura, clareza)
3. Problemas críticos a corrigir com urgência
4. Melhorias de médio prazo (checkout, categorias, conteúdo)
5. Oportunidades identificadas

Dados capturados da loja:
${dados}

Responda em português, com diagnóstico detalhado e recomendações práticas.`,
    }],
  });
  return (resp.content[0] as any).text;
}
