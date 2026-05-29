from crewai import Agent, Crew, Process, Task
from crewai import LLM

llm = LLM(model="claude-sonnet-4-6", max_tokens=8096)

gerente = Agent(
    role="Gerente de Ecommerce",
    goal="Coordenar todos os agentes especializados para maximizar os resultados do ecommerce",
    backstory=(
        "Você é o gerente geral de uma operação de ecommerce. "
        "Sua função é delegar tarefas aos agentes certos, "
        "garantir que cada área funcione bem e que os resultados "
        "sejam sempre otimizados."
    ),
    llm=llm,
    allow_delegation=True,
    verbose=True,
)
