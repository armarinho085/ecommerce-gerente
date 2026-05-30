import pandas as pd
from crewai.tools import tool

COLUNAS = {
    "pedido": "Nº Pedido",
    "pedido_ecommerce": "Nº Pedido e-commerce",
    "ecommerce": "E-commerce",
    "canal": "Canal de venda",
    "total": "Total",
    "frete": "Frete do pedido",
    "diferencial_frete": "Diferencial de frete",
    "comissao": "Total comissão",
    "comissao_marketplace": "Total comissão marketplace",
    "taxas": "Taxas e tarifas",
    "custo_produtos": "Custo dos produtos",
    "incentivo": "Total incentivo",
    "liquido": "Total líquido",
}


def _carregar_excel(caminho: str) -> pd.DataFrame:
    df = pd.read_excel(caminho)
    df.columns = df.columns.str.strip()
    colunas_numericas = [
        COLUNAS["total"], COLUNAS["frete"], COLUNAS["diferencial_frete"],
        COLUNAS["comissao"], COLUNAS["comissao_marketplace"], COLUNAS["taxas"],
        COLUNAS["custo_produtos"], COLUNAS["incentivo"], COLUNAS["liquido"],
    ]
    for col in colunas_numericas:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


@tool("Analisar relatorio de vendas")
def analisar_relatorio(caminho_arquivo: str) -> str:
    """
    Le o relatorio de custos do ecommerce em Excel e retorna uma analise completa
    com resumo por canal, erros encontrados e alertas importantes.
    Parametro: caminho_arquivo - caminho completo do arquivo .xlsx
    """
    try:
        df = _carregar_excel(caminho_arquivo)
    except Exception as e:
        return f"Erro ao abrir o arquivo: {e}"

    total_pedidos = len(df)
    resultado = []
    resultado.append(f"TOTAL DE PEDIDOS ANALISADOS: {total_pedidos}\n")

    # Resumo por canal
    col_canal = COLUNAS["canal"]
    col_total = COLUNAS["total"]
    col_liquido = COLUNAS["liquido"]
    col_custo = COLUNAS["custo_produtos"]
    col_comissao = COLUNAS["comissao"]

    if col_canal in df.columns:
        resultado.append("=== RESUMO POR CANAL DE VENDA ===")
        por_canal = df.groupby(col_canal).agg(
            Pedidos=(col_canal, "count"),
            Faturamento=(col_total, "sum"),
            Liquido=(col_liquido, "sum"),
            Custo=(col_custo, "sum"),
            Comissao=(col_comissao, "sum"),
        ).reset_index()

        for _, row in por_canal.iterrows():
            margem = (row["Liquido"] / row["Faturamento"] * 100) if row["Faturamento"] else 0
            resultado.append(
                f"  {row[col_canal]}: {int(row['Pedidos'])} pedidos | "
                f"Faturamento: R${row['Faturamento']:,.2f} | "
                f"Liquido: R${row['Liquido']:,.2f} | "
                f"Margem: {margem:.1f}%"
            )

    # Totais gerais
    resultado.append("\n=== TOTAIS GERAIS ===")
    resultado.append(f"  Faturamento total: R${df[col_total].sum():,.2f}")
    resultado.append(f"  Total liquido: R${df[col_liquido].sum():,.2f}")
    resultado.append(f"  Total comissoes: R${df[col_comissao].sum():,.2f}")
    resultado.append(f"  Total custo produtos: R${df[col_custo].sum():,.2f}")
    margem_geral = (df[col_liquido].sum() / df[col_total].sum() * 100) if df[col_total].sum() else 0
    resultado.append(f"  Margem geral: {margem_geral:.1f}%")

    # Erros e alertas
    resultado.append("\n=== ERROS E ALERTAS ===")
    alertas = 0

    # Pedidos com lucro negativo
    negativos = df[df[col_liquido] < 0]
    if not negativos.empty:
        resultado.append(f"  ALERTA: {len(negativos)} pedidos com liquido NEGATIVO:")
        for _, row in negativos.iterrows():
            resultado.append(
                f"    - Pedido {row[COLUNAS['pedido']]} | "
                f"Canal: {row.get(col_canal, 'N/A')} | "
                f"Liquido: R${row[col_liquido]:,.2f}"
            )
        alertas += len(negativos)

    # Pedidos sem custo de produto
    sem_custo = df[df[col_custo].isna() | (df[col_custo] == 0)]
    if not sem_custo.empty:
        resultado.append(f"  ATENCAO: {len(sem_custo)} pedidos sem custo de produto cadastrado")
        alertas += len(sem_custo)

    # Comissão zerada onde deveria ter
    col_ecommerce = COLUNAS["ecommerce"]
    if col_ecommerce in df.columns:
        marketplaces = df[df[col_ecommerce].notna()]
        sem_comissao = marketplaces[marketplaces[col_comissao].isna() | (marketplaces[col_comissao] == 0)]
        if not sem_comissao.empty:
            resultado.append(f"  ATENCAO: {len(sem_comissao)} pedidos de marketplace sem comissao registrada")
            alertas += len(sem_comissao)

    # Diferencial de frete alto (acima de 50% do frete)
    col_frete = COLUNAS["frete"]
    col_diff = COLUNAS["diferencial_frete"]
    if col_frete in df.columns and col_diff in df.columns:
        frete_vals = df[col_frete].replace(0, pd.NA).dropna()
        if not frete_vals.empty:
            frete_alto = df[
                (df[col_frete] > 0) &
                (df[col_diff].abs() > df[col_frete] * 0.5)
            ]
            if not frete_alto.empty:
                resultado.append(f"  ATENCAO: {len(frete_alto)} pedidos com diferencial de frete elevado (>50% do frete)")
                alertas += len(frete_alto)

    if alertas == 0:
        resultado.append("  Nenhum erro ou anomalia encontrada.")

    resultado.append(f"\nTOTAL DE ALERTAS: {alertas}")
    return "\n".join(resultado)
