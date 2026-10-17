import json
import math
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

USERNAME = "Jhonmoreno000"
ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def fetch_github_data():
    headers = {"User-Agent": "Jhonmoreno000-Profile-Engine"}
    try:
        req_user = urllib.request.Request(
            f"https://api.github.com/users/{USERNAME}", headers=headers
        )
        with urllib.request.urlopen(req_user, timeout=10) as r:
            user = json.loads(r.read().decode("utf-8"))

        req_repos = urllib.request.Request(
            f"https://api.github.com/users/{USERNAME}/repos?per_page=100&sort=updated",
            headers=headers,
        )
        with urllib.request.urlopen(req_repos, timeout=10) as r:
            repos = json.loads(r.read().decode("utf-8"))
        return user, repos
    except Exception as e:
        print(f"Warning: GitHub API fetch fallback ({e})")
        return {"public_repos": 7, "followers": 1, "created_at": "2024-09-03T16:14:14Z"}, []


def iso_point(gx, gy, gz, origin_x, origin_y, tile_w=13.5, tile_h=7.2):
    """Convert 3D grid coordinates (gx, gy, gz) to 2D isometric SVG coordinates."""
    px = origin_x + (gx - gy) * tile_w
    py = origin_y + (gx + gy) * tile_h - gz
    return round(px, 1), round(py, 1)


def draw_iso_bar(gx, gy, height, origin_x, origin_y, color_top, color_left, color_right, anim_class=""):
    tw, th = 11.5, 6.0
    # Top face corners at z = height
    p_top = iso_point(gx, gy, height, origin_x, origin_y, tw, th)
    p_right = iso_point(gx + 0.78, gy, height, origin_x, origin_y, tw, th)
    p_bottom = iso_point(gx + 0.78, gy + 0.78, height, origin_x, origin_y, tw, th)
    p_left = iso_point(gx, gy + 0.78, height, origin_x, origin_y, tw, th)

    # Base corners at z = 0
    b_right = iso_point(gx + 0.78, gy, 0, origin_x, origin_y, tw, th)
    b_bottom = iso_point(gx + 0.78, gy + 0.78, 0, origin_x, origin_y, tw, th)
    b_left = iso_point(gx, gy + 0.78, 0, origin_x, origin_y, tw, th)

    top_pts = f"{p_top[0]},{p_top[1]} {p_right[0]},{p_right[1]} {p_bottom[0]},{p_bottom[1]} {p_left[0]},{p_left[1]}"
    left_pts = f"{p_left[0]},{p_left[1]} {p_bottom[0]},{p_bottom[1]} {b_bottom[0]},{b_bottom[1]} {b_left[0]},{b_left[1]}"
    right_pts = f"{p_bottom[0]},{p_bottom[1]} {p_right[0]},{p_right[1]} {b_right[0]},{b_right[1]} {b_bottom[0]},{b_bottom[1]}"

    cls_attr = f' class="{anim_class}"' if anim_class else ""
    return (
        f'<g{cls_attr}>'
        f'<polygon points="{left_pts}" fill="{color_left}"/>'
        f'<polygon points="{right_pts}" fill="{color_right}"/>'
        f'<polygon points="{top_pts}" fill="{color_top}"/>'
        f"</g>"
    )


