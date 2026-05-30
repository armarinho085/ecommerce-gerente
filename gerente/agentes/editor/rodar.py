import subprocess
import sys
import os
from pathlib import Path

# ─── Caminhos ────────────────────────────────────────────────────────────────
EDITOR_DIR  = Path(__file__).parent.resolve()
GERENTE_DIR = EDITOR_DIR.parent.parent
INPUTS_DIR  = EDITOR_DIR / "inputs"
OUTPUT_DIR  = EDITOR_DIR / "output"
CORES_FILE  = GERENTE_DIR / "cores.txt"
GERENTE_TS  = GERENTE_DIR / "gerente.ts"

# ─── Verificações iniciais ────────────────────────────────────────────────────
def erro(msg):
    print(f"\nERRO {msg}")
    input("\nPressione Enter para fechar...")
    sys.exit(1)

print("=" * 50)
print("   EDITOR DE FOTOS - E-COMMERCE")
print("=" * 50)

if not CORES_FILE.exists():
    erro(f"Arquivo de cores não encontrado: {CORES_FILE}\nCrie o arquivo cores.txt na pasta gerente/ com os códigos hex.")

extensoes = [".jpg", ".jpeg", ".png", ".webp"]
antes_lista = [f for f in INPUTS_DIR.iterdir() if f.stem.lower() == "antes" and f.suffix.lower() in extensoes]

if not antes_lista:
    erro(
        "Nenhuma foto encontrada com o nome 'antes' na pasta inputs/\n"
        "   Renomeie sua foto para 'antes.jpg' (ou .png) e tente novamente."
    )

antes = antes_lista[0]
print(f"\n[OK] Foto encontrada: {antes.name}")

cores = [l.strip() for l in CORES_FILE.read_text(encoding="utf-8").splitlines() if l.strip()]
print(f"[OK] Cores carregadas: {len(cores)} variações")
print(f"  {', '.join(cores)}")

# ─── Passo 1: Gerar foto de catálogo ─────────────────────────────────────────
print("\n" + "─" * 50)
print("PASSO 1/2 — Gerando foto de catálogo profissional...")
print("─" * 50)

resultado = subprocess.run(
    ["npx", "tsx", str(GERENTE_TS), "editor", "generate-catalog", str(antes)],
    cwd=str(GERENTE_DIR),
    shell=True
)

if resultado.returncode != 0:
    erro("Falha ao gerar a foto de catálogo. Verifique sua conexão e a chave de API.")

catalogo = OUTPUT_DIR / "antes" / "antes-catalogo.png"

if not catalogo.exists():
    erro(f"Foto de catálogo não encontrada em: {catalogo}")

print(f"\n[OK] Catálogo salvo em: {catalogo}")

# ─── Passo 2: Gerar variações de cor ─────────────────────────────────────────
print("\n" + "─" * 50)
print(f"PASSO 2/2 — Gerando {len(cores)} variações de cor...")
print("─" * 50)

resultado = subprocess.run(
    ["npx", "tsx", str(GERENTE_TS), "editor", "change-color-batch", str(catalogo), str(CORES_FILE)],
    cwd=str(GERENTE_DIR),
    shell=True
)

if resultado.returncode != 0:
    erro("Falha ao gerar as variações de cor.")

# ─── Resumo final ─────────────────────────────────────────────────────────────
geradas = list((OUTPUT_DIR / "antes").glob("antes-catalogo-*.png"))

print("\n" + "=" * 50)
print("   CONCLUÍDO!")
print("=" * 50)
print(f"\n[OK] Foto base de catálogo gerada")
print(f"[OK] {len(geradas)} variações de cor geradas")
print(f"\nResultados em:\n  {OUTPUT_DIR / 'antes'}")

input("\nPressione Enter para fechar...")
