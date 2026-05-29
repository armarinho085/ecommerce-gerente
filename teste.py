from dotenv import load_dotenv
from crewai import Agent, Task, Crew, LLM

load_dotenv()

llm = LLM(model="anthropic/claude-sonnet-4-6", max_tokens=512)

agente = Agent(
    role="Assistente de Teste",
    goal="Confirmar que o sistema está funcionando",
    backstory="Agente criado para testar a configuração do projeto.",
    llm=llm,
    verbose=False,
)

tarefa = Task(
    description="Responda em uma frase: o sistema ecommerce-gerente está funcionando?",
    expected_output="Uma frase confirmando que o sistema está funcionando.",
    agent=agente,
)

crew = Crew(agents=[agente], tasks=[tarefa], verbose=False)
resultado = crew.kickoff()

print("\nRESULTADO:", resultado)