def generate_3d_contrib_svg(user, repos):
    public_repos = user.get("public_repos", 7)
    total_size_kb = sum(r.get("size", 0) for r in repos if not r.get("fork")) or 1750

    # Palette (Tokyo Night / Catppuccin inspired 5-level 3D blocks)
    palettes = [
        ("#1a1f35", "#121626", "#0d101d"),  # Level 0 (empty/low)
        ("#0e4429", "#082b1a", "#051d11"),  # Level 1
        ("#006d32", "#004d23", "#003618"),  # Level 2
        ("#26a641", "#1a752d", "#125320"),  # Level 3
        ("#39d353", "#26a641", "#18792c"),  # Level 4 (peak emerald)
        ("#7aa2f7", "#3d59a1", "#243763"),  # Accent peak (indigo-cyan)
    ]

    # Build a 28-week x 7-day isometric 3D contribution terrain
    cols = 28
    rows = 7
    origin_x = 435
    origin_y = 68

    bars_svg = []
    # Base isometric board
    b_top = iso_point(-0.6, -0.6, 0, origin_x, origin_y, 11.5, 6.0)
    b_right = iso_point(cols + 0.4, -0.6, 0, origin_x, origin_y, 11.5, 6.0)
    b_bottom = iso_point(cols + 0.4, rows + 0.4, 0, origin_x, origin_y, 11.5, 6.0)
    b_left = iso_point(-0.6, rows + 0.4, 0, origin_x, origin_y, 11.5, 6.0)

    for gx in range(cols):
        for gy in range(rows):
            # Deterministic organic activity wave seeded by coordinates
            wave = math.sin(gx * 0.45 + gy * 0.7) + math.cos(gx * 0.22 - gy * 0.5)
            # More activity in recent weeks (higher gx)
            recency_boost = (gx / cols) * 1.15
            score = wave + recency_boost
            if score < -0.2:
                lvl = 0
                h = 4
            elif score < 0.35:
                lvl = 1
                h = 10
            elif score < 0.85:
                lvl = 2
                h = 18
            elif score < 1.35:
                lvl = 3
                h = 28
            elif score < 1.75:
                lvl = 4
                h = 38
            else:
                lvl = 5
                h = 48

            c_top, c_left, c_right = palettes[lvl]
            anim = ""
            if lvl >= 4:
                anim = "peak-a" if (gx + gy) % 2 == 0 else "peak-b"
            bars_svg.append(
                draw_iso_bar(gx, gy, h, origin_x, origin_y, c_top, c_left, c_right, anim)
            )

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d UTC")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 360" width="100%" height="360">
  <defs>
    <linearGradient id="bg3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0d14"/>
      <stop offset="50%" stop-color="#101420"/>
      <stop offset="100%" stop-color="#090b10"/>
    </linearGradient>
    <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#131828"/>
      <stop offset="100%" stop-color="#0b0e18"/>
    </linearGradient>
    <style>
      @keyframes pulsePeakA {{
        0%, 100% {{ transform: translateY(0px); }}
        50% {{ transform: translateY(-5px); }}
      }}
      @keyframes pulsePeakB {{
        0%, 100% {{ transform: translateY(-4px); }}
        50% {{ transform: translateY(2px); }}
      }}
      .peak-a {{ animation: pulsePeakA 3.2s ease-in-out infinite; }}
      .peak-b {{ animation: pulsePeakB 3.6s ease-in-out infinite; }}
    </style>
  </defs>

  <rect width="1000" height="360" rx="16" fill="url(#bg3d)"/>
  <rect x="1" y="1" width="998" height="358" rx="15" fill="none" stroke="#1f2437" stroke-width="1.5"/>

  <!-- Top Editorial Header -->
  <g font-family="'JetBrains Mono', 'Fira Code', monospace">
    <circle cx="34" cy="30" r="4.5" fill="#39d353"/>
    <text x="48" y="34" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.5">3D ISOMETRIC CONTRIBUTION TERRAIN &amp; TELEMETRY</text>
    <text x="968" y="34" text-anchor="end" font-size="11" fill="#64748b">SYNCED: {now_str}</text>
  </g>
  <line x1="26" y1="50" x2="974" y2="50" stroke="#1f2437" stroke-width="1"/>

  <!-- Left Telemetry Cards -->
  <g transform="translate(28, 70)" font-family="'JetBrains Mono', 'Fira Code', monospace">
    <rect width="235" height="76" rx="10" fill="#111522" stroke="#1f2437" stroke-width="1"/>
    <text x="18" y="24" font-size="10" fill="#7aa2f7" font-weight="700">PUBLIC REPOSITORIES</text>
    <text x="18" y="54" font-size="26" font-weight="800" fill="#f8fafc">{public_repos:02d} <tspan font-size="11" font-weight="500" fill="#39d353">ACTIVE</tspan></text>

    <g transform="translate(0, 90)">
      <rect width="235" height="76" rx="10" fill="#111522" stroke="#1f2437" stroke-width="1"/>
      <text x="18" y="24" font-size="10" fill="#bb9af7" font-weight="700">CODEBASE FOOTPRINT</text>
      <text x="18" y="54" font-size="24" font-weight="800" fill="#f8fafc">{total_size_kb:,} <tspan font-size="11" font-weight="500" fill="#bb9af7">KB</tspan></text>
    </g>

    <g transform="translate(0, 180)">
      <rect width="235" height="82" rx="10" fill="#111522" stroke="#1f2437" stroke-width="1"/>
      <text x="18" y="24" font-size="10" fill="#73daca" font-weight="700">PRIMARY STACK</text>
      <text x="18" y="46" font-size="11.5" font-weight="700" fill="#e2e8f0">Python · Java · C# · TS</text>
      <text x="18" y="66" font-size="10.5" fill="#94a3b8">Postgres · Mongo · Docker</text>
    </g>
  </g>

  <!-- 3D Isometric Board Base -->
  <polygon points="{b_top[0]},{b_top[1]} {b_right[0]},{b_right[1]} {b_bottom[0]},{b_bottom[1]} {b_left[0]},{b_left[1]}"
           fill="url(#boardGrad)" stroke="#293048" stroke-width="1.2"/>
  <polygon points="{b_left[0]},{b_left[1]} {b_bottom[0]},{b_bottom[1]} {b_bottom[0]},{b_bottom[1]+10} {b_left[0]},{b_left[1]+10}"
           fill="#0a0d16" stroke="#1f2437" stroke-width="0.8"/>
  <polygon points="{b_bottom[0]},{b_bottom[1]} {b_right[0]},{b_right[1]} {b_right[0]},{b_right[1]+10} {b_bottom[0]},{b_bottom[1]+10}"
           fill="#070910" stroke="#1f2437" stroke-width="0.8"/>

  <!-- 3D Isometric Contribution Bars -->
  {''.join(bars_svg)}

  <!-- Legend Bottom Right -->
  <g transform="translate(720, 326)" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94a3b8">
    <text x="0" y="11">Less</text>
    <rect x="34" y="0" width="12" height="12" rx="2" fill="#1a1f35"/>
    <rect x="50" y="0" width="12" height="12" rx="2" fill="#0e4429"/>
    <rect x="66" y="0" width="12" height="12" rx="2" fill="#006d32"/>
    <rect x="82" y="0" width="12" height="12" rx="2" fill="#26a641"/>
    <rect x="98" y="0" width="12" height="12" rx="2" fill="#39d353"/>
    <rect x="114" y="0" width="12" height="12" rx="2" fill="#7aa2f7"/>
    <text x="134" y="11">Peak</text>
  </g>
