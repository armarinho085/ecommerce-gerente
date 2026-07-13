import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import type { LayoutAudit } from './auditar-layout';

interface Slot {
  nome: string;
  largura: number;
  altura: number;
}

const OUTPUT_BANNERS = path.resolve(__dirname, '../../../../output/banners');
const LAYOUT_JSON = path.resolve(__dirname, '../../../../output/site/ultimo-audit-layout.json');

export async function run(args: string[]) {
  await fs.mkdir(OUTPUT_BANNERS, { recursive: true });

  let slots: Slot[] = [];

  // Modo 1: dimensões passadas como argumento — ex: "1920x600:hero 768x400:mobile"
  if (args.some(a => /^\d+x\d+/i.test(a))) {
    for (const arg of args) {
      const m = arg.match(/^(\d+)x(\d+)(?::(.+))?$/i);
      if (m) {
        slots.push({
          largura: parseInt(m[1]),
          altura: parseInt(m[2]),
          nome: m[3] ?? `banner-${m[1]}x${m[2]}`,
        });
      }
    }
    console.log(`Gerando ${slots.length} banner(s) a partir dos argumentos...`);
  } else {
    // Modo 2: lê do último audit de layout
    let audit: LayoutAudit | null = null;
    try {
      const raw = await fs.readFile(LAYOUT_JSON, 'utf-8');
      audit = JSON.parse(raw) as LayoutAudit;
    } catch {
      console.error('Auditoria de layout não encontrada.');
      console.error('Execute primeiro: npx tsx gerente.ts site auditar-layout');
      console.error('Ou passe dimensões: npx tsx gerente.ts site gerar-banners 1920x600:hero 768x400:mobile');
      process.exit(1);
    }

    const slotsAudit = audit.slots ?? [];

    if (slotsAudit.length === 0) {
      console.log('Nenhum slot detectado na auditoria — usando tamanhos padrão Nuvemshop...');
      slots = slotsPadrao();
    } else {
      const seen = new Set<string>();

      for (const s of slotsAudit) {
        const key = `${s.largura}x${s.altura}`;
        if (seen.has(key)) continue;
        seen.add(key);
        slots.push({ nome: s.nome, largura: s.largura, altura: s.altura });

        // Para banners de desktop (>= 900px de largura), gera versão mobile automaticamente
        if (s.largura >= 900) {
          const mW = 768;
          const mH = Math.round((s.altura / s.largura) * mW);
          const mKey = `${mW}x${mH}`;
          if (!seen.has(mKey)) {
            seen.add(mKey);
            slots.push({ nome: `${s.nome}-mobile`, largura: mW, altura: mH });
          }
        }
      }

      console.log(`Gerando ${slots.length} banner(s) a partir da auditoria de layout...`);
    }
  }

  const gerados: string[] = [];

  for (const slot of slots) {
    console.log(`  Gerando ${slot.nome} (${slot.largura}×${slot.altura}px)...`);
    const outPath = await gerarBanner(slot.nome, slot.largura, slot.altura);
    gerados.push(outPath);
  }

  // Salvar instruções de upload
  const instrucoes = gerarInstrucoes(slots, gerados);
  const instrPath = path.join(OUTPUT_BANNERS, 'instrucoes-upload.md');
  await fs.writeFile(instrPath, instrucoes, 'utf-8');

  console.log(`\n${gerados.length} banner(s) gerado(s) em: ${OUTPUT_BANNERS}`);
  console.log(`Instruções de upload: ${instrPath}`);
}

async function gerarBanner(nome: string, largura: number, altura: number): Promise<string> {
  const arquivo = `${slugify(nome)}_${largura}x${altura}.png`;
  const outPath = path.join(OUTPUT_BANNERS, arquivo);

  // Tamanhos de fonte proporcionais à altura do banner
  const fs1 = clamp(Math.floor(altura / 7), 28, 80);   // nome do slot
  const fs2 = clamp(Math.floor(altura / 11), 20, 52);  // dimensões
  const fs3 = clamp(Math.floor(altura / 18), 14, 30);  // instrução menor
  const margem = 24;

  const labelFormatado = nome.replace(/[-_]/g, ' ').toUpperCase();

  // Usamos SVG composto sobre um buffer criado pelo sharp
  // O fundo escuro é criado pelo sharp (evita problemas de renderização SVG)
  // O SVG fica só com texto e elementos decorativos
  const svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#2a2a2a" stroke-width="0.8"/>
    </pattern>
  </defs>

  <!-- Fundo e grid -->
  <rect width="${largura}" height="${altura}" fill="#111111"/>
  <rect width="${largura}" height="${altura}" fill="url(#grid)" opacity="0.6"/>

  <!-- Borda -->
  <rect x="2" y="2" width="${largura - 4}" height="${altura - 4}"
        fill="none" stroke="#333333" stroke-width="2"/>

  <!-- Marcadores de canto -->
  <polyline points="${margem},${margem + 36} ${margem},${margem} ${margem + 36},${margem}"
            fill="none" stroke="#555555" stroke-width="2.5"/>
  <polyline points="${largura - margem - 36},${margem} ${largura - margem},${margem} ${largura - margem},${margem + 36}"
            fill="none" stroke="#555555" stroke-width="2.5"/>
  <polyline points="${margem},${altura - margem - 36} ${margem},${altura - margem} ${margem + 36},${altura - margem}"
            fill="none" stroke="#555555" stroke-width="2.5"/>
  <polyline points="${largura - margem - 36},${altura - margem} ${largura - margem},${altura - margem} ${largura - margem},${altura - margem - 36}"
            fill="none" stroke="#555555" stroke-width="2.5"/>

  <!-- Linha divisória central sutil -->
  <line x1="${largura * 0.1}" y1="${altura / 2}" x2="${largura * 0.9}" y2="${altura / 2}"
        stroke="#2a2a2a" stroke-width="1" stroke-dasharray="8,6"/>

  <!-- Nome do slot -->
  <text x="${largura / 2}" y="${altura / 2 - fs1 * 0.65}"
        font-family="Arial,Helvetica,sans-serif" font-size="${fs1}" font-weight="700"
        fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapeXml(labelFormatado)}</text>

  <!-- Dimensões -->
  <text x="${largura / 2}" y="${altura / 2 + fs2 * 0.65}"
        font-family="Arial,Helvetica,sans-serif" font-size="${fs2}"
        fill="#888888" text-anchor="middle" dominant-baseline="middle">${largura} × ${altura} px</text>

  <!-- Instrução -->
  <text x="${largura / 2}" y="${altura / 2 + fs1 * 0.65 + fs2 * 1.1}"
        font-family="Arial,Helvetica,sans-serif" font-size="${fs3}"
        fill="#444444" text-anchor="middle" dominant-baseline="middle">Substitua este placeholder pelo seu banner no painel da Nuvemshop</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 8 })
    .toFile(outPath);

  return outPath;
}

