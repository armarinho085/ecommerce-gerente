import subprocess
import sys
from pathlib import Path

EDITOR_DIR  = Path(__file__).parent.resolve()
GERENTE_DIR = EDITOR_DIR.parent.parent
INPUTS_DIR  = EDITOR_DIR / "inputs"
OUTPUT_DIR  = EDITOR_DIR / "output"
GERENTE_TS  = GERENTE_DIR / "gerente.ts"

def erro(msg):
    print(f"\nERRO: {msg}")
    input("\nPressione Enter para fechar...")
    sys.exit(1)

print("=" * 50)
print("   GERAR CORES - EDITOR E-COMMERCE")
print("=" * 50)

# Busca pastas de produto com cores.txt e catalogo gerado
subpastas = [p for p in INPUTS_DIR.iterdir() if p.is_dir()]

produtos = []
avisos = []

for pasta in subpastas:
    produto_nome = pasta.name
    cores_file   = pasta / "cores.txt"
    catalogo     = OUTPUT_DIR / produto_nome / "antes-catalogo.png"

    if not cores_file.exists():
        avisos.append(f"{produto_nome}: sem cores.txt — ignorado")
        continue

    cores = [l.strip() for l in cores_file.read_text(encoding="utf-8").splitlines() if l.strip()]
    if not cores:
        avisos.append(f"{produto_nome}: cores.txt vazio — ignorado")
        continue

    if not catalogo.exists():
        avisos.append(f"{produto_nome}: foto ainda nao melhorada — execute melhorar.py primeiro")
        continue

    produtos.append((produto_nome, catalogo, cores_file, cores))

if avisos:
    print("\n[!] Avisos:")
    for a in avisos:
        print(f"    - {a}")

if not produtos:
    erro(
        "Nenhum produto pronto para colorir.\n\n"
        "   Certifique-se de que cada pasta de produto em inputs/ tenha:\n"
        "     - antes.jpg (processado pelo melhorar.py)\n"
        "     - cores.txt (com os codigos hex desejados)"
    )

print(f"\n[OK] {len(produtos)} produto(s) para colorir:")
for nome, _, _, cores in produtos:
    print(f"     - {nome}  ({len(cores)} cor(es))")

print()

erros = []
for produto_nome, catalogo, cores_file, cores in produtos:
    print("-" * 50)
    print(f"Processando: {produto_nome}")
    print(f"Cores: {', '.join(cores)}")
    print(f"(Aguarde cerca de 20 segundos por cor)\n")

    cmd = f'npx tsx "{GERENTE_TS}" editor change-color-batch "{catalogo}" "{cores_file}"'
    resultado = subprocess.run(cmd, cwd=str(GERENTE_DIR), shell=True)

    if resultado.returncode != 0:
        erros.append(produto_nome)
        print(f"\n[ERRO] Falha ao colorir {produto_nome}.")
    else:
        geradas = list((OUTPUT_DIR / produto_nome).glob("antes-catalogo-*.png"))
        print(f"\n[OK] {len(geradas)} variacao(es) salvas em: {OUTPUT_DIR / produto_nome}")

print("\n" + "=" * 50)
if erros:
    print("   CONCLUIDO COM ERROS")
    print("=" * 50)
    print(f"\n[OK] {len(produtos) - len(erros)}/{len(produtos)} produto(s) colorido(s)")
    print(f"[ERRO] Falhas: {', '.join(erros)}")
else:
    print("   CONCLUIDO!")
    print("=" * 50)
    print(f"\n[OK] {len(produtos)}/{len(produtos)} produto(s) colorido(s) com sucesso")

print(f"\nResultados em: {OUTPUT_DIR}")

input("\nPressione Enter para fechar...")
