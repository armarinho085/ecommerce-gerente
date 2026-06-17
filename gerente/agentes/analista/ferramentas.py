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


def _custo_pedido(row) -> float:
    """
    Fórmula de custo varia conforme o e-commerce.
    Armarinho085 (ML): Diferencial de Frete + Comissão + Custo dos Produtos.
    Demais: Comissão + Comissão MP + Taxas + Custo dos Produtos - Incentivos.
    """
    ecommerce = str(row.get(COLUNAS["ecommerce"], "")).lower()
    if "armarinho085" in ecommerce:
        return (
            row.get(COLUNAS["diferencial_frete"], 0)
            + row.get(COLUNAS["comissao"], 0)
            + row.get(COLUNAS["custo_produtos"], 0)
        )
    return (
        row.get(COLUNAS["comissao"], 0)
        + row.get(COLUNAS["comissao_marketplace"], 0)
        + row.get(COLUNAS["taxas"], 0)
        + row.get(COLUNAS["custo_produtos"], 0)
        - row.get(COLUNAS["incentivo"], 0)
    )


def _carregar_e_processar(caminho: str) -> pd.DataFrame:
    if caminho.lower().endswith(".xls"):
        import xlrd
        wb = xlrd.open_workbook(caminho, ignore_workbook_corruption=True)
        sheet = wb.sheet_by_index(0)
        headers = [sheet.cell_value(0, c) for c in range(sheet.ncols)]
        rows = [
            [sheet.cell_value(r, c) for c in range(sheet.ncols)]
            for r in range(1, sheet.nrows)
        ]
        df = pd.DataFrame(rows, columns=headers)
    else:
        df = pd.read_excel(caminho)
    df.columns = df.columns.str.strip()

    numericas = [
        COLUNAS["total"], COLUNAS["frete"], COLUNAS["diferencial_frete"],
        COLUNAS["comissao"], COLUNAS["comissao_marketplace"], COLUNAS["taxas"],
        COLUNAS["custo_produtos"], COLUNAS["incentivo"], COLUNAS["liquido"],
    ]
    for col in numericas:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["_custo_total"] = df.apply(_custo_pedido, axis=1)
    df["_liquido_calculado"] = df[COLUNAS["total"]] - df["_custo_total"]
    df["_margem"] = df.apply(
        lambda r: (r["_liquido_calculado"] / r[COLUNAS["total"]] * 100)
        if r[COLUNAS["total"]] > 0 else 0,
        axis=1,
    )
    df["_diferenca_liquido"] = df[COLUNAS["liquido"]] - df["_liquido_calculado"]

    return df


