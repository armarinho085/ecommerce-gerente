from crewai import Agent
from crewai import LLM
from agentes.analista.ferramentas import analisar_relatorio, listar_pedidos_criticos

llm = LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8096)

analista = Agent(
    role="Analista de Vendas",
    goal=(
        "Analisar os resultados de vendas do ecommerce, calcular margens reais por pedido, "
        "identificar inconsistencias, pedidos em prejuizo e apresentar um relatorio completo "
        "com insights acionaveis para tomada de decisao."
    ),
    backstory=(
        "Voce e um analista financeiro especializado em ecommerce brasileiro. "
        "Conhece profundamente as metricas de marketplaces como Mercado Livre, "
        "Shopee e Amazon. Calcula o custo real de cada pedido a partir dos campos brutos "
        "(comissoes, taxas, custo de produto, incentivos), detecta inconsistencias entre "
        "o liquido reportado pela plataforma e o calculado, identifica pedidos com margem "
        "negativa ou muito baixa e aponta oportunidades de melhoria de margem."
    ),
    tools=[analisar_relatorio, listar_pedidos_criticos],
    llm=llm,
    verbose=False,
)
