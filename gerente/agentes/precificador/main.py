from crewai import Crew, Task
from .precificador import precificador
from .ferramentas import buscar_produtos


def run(pesquisa: str = ""):
    tarefa = Task(
        description=(
            f"Busque os produtos no Tiny ERP usando o termo '{pesquisa}' "
            f"(deixe vazio para listar todos) e apresente a lista com "
            f"descrição, SKU e preço de custo de cada produto."
        ),
        expected_output=(
            "Lista completa dos produtos com descrição, SKU e custo unitário."
        ),
        agent=precificador,
    )

    crew = Crew(
        agents=[precificador],
        tasks=[tarefa],
        verbose=True,
    )

    resultado = crew.kickoff()
    print("\n" + "=" * 60)
    print(resultado)


if __name__ == "__main__":
    run()
