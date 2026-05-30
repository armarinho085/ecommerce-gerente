from crewai import Agent
from crewai import LLM
from agentes.analista.ferramentas import analisar_relatorio

llm = LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8096)

analista = Agent(
    role="Analista de Vendas",
    goal=(
        "Analisar os resultados de vendas do ecommerce, identificar erros, "
        "anomalias e apresentar um relatorio claro com insights e recomendacoes"
    ),
    backstory=(
        "Voce e um analista financeiro especializado em ecommerce brasileiro. "
        "Conhece profundamente as metricas de marketplaces como Mercado Livre, "
        "Shopee e Amazon. Identifica erros nos dados, pedidos com margem negativa, "
        "custos incorretos e aponta oportunidades de melhoria com base nos numeros."
    ),
    tools=[analisar_relatorio],
    llm=llm,
    verbose=True,
)