@tool("Analisar relatorio de vendas")
def analisar_relatorio(caminho_arquivo: str, custo_operacional: float = 0.0) -> str:
    """
    Lê o relatório de custos do ecommerce (Excel) e retorna análise completa:
    resumo geral, breakdown por canal, métricas de margem e alertas.

    Parâmetros:
    - caminho_arquivo: caminho completo do arquivo .xlsx
    - custo_operacional: custos fixos mensais do negócio em R$ (ex: funcionários, aluguel).
      Default 0. Usado para calcular lucro líquido real.
    """
    try:
        df = _carregar_e_processar(caminho_arquivo)
    except Exception as e:
        return f"Erro ao abrir o arquivo: {e}"

    total_pedidos = len(df)
    col_canal = COLUNAS["canal"]
    col_total = COLUNAS["total"]
    col_liquido = COLUNAS["liquido"]
    col_custo = COLUNAS["custo_produtos"]
    col_comissao = COLUNAS["comissao"]
    col_comissao_mp = COLUNAS["comissao_marketplace"]
    col_taxas = COLUNAS["taxas"]
    col_incentivo = COLUNAS["incentivo"]
    col_frete = COLUNAS["frete"]

    resultado = []
    resultado.append(f"TOTAL DE PEDIDOS ANALISADOS: {total_pedidos}\n")

    # ── Resumo geral ──────────────────────────────────────────────────────────
    receita_total = df[col_total].sum()
    lucro_bruto = df["_liquido_calculado"].sum()
    lucro_liquido = lucro_bruto - custo_operacional
    margem_bruta = (lucro_bruto / receita_total * 100) if receita_total else 0
    margem_liquida = (lucro_liquido / receita_total * 100) if receita_total else 0
    ticket_medio = receita_total / total_pedidos if total_pedidos else 0

    pedidos_lucrativos = (df["_liquido_calculado"] > 0).sum()
    pedidos_prejuizo = (df["_liquido_calculado"] < 0).sum()

    resultado.append("=== RESUMO GERAL ===")
    resultado.append(f"  Receita total:        R${receita_total:>12,.2f}")
    resultado.append(f"  Custo dos produtos:   R${df[col_custo].sum():>12,.2f}")
    resultado.append(f"  Comissões totais:     R${(df[col_comissao].sum() + df[col_comissao_mp].sum()):>12,.2f}")
    resultado.append(f"  Taxas e tarifas:      R${df[col_taxas].sum():>12,.2f}")
    resultado.append(f"  Incentivos:           R${df[col_incentivo].sum():>12,.2f}")
    resultado.append(f"  Frete (informativo):  R${df[col_frete].sum():>12,.2f}")
    resultado.append(f"  Lucro bruto:          R${lucro_bruto:>12,.2f}  ({margem_bruta:.1f}%)")
    if custo_operacional > 0:
        resultado.append(f"  Custo operacional:    R${custo_operacional:>12,.2f}")
        resultado.append(f"  Lucro líquido real:   R${lucro_liquido:>12,.2f}  ({margem_liquida:.1f}%)")
    resultado.append(f"  Ticket médio:         R${ticket_medio:>12,.2f}")
    resultado.append(f"  Pedidos lucrativos:   {pedidos_lucrativos} ({pedidos_lucrativos/total_pedidos*100:.1f}%)")
    resultado.append(f"  Pedidos em prejuízo:  {pedidos_prejuizo} ({pedidos_prejuizo/total_pedidos*100:.1f}%)")

    # ── Resumo por e-commerce ─────────────────────────────────────────────────
    col_ecommerce = COLUNAS["ecommerce"]
    if col_ecommerce in df.columns:
        resultado.append("\n=== RESUMO POR E-COMMERCE ===")
        por_ec = df.groupby(col_ecommerce).agg(
            Pedidos=(col_ecommerce, "count"),
            Receita=(col_total, "sum"),
            LucroCalculado=("_liquido_calculado", "sum"),
        ).reset_index()
        por_ec = por_ec.sort_values("Receita", ascending=False)

        for _, row in por_ec.iterrows():
            margem = (row["LucroCalculado"] / row["Receita"] * 100) if row["Receita"] else 0
            resultado.append(
                f"  {row[col_ecommerce]:<35} | "
                f"{int(row['Pedidos']):>4} pedidos | "
                f"Receita: R${row['Receita']:>10,.2f} | "
                f"Lucro: R${row['LucroCalculado']:>10,.2f} | "
                f"Margem: {margem:>5.1f}%"
            )

    # ── Resumo por canal ──────────────────────────────────────────────────────
    if col_canal in df.columns:
        resultado.append("\n=== RESUMO POR CANAL DE VENDA ===")
        por_canal = df.groupby(col_canal).agg(
            Pedidos=(col_canal, "count"),
            Receita=(col_total, "sum"),
            LucroCalculado=("_liquido_calculado", "sum"),
            CustoProdutos=(col_custo, "sum"),
            Comissoes=(col_comissao, "sum"),
            Incentivos=(col_incentivo, "sum"),
        ).reset_index()
        por_canal = por_canal.sort_values("Receita", ascending=False)

        for _, row in por_canal.iterrows():
            margem = (row["LucroCalculado"] / row["Receita"] * 100) if row["Receita"] else 0
            resultado.append(
                f"  {row[col_canal]:<30} | "
                f"{int(row['Pedidos']):>4} pedidos | "
                f"Receita: R${row['Receita']:>10,.2f} | "
                f"Lucro: R${row['LucroCalculado']:>10,.2f} | "
                f"Margem: {margem:>5.1f}%"
            )

    # ── Alertas e anomalias ───────────────────────────────────────────────────
    resultado.append("\n=== ALERTAS E ANOMALIAS ===")
    alertas = 0

    # Pedidos com lucro negativo
    negativos = df[df["_liquido_calculado"] < 0]
    if not negativos.empty:
        resultado.append(f"  CRITICO: {len(negativos)} pedido(s) com lucro NEGATIVO")
        for _, row in negativos.nsmallest(10, "_liquido_calculado").iterrows():
            resultado.append(
                f"    Pedido {int(row[COLUNAS['pedido']])} | "
                f"Canal: {row.get(col_canal, 'N/A')} | "
                f"Receita: R${row[col_total]:,.2f} | "
                f"Lucro: R${row['_liquido_calculado']:,.2f} | "
                f"Margem: {row['_margem']:.1f}%"
            )
        if len(negativos) > 10:
            resultado.append(f"    ... e mais {len(negativos) - 10} pedido(s)")
        alertas += len(negativos)

    # Inconsistências: diferença entre líquido da plataforma e o calculado
    inconsistentes = df[df["_diferenca_liquido"].abs() > 0.05]
    if not inconsistentes.empty:
        resultado.append(
            f"  ATENCAO: {len(inconsistentes)} pedido(s) com diferença entre "
            f"líquido da plataforma e o calculado (possíveis erros de custo)"
        )
        for _, row in inconsistentes.nlargest(5, "_diferenca_liquido", keep="all").iterrows():
            resultado.append(
                f"    Pedido {int(row[COLUNAS['pedido']])} | "
                f"Líquido plataforma: R${row[col_liquido]:,.2f} | "
                f"Líquido calculado: R${row['_liquido_calculado']:,.2f} | "
                f"Diferença: R${row['_diferenca_liquido']:,.2f}"
            )
        if len(inconsistentes) > 5:
            resultado.append(f"    ... e mais {len(inconsistentes) - 5} pedido(s) com divergência")
        alertas += len(inconsistentes)

    # Pedidos sem custo de produto cadastrado
    sem_custo = df[(df[col_custo].isna()) | (df[col_custo] == 0)]
    if not sem_custo.empty:
        resultado.append(f"  ATENCAO: {len(sem_custo)} pedido(s) sem custo de produto cadastrado")
        alertas += len(sem_custo)

    # Pedidos de marketplace sem comissão
    col_ecommerce = COLUNAS["ecommerce"]
    if col_ecommerce in df.columns:
        marketplaces = df[df[col_ecommerce].notna() & (df[col_ecommerce] != "")]
        sem_comissao = marketplaces[
            (marketplaces[col_comissao] == 0) & (marketplaces[col_comissao_mp] == 0)
        ]
        if not sem_comissao.empty:
            resultado.append(f"  ATENCAO: {len(sem_comissao)} pedido(s) de marketplace sem comissão registrada")
            alertas += len(sem_comissao)

    if alertas == 0:
        resultado.append("  Nenhum erro ou anomalia encontrada.")

    resultado.append(f"\nTOTAL DE ALERTAS: {alertas}")
    return "\n".join(resultado)


