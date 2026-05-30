import subprocess
import sys
from pathlib import Path

EDITOR_DIR  = Path(__file__).parent.resolve()
GERENTE_DIR = EDITOR_DIR.parent.parent
INPUTS_DIR  = EDITOR_DIR / "inputs"
OUTPUT_DIR  = EDITOR_DIR / "output"
GERENTE_TS  = GERENTE_DIR / "gerente.ts"
EXTENSOES   = [".jpg", ".jpeg", ".png", ".webp"]

def erro(msg):
    print(f"\nERRO: {msg}")
    input("\nPressione Enter para fechar...")
    sys.exit(1)

def encontrar_antes(pasta):
    return next((f for f in pasta.iterdir() if f.stem.lower() == "antes" and f.suffix.lower() in EXTENSOES), None)

print("=" * 50)
print("   MELHORAR FOTO - EDITOR E-COMMERCE")
print("=" * 50)

# Busca pastas de produto com arquivo "antes"
subpastas = [p for p in INPUTS_DIR.iterdir() if p.is_dir()]
produtos = [(p, encontrar_antes(p)) for p in subpastas]
produtos = [(pasta, antes) for pasta, antes in produtos if antes is not None]

if not produtos:
    erro(
        "Nenhum produto encontrado para processar.\n\n"
        "   Crie uma pasta com o nome do produto dentro de inputs/\n"
        "   e coloque a foto renomeada como 'antes.jpg' dentro dela.\n\n"
        "   Exemplo:\n"
        "     inputs/elastico-branco/antes.jpg"
    )

print(f"\n[OK] {len(produtos)} produto(s) encontrado(s) para processar:")
for pasta, antes in produtos:
    print(f"     - {pasta.name}  ({antes.name})")

print()

erros = []
for pasta, antes in produtos:
    produto_nome = pasta.name
    output_dir = OUTPUT_DIR / produto_nome

    print("-" * 50)
    print(f"Processando: {produto_nome}")
    print("Gerando foto de catalogo profissional...")
    print("(Aguarde cerca de 20 a 50 segundos)\n")

    cmd = f'npx tsx "{GERENTE_TS}" editor generate-catalog "{antes}"'
    resultado = subprocess.run(cmd, cwd=str(GERENTE_DIR), shell=True)

    catalogo = output_dir / "antes-catalogo.png"

    if resultado.returncode != 0 or not catalogo.exists():
        erros.append(produto_nome)
        print(f"\n[ERRO] Falha ao processar {produto_nome}. Verifique sua conexao e tente novamente.")
    else:
        print(f"\n[OK] Foto salva em: {catalogo}")

print("\n" + "=" * 50)
if erros:
    print(f"   CONCLUIDO COM ERROS")
    print("=" * 50)
    print(f"\n[OK] {len(produtos) - len(erros)}/{len(produtos)} produto(s) processado(s)")
    print(f"[ERRO] Falhas: {', '.join(erros)}")
else:
    print(f"   CONCLUIDO!")
    print("=" * 50)
    print(f"\n[OK] {len(produtos)}/{len(produtos)} produto(s) processado(s) com sucesso")

print(f"\nPara gerar as variacoes de cor, crie o arquivo cores.txt")
print(f"dentro da pasta de cada produto e execute o  colorir.py")

input("\nPressione Enter para fechar...")
