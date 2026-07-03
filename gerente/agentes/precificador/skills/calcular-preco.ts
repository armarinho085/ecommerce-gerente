const TAXAS: Record<string, number> = {
  mercado_livre: 0.14,
  shopee: 0.20,
  amazon: 0.15,
  site_proprio: 0.03,
};

const NOMES: Record<string, string> = {
  mercado_livre: 'Mercado Livre',
  shopee: 'Shopee',
  amazon: 'Amazon',
  site_proprio: 'Site Próprio',
};

function formatBRL(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function run(args: string[]) {
  const custo = parseFloat(args[0]);
  const margemDesejada = parseFloat(args[1]) / 100; // ex: 30 -> 0.30

  if (isNaN(custo) || isNaN(margemDesejada)) {
    throw new Error('Uso: precificador calcular-preco <custo> <margem%>\nExemplo: precificador calcular-preco 15.00 30');
  }

  console.log(`\nCusto do produto: ${formatBRL(custo)}`);
  console.log(`Margem desejada: ${(margemDesejada * 100).toFixed(0)}%\n`);
  console.log('─'.repeat(52));
  console.log(`${'Canal'.padEnd(18)} ${'Taxa'.padEnd(8)} ${'Preço mínimo'.padEnd(14)} Preço c/ margem`);

  console.log('─'.repeat(52));

  for (const [canal, taxa] of Object.entries(TAXAS)) {
    // Preço mínimo: cobre custo + taxa sem margem
    const precoMinimo = custo / (1 - taxa);
    // Preço com margem: custo / (1 - taxa - margem)
    const denominador = 1 - taxa - margemDesejada;
    if (denominador <= 0) {
      console.log(`${NOMES[canal].padEnd(18)} ${((taxa * 100).toFixed(0) + '%').padEnd(8)} INVIÁVEL (taxa + margem > 100%)`);
      continue;
    }
    const precoFinal = custo / denominador;
    console.log(
      `${NOMES[canal].padEnd(18)} ${((taxa * 100).toFixed(0) + '%').padEnd(8)} ${formatBRL(precoMinimo).padEnd(14)} ${formatBRL(precoFinal)}`
    );
  }

  console.log('─'.repeat(52));
  console.log('\nPreço mínimo = cobre custo + taxa (margem zero)');
  console.log('Preço c/ margem = garante a margem líquida desejada após taxas');
}
