import { chromium } from 'playwright';
import { getStore, getProducts, ptField } from '../src/NuvemshopAPI';
import { analisarLoja } from '../src/AnalistaSiteAI';
import { salvarRelatorio } from '../src/salvarRelatorio';

export async function run(_args: string[]) {
  console.log('Buscando informações da loja...');
  const [loja, produtos] = await Promise.all([getStore(), getProducts()]);

  const lojaUrl = loja.url.startsWith('http') ? loja.url : `https://${loja.url}`;

  const publicados = produtos.filter(p => p.published);
  const produtoAleatorio = publicados[Math.floor(Math.random() * publicados.length)];
  const urlProduto = produtoAleatorio?.canonical_url ?? '';

  console.log(`Abrindo navegador para analisar: ${lojaUrl}`);

  const browser = await chromium.launch({ headless: true }).catch(() => {
    throw new Error(
      'Playwright não encontrou o browser. Execute: npx playwright install chromium'
    );
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  });

  const resultados: string[] = [];

  try {
    // ── Homepage ────────────────────────────────────────────────────────────
    console.log('Analisando homepage...');
    const pageHome = await context.newPage();
    const homeStart = Date.now();
    await pageHome.goto(lojaUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const homeLoad = Date.now() - homeStart;

    const homeData = await pageHome.evaluate(() => ({
      title: document.title,
      metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      metaRobots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
      h1s: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim() ?? ''),
      h2s: Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim() ?? '').slice(0, 10),
      navLinks: Array.from(document.querySelectorAll('nav a, header a')).map(el => el.textContent?.trim() ?? '').filter(Boolean).slice(0, 20),
      imgSemAlt: Array.from(document.querySelectorAll('img')).filter(img => !img.alt || img.alt.trim() === '').length,
      totalImgs: document.querySelectorAll('img').length,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
      hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
    }));

    resultados.push(
      '## Homepage',
      `**URL:** ${lojaUrl}  `,
      `**Tempo de carregamento:** ${homeLoad}ms`,
      `**Title:** ${homeData.title || '(vazio)'}  `,
      `**Comprimento do title:** ${homeData.title.length} chars (ideal: 50–60)`,
      `**Meta description:** ${homeData.metaDesc || '(vazio)'}  `,
      `**Comprimento da meta desc:** ${homeData.metaDesc.length} chars (ideal: 120–160)`,
      `**Canonical:** ${homeData.canonical || '(não definido)'}`,
      `**Meta robots:** ${homeData.metaRobots || '(padrão)'}`,
      `**Dados estruturados (JSON-LD):** ${homeData.hasStructuredData ? 'Sim' : 'Não'}`,
      '',
      `**H1s (${homeData.h1s.length}):** ${homeData.h1s.join(' | ') || '(nenhum)'}`,
      `**H2s principais:** ${homeData.h2s.join(' | ') || '(nenhum)'}`,
      '',
      `**Links de navegação:** ${homeData.navLinks.join(', ')}`,
      '',
      `**Imagens:** ${homeData.totalImgs} total | ${homeData.imgSemAlt} sem atributo alt`,
      '',
    );

    await pageHome.close();

    // ── Página de produto ────────────────────────────────────────────────────
    if (urlProduto) {
      const nomeProduto = ptField(produtoAleatorio?.name as any);
      console.log(`Analisando página de produto: ${nomeProduto}...`);

      const pageProduto = await context.newPage();
      const prodStart = Date.now();
      await pageProduto.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const prodLoad = Date.now() - prodStart;

      const prodData = await pageProduto.evaluate(() => ({
        title: document.title,
        metaDesc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
        h1s: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim() ?? ''),
        hasAddToCart: !!document.querySelector('[class*="add-to-cart"], [class*="comprar"], button[type="submit"]'),
        hasBreadcrumb: !!document.querySelector('[class*="breadcrumb"], nav[aria-label*="read"], ol[class*="bread"]'),
        hasReviews: !!document.querySelector('[class*="review"], [class*="avaliacao"]'),
        imgSemAlt: Array.from(document.querySelectorAll('img')).filter(img => !img.alt || img.alt.trim() === '').length,
        totalImgs: document.querySelectorAll('img').length,
        hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
      }));

      resultados.push(
        `## Página de Produto (amostra: "${nomeProduto}")`,
        `**URL:** ${urlProduto}  `,
        `**Tempo de carregamento:** ${prodLoad}ms`,
        `**Title:** ${prodData.title || '(vazio)'}`,
        `**Meta description:** ${prodData.metaDesc || '(vazio)'}`,
        `**H1:** ${prodData.h1s.join(' | ') || '(nenhum)'}`,
        `**Botão de compra visível:** ${prodData.hasAddToCart ? 'Sim' : 'Não detectado'}`,
        `**Breadcrumb:** ${prodData.hasBreadcrumb ? 'Sim' : 'Não'}`,
        `**Avaliações/Reviews:** ${prodData.hasReviews ? 'Sim' : 'Não'}`,
        `**Dados estruturados (JSON-LD):** ${prodData.hasStructuredData ? 'Sim' : 'Não'}`,
        `**Imagens:** ${prodData.totalImgs} total | ${prodData.imgSemAlt} sem alt`,
        '',
      );

      await pageProduto.close();
    }

    // ── Métricas gerais ──────────────────────────────────────────────────────
    resultados.push(
      '## Dados Gerais da Loja (via API)',
      `**Nome:** ${loja.name}`,
      `**Moeda:** ${loja.currency}`,
      `**Total de produtos publicados:** ${publicados.length}`,
      '',
    );

  } finally {
    await browser.close();
  }

  const dadosSummary = resultados.join('\n');

  console.log('\nAnalisando com IA...');
  const analiseIA = await analisarLoja(dadosSummary);

  const relatorio = `${dadosSummary}\n---\n\n## Análise IA\n\n${analiseIA}`;
  const caminho = await salvarRelatorio('analise-loja', relatorio);

  console.log(`\nRelatório salvo em: ${caminho}`);
}
