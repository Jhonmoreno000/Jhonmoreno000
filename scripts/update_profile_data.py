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
    headers = {"User-Agent": "Jhonmoreno000-Cyber-SOC-Engine"}
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
        return {"public_repos": 9, "followers": 2, "created_at": "2024-09-03T16:14:14Z"}, []


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
        f"<g{cls_attr}>"
        f'<polygon points="{left_pts}" fill="{color_left}"/>'
        f'<polygon points="{right_pts}" fill="{color_right}"/>'
        f'<polygon points="{top_pts}" fill="{color_top}"/>'
        f"</g>"
    )


def generate_3d_contrib_svg(user, repos):
    public_repos = max(user.get("public_repos", 9), 9)
    total_size_kb = sum(r.get("size", 0) for r in repos if not r.get("fork")) or 59009

    # Tactical Cyber-Emerald & Cyan Isometric Matrix Palette
    palettes = [
        ("#081824", "#051018", "#030a0f"),
        ("#0c2c3d", "#081f2c", "#05141d"),
        ("#0a4f63", "#073847", "#04242e"),
        ("#087f8c", "#065c66", "#043d44"),
        ("#10b981", "#059669", "#047857"),
        ("#00ff9d", "#10b981", "#059669"),
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
      <stop offset="0%" stop-color="#03070b"/>
      <stop offset="50%" stop-color="#061019"/>
      <stop offset="100%" stop-color="#020508"/>
    </linearGradient>
    <radialGradient id="orb3d" cx="68%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.14"/>
      <stop offset="55%" stop-color="#00e5ff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#03070b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hudCard3d" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0a1722" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#040b11" stop-opacity="0.94"/>
    </linearGradient>
    <linearGradient id="hudRim3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.42"/>
      <stop offset="50%" stop-color="#00e5ff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#00ff9d" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#071520"/>
      <stop offset="100%" stop-color="#03090e"/>
    </linearGradient>
    <pattern id="grid3d" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#00e5ff" stroke-width="0.5" stroke-opacity="0.06"/>
    </pattern>
    <style>
      .mono {{ font-family: 'JetBrains Mono', 'Share Tech Mono', 'Fira Code', Consolas, monospace; }}
      .disp {{ font-family: 'Orbitron', 'Rajdhani', 'Space Grotesk', 'Inter', sans-serif; }}
      @keyframes pulsePeakA {{
        0%, 100% {{ transform: translateY(0px); }}
        50% {{ transform: translateY(-5px); }}
      }}
      @keyframes pulsePeakB {{
        0%, 100% {{ transform: translateY(-4px); }}
        50% {{ transform: translateY(2px); }}
      }}
      .peak-a {{ animation: pulsePeakA 3.2s ease-in-out infinite; }}
      .peak-b {{ animation: pulsePeakB 3.8s ease-in-out infinite; }}
    </style>
  </defs>

  <rect width="1000" height="360" rx="14" fill="url(#bg3d)"/>
  <rect width="1000" height="360" rx="14" fill="url(#grid3d)"/>
  <rect width="1000" height="360" rx="14" fill="url(#orb3d)"/>
  <rect x="1.5" y="1.5" width="997" height="357" rx="13" fill="none" stroke="url(#hudRim3d)" stroke-width="1.3"/>
  <path d="M 14 2 L 2 2 L 2 16" fill="none" stroke="#00ff9d" stroke-width="2"/>
  <path d="M 986 2 L 998 2 L 998 16" fill="none" stroke="#00e5ff" stroke-width="2"/>
  <path d="M 14 358 L 2 358 L 2 344" fill="none" stroke="#00e5ff" stroke-width="2"/>
  <path d="M 986 358 L 998 358 L 998 344" fill="none" stroke="#00ff9d" stroke-width="2"/>

  <rect x="2" y="2" width="996" height="36" rx="12" fill="#07131e" fill-opacity="0.9"/>
  <line x1="2" y1="38" x2="998" y2="38" stroke="#00ff9d" stroke-opacity="0.22" stroke-width="1"/>

  <g class="mono">
    <circle cx="24" cy="20" r="3.5" fill="#00ff9d">
      <animate attributeName="opacity" values="1;0.25;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
    <text x="38" y="24" font-size="11" font-weight="700" fill="#f1f5f9" letter-spacing="0.6">
      [ TOPOLOGIA ISOMETRICA 3D // ACTIVIDAD Y DESPLIEGUES EN GITHUB ]
    </text>
    <text x="976" y="24" text-anchor="end" font-size="10" fill="#00e5ff">SYNC: {now_str}</text>
  </g>

  <g transform="translate(26, 56)" class="mono">
    <rect width="242" height="82" rx="8" fill="url(#hudCard3d)" stroke="url(#hudRim3d)" stroke-width="1"/>
    <rect x="0" y="0" width="3.5" height="82" fill="#00ff9d"/>
    <text x="18" y="24" font-size="10" fill="#94a3b8" font-weight="600">01 // REPOSITORIOS PUBLICOS</text>
    <text x="18" y="56" class="disp" font-size="25" font-weight="800" fill="#f8fafc">{public_repos:02d} <tspan class="mono" font-size="10.5" font-weight="700" fill="#00ff9d">ACTIVOS</tspan></text>
    <text x="18" y="72" font-size="8.8" fill="#64748b">VERIFICADOS CON SAST &amp; DOCKER</text>

    <g transform="translate(0, 96)">
      <rect width="242" height="82" rx="8" fill="url(#hudCard3d)" stroke="url(#hudRim3d)" stroke-width="1"/>
      <rect x="0" y="0" width="3.5" height="82" fill="#00e5ff"/>
      <text x="18" y="24" font-size="10" fill="#94a3b8" font-weight="600">02 // VOLUMEN AUDITADO</text>
      <text x="18" y="56" class="disp" font-size="23" font-weight="800" fill="#f8fafc">{total_size_kb:,} <tspan class="mono" font-size="10.5" font-weight="700" fill="#00e5ff">KB</tspan></text>
      <text x="18" y="72" font-size="8.8" fill="#64748b">CODIGO FUENTE &amp; ARTEFACTOS</text>
    </g>

    <g transform="translate(0, 192)">
      <rect width="242" height="86" rx="8" fill="url(#hudCard3d)" stroke="url(#hudRim3d)" stroke-width="1"/>
      <rect x="0" y="0" width="3.5" height="86" fill="#10b981"/>
      <text x="18" y="23" font-size="10" fill="#94a3b8" font-weight="600">03 // STACK DE SEGURIDAD</text>
      <text x="18" y="44" font-size="10.5" font-weight="700" fill="#00ff9d">OWASP ASVS · SHA-256 · JWT</text>
      <text x="18" y="61" font-size="9.5" fill="#e2e8f0">TS · Java · C# · Python · PG17</text>
      <text x="18" y="76" font-size="8.8" fill="#00e5ff">Qwen 2.5 7B SAST · Docker</text>
    </g>
  </g>

  <polygon points="{b_top[0]},{b_top[1]} {b_right[0]},{b_right[1]} {b_bottom[0]},{b_bottom[1]} {b_left[0]},{b_left[1]}"
           fill="url(#boardGrad)" stroke="#00e5ff" stroke-opacity="0.32" stroke-width="1.2"/>
  <polygon points="{b_left[0]},{b_left[1]} {b_bottom[0]},{b_bottom[1]} {b_bottom[0]},{b_bottom[1]+10} {b_left[0]},{b_left[1]+10}"
           fill="#040b12" stroke="#00ff9d" stroke-opacity="0.2" stroke-width="0.8"/>
  <polygon points="{b_bottom[0]},{b_bottom[1]} {b_right[0]},{b_right[1]} {b_right[0]},{b_right[1]+10} {b_bottom[0]},{b_bottom[1]+10}"
           fill="#02060a" stroke="#00e5ff" stroke-opacity="0.2" stroke-width="0.8"/>

  {''.join(bars_svg)}

  <g transform="translate(690, 326)" class="mono" font-size="9.5" font-weight="600" fill="#94a3b8">
    <text x="0" y="10">BAJO</text>
    <rect x="36" y="0" width="12" height="12" rx="2" fill="#081824" stroke="#1e293b"/>
    <rect x="52" y="0" width="12" height="12" rx="2" fill="#0c2c3d"/>
    <rect x="68" y="0" width="12" height="12" rx="2" fill="#0a4f63"/>
    <rect x="84" y="0" width="12" height="12" rx="2" fill="#087f8c"/>
    <rect x="100" y="0" width="12" height="12" rx="2" fill="#10b981"/>
    <rect x="116" y="0" width="12" height="12" rx="2" fill="#00ff9d"/>
    <text x="136" y="10" fill="#00ff9d">PICO MAX</text>
  </g>
</svg>
"""
    out = ASSETS_DIR / "github-3d-contrib.svg"
    out.write_text(svg, encoding="utf-8")
    ET.parse(out)


def generate_snake_svg():
    """Generate an Autonomous Cyber-Packet Interceptor Matrix SVG."""
    cols = 52
    rows = 7
    cell = 13
    gap = 3.5
    step = cell + gap
    start_x = 68
    start_y = 64

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
    colors = ["#07131d", "#0c2b3b", "#0a5266", "#0d8a72", "#00ff9d"]
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
                        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="2.5" fill="{base_color}">'
                        f'<animate attributeName="fill" values="{base_color};{base_color};#07131d;#07131d;{base_color}" '
                        f'keyTimes="0;{t_before};{t_eat};{t_respawn};1" dur="11s" repeatCount="indefinite"/>'
                        f"</rect>"
                    )
                else:
                    cells_svg.append(
                        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="2.5" fill="{base_color}"/>'
                    )
            else:
                cells_svg.append(
                    f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="2.5" fill="{base_color}"/>'
                )

    path_coords = [
        (round(start_x + c * step + cell / 2, 1), round(start_y + r * step + cell / 2, 1))
        for c, r in waypoints
    ]
    d_str = "M " + " L ".join(f"{px} {py}" for px, py in path_coords)

    months = ["OCT", "NOV", "DIC", "ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP"]
    month_svg = []
    for m_i, m_name in enumerate(months):
        mx = round(start_x + m_i * (cols / 12) * step, 1)
        month_svg.append(f'<text x="{mx}" y="54">{m_name}</text>')

    seg_colors = ["#00ff9d", "#00ff9d", "#10b981", "#00e5ff", "#0284c7", "#0369a1", "#0c4a6e"]
    seg_sizes = [13, 12, 11.5, 11, 10, 9, 8]
    snake_segments_svg = []
    for s_idx in range(len(seg_colors) - 1, -1, -1):
        sc = seg_colors[s_idx]
        sz = seg_sizes[s_idx]
        half = round(-sz / 2, 1)
        delay = round(s_idx * 0.10, 2)
        snake_segments_svg.append(
            f'<rect x="{half}" y="{half}" width="{sz}" height="{sz}" rx="2.5" fill="{sc}">'
            f'<animateMotion dur="11s" begin="-{delay}s" repeatCount="indefinite">'
            f'<mpath href="#snakeRoute"/>'
            f"</animateMotion>"
            f"</rect>"
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 210" width="100%" height="210">
  <defs>
    <linearGradient id="snkBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#03070b"/>
      <stop offset="100%" stop-color="#061019"/>
    </linearGradient>
    <linearGradient id="snkRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.42"/>
      <stop offset="50%" stop-color="#00e5ff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#00ff9d" stop-opacity="0.08"/>
    </linearGradient>
    <path id="snakeRoute" d="{d_str}"/>
    <style>
      .mono {{ font-family: 'JetBrains Mono', 'Share Tech Mono', 'Fira Code', Consolas, monospace; }}
    </style>
  </defs>

  <rect width="1000" height="210" rx="14" fill="url(#snkBg)"/>
  <rect x="1.5" y="1.5" width="997" height="207" rx="13" fill="none" stroke="url(#snkRim)" stroke-width="1.3"/>
  <path d="M 14 2 L 2 2 L 2 16" fill="none" stroke="#00ff9d" stroke-width="2"/>
  <path d="M 986 2 L 998 2 L 998 16" fill="none" stroke="#00e5ff" stroke-width="2"/>
  <path d="M 14 208 L 2 208 L 2 194" fill="none" stroke="#00e5ff" stroke-width="2"/>
  <path d="M 986 208 L 998 208 L 998 194" fill="none" stroke="#00ff9d" stroke-width="2"/>

  <rect x="2" y="2" width="996" height="34" rx="12" fill="#07131e" fill-opacity="0.9"/>
  <line x1="2" y1="36" x2="998" y2="36" stroke="#00ff9d" stroke-opacity="0.22" stroke-width="1"/>

  <g class="mono">
    <circle cx="24" cy="19" r="3.5" fill="#00ff9d">
      <animate attributeName="opacity" values="1;0.25;1" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <text x="38" y="23" font-size="11" font-weight="700" fill="#f1f5f9" letter-spacing="0.6">
      [ ESCANER AUTONOMO DE MATRIZ DE CONTRIBUCIONES // 52 SEMANAS ]
    </text>
    <text x="976" y="23" text-anchor="end" font-size="10" fill="#00ff9d">PACKET HUNTER :: ACTIVE</text>
  </g>

  <g class="mono" font-size="9" font-weight="600" fill="#64748b">
    {''.join(month_svg)}
    <text x="28" y="{round(start_y + 1 * step + 10, 1)}">LUN</text>
    <text x="28" y="{round(start_y + 3 * step + 10, 1)}">MIE</text>
    <text x="28" y="{round(start_y + 5 * step + 10, 1)}">VIE</text>
  </g>

  <g>
    {''.join(cells_svg)}
  </g>

  <g>
    {''.join(snake_segments_svg)}
  </g>
</svg>
"""
    out = ASSETS_DIR / "snake-dark.svg"
    out.write_text(svg, encoding="utf-8")
    ET.parse(out)


def generate_activity_streak_svg(user, repos):
    """Generate Dual Tactical SOC Telemetry Cards: Streak Radar + Commit Oscilloscope."""
    public_repos = max(user.get("public_repos", 9), 9)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 235" width="100%" height="235">
  <defs>
    <linearGradient id="asBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#03070b"/>
      <stop offset="100%" stop-color="#061019"/>
    </linearGradient>
    <linearGradient id="asRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.42"/>
      <stop offset="50%" stop-color="#00e5ff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#00ff9d" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00ff9d"/>
      <stop offset="50%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <style>
      .mono {{ font-family: 'JetBrains Mono', 'Share Tech Mono', 'Fira Code', Consolas, monospace; }}
      .disp {{ font-family: 'Orbitron', 'Rajdhani', 'Space Grotesk', 'Inter', sans-serif; }}
    </style>
  </defs>

  <!-- ==================== LEFT SOC CARD: STREAK & OPERATIONAL METRICS ==================== -->
  <g transform="translate(0, 0)" class="mono">
    <rect width="488" height="235" rx="14" fill="url(#asBg)"/>
    <rect x="1.5" y="1.5" width="485" height="232" rx="13" fill="none" stroke="url(#asRim)" stroke-width="1.3"/>
    <path d="M 14 2 L 2 2 L 2 16" fill="none" stroke="#00ff9d" stroke-width="2"/>
    <path d="M 474 2 L 486 2 L 486 16" fill="none" stroke="#00e5ff" stroke-width="2"/>

    <rect x="2" y="2" width="484" height="34" rx="12" fill="#07131e" fill-opacity="0.9"/>
    <line x1="2" y1="36" x2="486" y2="36" stroke="#00ff9d" stroke-opacity="0.22" stroke-width="1"/>
    <text x="20" y="23" font-size="10.5" font-weight="700" fill="#f1f5f9">
      [ 01 // CONSTANCIA OPERATIVA &amp; DESPLIEGUES ]
    </text>

    <!-- Col 1: Total Contributions -->
    <g transform="translate(88, 124)" text-anchor="middle">
      <text x="0" y="0" class="disp" font-size="28" font-weight="800" fill="#00ff9d">140+</text>
      <text x="0" y="24" font-size="10" font-weight="700" fill="#e2e8f0">COMMITS &amp; PRs</text>
      <text x="0" y="42" font-size="9" fill="#64748b">2024 — PRESENTE</text>
    </g>

    <line x1="168" y1="64" x2="168" y2="202" stroke="#1e293b" stroke-width="1"/>

    <!-- Col 2: Animated Tactical HUD Target Ring -->
    <g transform="translate(244, 124)" text-anchor="middle">
      <circle cx="0" cy="-10" r="42" fill="none" stroke="#00e5ff" stroke-opacity="0.2" stroke-width="1.2" stroke-dasharray="6 4">
        <animateTransform attributeName="transform" type="rotate" from="0 0 -10" to="360 0 -10" dur="12s" repeatCount="indefinite"/>
      </circle>
      <circle cx="0" cy="-10" r="35" fill="none" stroke="#1e293b" stroke-width="4.5"/>
      <circle cx="0" cy="-10" r="35" fill="none" stroke="url(#ringGrad)" stroke-width="4.5"
              stroke-linecap="round" stroke-dasharray="195 220" transform="rotate(-90 0 -10)">
        <animate attributeName="stroke-dasharray" values="40 220;195 220;195 220" keyTimes="0;0.4;1" dur="4.5s" repeatCount="indefinite"/>
      </circle>
      <text x="0" y="-6" class="disp" font-size="13" font-weight="800" fill="#00ff9d">ONLINE</text>
      <text x="0" y="50" font-size="10" font-weight="700" fill="#00e5ff">RITMO CONTINUO</text>
      <text x="0" y="66" font-size="9" fill="#64748b">MEDELLIN (UTC-5)</text>
    </g>

    <line x1="320" y1="64" x2="320" y2="202" stroke="#1e293b" stroke-width="1"/>

    <!-- Col 3: Public Repos & Security -->
    <g transform="translate(402, 124)" text-anchor="middle">
      <text x="0" y="0" class="disp" font-size="28" font-weight="800" fill="#00e5ff">{public_repos:02d}</text>
      <text x="0" y="24" font-size="10" font-weight="700" fill="#e2e8f0">REPOSITORIOS</text>
      <text x="0" y="42" font-size="9" fill="#00ff9d">ZERO-TRUST &amp; SAST</text>
    </g>
  </g>

  <!-- ==================== RIGHT SOC CARD: OSCILLOSCOPE COMMIT TELEMETRY ==================== -->
  <g transform="translate(512, 0)" class="mono">
    <rect width="488" height="235" rx="14" fill="url(#asBg)"/>
    <rect x="1.5" y="1.5" width="485" height="232" rx="13" fill="none" stroke="url(#asRim)" stroke-width="1.3"/>
    <path d="M 14 2 L 2 2 L 2 16" fill="none" stroke="#00e5ff" stroke-width="2"/>
    <path d="M 474 2 L 486 2 L 486 16" fill="none" stroke="#00ff9d" stroke-width="2"/>

    <rect x="2" y="2" width="484" height="34" rx="12" fill="#07131e" fill-opacity="0.9"/>
    <line x1="2" y1="36" x2="486" y2="36" stroke="#00ff9d" stroke-opacity="0.22" stroke-width="1"/>
    <text x="20" y="23" font-size="10.5" font-weight="700" fill="#f1f5f9">
      [ 02 // FRECUENCIA DE COMMITS &amp; TELEMETRIA ]
    </text>
    <text x="468" y="23" text-anchor="end" font-size="9.5" fill="#00ff9d">
      MAIN :: VERIFIED
    </text>

    <!-- Chart Grid Lines -->
    <g stroke="#00e5ff" stroke-opacity="0.10" stroke-width="1" stroke-dasharray="3 3">
      <line x1="48" y1="68" x2="458" y2="68"/>
      <line x1="48" y1="104" x2="458" y2="104"/>
      <line x1="48" y1="140" x2="458" y2="140"/>
      <line x1="48" y1="176" x2="458" y2="176"/>
    </g>

    <!-- Y-Axis Labels -->
    <g font-size="9" fill="#64748b" text-anchor="end">
      <text x="40" y="71">30</text>
      <text x="40" y="107">20</text>
      <text x="40" y="143">10</text>
      <text x="40" y="179">00</text>
    </g>

    <!-- Area Under Curve -->
    <path d="M 48 162 C 85 155, 105 118, 130 122 C 160 126, 180 88, 212 92 C 245 96, 265 135, 294 114 C 325 92, 348 64, 376 74 C 405 84, 430 62, 458 56 L 458 176 L 48 176 Z"
          fill="url(#areaGrad)"/>

    <!-- Oscilloscope Spline Line -->
    <path d="M 48 162 C 85 155, 105 118, 130 122 C 160 126, 180 88, 212 92 C 245 96, 265 135, 294 114 C 325 92, 348 64, 376 74 C 405 84, 430 62, 458 56"
          fill="none" stroke="#00ff9d" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Animated Vertical Laser Telemetry Scanner Line -->
    <line x1="48" y1="54" x2="48" y2="176" stroke="#00e5ff" stroke-opacity="0.55" stroke-width="1.2">
      <animate attributeName="x1" values="48;458;48" dur="7s" repeatCount="indefinite"/>
      <animate attributeName="x2" values="48;458;48" dur="7s" repeatCount="indefinite"/>
    </line>

    <!-- Data Nodes -->
    <g fill="#00e5ff" stroke="#03070b" stroke-width="1.5">
      <circle cx="48" cy="162" r="3.5"/>
      <circle cx="130" cy="122" r="3.5"/>
      <circle cx="212" cy="92" r="4"/>
      <circle cx="294" cy="114" r="3.5"/>
      <circle cx="376" cy="74" r="4"/>
      <circle cx="458" cy="56" r="4.5" fill="#00ff9d">
        <animate attributeName="r" values="3.5;6.5;3.5" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </g>

    <!-- X-Axis Labels -->
    <g font-size="9.5" font-weight="600" fill="#64748b" text-anchor="middle">
      <text x="58" y="202">JUN</text>
      <text x="130" y="202">JUL</text>
      <text x="212" y="202">AGO</text>
      <text x="294" y="202">SEP</text>
      <text x="376" y="202">OCT</text>
      <text x="448" y="202" fill="#00ff9d">NOV</text>
    </g>
  </g>
</svg>
"""
    out = ASSETS_DIR / "activity-streak-telemetry.svg"
    out.write_text(svg, encoding="utf-8")
    ET.parse(out)


def generate_bento_cards():
    """Generate 6 Tactical Cyber-Armored Bento Repository Cards with animated telemetry rails & zero emojis."""
    cards = [
        {
            "file": "bento-nexus.svg",
            "code": "MOD-01 // ACID ENGINE",
            "title": "NEXUS",
            "badge": "PG16 · MONACO IDE",
            "accent": "#00ff9d",
            "orb": "#00ff9d",
            "lines": [
                "Simulador interactivo de ingeniería SQL y resiliencia ACID con",
                "editor Monaco, motor PostgreSQL 16 en memoria (pg-mem),",
                "mitigación de deadlocks concurrentes y auditoría EXPLAIN.",
            ],
            "tags": ["TypeScript 5.3", "Fastify 4.26", "React 18", "PostgreSQL 16"],
            "lang": "TypeScript // SQL Engine",
            "lang_color": "#00ff9d",
            "link": "REPO // NEXUS &gt;&gt;",
        },
        {
            "file": "bento-architect.svg",
            "code": "MOD-02 // PERIMETER DEFENSE",
            "title": "ARCHITECT-TD",
            "badge": "WAF L7 · 56 TESTS",
            "accent": "#00e5ff",
            "orb": "#00e5ff",
            "lines": [
                "Simulador de arquitectura y defensa perimetral 360 en HTML5",
                "Canvas: mitigación de SYN Flood, SQLi, MITM y Spectre con",
                "nodos WAF, Envoy, Redis, generador IaC y 56 tests activos.",
            ],
            "tags": ["JavaScript ES6+", "WAF &amp; Envoy", "Docker &amp; Nginx", "56 Tests"],
            "lang": "JavaScript // Cyber Sim",
            "lang_color": "#00e5ff",
            "link": "REPO // ARCHITECT-TD &gt;&gt;",
        },
        {
            "file": "bento-aisec.svg",
            "code": "MOD-03 // LOCAL AI SECURITY",
            "title": "SECDEV // CYBER STATION",
            "badge": "QWEN 7B · DIRECT3D",
            "accent": "#00ff9d",
            "orb": "#10b981",
            "lines": [
                "Estación nativa de ingeniería de software y ciberseguridad",
                "con IA local (Qwen 2.5 Coder 7B), aceleración Direct3D,",
                "auditoría SAST automatizada y deduplicación SHA-256.",
            ],
            "tags": ["C# .NET", "Qwen 2.5 7B", "Direct3D", "SAST DevSecOps"],
            "lang": "C# // Local AI Security",
            "lang_color": "#00ff9d",
            "link": "REPO // SECDEV &gt;&gt;",
        },
        {
            "file": "bento-todo.svg",
            "code": "MOD-04 // FINTECH &amp; ERP",
            "title": "D&amp;D TEXTIL // ERP &amp; STORE",
            "badge": "SHA-256 · OWASP ASVS",
            "accent": "#00e5ff",
            "orb": "#0284c7",
            "lines": [
                "Ecosistema E-Commerce y ERP con 50 rutas React, backend Java,",
                "PostgreSQL 17 (25 tablas), firma criptográfica SHA-256 para",
                "webhooks Wompi, SSO Google/Microsoft y Rate Limit 1200/min.",
            ],
            "tags": ["React + Vite", "Java JDBC", "PostgreSQL 17", "OWASP ASVS"],
            "lang": "Java · React · PostgreSQL",
            "lang_color": "#00e5ff",
            "link": "REPO // TIENDA-TEXTIL &gt;&gt;",
        },
        {
            "file": "bento-gcp.svg",
            "code": "MOD-05 // NATIVE TELEMETRY",
            "title": "GCP-GESTION-PRODUCTOS",
            "badge": ".NET 10 · GDI+ 60FPS",
            "accent": "#00ff9d",
            "orb": "#059669",
            "lines": [
                "Sistema transaccional de Punto de Venta (POS) y control de",
                "inventario en C# 12 y Windows Forms (.NET 10.0) con gráficas",
                "vectoriales en GDI+ a 60 FPS y alertas de umbrales críticos.",
            ],
            "tags": ["C# 12", ".NET 10.0", "WinForms GDI+", "POS 60 FPS"],
            "lang": "C# (.NET 10.0)",
            "lang_color": "#00ff9d",
            "link": "REPO // GCP-POS &gt;&gt;",
        },
        {
            "file": "bento-python.svg",
            "code": "MOD-06 // CONTAINERS &amp; DSA",
            "title": "TODO-API &amp; PYTHON LAB",
            "badge": "DOCKER · BIG-O",
            "accent": "#00e5ff",
            "orb": "#00e5ff",
            "lines": [
                "Microservicio RESTful contenerizado en Node.js 20, Express y",
                "MongoDB v6 con Docker Compose Multi-Stage, junto con suite",
                "de algoritmia y análisis de complejidad Big-O en Python 3.12.",
            ],
            "tags": ["Node.js 20", "MongoDB v6", "Python 3.12", "Docker Compose"],
            "lang": "Node.js · Python 3.12",
            "lang_color": "#00e5ff",
            "link": "REPO // EXPLORAR &gt;&gt;",
        },
    ]

    for c in cards:
        tag_svg = ""
        tx = 0
        for t in c["tags"]:
            clean_len = len(t.replace("&amp;", "&"))
            w = clean_len * 6.8 + 20
            tag_svg += (
                f'    <rect x="{tx:.0f}" y="0" width="{w:.0f}" height="22" rx="4" '
                f'fill="#040c14" stroke="{c["accent"]}" stroke-opacity="0.32"/>\n'
            )
            tag_svg += f'    <text x="{tx + w/2:.1f}" y="14.5" text-anchor="middle" fill="#cbd5e1">{t}</text>\n'
            tx += w + 8

        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 220" width="100%" height="220">
  <defs>
    <linearGradient id="bgBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#03070b"/>
      <stop offset="100%" stop-color="#07121c"/>
    </linearGradient>
    <radialGradient id="orbGlow" cx="85%" cy="22%" r="48%">
      <stop offset="0%" stop-color="{c['orb']}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#03070b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hudRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c['accent']}" stop-opacity="0.50"/>
      <stop offset="50%" stop-color="#00e5ff" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="{c['accent']}" stop-opacity="0.08"/>
    </linearGradient>
    <pattern id="cardGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#00e5ff" stroke-width="0.4" stroke-opacity="0.06"/>
    </pattern>
    <style>
      .mono {{ font-family: 'JetBrains Mono', 'Share Tech Mono', 'Fira Code', Consolas, monospace; }}
      .disp {{ font-family: 'Orbitron', 'Rajdhani', 'Space Grotesk', 'Inter', sans-serif; }}
      .sans {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
      @keyframes railPulse {{ to {{ stroke-dashoffset: -24; }} }}
      .rail-anim {{ stroke-dasharray: 6 6; animation: railPulse 1.5s linear infinite; }}
    </style>
  </defs>

  <rect width="490" height="220" rx="12" fill="url(#bgBase)"/>
  <rect width="490" height="220" rx="12" fill="url(#cardGrid)"/>
  <rect width="490" height="220" rx="12" fill="url(#orbGlow)"/>
  <rect x="1.5" y="1.5" width="487" height="217" rx="11" fill="none" stroke="url(#hudRim)" stroke-width="1.3"/>

  <!-- Corner Tactical Reticles -->
  <path d="M 12 2 L 2 2 L 2 14" fill="none" stroke="{c['accent']}" stroke-width="2"/>
  <path d="M 478 2 L 488 2 L 488 14" fill="none" stroke="{c['accent']}" stroke-width="2"/>
  <path d="M 12 218 L 2 218 L 2 206" fill="none" stroke="{c['accent']}" stroke-width="2"/>
  <path d="M 478 218 L 488 218 L 488 206" fill="none" stroke="{c['accent']}" stroke-width="2"/>

  <!-- Animated Top Data Rail -->
  <line x1="24" y1="2" x2="240" y2="2" stroke="{c['accent']}" stroke-opacity="0.75" stroke-width="1.5" class="rail-anim"/>

  <!-- Module Code & Title -->
  <g transform="translate(22, 22)">
    <text x="0" y="0" class="mono" font-size="8.5" font-weight="700" fill="{c['accent']}" letter-spacing="0.8">
      [ {c['code']} ]
    </text>
    <!-- Vector Shield/Node Icon -->
    <polygon points="0,12 7,8 14,12 14,20 7,25 0,20" fill="#061622" stroke="{c['accent']}" stroke-width="1.3"/>
    <circle cx="7" cy="16.5" r="2" fill="{c['accent']}"/>
    <text x="22" y="22" class="disp" font-size="15.5" font-weight="800" letter-spacing="0.4" fill="#f8fafc">{c['title']}</text>
  </g>

  <!-- Tactical Status Badge -->
  <g transform="translate(332, 24)" class="mono">
    <rect x="0" y="0" width="136" height="22" rx="4" fill="#040c14" stroke="{c['accent']}" stroke-opacity="0.45" stroke-width="1"/>
    <text x="68" y="14.5" text-anchor="middle" font-size="9" font-weight="700" fill="{c['accent']}">{c['badge']}</text>
  </g>

  <!-- Description Lines -->
  <g class="sans" font-size="11.8" fill="#94a3b8">
    <text x="22" y="76">{c['lines'][0]}</text>
    <text x="22" y="96">{c['lines'][1]}</text>
    <text x="22" y="116">{c['lines'][2]}</text>
  </g>

  <!-- Tech Tags -->
  <g transform="translate(22, 136)" class="mono" font-size="9.2" font-weight="600">
{tag_svg.rstrip()}
  </g>

  <line x1="22" y1="174" x2="468" y2="174" stroke="#1e293b" stroke-width="1"/>
  <g transform="translate(22, 196)" class="mono" font-size="10" font-weight="700">
    <circle cx="5" cy="-3.5" r="3.5" fill="{c['lang_color']}">
      <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <text x="15" y="0" fill="#e2e8f0">{c['lang']}</text>
    <text x="446" y="0" text-anchor="end" fill="{c['accent']}">{c['link']}</text>
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
    print("Generated all cybersecurity SOC telemetry and Bento SVG assets successfully.")
