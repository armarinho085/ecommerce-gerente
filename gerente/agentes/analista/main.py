import sys
import os
from dotenv import load_dotenv
from crewai import Task, Crew

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agentes.analista.analista import analista


def rodar_analista(caminho_arquivo: str):
    tarefa = Task(
        description=(
            f"Analise o relatorio de vendas localizado em: {caminho_arquivo}\n\n"
            "Use a ferramenta de analise para processar o arquivo e depois:\n"
            "1. Apresente um resumo executivo do periodo\n"
            "2. Destaque os canais mais e menos rentaveis\n"
            "3. Liste todos os erros e anomalias encontrados com explicacao\n"
            "4. Sugira acoes corretivas para os problemas identificados\n"
            "5. Aponte oportunidades de melhoria de margem"
        ),
        expected_output=(
            "Relatorio completo de analise de vendas com resumo executivo, "
            "ranking de canais, lista de erros com sugestoes de correcao e "
            "recomendacoes de melhoria."
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
        print("Uso: python main.py <caminho_do_arquivo.xlsx>")
        print("Exemplo: python main.py C:/relatorios/custos_maio_2026.xlsx")
        sys.exit(1)

    caminho = sys.argv[1]
    if not os.path.exists(caminho):
        print(f"Arquivo nao encontrado: {caminho}")
        sys.exit(1)

    rodar_analista(caminho)
