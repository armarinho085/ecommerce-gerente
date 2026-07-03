import { lerDadosSite } from '../src/SiteReader';
import { analisarAnual } from '../src/AnalistaAI';
import { salvarAnalise } from '../src/salvarAnalise';

export async function run(_args: string[]) {
  console.log('\nLendo todos os meses do site...');
  const dados = await lerDadosSite();

  if (dados.length === 0) {
    console.log('Nenhum dado encontrado. Exporte do site primeiro.');
    return;
  }

  const label = `${dados[0].mesReferencia}_a_${dados[dados.length - 1].mesReferencia}`;
  console.log(`Meses encontrados: ${dados.map(d => d.mesReferencia).join(', ')}\n`);
  console.log('Analisando evolução anual...\n');

  const analise = await analisarAnual(dados);
  console.log(analise);

  const arquivo = await salvarAnalise('anual', label, analise);
  console.log(`\nSalvo em: ${arquivo}`);
}
