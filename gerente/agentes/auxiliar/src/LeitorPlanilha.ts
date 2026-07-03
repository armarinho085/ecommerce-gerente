import * as XLSX from 'xlsx';
import * as fs from 'fs';

export type Linha = Record<string, string | number | null>;

export function lerPlanilha(caminho: string): Linha[] {
  if (!fs.existsSync(caminho)) throw new Error(`Arquivo não encontrado: ${caminho}`);
  const wb = XLSX.readFile(caminho);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Linha>(ws, { defval: null });
}

export function normCol(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function acharCol(linhas: Linha[], candidatos: string[]): string | null {
  if (!linhas.length) return null;
  const cols = Object.keys(linhas[0]);
  for (const c of candidatos) {
    const found = cols.find(k => normCol(k) === normCol(c));
    if (found) return found;
  }
  return null;
}

export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[R$\s]/g, '');
  // Formato BR: 1.500,00 → 1500.00
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function listarColunas(linhas: Linha[]): string {
  if (!linhas.length) return '  (arquivo vazio)';
  return Object.keys(linhas[0]).map(c => `  - "${c}"`).join('\n');
}
