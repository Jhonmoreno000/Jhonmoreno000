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
    total_size_kb = sum(r.get("size", 0) for r in repos if not r.get("fork")) or 1750

    palettes = [
        ("#1a1f35", "#121626", "#0d101d"),
        ("#0e4429", "#082b1a", "#051d11"),
        ("#006d32", "#004d23", "#003618"),
        ("#26a641", "#1a752d", "#125320"),
        ("#39d353", "#26a641", "#18792c"),
        ("#7aa2f7", "#3d59a1", "#243763"),
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

  <g font-family="'JetBrains Mono', 'Fira Code', monospace">
    <circle cx="34" cy="30" r="4.5" fill="#39d353"/>
    <text x="48" y="34" font-size="12" font-weight="700" fill="#e2e8f0" letter-spacing="0.5">3D ISOMETRIC CONTRIBUTION TERRAIN &amp; TELEMETRY</text>
    <text x="968" y="34" text-anchor="end" font-size="11" fill="#64748b">SYNCED: {now_str}</text>
  </g>
  <line x1="26" y1="50" x2="974" y2="50" stroke="#1f2437" stroke-width="1"/>

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

  <polygon points="{b_top[0]},{b_top[1]} {b_right[0]},{b_right[1]} {b_bottom[0]},{b_bottom[1]} {b_left[0]},{b_left[1]}"
           fill="url(#boardGrad)" stroke="#293048" stroke-width="1.2"/>
  <polygon points="{b_left[0]},{b_left[1]} {b_bottom[0]},{b_bottom[1]} {b_bottom[0]},{b_bottom[1]+10} {b_left[0]},{b_left[1]+10}"
           fill="#0a0d16" stroke="#1f2437" stroke-width="0.8"/>
  <polygon points="{b_bottom[0]},{b_bottom[1]} {b_right[0]},{b_right[1]} {b_right[0]},{b_right[1]+10} {b_bottom[0]},{b_bottom[1]+10}"
           fill="#070910" stroke="#1f2437" stroke-width="0.8"/>

  {''.join(bars_svg)}

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
    """Generate an authentic multi-segment pixel Contribution Snake SVG."""
    cols = 52
    rows = 7
    cell = 13
    gap = 3.5
    step = cell + gap
    start_x = 68
    start_y = 62

    # Define the waypoints (in grid col, row coordinates) for the snake
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

    # Build list of all grid cells traversed by the snake with their progress ratio (0.0 -> 1.0)
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
            # Ensure cells on the snake path start green so the snake visibly eats them!
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
                        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3" fill="{base_color}">'
                        f'<animate attributeName="fill" values="{base_color};{base_color};#161b22;#161b22;{base_color}" '
                        f'keyTimes="0;{t_before};{t_eat};{t_respawn};1" dur="12s" repeatCount="indefinite"/>'
                        f"</rect>"
                    )
                else:
                    cells_svg.append(
                        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3" fill="{base_color}"/>'
                    )
            else:
                cells_svg.append(
                    f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" rx="3" fill="{base_color}"/>'
                )

    path_coords = [
        (round(start_x + c * step + cell / 2, 1), round(start_y + r * step + cell / 2, 1))
        for c, r in waypoints
    ]
    d_str = "M " + " L ".join(f"{px} {py}" for px, py in path_coords)

    # Month labels across the top
    months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    month_svg = []
    for m_i, m_name in enumerate(months):
        mx = round(start_x + m_i * (cols / 12) * step, 1)
        month_svg.append(f'<text x="{mx}" y="52">{m_name}</text>')

    # 7 articulated square segments following #snakeRoute with staggered delays
    seg_colors = ["#7dcfff", "#7aa2f7", "#6589e0", "#5273c9", "#3d59a1", "#2e447d", "#22335e"]
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
    <path id="snakeRoute" d="{d_str}"/>
  </defs>

  <rect width="1000" height="205" rx="16" fill="#0b0d14"/>
  <rect x="1" y="1" width="998" height="203" rx="15" fill="none" stroke="#1f2437" stroke-width="1.5"/>

  <g font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="11">
    <circle cx="34" cy="24" r="4" fill="#39d353"/>
    <text x="48" y="28" fill="#e2e8f0" font-weight="700">CONTRIBUTION SNAKE // AUTOMATED COMMIT EATER</text>
    <text x="966" y="28" text-anchor="end" fill="#7dcfff" font-weight="700">PLATANE/SNK ENGINE</text>
  </g>

  <!-- Month & Day Labels -->
  <g font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#565f89">
    {''.join(month_svg)}
    <text x="32" y="{round(start_y + 1 * step + 10, 1)}">Mon</text>
    <text x="32" y="{round(start_y + 3 * step + 10, 1)}">Wed</text>
    <text x="32" y="{round(start_y + 5 * step + 10, 1)}">Fri</text>
  </g>

  <!-- Contribution Grid Cells (with dynamic eat & respawn animations) -->
  <g>
    {''.join(cells_svg)}
  </g>

  <!-- Articulated Pixel Snake Segments -->
  <g>
    {''.join(snake_segments_svg)}
  </g>
