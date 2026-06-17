import sys
import os
from dotenv import load_dotenv
from crewai import Crew, Task, Process

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from gerente import gerente
from agentes.analista.analista import analista

AGENTES = [analista]

BANNER = """
╔══════════════════════════════════════════════════════════╗
║           GERENTE DE ECOMMERCE                           ║
║  Agentes disponíveis: Analista de Vendas                 ║
║  Digite 'sair' para encerrar                             ║
╚══════════════════════════════════════════════════════════╝
"""


def executar(mensagem: str) -> str:
    tarefa = Task(
        description=(
            f"Solicitação do usuário: {mensagem}\n\n"
            "Identifique o que o usuário precisa e use os agentes disponíveis "
            "para atender a solicitação. Se precisar de informações adicionais "
            "(como caminho de arquivo), informe claramente o que falta."
        ),
        expected_output=(
            "Resposta completa à solicitação: dados analisados, conclusões "
            "e recomendações práticas."
        ),
    )

    crew = Crew(
        agents=AGENTES,
        tasks=[tarefa],
        process=Process.hierarchical,
        manager_agent=gerente,
        verbose=False,
    )

    return str(crew.kickoff())


def main():
    print(BANNER)

    while True:
        try:
            mensagem = input("Você: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nEncerrando...")
            break

        if not mensagem:
            continue
        if mensagem.lower() in ("sair", "exit", "quit"):
            print("Até logo!")
            break

        print("\n⏳ Processando...\n")
        resultado = executar(mensagem)
        print(f"\n{'─'*60}")
        print(resultado)
        print(f"{'─'*60}\n")


if __name__ == "__main__":
    main()
