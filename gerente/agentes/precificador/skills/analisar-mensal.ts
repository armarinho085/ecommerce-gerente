import { lerDadosSite } from '../src/SiteReader';
import { analisarMes } from '../src/AnalistaAI';
import { salvarAnalise } from '../src/salvarAnalise';

export async function run(args: string[]) {
  const mes = args[0]; // opcional: YYYY-MM

  console.log('\nLendo dados do site...');
  const dados = await lerDadosSite(mes);

  if (dados.length === 0) {
    console.log('Nenhum dado encontrado. Exporte do site primeiro.');
    return;
  }

  const alvo = mes ? dados : [dados[dados.length - 1]];
  const label = alvo.map(d => d.mesReferencia).join('_');
  console.log(`Analisando: ${label}\n`);

  const analise = await analisarMes(alvo);
  console.log(analise);

  const arquivo = await salvarAnalise('mensal', label, analise);
  console.log(`\nSalvo em: ${arquivo}`);
}
