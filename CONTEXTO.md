# Ecommerce Gerente — Contexto do Projeto

## Visão Geral
Sistema multi-agente para gestão de ecommerce. O **gerente** é o agente central que coordena todos os demais agentes especializados.

## Tecnologia
- Python 3.13+
- CrewAI (orquestração de agentes)
- Anthropic Claude (modelo de linguagem)

## Agentes

| Agente | Responsabilidade |
|--------|-----------------|
| `gerente` | Coordena todos os agentes, delega tarefas |
| `editor` | Edição de fotos de produtos |
| `precificador` | Calcula preços considerando taxas de marketplaces |
| `analista` | Analisa resultados de vendas por período |
| `espiao` | Monitora concorrentes, preços e promoções |
| `marketeiro` | Cria promoções, ajusta ads, campanhas em marketplaces e site |

## Estado Atual
- [ ] Estrutura do projeto criada
- [ ] Agente `editor` (em desenvolvimento — migrar código do outro computador)
- [ ] Agente `precificador` (a fazer)
- [ ] Agente `analista` (a fazer)
- [ ] Agente `espiao` (a fazer)
- [ ] Agente `marketeiro` (a fazer)
- [ ] Gerente coordenador (a fazer)

## Marketplaces Suportados (planejado)
- Mercado Livre
- Shopee
- Amazon
- Site próprio