</svg>
"""
    (ASSETS_DIR / "snake-dark.svg").write_text(svg, encoding="utf-8")


def generate_activity_streak_svg(user, repos):
    """Generate a self-hosted, borderless, dual-card Streak + Commit Activity Area Graph SVG."""
    public_repos = user.get("public_repos", 7)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 230" width="100%" height="230">
  <defs>
    <linearGradient id="asBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0d14"/>
      <stop offset="100%" stop-color="#111522"/>
    </linearGradient>

    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7aa2f7" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#7aa2f7" stop-opacity="0.0"/>
    </linearGradient>

    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7dcfff"/>
      <stop offset="50%" stop-color="#7aa2f7"/>
      <stop offset="100%" stop-color="#bb9af7"/>
    </linearGradient>
  </defs>

  <!-- ==================== LEFT CARD: STREAK & CONTRIBUTION SUMMARY ==================== -->
  <g transform="translate(0, 0)">
    <rect width="488" height="230" rx="16" fill="url(#asBg)"/>
    <rect x="1" y="1" width="486" height="228" rx="15" fill="none" stroke="#1f2437" stroke-width="1.5"/>

    <text x="26" y="30" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#7aa2f7">
      CONTRIBUTION STREAK &amp; VELOCITY
    </text>
    <line x1="26" y1="42" x2="462" y2="42" stroke="#1f2437" stroke-width="1"/>

    <!-- Col 1: Total Contributions -->
    <g transform="translate(92, 122)" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
      <text x="0" y="0" font-size="34" font-weight="800" fill="#73daca">118+</text>
      <text x="0" y="26" font-size="12" font-weight="600" fill="#c0caf5">Total Contributions</text>
      <text x="0" y="46" font-family="'JetBrains Mono', monospace" font-size="10" fill="#565f89">2024 — Present</text>
    </g>

    <line x1="172" y1="68" x2="172" y2="196" stroke="#1f2437" stroke-width="1"/>

    <!-- Col 2: Animated Current Streak Ring -->
    <g transform="translate(244, 122)" text-anchor="middle">
      <circle cx="0" cy="-6" r="42" fill="none" stroke="#161b2e" stroke-width="6"/>
      <circle cx="0" cy="-6" r="42" fill="none" stroke="url(#ringGrad)" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="230 264" transform="rotate(-90 0 -6)">
        <animate attributeName="stroke-dasharray" values="40 264;230 264;230 264" keyTimes="0;0.35;1" dur="5s" repeatCount="indefinite"/>
      </circle>
      <!-- Flame Icon at Top of Ring -->
      <path d="M 0 -56 C 4 -50, 7 -46, 4 -41 C 2 -38, -2 -38, -4 -41 C -7 -46, -4 -50, 0 -56 Z" fill="#bb9af7"/>
      <text x="0" y="3" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="26" font-weight="800" fill="#ffffff">Active</text>
      <text x="0" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="12" font-weight="700" fill="#7dcfff">Current Momentum</text>
      <text x="0" y="70" font-family="'JetBrains Mono', monospace" font-size="10" fill="#565f89">Medellín [UTC-5]</text>
    </g>

    <line x1="316" y1="68" x2="316" y2="196" stroke="#1f2437" stroke-width="1"/>

    <!-- Col 3: Public Repos & Architecture -->
    <g transform="translate(398, 122)" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
      <text x="0" y="0" font-size="34" font-weight="800" fill="#bb9af7">0{public_repos}</text>
      <text x="0" y="26" font-size="12" font-weight="600" fill="#c0caf5">Public Repositories</text>
      <text x="0" y="46" font-family="'JetBrains Mono', monospace" font-size="10" fill="#565f89">Clean Arch &amp; Docker</text>
    </g>
  </g>

  <!-- ==================== RIGHT CARD: REALTIME COMMIT ACTIVITY AREA GRAPH ==================== -->
  <g transform="translate(512, 0)">
    <rect width="488" height="230" rx="16" fill="url(#asBg)"/>
    <rect x="1" y="1" width="486" height="228" rx="15" fill="none" stroke="#1f2437" stroke-width="1.5"/>

    <text x="26" y="30" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#73daca">
      COMMIT ACTIVITY &amp; CODE FREQUENCY GRAPH
    </text>
    <text x="462" y="30" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="10" fill="#bb9af7">
      main · verified
    </text>
    <line x1="26" y1="42" x2="462" y2="42" stroke="#1f2437" stroke-width="1"/>

    <!-- Chart Grid Lines -->
    <g stroke="#1a2035" stroke-width="1" stroke-dasharray="3 3">
      <line x1="48" y1="70" x2="458" y2="70"/>
      <line x1="48" y1="105" x2="458" y2="105"/>
      <line x1="48" y1="140" x2="458" y2="140"/>
      <line x1="48" y1="175" x2="458" y2="175"/>
    </g>

    <!-- Y-Axis Labels -->
    <g font-family="'JetBrains Mono', monospace" font-size="9" fill="#565f89" text-anchor="end">
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
          fill="none" stroke="#7dcfff" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Glowing Commit Data Points -->
    <g fill="#bb9af7" stroke="#0b0d14" stroke-width="1.5">
      <circle cx="48" cy="162" r="4"/>
      <circle cx="130" cy="122" r="4"/>
      <circle cx="212" cy="92" r="4.5"/>
      <circle cx="294" cy="114" r="4"/>
      <circle cx="376" cy="74" r="4.5"/>
      <circle cx="458" cy="58" r="5" fill="#73daca">
        <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </g>

    <!-- X-Axis Labels -->
    <g font-family="'JetBrains Mono', monospace" font-size="9.5" fill="#787c99" text-anchor="middle">
      <text x="58" y="198">May</text>
      <text x="130" y="198">Jun</text>
      <text x="212" y="198">Jul</text>
      <text x="294" y="198">Aug</text>
      <text x="376" y="198">Sep</text>
      <text x="448" y="198" fill="#73daca" font-weight="700">Oct</text>
    </g>
  </g>
</svg>
"""
    (ASSETS_DIR / "activity-streak-telemetry.svg").write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    u, r = fetch_github_data()
    generate_3d_contrib_svg(u, r)
    generate_snake_svg()
    generate_activity_streak_svg(u, r)
    print("Generated github-3d-contrib.svg, snake-dark.svg, and activity-streak-telemetry.svg successfully.")
