import sys
import os
from dotenv import load_dotenv
from crewai import Task, Crew

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agentes.analista.analista import analista


def rodar_analista(caminho_arquivo: str, custo_operacional: float = 0.0):
    desc_custo = (
        f"\n\nCusto operacional mensal informado: R${custo_operacional:,.2f} "
        f"(use esse valor ao chamar a ferramenta de analise)"
        if custo_operacional > 0
        else ""
    )

    tarefa = Task(
        description=(
            f"Analise o relatorio de vendas localizado em: {caminho_arquivo}{desc_custo}\n\n"
            "Siga esta sequencia:\n"
            "1. Use 'Analisar relatorio de vendas' para obter o resumo geral, por canal e alertas\n"
            "2. Use 'Listar pedidos criticos por margem' para detalhar os pedidos problemáticos\n"
            "3. Com base nos dados das duas ferramentas, elabore o relatorio final com:\n"
            "   a) Resumo executivo do periodo (receita, lucro bruto, margem, ticket medio)\n"
            "   b) Ranking dos canais por rentabilidade com analise\n"
            "   c) Lista de pedidos criticos (prejuizo, margem baixa, inconsistencias)\n"
            "   d) Acoes corretivas recomendadas para cada problema encontrado\n"
            "   e) Oportunidades de melhoria de margem identificadas"
        ),
        expected_output=(
            "Relatorio completo com: resumo executivo numerico, ranking de canais "
            "por margem, lista dos pedidos problemáticos com valores exatos, "
            "acoes corretivas especificas e recomendacoes priorizadas."
        ),
        agent=analista,
    )

    crew = Crew(agents=[analista], tasks=[tarefa], verbose=True)
    resultado = crew.kickoff()
    print("\n" + "=" * 60)
    print("RELATORIO FINAL DO ANALISTA")
    print("=" * 60)
    print(resultado)
    return resultado


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python main.py <caminho_do_arquivo.xlsx> [custo_operacional]")
        print("Exemplo: python main.py C:/relatorios/custos_maio_2026.xlsx 3500")
        sys.exit(1)

    caminho = sys.argv[1]
    if not os.path.exists(caminho):
        print(f"Arquivo nao encontrado: {caminho}")
        sys.exit(1)

    custo_op = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
    rodar_analista(caminho, custo_op)
