from crewai import Agent, LLM
from .ferramentas import buscar_produtos

llm = LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8096)

TAXAS_MARKETPLACES = {
    "mercado_livre": 0.14,
    "shopee": 0.20,
    "amazon": 0.15,
    "site_proprio": 0.03,
}

precificador = Agent(
    role="Precificador de Produtos",
    goal=(
        "Calcular o preço ideal de venda de produtos considerando "
        "custos, taxas de cada marketplace e margem de lucro desejada"
    ),
    backstory=(
        "Você é um especialista em precificação para ecommerce. "
        "Conhece as taxas de cada marketplace, impostos e custos operacionais. "
        "Seu objetivo é garantir que cada produto seja vendido com lucro "
        "em todos os canais de venda."
    ),
    llm=llm,
    tools=[buscar_produtos],
    verbose=True,
)
