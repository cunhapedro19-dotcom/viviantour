#!/usr/bin/env python3
"""
Viviantourr — gerador de arte ilustrada (modo demonstração).

Cria, de forma determinística, imagens estilizadas de litoral (céu, mar,
areia, sol, barcos, morros) para os anúncios de exemplo em public/img/.
Não são fotos reais: é a identidade visual ilustrada do projeto demo.

Uso:
    python3 scripts/generate-artwork.py

Requisito: Pillow  (pip install pillow)
"""

import hashlib
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "public", "img"))

W, H = 1600, 1000
SS = 2  # supersampling

SEEDS = {
    "stays": [
        "casa-vista-atalaia", "loft-centro-arraial", "cobertura-praia-dos-anjos",
        "casa-pe-na-areia", "flat-das-prainhas", "pousada-recanto-atalaia",
        "casa-jardim-do-ceu", "studio-praia-do-pontal",
    ],
    "tours": [
        "escuna-6-praias", "lancha-gruta-azul", "mergulho-batismo",
        "mergulho-autonomo", "saveiro-sunset", "fast-boat",
        "stand-up-pontal", "city-tour-praias",
    ],
}

PALETTES = [
    {  # amanhecer
        "sky_top": (255, 236, 210), "sky_bot": (255, 190, 130),
        "sea": [(46, 143, 163), (31, 125, 147), (22, 106, 130), (15, 88, 112)],
        "sun": (255, 244, 214), "sand": (240, 221, 186), "silhouette": (24, 62, 82),
    },
    {  # dia claro
        "sky_top": (207, 239, 246), "sky_bot": (142, 212, 228),
        "sea": [(47, 163, 184), (31, 140, 163), (22, 118, 140), (15, 96, 117)],
        "sun": (255, 251, 235), "sand": (245, 231, 200), "silhouette": (20, 70, 92),
    },
    {  # tarde dourada
        "sky_top": (255, 233, 184), "sky_bot": (246, 178, 107),
        "sea": [(38, 130, 155), (26, 112, 138), (18, 94, 120), (12, 76, 100)],
        "sun": (255, 240, 190), "sand": (243, 220, 176), "silhouette": (30, 58, 78),
    },
    {  # tropical vibrante
        "sky_top": (230, 247, 250), "sky_bot": (183, 232, 239),
        "sea": [(25, 181, 194), (18, 158, 174), (12, 134, 152), (8, 110, 128)],
        "sun": (255, 255, 244), "sand": (247, 233, 203), "silhouette": (16, 74, 90),
    },
    {  # entardecer rosado
        "sky_top": (255, 214, 170), "sky_bot": (235, 148, 138),
        "sea": [(42, 118, 148), (30, 100, 132), (20, 84, 116), (13, 68, 98)],
        "sun": (255, 238, 200), "sand": (238, 213, 180), "silhouette": (35, 46, 70),
    },
]


