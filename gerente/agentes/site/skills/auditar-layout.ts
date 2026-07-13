import path from 'path';
import fs from 'fs/promises';
import { chromium } from 'playwright';
import { getStore, getActiveTheme } from '../src/NuvemshopAPI';
import { analisarLayout } from '../src/AnalistaSiteAI';
import { salvarRelatorio } from '../src/salvarRelatorio';

interface SlotBanner {
  nome: string;
  classe: string;
  largura: number;
  altura: number;
  temImagem: boolean;
  qtdImagens: number;
}

interface SecaoLayout {
  tipo: string;
  classe: string;
  largura: number;
  altura: number;
  posicaoY: number;
}

export interface LayoutAudit {
  tema: { id: number; nome: string; code: string } | null;
  temaBody: string;
  slots: SlotBanner[];
  secoes: SecaoLayout[];
  screenshotPath: string;
  dataAuditoria: string;
  urlLoja: string;
}

const OUTPUT_DIR = path.resolve(__dirname, '../../../../output/site');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

export async function run(_args: string[]) {
  console.log('Identificando tema e layout da loja...');

  const [loja, tema] = await Promise.all([
    getStore(),
    getActiveTheme().catch(() => null),
  ]);

  if (tema) {
    console.log(`Tema ativo: ${tema.name} (${tema.code})`);
  } else {
    console.log('Tema: não identificado via API (token pode não ter permissão /themes)');
  }

  const lojaUrl = loja.url.startsWith('http') ? loja.url : `https://${loja.url}`;

  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true }).catch(() => {
    throw new Error('Playwright não encontrou o browser. Execute: npx playwright install chromium');
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  });

  const audit: LayoutAudit = {
    tema: tema ? { id: tema.id, nome: tema.name, code: tema.code } : null,
    temaBody: '',
    slots: [],
    secoes: [],
    screenshotPath: '',
    dataAuditoria: new Date().toISOString(),
    urlLoja: lojaUrl,
  };

  try {
    const page = await context.newPage();
    console.log(`Carregando ${lojaUrl}...`);
    await page.goto(lojaUrl, { waitUntil: 'load', timeout: 45000 });

    // Scroll para ativar lazy-loading e depois volta ao topo
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Screenshot full page
    const dataHora = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
    const screenshotPath = path.join(SCREENSHOT_DIR, `layout_${dataHora}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    audit.screenshotPath = screenshotPath;
    console.log(`Screenshot salvo: ${path.basename(screenshotPath)}`);

    // Detectar tema pelo HTML
    const temaHtml = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return [
        body.className,
        html.getAttribute('data-theme') ?? body.getAttribute('data-theme') ?? '',
        (window as any).__theme ?? '',
      ].filter(Boolean).join(' | ');
    });
    audit.temaBody = temaHtml;

    // Detectar slots de banner por dimensão e classe
    const slotsDetectados: SlotBanner[] = await page.evaluate(() => {
      const KEYWORDS = /slider|banner|hero|carousel|slide|featured|promo|highlight|destaque|vitrine|home-|swiper/i;
      const MIN_W = 300;
      const MIN_H = 100;
      const seen = new Set<string>();
      const result: Array<{
        nome: string; classe: string; largura: number; altura: number;
        temImagem: boolean; qtdImagens: number;
      }> = [];

      document.querySelectorAll('[class]').forEach(el => {
        const cls = el.className;
        if (typeof cls !== 'string' || !KEYWORDS.test(cls)) return;

        const w = (el as HTMLElement).offsetWidth;
        const h = (el as HTMLElement).offsetHeight;
        if (w < MIN_W || h < MIN_H) return;

        const key = `${w}x${h}`;
        if (seen.has(key)) return;
        seen.add(key);

        const imgs = Array.from(el.querySelectorAll('img'));
        const temImagem = imgs.some(img => img.src && img.naturalWidth > 0);

        result.push({
          nome: cls.trim().split(' ')[0].replace(/[^a-z0-9-_]/gi, '').slice(0, 50),
          classe: cls.trim().slice(0, 100),
          largura: w,
          altura: h,
          temImagem,
          qtdImagens: imgs.length,
        });
      });

      // Imagens grandes avulsas (sem container com keyword)
      document.querySelectorAll('img').forEach(img => {
        const w = img.offsetWidth;
        const h = img.offsetHeight;
        if (w < 400 || h < 150) return;
        const key = `img_${w}x${h}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({
          nome: `imagem-grande-${w}x${h}`,
          classe: img.className.trim().slice(0, 100),
          largura: w,
          altura: h,
          temImagem: true,
          qtdImagens: 1,
        });
      });

      return result.sort((a, b) => b.largura - a.largura);
    });

    audit.slots = slotsDetectados;
    console.log(`${slotsDetectados.length} slot(s) de banner identificado(s)`);

    // Detectar seções da homepage
    const secoesDetectadas: SecaoLayout[] = await page.evaluate(() => {
      const SEC_KEYWORDS = /section|home-|bloco|row|container|wrapper/i;
      const seen = new Set<number>();
      const result: Array<{ tipo: string; classe: string; largura: number; altura: number; posicaoY: number }> = [];

      const candidatos = document.querySelectorAll(
        'section, [class*="home-"], [class*="section-"], main > div, main > section'
      );

      candidatos.forEach(el => {
        const w = (el as HTMLElement).offsetWidth;
        const h = (el as HTMLElement).offsetHeight;
        if (w < 200 || h < 50) return;

        const posY = Math.round((el as HTMLElement).offsetTop);
        if (seen.has(posY)) return;
        seen.add(posY);

        const cls = typeof el.className === 'string' ? el.className : '';
        result.push({
          tipo: el.tagName.toLowerCase(),
          classe: cls.trim().slice(0, 100),
          largura: w,
          altura: h,
          posicaoY: posY,
        });
      });

      return result.sort((a, b) => a.posicaoY - b.posicaoY).slice(0, 20);
    });

    audit.secoes = secoesDetectadas;

    await page.close();
  } finally {
    await browser.close();
  }

  // Salvar JSON para o gerar-banners usar
  const jsonPath = path.join(OUTPUT_DIR, 'ultimo-audit-layout.json');
  await fs.writeFile(jsonPath, JSON.stringify(audit, null, 2), 'utf-8');

  // ── Montar relatório ──────────────────────────────────────────────────────

  const linhas: string[] = [];

  linhas.push(`## Auditoria de Layout — ${loja.name}`);
  linhas.push(`**Loja:** ${audit.urlLoja}`);
  linhas.push(`**Data:** ${new Date(audit.dataAuditoria).toLocaleString('pt-BR')}`);
  linhas.push('');

  linhas.push('## Tema Ativo');
  if (audit.tema) {
    linhas.push(`**Nome:** ${audit.tema.nome}`);
    linhas.push(`**Código:** ${audit.tema.code}`);
    linhas.push(`**ID:** ${audit.tema.id}`);
  } else {
    linhas.push('_Não identificado via API (token sem escopo /themes)_');
  }
  if (audit.temaBody) {
    linhas.push(`**Classes no HTML:** \`${audit.temaBody}\``);
  }
  linhas.push('');

  linhas.push('## Screenshot');
  linhas.push(`Captura salva em: \`${audit.screenshotPath}\``);
  linhas.push('');

  linhas.push(`## Slots de Banner Identificados (${audit.slots.length})`);
  if (audit.slots.length === 0) {
    linhas.push('_Nenhum slot detectado automaticamente._');
    linhas.push('_Dica: verifique o screenshot — o tema pode usar seletores incomuns._');
  } else {
    linhas.push('| Slot | Dimensões | Com imagem? | Qtd imgs |');
    linhas.push('|------|-----------|-------------|----------|');
    for (const s of audit.slots) {
      const status = s.temImagem ? 'Sim' : '**VAZIO**';
      linhas.push(`| \`${s.nome}\` | **${s.largura}×${s.altura}px** | ${status} | ${s.qtdImagens} |`);
    }
  }
  linhas.push('');

  linhas.push(`## Seções da Homepage (${audit.secoes.length})`);
  for (const sec of audit.secoes) {
    linhas.push(`- **Y=${sec.posicaoY}px** — \`${sec.classe || sec.tipo}\` (${sec.largura}×${sec.altura}px)`);
  }
  linhas.push('');

  const dadosSummary = linhas.join('\n');

  console.log('\nAnalisando layout com IA...');
  const analiseIA = await analisarLayout(dadosSummary);

  const relatorio = `${dadosSummary}\n---\n\n## Análise IA\n\n${analiseIA}`;
  const caminhoRelatorio = await salvarRelatorio('auditoria-layout', relatorio);

  console.log(`\nRelatório salvo em: ${caminhoRelatorio}`);
  console.log(`JSON de layout salvo em: ${jsonPath}`);

  if (audit.slots.length > 0) {
    console.log('\nSlots detectados:');
    audit.slots.forEach(s => {
      const status = s.temImagem ? 'com imagem' : 'VAZIO';
      console.log(`  ${s.largura}×${s.altura}px — ${s.nome} (${status})`);
    });
    console.log('\nDica: execute "npx tsx gerente.ts site gerar-banners" para criar os banners com as dimensões corretas.');
  }
}