</svg>
"""
    (ASSETS_DIR / "github-3d-contrib.svg").write_text(svg, encoding="utf-8")


def generate_snake_svg():
    """Generate a sleek dark-mode animated Contribution Grid Snake SVG."""
    cols = 52
    rows = 7
    cell = 13
    gap = 3
    step = cell + gap
    start_x = 34
    start_y = 54

    cells_svg = []
    colors = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]
    for c in range(cols):
        for r in range(rows):
            val = math.sin(c * 0.37 + r * 0.9) + (c / cols) * 0.8
            idx = 0
            if val > 1.25:
                idx = 4
            elif val > 0.8:
                idx = 3
            elif val > 0.35:
                idx = 2
            elif val > -0.1:
                idx = 1
            x = start_x + c * step
            y = start_y + r * step
            cells_svg.append(
                f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3" fill="{colors[idx]}"/>'
            )

    # Create a continuous snake path traversing the contribution grid
    path_pts = [
        (start_x + 2 * step + 6, start_y + 1 * step + 6),
        (start_x + 14 * step + 6, start_y + 1 * step + 6),
        (start_x + 14 * step + 6, start_y + 5 * step + 6),
        (start_x + 28 * step + 6, start_y + 5 * step + 6),
        (start_x + 28 * step + 6, start_y + 2 * step + 6),
        (start_x + 42 * step + 6, start_y + 2 * step + 6),
        (start_x + 42 * step + 6, start_y + 6 * step + 6),
        (start_x + 50 * step + 6, start_y + 6 * step + 6),
        (start_x + 50 * step + 6, start_y + 1 * step + 6),
        (start_x + 2 * step + 6, start_y + 1 * step + 6),
    ]
    d_str = "M " + " L ".join(f"{px} {py}" for px, py in path_pts)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 195" width="100%" height="195">
  <defs>
    <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7aa2f7"/>
      <stop offset="50%" stop-color="#73daca"/>
      <stop offset="100%" stop-color="#39d353"/>
    </linearGradient>
    <filter id="snakeGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="900" height="195" rx="14" fill="#0b0d14"/>
  <rect x="1" y="1" width="898" height="193" rx="13" fill="none" stroke="#1f2437" stroke-width="1.5"/>

  <g font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="11">
    <text x="34" y="32" fill="#e2e8f0" font-weight="700">CONTRIBUTION SNAKE // AUTOMATED COMMIT EATER</text>
    <text x="866" y="32" text-anchor="end" fill="#39d353" font-weight="700">GITHUB ACTIONS</text>
  </g>

  <!-- Grid Cells -->
  <g>
    {''.join(cells_svg)}
  </g>

  <!-- Animated Snake Body Traveling Across Contribution Grid -->
  <path d="{d_str}" fill="none" stroke="url(#snakeGrad)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="140 1600" filter="url(#snakeGlow)">
    <animate attributeName="stroke-dashoffset" from="1740" to="0" dur="9s" repeatCount="indefinite"/>
  </path>
</svg>
"""
    (ASSETS_DIR / "snake-dark.svg").write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    u, r = fetch_github_data()
    generate_3d_contrib_svg(u, r)
    generate_snake_svg()
    print("Generated github-3d-contrib.svg and snake-dark.svg successfully.")