def h(s: str) -> int:
    return int(hashlib.md5(s.encode()).hexdigest(), 16)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_scene(img, seed_str, kind):
    rnd = random.Random(h(seed_str))
    pal = PALETTES[h(seed_str) % len(PALETTES)]
    w, hh = img.size
    d = ImageDraw.Draw(img)

    horizon = int(hh * (0.52 + rnd.uniform(-0.04, 0.05)))

    # fundo (evita frestas pretas entre camadas)
    d.rectangle([0, 0, w, hh], fill=pal["sea"][-1])

    # céu
    for y in range(horizon):
        t = y / horizon
        d.line([(0, y), (w, y)], fill=lerp(pal["sky_top"], pal["sky_bot"], t))

    # sol com halo
    sun_x = int(w * (0.18 + rnd.random() * 0.6))
    sun_y = int(horizon * (0.28 + rnd.random() * 0.35))
    sun_r = int(hh * 0.07)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(60, 0, -1):
        r = int(sun_r * (1 + i * 0.12))
        od.ellipse([sun_x - r, sun_y - r, sun_x + r, sun_y + r], fill=(*pal["sun"], 4))
    od.ellipse([sun_x - sun_r, sun_y - sun_r, sun_x + sun_r, sun_y + sun_r], fill=(*pal["sun"], 235))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))

    # morros distantes (base estendida para dentro do mar, sem frestas)
    base = horizon + int(hh * 0.02)
    pts = [(0, base)]
    x = 0
    peak = 0
    while x < w:
        peak = base - int(hh * (0.04 + rnd.random() * 0.10))
        span = int(w * (0.15 + rnd.random() * 0.2))
        pts.append((x + span // 2, peak))
        x += span
        pts.append((x, base))
    d.polygon(pts, fill=lerp(pal["sea"][-1], pal["sky_bot"], 0.45))

    # camadas do mar
    n_layers = len(pal["sea"])
    for i, color in enumerate(pal["sea"]):
        top = horizon + int((hh - horizon) * (i / n_layers) * 0.75)
        amp = int(hh * (0.010 + 0.004 * i))
        period = int(w / (3 + i * 1.2))
        phase = rnd.uniform(0, math.pi * 2)
        pts = []
        for xx in range(0, w + 8, 8):
            yy = top + amp * math.sin((xx / period) * math.pi * 2 + phase)
            pts.append((xx, yy))
        pts += [(w, hh), (0, hh)]
        d.polygon(pts, fill=color)

    # barco (passeios)
    if kind == "tour":
        boat_x = int(w * (0.25 + rnd.random() * 0.5))
        boat_y = horizon + int((hh - horizon) * rnd.uniform(0.08, 0.3))
        s = hh * (0.05 + rnd.random() * 0.03)
        col = pal["silhouette"]
        d.polygon(
            [(boat_x - s, boat_y), (boat_x + s * 1.15, boat_y), (boat_x + s * 0.8, boat_y + s * 0.42), (boat_x - s * 0.72, boat_y + s * 0.42)],
            fill=col,
        )
        if rnd.random() < 0.6:  # vela
            d.polygon([(boat_x, boat_y - s * 1.5), (boat_x, boat_y - s * 0.05), (boat_x + s * 0.95, boat_y - s * 0.05)], fill=col)
            d.line([(boat_x, boat_y - s * 1.6), (boat_x, boat_y)], fill=col, width=max(2, int(s * 0.06)))
        else:  # lancha (cabine)
            d.polygon([(boat_x - s * 0.35, boat_y - s * 0.5), (boat_x + s * 0.35, boat_y - s * 0.5), (boat_x + s * 0.45, boat_y), (boat_x - s * 0.45, boat_y)], fill=col)
        # reflexo
        for i in range(3):
            yy = boat_y + s * 0.6 + i * s * 0.22
            d.line([(boat_x - s * (0.8 - i * 0.15), yy), (boat_x + s * (0.9 - i * 0.15), yy)], fill=lerp(col, pal["sea"][-1], 0.5), width=max(2, int(s * 0.05)))

    # casa (hospedagens) sobre duna
    if kind == "stay":
        hx = int(w * (0.2 + rnd.random() * 0.6))
        hy = horizon - int(hh * 0.035)
        s = hh * (0.07 + rnd.random() * 0.03)
        col = pal["silhouette"]
        d.rectangle([hx - s, hy - s * 0.75, hx + s, hy], fill=col)
        d.polygon([(hx - s * 1.15, hy - s * 0.75), (hx, hy - s * 1.45), (hx + s * 1.15, hy - s * 0.75)], fill=col)
        d.rectangle([hx - s * 0.22, hy - s * 0.5, hx + s * 0.22, hy], fill=lerp(col, pal["sun"], 0.55))
        # duna / faixa de areia
        d.polygon([(0, hh), (0, hh - hh * 0.10), (w, hh - hh * 0.05), (w, hh)], fill=pal["sand"])

    # areia à frente (algumas variações)
    if rnd.random() < 0.55:
        d.polygon([(0, hh), (0, hh - hh * 0.06), (w, hh - hh * 0.12), (w, hh)], fill=pal["sand"])

    # pássaros
    for _ in range(rnd.randint(1, 4)):
        bx = rnd.uniform(0.1, 0.9) * w
        by = rnd.uniform(0.12, 0.4) * hh
        r = hh * 0.012
        d.arc([bx - r, by - r, bx, by + r], 200, 340, fill=pal["silhouette"], width=3)
        d.arc([bx, by - r, bx + r, by + r], 200, 340, fill=pal["silhouette"], width=3)

    # vinheta suave
    vig = Image.new("L", img.size, 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-w * 0.3, -hh * 0.3, w * 1.3, hh * 1.3], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(w * 0.12))
    black = Image.new("RGB", img.size, (10, 30, 40))
    img.paste(Image.composite(img, black, vig.point(lambda p: 70 + int(p * 185 / 255))), (0, 0))


def make(seed: str, kind: str, variant: int):
    rnd = random.Random(h(f"{seed}-{variant}"))
    img = Image.new("RGB", (W * SS, H * SS))
    # pequena variação de composição por variante
    draw_scene(img, f"{seed}-{variant}", kind)
    img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(OUT, f"{seed}-{variant}.jpg"), quality=82, optimize=True)
    print(f"  ✓ {seed}-{variant}.jpg")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("Gerando arte do Viviantourr em", OUT)
    for seed in SEEDS["stays"]:
        for v in (1, 2, 3):
            make(seed, "stay", v)
    for seed in SEEDS["tours"]:
        for v in (1, 2):
            make(seed, "tour", v)
    for v in (1, 2):
        make("hero", "hero", v)
    print("Concluído.")


if __name__ == "__main__":
    main()
