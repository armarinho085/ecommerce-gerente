import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Tenta os dois nomes possíveis (Chrome às vezes adiciona .json duplo)
const JSON_CANDIDATES = [
  path.join(os.homedir(), 'Downloads', 'agente-dados.json'),
  path.join(os.homedir(), 'Downloads', 'agente-dados.json.json'),
  path.join(os.homedir(), 'Downloads', 'agente-dados'),
];

export interface ResumeMes {
  totalPedidos: number;
  receitaTotal: number;
  lucroTotal: number;
  lucroLiquido: number;
  margemGeral: number;
  margemLiquida: number;
  ticketMedio: number;
  custoProdutos: number;
  comissoes: number;
  frete: number;
  taxas: number;
  incentivos: number;
  custoOperacional: number;
  pedidosLucrativos: number;
  pedidosPrejuizo: number;
}

export interface DadosMes {
  mesReferencia: string;
  nomeArquivo: string;
  resumo: ResumeMes;
  custoOperacional: number;
  dataImportacao: string;
  porEcommerce: Array<{
    ecommerce: string;
    pedidos: number;
    receitaTotal: number;
    lucroTotal: number;
    ticketMedio: number;
    margem: number;
  }>;
}

export async function lerDadosSite(mes?: string): Promise<DadosMes[]> {
  let raw: Buffer | null = null;
  for (const candidate of JSON_CANDIDATES) {
    try {
      raw = await fs.readFile(candidate);
      break;
    } catch { /* tenta o próximo */ }
  }
  if (!raw) {
    throw new Error(
      `Arquivo não encontrado em Downloads.\n\n` +
      `Para exportar:\n` +
      `1. Abra o site de custos no Chrome\n` +
      `2. Clique no botão "Exportar para IA (JSON)"\n` +
      `3. O arquivo será baixado automaticamente para Downloads\n` +
      `4. Rode o comando novamente`
    );
  }

  const json = JSON.parse(raw.toString());
  const meses: DadosMes[] = json.meses ?? [];

  if (meses.length === 0) {
    throw new Error('O arquivo agente-dados.json está vazio. Exporte novamente do site.');
  }

  if (mes) {
    const filtrado = meses.filter(m => m.mesReferencia === mes);
    if (filtrado.length === 0) {
      const disponiveis = meses.map(m => m.mesReferencia).join(', ');
      throw new Error(`Mês "${mes}" não encontrado. Disponíveis: ${disponiveis}`);
    }
    return filtrado;
  }

  return meses.sort((a, b) => a.mesReferencia.localeCompare(b.mesReferencia));
}
