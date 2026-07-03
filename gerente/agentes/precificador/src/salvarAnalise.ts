import fs from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '../../../../output/analises');

export async function salvarAnalise(tipo: string, label: string, conteudo: string): Promise<string> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const data = new Date().toISOString().slice(0, 10);
  const hora = new Date().toTimeString().slice(0, 5).replace(':', 'h');
  const nome = `${data}_${hora}_${tipo}_${label}.md`;
  const filePath = path.join(OUTPUT_DIR, nome);

  const header = `# Análise: ${tipo} — ${label}\n_Gerada em ${new Date().toLocaleString('pt-BR')}_\n\n---\n\n`;
  await fs.writeFile(filePath, header + conteudo, 'utf-8');

  return filePath;
}
