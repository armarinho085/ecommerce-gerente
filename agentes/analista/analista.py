from crewai import Agent
from crewai import LLM

llm = LLM(model="claude-sonnet-4-6", max_tokens=8096)

analista = Agent(
    role="Analista de Vendas",
    goal=(
        "Analisar os resultados de vendas em um período definido, "
        "identificar tendências, produtos mais vendidos e oportunidades de melhoria"
    ),
    backstory=(
        "Você é um analista de dados especializado em ecommerce. "
        "Transforma números de vendas em insights acionáveis, "
        "identifica padrões de comportamento do consumidor e "
        "aponta onde o negócio pode crescer."
    ),
    llm=llm,
    verbose=True,
)