@tool("Listar pedidos criticos por margem")
def listar_pedidos_criticos(caminho_arquivo: str, limite: int = 20) -> str:
    """
    Lista os pedidos com pior desempenho: margens negativas, inconsistências
    e os de menor margem. Use para identificar pedidos que precisam de ação.

    Parâmetros:
    - caminho_arquivo: caminho completo do arquivo .xlsx
    - limite: quantidade de pedidos a exibir por categoria (default 20)
    """
    try:
        df = _carregar_e_processar(caminho_arquivo)
    except Exception as e:
        return f"Erro ao abrir o arquivo: {e}"

    col_canal = COLUNAS["canal"]
    col_ecommerce = COLUNAS["ecommerce"]
    col_total = COLUNAS["total"]
    col_liquido = COLUNAS["liquido"]
    col_custo = COLUNAS["custo_produtos"]
    resultado = []

    def _linha_pedido(row):
        ec = row.get(col_ecommerce, "N/A")
        canal = row.get(col_canal, "N/A")
        return (
            f"  Pedido {int(row[COLUNAS['pedido']])} | "
            f"EC: {ec} | Canal: {canal} | "
            f"Receita: R${row[col_total]:,.2f} | "
            f"Lucro: R${row['_liquido_calculado']:,.2f} | "
            f"Margem: {row['_margem']:.1f}%"
        )

    # Pedidos com lucro negativo (piores primeiro)
    negativos = df[df["_liquido_calculado"] < 0].nsmallest(limite, "_liquido_calculado")
    resultado.append(f"=== PEDIDOS COM LUCRO NEGATIVO ({len(df[df['_liquido_calculado'] < 0])} total) ===")
    if negativos.empty:
        resultado.append("  Nenhum pedido com lucro negativo.")
    else:
        for _, row in negativos.iterrows():
            resultado.append(_linha_pedido(row))

    # Pedidos com margem muito baixa (entre 0% e 5%)
    baixa_margem = df[(df["_margem"] >= 0) & (df["_margem"] < 5)].nsmallest(limite, "_margem")
    resultado.append(f"\n=== PEDIDOS COM MARGEM MUITO BAIXA (0% a 5%) — {len(df[(df['_margem'] >= 0) & (df['_margem'] < 5)])} total ===")
    if baixa_margem.empty:
        resultado.append("  Nenhum pedido nessa faixa.")
    else:
        for _, row in baixa_margem.iterrows():
            resultado.append(_linha_pedido(row))

    # Inconsistências (diferença entre líquido plataforma vs calculado)
    inconsistentes = df[df["_diferenca_liquido"].abs() > 0.05].nlargest(limite, "_diferenca_liquido", keep="all")
    resultado.append(f"\n=== INCONSISTENCIAS LIQUIDO PLATAFORMA vs CALCULADO — {len(df[df['_diferenca_liquido'].abs() > 0.05])} total ===")
    if inconsistentes.empty:
        resultado.append("  Nenhuma inconsistência encontrada.")
    else:
        for _, row in inconsistentes.iterrows():
            resultado.append(
                f"  Pedido {int(row[COLUNAS['pedido']])} | "
                f"EC: {row.get(col_ecommerce, 'N/A')} | "
                f"Líq. plataforma: R${row[col_liquido]:,.2f} | "
                f"Líq. calculado: R${row['_liquido_calculado']:,.2f} | "
                f"Diferença: R${row['_diferenca_liquido']:+,.2f}"
            )

    # Top pedidos mais lucrativos
    top_lucrativos = df.nlargest(min(10, limite), "_liquido_calculado")
    resultado.append(f"\n=== TOP {min(10, limite)} PEDIDOS MAIS LUCRATIVOS ===")
    for _, row in top_lucrativos.iterrows():
        resultado.append(_linha_pedido(row))

    return "\n".join(resultado)
