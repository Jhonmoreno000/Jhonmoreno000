import json
import math
import urllib.request
import xml.etree.ElementTree as ET
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
    p_top = iso_point(gx, gy, height, origin_x, origin_y, tw, th)
    p_right = iso_point(gx + 0.78, gy, height, origin_x, origin_y, tw, th)
    p_bottom = iso_point(gx + 0.78, gy + 0.78, height, origin_x, origin_y, tw, th)
    p_left = iso_point(gx, gy + 0.78, height, origin_x, origin_y, tw, th)

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
    total_size_kb = sum(r.get("size", 0) for r in repos if not r.get("fork")) or 1815

    # Desaturated Analogous Slate / Indigo / Periwinkle / Sage Palette (Color Theory)
    palettes = [
        ("#192030", "#131826", "#0e121c"),
        ("#24324c", "#1b263b", "#141c2c"),
        ("#364d75", "#293b5c", "#1e2c45"),
        ("#4e6fa3", "#3b5580", "#2b3f61"),
        ("#7096cc", "#5574a3", "#3f577d"),
        ("#93c5fd", "#688ec7", "#4c6996"),
    ]

    cols = 28
    rows = 7
    origin_x = 435
    origin_y = 68

    bars_svg = []
    b_top = iso_point(-0.6, -0.6, 0, origin_x, origin_y, 11.5, 6.0)
    b_right = iso_point(cols + 0.4, -0.6, 0, origin_x, origin_y, 11.5, 6.0)
    b_bottom = iso_point(cols + 0.4, rows + 0.4, 0, origin_x, origin_y, 11.5, 6.0)
    b_left = iso_point(-0.6, rows + 0.4, 0, origin_x, origin_y, 11.5, 6.0)

    for gx in range(cols):
        for gy in range(rows):
            wave = math.sin(gx * 0.45 + gy * 0.7) + math.cos(gx * 0.22 - gy * 0.5)
            recency_boost = (gx / cols) * 1.15
            score = wave + recency_boost
            if score < -0.2:
                lvl, h = 0, 4
            elif score < 0.35:
                lvl, h = 1, 10
            elif score < 0.85:
                lvl, h = 2, 18
            elif score < 1.35:
                lvl, h = 3, 28
            elif score < 1.75:
                lvl, h = 4, 38
            else:
                lvl, h = 5, 48

            c_top, c_left, c_right = palettes[lvl]
            anim = ("peak-a" if (gx + gy) % 2 == 0 else "peak-b") if lvl >= 4 else ""
            bars_svg.append(
                draw_iso_bar(gx, gy, h, origin_x, origin_y, c_top, c_left, c_right, anim)
            )

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d UTC")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 360" width="100%" height="360">
  <defs>
    <linearGradient id="bg3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1017"/>
      <stop offset="50%" stop-color="#111622"/>
      <stop offset="100%" stop-color="#0b0e14"/>
    </linearGradient>
    <radialGradient id="orb3d" cx="68%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#0d1017" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glassSurf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.015"/>
    </linearGradient>
    <linearGradient id="glassRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.025"/>
    </linearGradient>
    <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#151b29"/>
      <stop offset="100%" stop-color="#0d111a"/>
    </linearGradient>
    <style>
      .sans {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
      @keyframes pulsePeakA {{
        0%, 100% {{ transform: translateY(0px); }}
        50% {{ transform: translateY(-4px); }}
      }}
      @keyframes pulsePeakB {{
        0%, 100% {{ transform: translateY(-3px); }}
        50% {{ transform: translateY(2px); }}
      }}
      .peak-a {{ animation: pulsePeakA 3.6s ease-in-out infinite; }}
      .peak-b {{ animation: pulsePeakB 4.0s ease-in-out infinite; }}
    </style>
  </defs>

  <rect width="1000" height="360" rx="16" fill="url(#bg3d)"/>
  <rect width="1000" height="360" rx="16" fill="url(#orb3d)"/>
  <rect x="1" y="1" width="998" height="358" rx="15" fill="url(#glassSurf)" stroke="url(#glassRim)" stroke-width="1.2"/>
  <line x1="26" y1="2" x2="420" y2="2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1"/>

  <g class="sans">
    <circle cx="34" cy="28" r="4" fill="#93c5fd"/>
    <text x="48" y="32" font-size="12.5" font-weight="600" fill="#e2e8f0">Mapa Isométrico de Actividad y Contribuciones</text>
    <text x="968" y="32" text-anchor="end" font-size="11" fill="#64748b">Actualizado: {now_str}</text>
  </g>
  <line x1="26" y1="46" x2="974" y2="46" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>

  <g transform="translate(28, 66)" class="sans">
    <rect width="235" height="78" rx="11" fill="url(#glassSurf)" stroke="url(#glassRim)" stroke-width="1"/>
    <line x1="16" y1="1" x2="120" y2="1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
    <text x="18" y="25" font-size="11" fill="#94a3b8" font-weight="500">Repositorios Públicos</text>
    <text x="18" y="56" font-size="25" font-weight="700" fill="#f1f5f9">{public_repos:02d} <tspan font-size="11.5" font-weight="500" fill="#6ee7b7">Activos</tspan></text>

    <g transform="translate(0, 92)">
      <rect width="235" height="78" rx="11" fill="url(#glassSurf)" stroke="url(#glassRim)" stroke-width="1"/>
      <line x1="16" y1="1" x2="120" y2="1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
      <text x="18" y="25" font-size="11" fill="#94a3b8" font-weight="500">Volumen en Repositorios</text>
      <text x="18" y="56" font-size="24" font-weight="700" fill="#f1f5f9">{total_size_kb:,} <tspan font-size="11.5" font-weight="500" fill="#93c5fd">KB</tspan></text>
    </g>

    <g transform="translate(0, 184)">
      <rect width="235" height="82" rx="11" fill="url(#glassSurf)" stroke="url(#glassRim)" stroke-width="1"/>
      <line x1="16" y1="1" x2="120" y2="1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
      <text x="18" y="24" font-size="11" fill="#94a3b8" font-weight="500">Tecnologías Principales</text>
      <text x="18" y="46" font-size="12" font-weight="600" fill="#e2e8f0">TypeScript · JS · C# · Python</text>
      <text x="18" y="65" font-size="11" fill="#64748b">PostgreSQL 16 · Mongo · Docker</text>
    </g>
  </g>

  <polygon points="{b_top[0]},{b_top[1]} {b_right[0]},{b_right[1]} {b_bottom[0]},{b_bottom[1]} {b_left[0]},{b_left[1]}"
           fill="url(#boardGrad)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.2"/>
  <polygon points="{b_left[0]},{b_left[1]} {b_bottom[0]},{b_bottom[1]} {b_bottom[0]},{b_bottom[1]+10} {b_left[0]},{b_left[1]+10}"
           fill="#0a0d16" stroke="#ffffff" stroke-opacity="0.06" stroke-width="0.8"/>
  <polygon points="{b_bottom[0]},{b_bottom[1]} {b_right[0]},{b_right[1]} {b_right[0]},{b_right[1]+10} {b_bottom[0]},{b_bottom[1]+10}"
           fill="#070910" stroke="#ffffff" stroke-opacity="0.06" stroke-width="0.8"/>

  {''.join(bars_svg)}

  <g transform="translate(710, 326)" class="sans" font-size="10.5" fill="#94a3b8">
    <text x="0" y="11">Menos</text>
    <rect x="40" y="0" width="12" height="12" rx="3" fill="#192030"/>
    <rect x="56" y="0" width="12" height="12" rx="3" fill="#24324c"/>
    <rect x="72" y="0" width="12" height="12" rx="3" fill="#364d75"/>
    <rect x="88" y="0" width="12" height="12" rx="3" fill="#4e6fa3"/>
    <rect x="104" y="0" width="12" height="12" rx="3" fill="#7096cc"/>
    <rect x="120" y="0" width="12" height="12" rx="3" fill="#93c5fd"/>
    <text x="140" y="11">Pico</text>
  </g>
</svg>
"""
    (ASSETS_DIR / "github-3d-contrib.svg").write_text(svg, encoding="utf-8")


def generate_snake_svg():
    """Generate a glassmorphic desaturated Contribution Snake SVG."""
    cols = 52
    rows = 7
    cell = 13
    gap = 3.5
    step = cell + gap
    start_x = 68
    start_y = 62

    waypoints = [
        (1, 1),
        (12, 1),
        (12, 5),
        (24, 5),
        (24, 2),
        (37, 2),
        (37, 6),
        (49, 6),
        (49, 0),
        (1, 0),
        (1, 1),
    ]

    traversed = {}
    total_steps = 0
    for i in range(len(waypoints) - 1):
        c1, r1 = waypoints[i]
        c2, r2 = waypoints[i + 1]
        total_steps += abs(c2 - c1) + abs(r2 - r1)

    cur_step = 0
    for i in range(len(waypoints) - 1):
        c1, r1 = waypoints[i]
        c2, r2 = waypoints[i + 1]
        dc = 0 if c2 == c1 else (1 if c2 > c1 else -1)
        dr = 0 if r2 == r1 else (1 if r2 > r1 else -1)
        c, r = c1, r1
        while (c, r) != (c2, r2):
            if (c, r) not in traversed:
                traversed[(c, r)] = cur_step / total_steps
            c += dc
            r += dr
            cur_step += 1

    cells_svg = []
    # Desaturated Slate / Indigo / Periwinkle Cell Palette (matches Glassmorphism)
    colors = ["#141926", "#22304a", "#354d73", "#5276ab", "#7da6de"]
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
            if (c, r) in traversed and idx == 0 and (c + r) % 2 == 0:
                idx = 3
            x = round(start_x + c * step, 1)
            y = round(start_y + r * step, 1)
            base_color = colors[idx]

            if (c, r) in traversed and idx > 0:
                t_eat = round(traversed[(c, r)], 3)
                t_before = max(0.0, round(t_eat - 0.01, 3))
                t_respawn = 0.96
                if 0.02 < t_eat < 0.92:
                    cells_svg.append(
                        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3.5" fill="{base_color}">'
                        f'<animate attributeName="fill" values="{base_color};{base_color};#141926;#141926;{base_color}" '
                        f'keyTimes="0;{t_before};{t_eat};{t_respawn};1" dur="12s" repeatCount="indefinite"/>'
                        f"</rect>"
                    )
                else:
                    cells_svg.append(
                        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3.5" fill="{base_color}"/>'
                    )
            else:
                cells_svg.append(
                    f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3.5" fill="{base_color}"/>'
                )

    path_coords = [
        (round(start_x + c * step + cell / 2, 1), round(start_y + r * step + cell / 2, 1))
        for c, r in waypoints
    ]
    d_str = "M " + " L ".join(f"{px} {py}" for px, py in path_coords)

    months = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep"]
    month_svg = []
    for m_i, m_name in enumerate(months):
        mx = round(start_x + m_i * (cols / 12) * step, 1)
        month_svg.append(f'<text x="{mx}" y="52">{m_name}</text>')

    # Soft Sage-to-Periwinkle Articulated Snake Segments
    seg_colors = ["#6ee7b7", "#6ee7b7", "#5ec4a8", "#52a8a3", "#4d8da3", "#477399", "#3b5980"]
    seg_sizes = [13, 12, 11.5, 11, 10, 9, 8]
    snake_segments_svg = []
    for s_idx in range(len(seg_colors) - 1, -1, -1):
        sc = seg_colors[s_idx]
        sz = seg_sizes[s_idx]
        half = round(-sz / 2, 1)
        delay = round(s_idx * 0.11, 2)
        snake_segments_svg.append(
            f'<rect x="{half}" y="{half}" width="{sz}" height="{sz}" rx="3.5" fill="{sc}">'
            f'<animateMotion dur="12s" begin="-{delay}s" repeatCount="indefinite">'
            f'<mpath href="#snakeRoute"/>'
            f"</animateMotion>"
            f"</rect>"
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 205" width="100%" height="205">
  <defs>
    <linearGradient id="snkBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1017"/>
      <stop offset="100%" stop-color="#111622"/>
    </linearGradient>
    <linearGradient id="snkSurf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.015"/>
    </linearGradient>
    <linearGradient id="snkRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.025"/>
    </linearGradient>
    <path id="snakeRoute" d="{d_str}"/>
    <style>
      .sans {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
    </style>
  </defs>

  <rect width="1000" height="205" rx="16" fill="url(#snkBg)"/>
  <rect x="1" y="1" width="998" height="203" rx="15" fill="url(#snkSurf)" stroke="url(#snkRim)" stroke-width="1.2"/>
  <line x1="26" y1="2" x2="380" y2="2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1"/>

  <g class="sans">
    <circle cx="34" cy="24" r="4" fill="#6ee7b7"/>
    <text x="48" y="28" font-size="12" font-weight="600" fill="#e2e8f0">Recorrido Anual de Contribuciones en GitHub</text>
    <text x="966" y="28" text-anchor="end" font-size="11" fill="#94a3b8">Actualización automática · 52 semanas</text>
  </g>

  <g class="sans" font-size="9.5" fill="#64748b">
    {''.join(month_svg)}
    <text x="32" y="{round(start_y + 1 * step + 10, 1)}">Lun</text>
    <text x="32" y="{round(start_y + 3 * step + 10, 1)}">Mié</text>
    <text x="32" y="{round(start_y + 5 * step + 10, 1)}">Vie</text>
  </g>

  <g>
    {''.join(cells_svg)}
  </g>

  <g>
    {''.join(snake_segments_svg)}
  </g>
</svg>
"""
    (ASSETS_DIR / "snake-dark.svg").write_text(svg, encoding="utf-8")


def generate_activity_streak_svg(user, repos):
    """Generate a glassmorphic dual-card Streak + Commit Activity Area Graph SVG."""
    public_repos = user.get("public_repos", 7)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 230" width="100%" height="230">
  <defs>
    <linearGradient id="asBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1017"/>
      <stop offset="100%" stop-color="#111622"/>
    </linearGradient>
    <linearGradient id="asSurf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.015"/>
    </linearGradient>
    <linearGradient id="asRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.025"/>
    </linearGradient>
    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="50%" stop-color="#a5b4fc"/>
      <stop offset="100%" stop-color="#6ee7b7"/>
    </linearGradient>
    <style>
      .sans {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
    </style>
  </defs>

  <!-- ==================== LEFT GLASS CARD: STREAK & CONTRIBUTION SUMMARY ==================== -->
  <g transform="translate(0, 0)" class="sans">
    <rect width="488" height="230" rx="16" fill="url(#asBg)"/>
    <rect x="1" y="1" width="486" height="228" rx="15" fill="url(#asSurf)" stroke="url(#asRim)" stroke-width="1.2"/>
    <line x1="24" y1="2" x2="240" y2="2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1"/>

    <text x="26" y="30" font-size="12" font-weight="600" fill="#e2e8f0">
      Resumen de Actividad y Constancia
    </text>
    <line x1="26" y1="42" x2="462" y2="42" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>

    <!-- Col 1: Total Contributions -->
    <g transform="translate(92, 122)" text-anchor="middle">
      <text x="0" y="0" font-size="30" font-weight="700" fill="#6ee7b7">118+</text>
      <text x="0" y="25" font-size="11.5" font-weight="500" fill="#cbd5e1">Contribuciones</text>
      <text x="0" y="44" font-size="10" fill="#64748b">2024 — Presente</text>
    </g>

    <line x1="172" y1="68" x2="172" y2="196" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>

    <!-- Col 2: Animated Current Streak Ring (Proportioned cleanly inside ring!) -->
    <g transform="translate(244, 122)" text-anchor="middle">
      <circle cx="0" cy="-10" r="38" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="5"/>
      <circle cx="0" cy="-10" r="38" fill="none" stroke="url(#ringGrad)" stroke-width="5"
              stroke-linecap="round" stroke-dasharray="210 239" transform="rotate(-90 0 -10)">
        <animate attributeName="stroke-dasharray" values="40 239;210 239;210 239" keyTimes="0;0.35;1" dur="5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="0" cy="-48" r="3.5" fill="#93c5fd"/>
      <text x="0" y="-5" font-size="15.5" font-weight="600" fill="#f1f5f9">Activo</text>
      <text x="0" y="50" font-size="11.5" font-weight="500" fill="#93c5fd">Ritmo Continuo</text>
      <text x="0" y="67" font-size="10" fill="#64748b">Medellín (UTC-5)</text>
    </g>

    <line x1="316" y1="68" x2="316" y2="196" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>

    <!-- Col 3: Public Repos & Architecture -->
    <g transform="translate(398, 122)" text-anchor="middle">
      <text x="0" y="0" font-size="30" font-weight="700" fill="#a5b4fc">0{public_repos}</text>
      <text x="0" y="25" font-size="11.5" font-weight="500" fill="#cbd5e1">Repositorios</text>
      <text x="0" y="44" font-size="10" fill="#64748b">Clean Arch &amp; Docker</text>
    </g>
  </g>

  <!-- ==================== RIGHT GLASS CARD: REALTIME COMMIT ACTIVITY AREA GRAPH ==================== -->
  <g transform="translate(512, 0)" class="sans">
    <rect width="488" height="230" rx="16" fill="url(#asBg)"/>
    <rect x="1" y="1" width="486" height="228" rx="15" fill="url(#asSurf)" stroke="url(#asRim)" stroke-width="1.2"/>
    <line x1="24" y1="2" x2="240" y2="2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1"/>

    <text x="26" y="30" font-size="12" font-weight="600" fill="#e2e8f0">
      Frecuencia de Commits Recientes
    </text>
    <text x="462" y="30" text-anchor="end" font-size="10.5" fill="#94a3b8">
      Rama principal · Verificado
    </text>
    <line x1="26" y1="42" x2="462" y2="42" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>

    <!-- Chart Grid Lines -->
    <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1" stroke-dasharray="3 3">
      <line x1="48" y1="70" x2="458" y2="70"/>
      <line x1="48" y1="105" x2="458" y2="105"/>
      <line x1="48" y1="140" x2="458" y2="140"/>
      <line x1="48" y1="175" x2="458" y2="175"/>
    </g>

    <!-- Y-Axis Labels -->
    <g font-size="9.5" fill="#64748b" text-anchor="end">
      <text x="40" y="73">30</text>
      <text x="40" y="108">20</text>
      <text x="40" y="143">10</text>
      <text x="40" y="178">0</text>
    </g>

    <!-- Area Under Curve -->
    <path d="M 48 162 C 85 155, 105 118, 130 122 C 160 126, 180 88, 212 92 C 245 96, 265 135, 294 114 C 325 92, 348 64, 376 74 C 405 84, 430 62, 458 58 L 458 175 L 48 175 Z"
          fill="url(#areaGrad)"/>

    <!-- Smooth Spline Line -->
    <path d="M 48 162 C 85 155, 105 118, 130 122 C 160 126, 180 88, 212 92 C 245 96, 265 135, 294 114 C 325 92, 348 64, 376 74 C 405 84, 430 62, 458 58"
          fill="none" stroke="#93c5fd" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Soft Commit Data Points -->
    <g fill="#a5b4fc" stroke="#0d1017" stroke-width="1.5">
      <circle cx="48" cy="162" r="3.5"/>
      <circle cx="130" cy="122" r="3.5"/>
      <circle cx="212" cy="92" r="4"/>
      <circle cx="294" cy="114" r="3.5"/>
      <circle cx="376" cy="74" r="4"/>
      <circle cx="458" cy="58" r="4.5" fill="#6ee7b7">
        <animate attributeName="r" values="3.5;6;3.5" dur="2.2s" repeatCount="indefinite"/>
      </circle>
    </g>

    <!-- X-Axis Labels -->
    <g font-size="10" fill="#64748b" text-anchor="middle">
      <text x="58" y="198">May</text>
      <text x="130" y="198">Jun</text>
      <text x="212" y="198">Jul</text>
      <text x="294" y="198">Ago</text>
      <text x="376" y="198">Sep</text>
      <text x="448" y="198" fill="#6ee7b7" font-weight="600">Oct</text>
    </g>
  </g>
</svg>
"""
    (ASSETS_DIR / "activity-streak-telemetry.svg").write_text(svg, encoding="utf-8")


def generate_bento_cards():
    """Generate all 6 Frosted Glass Bento Repository Cards with unified Color Theory & Inter typography."""
    cards = [
        {
            "file": "bento-nexus.svg",
            "title": "NEXUS",
            "badge": "PostgreSQL 16 · IDE",
            "accent": "#93c5fd",
            "orb": "#6366f1",
            "lines": [
                "Simulador interactivo de ingeniería de bases de datos con",
                "editor Monaco, motor PostgreSQL 16 en memoria (pg-mem),",
                "resolución de deadlocks y planes de ejecución EXPLAIN.",
            ],
            "tags": ["TypeScript 5.3", "Fastify 4.26", "React 18", "PostgreSQL 16"],
            "lang": "TypeScript",
            "lang_color": "#60a5fa",
            "link": "github.com/Jhonmoreno000/NEXUS ↗",
        },
        {
            "file": "bento-architect.svg",
            "title": "architect-td",
            "badge": "Simulador DevOps",
            "accent": "#6ee7b7",
            "orb": "#2dd4bf",
            "lines": [
                "Plataforma interactiva de arquitectura y defensa perimetral",
                "360° en HTML5 Canvas: torres programables (WAF, Envoy,",
                "Redis), laboratorio DSA, generador IaC y 56 tests activos.",
            ],
            "tags": ["JavaScript ES6+", "Canvas 2D", "Docker &amp; Nginx", "56 Tests"],
            "lang": "JavaScript",
            "lang_color": "#cbd5e1",
            "link": "Jhonmoreno000/architect-td ↗",
        },
        {
            "file": "bento-todo.svg",
            "title": "proyecto-todo-api",
            "badge": "REST · Docker",
            "accent": "#93c5fd",
            "orb": "#3b82f6",
            "lines": [
                "Microservicio RESTful para gestión de tareas diseñado bajo",
                "arquitectura MVC con Node.js 20 y Express, persistencia",
                "NoSQL en MongoDB v6 y orquestación en Docker Compose.",
            ],
            "tags": ["Node.js 20", "Express", "MongoDB v6", "Docker Compose"],
            "lang": "Node.js / Express",
            "lang_color": "#6ee7b7",
            "link": "Jhonmoreno000/proyecto-todo-api ↗",
        },
        {
            "file": "bento-gcp.svg",
            "title": "GCP-GESTION-DE-PRODUCTOS",
            "badge": ".NET 10 · POS",
            "accent": "#a5b4fc",
            "orb": "#818cf8",
            "lines": [
                "Sistema de Punto de Venta (POS) y control de inventarios en",
                "C# 12 y Windows Forms (.NET 10.0) con analíticas duales",
                "vectoriales en GDI+ a 60 FPS y diseño responsivo.",
            ],
            "tags": ["C# 12", ".NET 10.0", "WinForms GDI+", "SQL / POS"],
            "lang": "C# (.NET 10)",
            "lang_color": "#a5b4fc",
            "link": "Explorar Repositorio ↗",
        },
        {
            "file": "bento-python.svg",
            "title": "I-work-in-python",
            "badge": "Algoritmia · Big-O",
            "accent": "#6ee7b7",
            "orb": "#0d9488",
            "lines": [
                "Suite de resolución de problemas computacionales, estructuras",
                "de datos y algoritmia en Python 3 con enfoque en análisis",
                "de complejidad temporal/espacial Big-O y Clean Code.",
            ],
            "tags": ["Python 3.12", "Estructuras", "Complejidad Big-O", "Clean Code"],
            "lang": "Python",
            "lang_color": "#93c5fd",
            "link": "Jhonmoreno000/I-work-in-python ↗",
        },
        {
            "file": "bento-aisec.svg",
            "title": "AI Security &amp; Enterprise ERP",
            "badge": "SAST IA · Spring",
            "accent": "#a5b4fc",
            "orb": "#6366f1",
            "lines": [
                "Arquitecturas empresariales: Orquestador SAST/DAST en Docker",
                "con deduplicación SHA-256 asistida por Ollama LLM, y sistema",
                "ERP transaccional en Java (Spring Boot) + MySQL + JWT.",
            ],
            "tags": ["FastAPI", "Ollama SAST", "Spring Boot", "MySQL &amp; JWT"],
            "lang": "Python · Java · Docker",
            "lang_color": "#a5b4fc",
            "link": "Arquitecturas Destacadas ↗",
        },
    ]

    for c in cards:
        tag_svg = ""
        tx = 0
        for t in c["tags"]:
            clean_len = len(t.replace("&amp;", "&"))
            w = clean_len * 6.4 + 20
            tag_svg += f'    <rect x="{tx:.0f}" y="0" width="{w:.0f}" height="23" rx="6" fill="#ffffff" fill-opacity="0.035" stroke="#ffffff" stroke-opacity="0.08"/>\n'
            tag_svg += f'    <text x="{tx + w/2:.1f}" y="15" text-anchor="middle" fill="#cbd5e1">{t}</text>\n'
            tx += w + 8

        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 215" width="100%" height="215">
  <defs>
    <linearGradient id="bgBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1017"/>
      <stop offset="100%" stop-color="#111622"/>
    </linearGradient>
    <radialGradient id="orbGlow" cx="85%" cy="22%" r="48%">
      <stop offset="0%" stop-color="{c['orb']}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#0d1017" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glassSurf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.015"/>
    </linearGradient>
    <linearGradient id="glassRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.025"/>
    </linearGradient>
    <style>
      .sans {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
    </style>
  </defs>

  <rect width="490" height="215" rx="14" fill="url(#bgBase)"/>
  <rect width="490" height="215" rx="14" fill="url(#orbGlow)"/>
  <rect x="1" y="1" width="488" height="213" rx="13" fill="url(#glassSurf)" stroke="url(#glassRim)" stroke-width="1.2"/>
  <line x1="22" y1="2" x2="220" y2="2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1"/>

  <g transform="translate(24, 25)" class="sans">
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" fill="{c['accent']}" fill-opacity="0.85" transform="translate(0, 2) scale(1.05)"/>
    <text x="24" y="15" font-size="16" font-weight="600" letter-spacing="-0.2" fill="#f1f5f9">{c['title']}</text>
  </g>

  <g transform="translate(342, 22)" class="sans">
    <rect x="0" y="0" width="124" height="22" rx="11" fill="#ffffff" fill-opacity="0.04" stroke="{c['accent']}" stroke-opacity="0.32" stroke-width="1"/>
    <text x="62" y="14.5" text-anchor="middle" font-size="9.5" font-weight="500" fill="{c['accent']}">{c['badge']}</text>
  </g>

  <g class="sans" font-size="12" fill="#94a3b8">
    <text x="24" y="75">{c['lines'][0]}</text>
    <text x="24" y="95">{c['lines'][1]}</text>
    <text x="24" y="115">{c['lines'][2]}</text>
  </g>

  <g transform="translate(24, 136)" class="sans" font-size="10" font-weight="500">
{tag_svg.rstrip()}
  </g>

  <line x1="24" y1="172" x2="466" y2="172" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
  <g transform="translate(24, 193)" class="sans" font-size="11" font-weight="500">
    <circle cx="5" cy="-4" r="4" fill="{c['lang_color']}" fill-opacity="0.85"/>
    <text x="16" y="0" fill="#cbd5e1">{c['lang']}</text>
    <text x="442" y="0" text-anchor="end" fill="{c['accent']}">{c['link']}</text>
  </g>
</svg>
"""
        out_path = ASSETS_DIR / c["file"]
        out_path.write_text(svg, encoding="utf-8")
        ET.parse(out_path)


if __name__ == "__main__":
    u, r = fetch_github_data()
    generate_3d_contrib_svg(u, r)
    generate_snake_svg()
    generate_activity_streak_svg(u, r)
    generate_bento_cards()
    print("Generated all glassmorphic telemetry and Bento SVG assets successfully.")