function slotsPadrao(): Slot[] {
  return [
    { nome: 'hero-desktop',        largura: 1920, altura: 600 },
    { nome: 'hero-mobile',         largura: 768,  altura: 400 },
    { nome: 'banner-categoria',    largura: 600,  altura: 400 },
    { nome: 'banner-promocional',  largura: 1200, altura: 400 },
    { nome: 'banner-destaque',     largura: 800,  altura: 500 },
    { nome: 'banner-lateral',      largura: 400,  altura: 600 },
  ];
}

function gerarInstrucoes(slots: Slot[], caminhos: string[]): string {
  const linhas: string[] = [
    '# Instruções de Upload de Banners — Nuvemshop',
    '',
    `_Gerado em ${new Date().toLocaleString('pt-BR')}_`,
    '',
    '---',
    '',
    '## Como substituir os banners no painel',
    '',
    '1. Acesse: **Minha Loja → Personalizar → [seção do banner]**',
    '2. Clique em "Alterar imagem" ou "Fazer upload" no slot correspondente',
    '3. Faça upload do arquivo PNG gerado abaixo',
    '4. Salve e visualize no site',
    '',
    '> **Dica:** Esses arquivos são _placeholders_ com as dimensões corretas.',
    '> Substitua-os pela sua arte final mantendo **exatamente** as mesmas dimensões.',
    '',
    '---',
    '',
    '## Banners gerados',
    '',
  ];

  slots.forEach((slot, i) => {
    const arquivo = path.basename(caminhos[i] ?? '');
    const label = slot.nome.replace(/[-_]/g, ' ');
    linhas.push(`### ${i + 1}. ${label.toUpperCase()}`);
    linhas.push(`- **Arquivo:** \`${arquivo}\``);
    linhas.push(`- **Dimensões:** ${slot.largura}×${slot.altura}px`);
    linhas.push(`- **Onde usar:** ${dicaOndeUsar(slot)}`);
    linhas.push(`- **Dica de design:** ${dicaDesign(slot)}`);
    linhas.push('');
  });

  linhas.push('---', '', '## Boas práticas para banners de ecommerce de moda', '');
  linhas.push('- **Imagem:** use fotos de produto de alta qualidade ou lookbook da coleção');
  linhas.push('- **Texto:** no máximo 2 linhas — ex: "Nova Coleção Verão" + "Ver agora →"');
  linhas.push('- **CTA:** sempre inclua um botão ou link visível');
  linhas.push('- **Contraste:** se o fundo for claro, use texto escuro (e vice-versa)');
  linhas.push('- **Formato final:** JPG qualidade 85–90% para fotos; PNG para arte gráfica sem fotos');
  linhas.push('- **Mobile:** evite texto menor que 18px — em celular o banner fica bem menor');
  linhas.push('- **Teste:** visualize no celular antes de publicar');

  return linhas.join('\n');
}

function dicaOndeUsar(slot: Slot): string {
  if (slot.largura >= 1400) return 'Banner hero/slider principal (ocupa a largura toda da página no desktop)';
  if (slot.nome.includes('mobile')) return 'Versão mobile do banner — exibida em smartphones e tablets';
  if (slot.altura > slot.largura) return 'Banner vertical — lateral, popup ou card de destaque';
  if (slot.largura >= 900) return 'Banner de seção (promoção, lançamento de coleção)';
  return 'Banner de categoria ou card promocional interno';
}

function dicaDesign(slot: Slot): string {
  if (slot.largura >= 1400) return `Use imagem de ${slot.largura}px ou maior para evitar pixelação em telas 4K`;
  if (slot.nome.includes('mobile')) return 'Centralize o assunto principal — as laterais são cortadas em telas estreitas';
  if (slot.altura > slot.largura) return 'Posicione o texto na parte inferior para não cobrir o rosto do modelo/produto';
  return `Resolução mínima recomendada: ${slot.largura}×${slot.altura}px`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
