import os
import requests
from crewai.tools import tool
from dotenv import load_dotenv

load_dotenv()

TINY_TOKEN = os.getenv("TINY_TOKEN")
TINY_API_URL = "https://api.tiny.com.br/api2"


@tool("Buscar produtos do Tiny ERP")
def buscar_produtos(pesquisa: str = "") -> str:
    """
    Busca produtos no Tiny ERP e retorna descrição, SKU e preço de custo.
    Use pesquisa='' para listar todos os produtos, ou informe um termo para filtrar por nome ou SKU.
    """
    if not TINY_TOKEN:
        return "Erro: TINY_TOKEN não configurado no arquivo .env"

    todos_produtos = []
    pagina = 1

    while True:
        params = {
            "token": TINY_TOKEN,
            "formato": "JSON",
            "pesquisa": pesquisa,
            "pagina": pagina,
        }

        try:
            response = requests.get(
                f"{TINY_API_URL}/produtos.pesquisa.php",
                params=params,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as e:
            return f"Erro ao conectar com o Tiny ERP: {e}"

        retorno = data.get("retorno", {})

        if retorno.get("status") != "OK":
            codigo_erro = str(retorno.get("codigo_erro", ""))
            if codigo_erro == "4" or not retorno.get("produtos"):
                break
            return f"Erro da API Tiny: {retorno.get('erros', data)}"

        produtos_pagina = retorno.get("produtos", [])
        if not produtos_pagina:
            break

        for item in produtos_pagina:
            p = item.get("produto", {})

            custo_raw = p.get("preco_custo", "") or ""
            try:
                custo = float(str(custo_raw).replace(",", "."))
            except ValueError:
                custo = 0.0

            todos_produtos.append({
                "descricao": p.get("nome", "").strip(),
                "sku": p.get("codigo", "").strip(),
                "custo": custo,
            })

        numero_paginas = int(retorno.get("numero_paginas", 1))
        if pagina >= numero_paginas:
            break
        pagina += 1

    if not todos_produtos:
        termo = f' para "{pesquisa}"' if pesquisa else ""
        return f"Nenhum produto encontrado{termo}."

    linhas = [f"Total: {len(todos_produtos)} produto(s) encontrado(s)\n"]
    for p in todos_produtos:
        custo_str = f"R$ {p['custo']:.2f}" if p["custo"] > 0 else "Sem custo cadastrado"
        sku_str = p["sku"] if p["sku"] else "N/A"
        linhas.append(f"- {p['descricao']} | SKU: {sku_str} | Custo: {custo_str}")

    return "\n".join(linhas)
