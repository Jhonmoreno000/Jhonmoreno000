import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const UPNG = require("upng-js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "assets");
const PREVIEW_DIR = process.env.PREVIEW_DIR || "";

const WIDTH = 1100;
const HEIGHT = 420;
const FRAMES = 40;
const FRAME_DELAY_MS = 60; // ~16.7 fps, 2.4s smooth seamless loop

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("No Chrome/Edge executable found. Set CHROME_PATH env var.");
}

function getThreeBuildDir() {
  return path.dirname(require.resolve("three"));
}

function buildHtml(theme) {
  const isDark = theme === "dark";
  const pal = isDark
    ? {
        bgOuter: "#030508",
        bgInner1: "#050a10",
        bgInner2: "#08121d",
        border: "#1b2838",
        accent1: "#00ff88",
        accent2: "#00e5ff",
        accent3: "#f59e0b",
        accent4: "#38bdf8",
        textMain: "#f8fafc",
        textSub: "#94a3b8",
        textDim: "#64748b",
        pillBg: "rgba(6, 20, 32, 0.85)",
        pillBorder: "rgba(0, 255, 136, 0.35)",
        cardBg: "rgba(7, 15, 24, 0.82)",
        cardBorder: "rgba(30, 48, 68, 0.9)",
        dotColor: "rgba(0, 229, 255, 0.14)",
        headerBg: "rgba(6, 12, 20, 0.88)",
        glowA: "rgba(0, 255, 136, 0.11)",
        glowB: "rgba(0, 229, 255, 0.14)",
        nameGrad: "linear-gradient(92deg, #ffffff 0%, #e2e8f0 48%, #00ff88 82%, #00e5ff 100%)",
        specLabelBg: "rgba(4, 12, 20, 0.88)",
        // 3D materials
        chassisColor: 0x16202c,
        chassisTrim: 0x00ff88,
        keyColor: 0x0d1520,
        keyGlow: 0x00e5ff,
        serverColor: 0x111a26,
        gridColor1: 0x00e5ff,
        gridColor2: 0x0f2538,
        ringColor: 0x00ff88,
        particleColor: 0x00ff88,
        light1: 0x00ff88,
        light2: 0x00e5ff,
        lightAmb: 0x446688,
        termBg: "#050c12",
        termBorder: "#00ff88",
        termText: "#e2e8f0",
        termGreen: "#00ff88",
        termCyan: "#00e5ff",
        termAmber: "#fbbf24",
      }
    : {
        bgOuter: "#eef2f6",
        bgInner1: "#f8fafc",
        bgInner2: "#eef4f9",
        border: "#cbd5e1",
        accent1: "#059669",
        accent2: "#0284c7",
        accent3: "#d97706",
        accent4: "#4f46e5",
        textMain: "#0f172a",
        textSub: "#475569",
        textDim: "#64748b",
        pillBg: "rgba(255, 255, 255, 0.94)",
        pillBorder: "rgba(5, 150, 105, 0.35)",
        cardBg: "rgba(255, 255, 255, 0.90)",
        cardBorder: "rgba(203, 213, 225, 0.95)",
        dotColor: "rgba(15, 23, 42, 0.09)",
        headerBg: "rgba(241, 245, 249, 0.94)",
        glowA: "rgba(5, 150, 105, 0.08)",
        glowB: "rgba(2, 132, 199, 0.10)",
        nameGrad: "linear-gradient(92deg, #0f172a 0%, #1e293b 52%, #059669 82%, #0284c7 100%)",
        specLabelBg: "rgba(255, 255, 255, 0.94)",
        // 3D materials (brushed aluminum ThinkPad / studio look)
        chassisColor: 0x334155,
        chassisTrim: 0x059669,
        keyColor: 0x1e293b,
        keyGlow: 0x0284c7,
        serverColor: 0x475569,
        gridColor1: 0x0284c7,
        gridColor2: 0xcbd5e1,
        ringColor: 0x059669,
        particleColor: 0x0284c7,
        light1: 0x34d399,
        light2: 0x38bdf8,
        lightAmb: 0xe2e8f0,
        termBg: "#0a111a",
        termBorder: "#059669",
        termText: "#f1f5f9",
        termGreen: "#34d399",
        termCyan: "#38bdf8",
        termAmber: "#fbbf24",
      };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    background: ${pal.bgOuter};
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .mono {
    font-family: 'Cascadia Code', 'Consolas', 'JetBrains Mono', ui-monospace, monospace;
  }
  .frame {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    background: ${pal.bgOuter};
    padding: 8px;
  }
  .chassis {
    position: relative;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, ${pal.bgInner1} 0%, ${pal.bgInner2} 100%);
    clip-path: polygon(
      26px 0%, 240px 0%, 254px 10px, 840px 10px, 854px 0%, calc(100% - 26px) 0%,
      100% 26px, 100% calc(100% - 26px), calc(100% - 26px) 100%,
      26px 100%, 0% calc(100% - 26px), 0% 26px
    );
    overflow: hidden;
  }
  .dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(${pal.dotColor} 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
  }
  .glow-l {
    position: absolute;
    left: -80px;
    top: -60px;
    width: 460px;
    height: 360px;
    background: radial-gradient(circle, ${pal.glowA} 0%, transparent 70%);
    pointer-events: none;
  }
  .glow-r {
    position: absolute;
    right: -30px;
    top: 20px;
    width: 560px;
    height: 380px;
    background: radial-gradient(circle, ${pal.glowB} 0%, transparent 68%);
    pointer-events: none;
  }
  svg.chassis-outline {
    position: absolute;
    inset: 8px;
    width: ${WIDTH - 16}px;
    height: ${HEIGHT - 16}px;
    pointer-events: none;
    z-index: 20;
  }

  .topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 32px 0 32px;
    border-bottom: 1px solid ${pal.border};
    background: ${pal.headerBg};
    z-index: 10;
  }
  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 1.6px;
    color: ${pal.accent1};
  }
  .led {
    width: 8px;
    height: 8px;
    background: ${pal.accent1};
    box-shadow: 0 0 10px ${pal.accent1};
  }
  .topbar-right {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: ${pal.textSub};
  }
  .topbar-right span {
    color: ${pal.accent2};
  }

  .left-col {
    position: absolute;
    top: 54px;
    left: 34px;
    width: 552px;
    z-index: 10;
  }
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 5px 13px;
    background: ${pal.pillBg};
    border: 1px solid ${pal.pillBorder};
    border-left: 3px solid ${pal.accent1};
    font-size: 9.8px;
    font-weight: 800;
    letter-spacing: 1.4px;
    color: ${pal.accent1};
    margin-bottom: 13px;
  }
  .role-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${pal.accent1};
  }
  .hero-name {
    font-size: 37px;
    font-weight: 900;
    letter-spacing: 1.5px;
    line-height: 1.06;
    background: ${pal.nameGrad};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }
  .hero-subline {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: ${pal.accent2};
    margin-bottom: 12px;
  }
  .hero-desc {
    font-size: 13px;
    line-height: 1.52;
    color: ${pal.textSub};
    max-width: 530px;
    margin-bottom: 18px;
  }
  .hero-desc strong {
    color: ${pal.textMain};
    font-weight: 700;
  }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    width: 542px;
  }
  .spec-card {
    position: relative;
    background: ${pal.cardBg};
    border: 1px solid ${pal.cardBorder};
    padding: 9px 10px 9px 12px;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
  }
  .spec-card::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--accent);
  }
  .spec-k {
    font-size: 8.2px;
    font-weight: 800;
    letter-spacing: 1.1px;
    color: ${pal.textDim};
    margin-bottom: 4px;
  }
  .spec-v {
    font-size: 13.5px;
    font-weight: 900;
    color: ${pal.textMain};
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }
  .spec-s {
    font-size: 8.4px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.4px;
  }

  .hero-coords {
    position: absolute;
    left: 34px;
    bottom: 17px;
    display: flex;
    gap: 18px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.1px;
    color: ${pal.textDim};
    z-index: 10;
  }
  .hero-coords b {
    color: ${pal.accent1};
  }

  /* Right WebGL 3D Linux Workstation Viewport */
  #webgl-stage {
    position: absolute;
    top: 38px;
    right: 0;
    width: 510px;
    height: ${HEIGHT - 54}px;
    z-index: 5;
  }
  canvas#three-canvas {
    width: 510px;
    height: ${HEIGHT - 54}px;
    display: block;
  }

  .hud-tag {
    position: absolute;
    padding: 4px 10px;
    background: ${pal.specLabelBg};
    border: 1px solid ${pal.border};
    border-left: 3px solid var(--c);
    font-size: 8.6px;
    font-weight: 800;
    letter-spacing: 1.3px;
    color: var(--c);
    z-index: 15;
  }
  .hud-tl { top: 50px; right: 342px; --c: ${pal.accent2}; }
  .hud-tr { top: 50px; right: 24px; --c: ${pal.accent1}; }
  .hud-bl { bottom: 16px; right: 326px; --c: ${pal.accent3}; }
  .hud-br { bottom: 16px; right: 24px; --c: ${pal.accent4}; }
</style>
</head>
<body>
  <div class="frame">
    <div class="chassis">
      <div class="dots"></div>
      <div class="glow-l"></div>
      <div class="glow-r"></div>

      <div class="topbar">
        <div class="topbar-left mono">
          <div class="led" id="led-dot"></div>
          <span>LINUX WORKSTATION // JHONMORENO000</span>
        </div>
        <div class="topbar-right mono">
          FORMACION: <span>SENA ADSO</span> &nbsp;|&nbsp; MEDELLIN, ANTIOQUIA <span>[CO]</span> &nbsp;|&nbsp; GITHUB DESDE <span>2024</span>
        </div>
      </div>

      <div class="left-col">
        <div class="role-badge mono">
          <div class="role-dot"></div>
          <span>ESTUDIANTE ADSO (SENA) · BACKEND · LINUX · CIBERSEGURIDAD</span>
        </div>
        <div class="hero-name mono">JHON ANDERSON<br/>MORENO POSSO</div>
        <div class="hero-subline mono">// ANALISIS Y DESARROLLO DE SOFTWARE · BASES DE DATOS · REDES</div>
        <div class="hero-desc">
          Estudiante de Tecnologia en <strong>Analisis y Desarrollo de Software (ADSO)</strong> en el SENA.
          Construyo proyectos practicos en <strong>Java, TypeScript, C#, Python y SQL</strong>,
          profundizando en entornos <strong>Linux</strong>, Docker y fundamentos de ciberseguridad.
        </div>

        <div class="spec-grid">
          <div class="spec-card" style="--accent: ${pal.accent1}">
            <div class="spec-k mono">FORMACION</div>
            <div class="spec-v mono">SENA ADSO</div>
            <div class="spec-s mono">Medellin, CO</div>
          </div>
          <div class="spec-card" style="--accent: ${pal.accent2}">
            <div class="spec-k mono">TRAYECTORIA</div>
            <div class="spec-v mono">2024 - 2026</div>
            <div class="spec-s mono">8 Proyectos</div>
          </div>
          <div class="spec-card" style="--accent: ${pal.accent3}">
            <div class="spec-k mono">LENGUAJES</div>
            <div class="spec-v mono">JAVA·TS·C#</div>
            <div class="spec-s mono">Python · SQL</div>
          </div>
          <div class="spec-card" style="--accent: ${pal.accent4}">
            <div class="spec-k mono">ENTORNO</div>
            <div class="spec-v mono">LINUX·BASH</div>
            <div class="spec-s mono">Docker · Git</div>
          </div>
        </div>
      </div>

      <div class="hero-coords mono">
        <span>OS: <b>LINUX / BASH</b></span>
        <span>DB: <b>POSTGRES · MYSQL · MONGO</b></span>
        <span>MODO: <b>EN FORMACION</b></span>
      </div>

      <div id="webgl-stage">
        <canvas id="three-canvas" width="510" height="${HEIGHT - 54}"></canvas>
      </div>

      <div class="hud-tag hud-tl mono">TTY1 // FASTFETCH</div>
      <div class="hud-tag hud-tr mono" id="hud-shell">BASH: ACTIVE</div>
      <div class="hud-tag hud-bl mono">KERNEL: LINUX 6.x</div>
      <div class="hud-tag hud-br mono">DOCKER · SSH · GIT</div>
    </div>

    <svg class="chassis-outline" viewBox="0 0 ${WIDTH - 16} ${HEIGHT - 16}" xmlns="http://www.w3.org/2000/svg">
      <path d="M 26,1 L 240,1 L 254,11 L 840,11 L 854,1 L ${WIDTH - 42},1 L ${WIDTH - 17},26 L ${WIDTH - 17},${HEIGHT - 42} L ${WIDTH - 42},${HEIGHT - 17} L 26,${HEIGHT - 17} L 1,${HEIGHT - 42} L 1,26 Z"
            fill="none" stroke="${pal.border}" stroke-width="1.5"/>
      <path id="laser-rail"
            d="M 26,1 L 240,1 L 254,11 L 840,11 L 854,1 L ${WIDTH - 42},1 L ${WIDTH - 17},26 L ${WIDTH - 17},${HEIGHT - 42} L ${WIDTH - 42},${HEIGHT - 17} L 26,${HEIGHT - 17} L 1,${HEIGHT - 42} L 1,26 Z"
            fill="none" stroke="${pal.accent1}" stroke-width="1.6" stroke-opacity="0.72"
            stroke-dasharray="90 220" stroke-dashoffset="0"/>
      <path d="M 26,1 L 78,1" stroke="${pal.accent1}" stroke-width="3"/>
      <path d="M ${WIDTH - 94},1 L ${WIDTH - 42},1" stroke="${pal.accent2}" stroke-width="3"/>
    </svg>
  </div>

  <script type="module">
    import * as THREE from "/three.module.js";

    (function initLinux3D() {
      const W = 510;
      const H = ${HEIGHT - 54};
      const canvas = document.getElementById("three-canvas");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(W, H, false);
      renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = ${isDark ? "1.3" : "1.18"};

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
      camera.position.set(-1.35, 2.25, 6.45);
      camera.lookAt(0.1, 0.05, 0);

      // Studio Lighting
      scene.add(new THREE.AmbientLight(${pal.lightAmb}, ${isDark ? "1.4" : "2.4"}));
      const keyLight = new THREE.DirectionalLight(${pal.light1}, ${isDark ? "2.4" : "2.1"});
      keyLight.position.set(4, 7, 5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(${pal.light2}, ${isDark ? "2.4" : "2.2"});
      rimLight.position.set(-5, 3, -3);
      scene.add(rimLight);

      const frontLight = new THREE.DirectionalLight(0xffffff, ${isDark ? "0.95" : "1.7"});
      frontLight.position.set(0, 3, 6);
      scene.add(frontLight);

      const screenGlow = new THREE.PointLight(${pal.light1}, ${isDark ? "2.2" : "1.0"}, 6);
      screenGlow.position.set(-0.3, 0.55, 1.0);
      scene.add(screenGlow);

      // ================================================================
      // LIVE CANVAS TEXTURE: AUTHENTIC LINUX TERMINAL WITH TUX PENGUIN
      // ================================================================
      const termCanvas = document.createElement("canvas");
      termCanvas.width = 640;
      termCanvas.height = 400;
      const ctx = termCanvas.getContext("2d");
      const termTex = new THREE.CanvasTexture(termCanvas);
      termTex.minFilter = THREE.LinearFilter;
      termTex.magFilter = THREE.LinearFilter;

      const cmds = [
        "uname -sr && whoami",
        "docker ps --format '{{.Names}}'",
        "git log --oneline -n 3",
        "systemctl status postgresql",
      ];

      function drawTux(c, x, y, scale) {
        c.save();
        c.translate(x, y);
        c.scale(scale, scale);

        // Tux outer silhouette (clean geometric vector Tux penguin!)
        c.fillStyle = "#0f172a";
        c.strokeStyle = "${pal.termGreen}";
        c.lineWidth = 3;
        // Body
        c.beginPath();
        c.ellipse(0, 26, 42, 52, 0, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        // Head
        c.beginPath();
        c.arc(0, -34, 30, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // White belly
        c.fillStyle = "#f8fafc";
        c.beginPath();
        c.ellipse(0, 32, 27, 38, 0, 0, Math.PI * 2);
        c.fill();

        // Wings
        c.fillStyle = "#0f172a";
        c.strokeStyle = "${pal.termCyan}";
        c.lineWidth = 2.4;
        c.beginPath();
        c.ellipse(-44, 18, 12, 30, 0.35, 0, Math.PI * 2);
        c.fill(); c.stroke();
        c.beginPath();
        c.ellipse(44, 18, 12, 30, -0.35, 0, Math.PI * 2);
        c.fill(); c.stroke();

        // Eyes
        c.fillStyle = "#ffffff";
        c.beginPath(); c.ellipse(-10, -40, 7.5, 9.5, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(10, -40, 7.5, 9.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#020617";
        c.beginPath(); c.arc(-8, -39, 3.6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(8, -39, 3.6, 0, Math.PI * 2); c.fill();

        // Beak (Amber Linux gold)
        c.fillStyle = "${pal.termAmber}";
        c.beginPath();
        c.moveTo(-12, -26);
        c.quadraticCurveTo(0, -33, 12, -26);
        c.quadraticCurveTo(0, -14, -12, -26);
        c.fill();

        // Feet (Amber Linux gold)
        c.fillStyle = "${pal.termAmber}";
        c.beginPath(); c.ellipse(-20, 78, 17, 9, -0.15, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(20, 78, 17, 9, 0.15, 0, Math.PI * 2); c.fill();

        c.restore();
      }

      function paintTerminal(frameIdx, totalFrames) {
        const t = frameIdx / totalFrames;
        ctx.fillStyle = "${pal.termBg}";
        ctx.fillRect(0, 0, 640, 400);

        // Subtle CRT scanline texture
        ctx.fillStyle = "rgba(0, 229, 255, 0.035)";
        for (let y = 0; y < 400; y += 6) {
          ctx.fillRect(0, y, 640, 2);
        }

        // Top Window Bar (Linux tiling WM style)
        ctx.fillStyle = "#0c1926";
        ctx.fillRect(0, 0, 640, 36);
        ctx.strokeStyle = "${pal.termBorder}";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(640, 36); ctx.stroke();

        // WM dots
        const dots = ["#ef4444", "#f59e0b", "#10b981"];
        dots.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(20 + i * 18, 18, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.font = "bold 14px Consolas, monospace";
        ctx.fillStyle = "${pal.termCyan}";
        ctx.fillText("jhon@linux-adso: ~/proyectos [tty1]", 82, 23);

        // Draw Vector Tux Penguin on Left
        drawTux(ctx, 112, 172, 1.05);

        // Fastfetch real student specs on Right
        const sx = 220;
        ctx.font = "bold 19px Consolas, monospace";
        ctx.fillStyle = "${pal.termGreen}";
        ctx.fillText("jhon@linux-adso", sx, 76);

        ctx.fillStyle = "#334155";
        ctx.fillText("-------------------------", sx, 98);

        const specs = [
          ["OS     ", "GNU/Linux · Bash / Zsh", "${pal.termCyan}"],
          ["Rol    ", "Estudiante SENA ADSO", "${pal.termText}"],
          ["Ciudad ", "Medellin, Colombia", "${pal.termText}"],
          ["Stack  ", "Java 21 · TS · C# · Py", "${pal.termGreen}"],
          ["Datos  ", "PostgreSQL · MySQL · Mongo", "${pal.termCyan}"],
          ["Tools  ", "Docker · Git · GitHub CI", "${pal.termAmber}"],
          ["Enfoque", "Backend & Ciberseguridad", "${pal.termGreen}"],
        ];
        ctx.font = "bold 15px Consolas, monospace";
        specs.forEach(([k, v, col], idx) => {
          const yy = 128 + idx * 27;
          ctx.fillStyle = "${pal.termGreen}";
          ctx.fillText(k + ":", sx, yy);
          ctx.fillStyle = col;
          ctx.fillText(v, sx + 82, yy);
        });

        // Color palette blocks (authentic neofetch/fastfetch touch)
        const swatch = ["#0f172a", "#ef4444", "#00ff88", "#fbbf24", "#00e5ff", "#a855f7", "#38bdf8", "#f8fafc"];
        swatch.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.fillRect(sx + i * 24, 316, 20, 12);
        });

        // Animated live shell prompt at bottom
        const cmdIdx = Math.floor(t * cmds.length) % cmds.length;
        const localPhase = (t * cmds.length) % 1;
        const fullCmd = cmds[cmdIdx];
        const shownChars = Math.min(fullCmd.length, Math.floor(localPhase * (fullCmd.length + 8)));
        const typed = fullCmd.slice(0, shownChars);

        ctx.fillStyle = "#08121b";
        ctx.fillRect(18, 344, 604, 38);
        ctx.strokeStyle = "#1e3a52";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(18, 344, 604, 38);

        ctx.font = "bold 16px Consolas, monospace";
        ctx.fillStyle = "${pal.termGreen}";
        ctx.fillText("jhon@linux:~$", 30, 369);
        ctx.fillStyle = "${pal.termText}";
        ctx.fillText(typed, 166, 369);

        // Blinking block cursor
        if (Math.floor(frameIdx / 4) % 2 === 0) {
          const cw = ctx.measureText(typed).width;
          ctx.fillStyle = "${pal.termGreen}";
          ctx.fillRect(170 + cw, 354, 10, 18);
        }

        // Outer neon border
        ctx.strokeStyle = "${pal.termBorder}";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 636, 396);
        termTex.needsUpdate = true;
      }

      // ================================================================
      // 3D WORKSTATION SCENE
      // ================================================================
      const rig = new THREE.Group();
      rig.position.set(0.08, -0.15, 0);
      scene.add(rig);

      // 1. Isometric Floor Grid + Platform Ring
      const floor = new THREE.Group();
      floor.position.y = -1.25;
      const grid = new THREE.GridHelper(6.6, 16, ${pal.gridColor1}, ${pal.gridColor2});
      grid.material.transparent = true;
      grid.material.opacity = ${isDark ? "0.38" : "0.45"};
      floor.add(grid);

      const ringFloor = new THREE.Mesh(
        new THREE.RingGeometry(2.15, 2.22, 64),
        new THREE.MeshBasicMaterial({ color: ${pal.ringColor}, side: THREE.DoubleSide, transparent: true, opacity: ${isDark ? "0.48" : "0.42"} })
      );
      ringFloor.rotation.x = -Math.PI / 2;
      ringFloor.position.y = 0.02;
      floor.add(ringFloor);
      rig.add(floor);

      // 2. 3D Linux Cyberdeck Laptop / Workstation
      const deckGroup = new THREE.Group();
      deckGroup.position.set(-0.35, -0.58, 0.2);

      const chassisMat = new THREE.MeshPhysicalMaterial({
        color: ${pal.chassisColor},
        metalness: 0.72,
        roughness: 0.25,
        clearcoat: 0.6,
      });
      const trimMat = new THREE.LineBasicMaterial({ color: ${pal.chassisTrim}, transparent: true, opacity: 0.85 });

      // Laptop base deck
      const baseGeo = new THREE.BoxGeometry(2.85, 0.14, 1.92);
      const baseMesh = new THREE.Mesh(baseGeo, chassisMat);
      baseMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), trimMat));
      deckGroup.add(baseMesh);

      // Trackpad
      const padGeo = new THREE.BoxGeometry(0.76, 0.02, 0.42);
      const padMesh = new THREE.Mesh(
        padGeo,
        new THREE.MeshStandardMaterial({ color: ${pal.keyColor}, metalness: 0.4, roughness: 0.3 })
      );
      padMesh.position.set(0, 0.075, 0.62);
      padMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(padGeo), new THREE.LineBasicMaterial({ color: ${pal.keyGlow}, transparent: true, opacity: 0.6 })));
      deckGroup.add(padMesh);

      // 3D Mechanical Keycaps Grid (5 rows x 12 cols)
      const keyMat = new THREE.MeshStandardMaterial({ color: ${pal.keyColor}, metalness: 0.35, roughness: 0.35 });
      const keyGlowMat = new THREE.MeshBasicMaterial({ color: ${pal.keyGlow}, transparent: true, opacity: 0.32 });
      const keyGeo = new THREE.BoxGeometry(0.16, 0.05, 0.14);
      const keyPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.44, 0.96), keyGlowMat);
      keyPlate.rotation.x = -Math.PI / 2;
      keyPlate.position.set(0, 0.073, -0.18);
      deckGroup.add(keyPlate);

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 12; c++) {
          const km = new THREE.Mesh(keyGeo, keyMat);
          km.position.set(-1.08 + c * 0.196, 0.092, -0.56 + r * 0.185);
          deckGroup.add(km);
        }
      }

      // Hinged OLED Display Lid (angled ~104 degrees open)
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.07, -0.92);
      lidPivot.rotation.x = -0.22; // tilted slightly back for ergonomic 3D angle

      const lidGeo = new THREE.BoxGeometry(2.85, 1.82, 0.09);
      const lidMesh = new THREE.Mesh(lidGeo, chassisMat);
      lidMesh.position.set(0, 0.93, 0);
      lidMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(lidGeo), trimMat));
      lidPivot.add(lidMesh);

      // Live Linux Terminal OLED Screen Plane
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.68, 1.66),
        new THREE.MeshBasicMaterial({ map: termTex })
      );
      screenMesh.position.set(0, 0.93, 0.052);
      lidPivot.add(screenMesh);
      deckGroup.add(lidPivot);
      rig.add(deckGroup);

      // 3. Companion 3D Linux Docker Server Tower (Right-Back)
      const tower = new THREE.Group();
      tower.position.set(1.78, 0.06, -0.58);

      const towerGeo = new THREE.BoxGeometry(0.86, 1.98, 1.08);
      const towerMat = new THREE.MeshPhysicalMaterial({
        color: ${pal.serverColor},
        metalness: 0.78,
        roughness: 0.24,
        clearcoat: 0.5,
      });
      const towerMesh = new THREE.Mesh(towerGeo, towerMat);
      towerMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(towerGeo), new THREE.LineBasicMaterial({ color: ${pal.keyGlow}, transparent: true, opacity: 0.75 })));
      tower.add(towerMesh);

      // 4 Glowing Server Blade Slots + Activity LEDs
      const ledMeshes = [];
      const ledCols = [0x00ff88, 0x00e5ff, 0xf59e0b, 0x00ff88];
      for (let i = 0; i < 4; i++) {
        const slot = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 0.26, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x070d14, metalness: 0.5, roughness: 0.4 })
        );
        slot.position.set(0, 0.62 - i * 0.42, 0.54);
        tower.add(slot);

        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.03, 0.05),
          new THREE.MeshBasicMaterial({ color: ledCols[i] })
        );
        strip.position.set(-0.08, 0.62 - i * 0.42, 0.555);
        tower.add(strip);

        const dot = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.07, 0.06),
          new THREE.MeshBasicMaterial({ color: ledCols[i] })
        );
        dot.position.set(0.24, 0.62 - i * 0.42, 0.555);
        tower.add(dot);
        ledMeshes.push(dot);
      }
      rig.add(tower);

      // 4. Subtle Orbiting Linux Kernel Data Halo Ring around the Workstation
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(2.55, 0.014, 10, 96),
        new THREE.MeshBasicMaterial({ color: ${pal.keyGlow}, transparent: true, opacity: ${isDark ? "0.35" : "0.28"} })
      );
      halo.rotation.x = Math.PI * 0.46;
      halo.position.y = -0.35;
      rig.add(halo);

      // 5. Floating Ambient Terminal Particles
      const pCount = 70;
      const pPos = new Float32Array(pCount * 3);
      const pMeta = [];
      let seed = 133799;
      const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < pCount; i++) {
        const r = 1.9 + rand() * 1.4;
        const a = rand() * Math.PI * 2;
        const y = -0.9 + rand() * 2.4;
        pMeta.push({ r, a, y, sp: rand() > 0.5 ? 1 : -1 });
        pPos[i * 3] = Math.cos(a) * r;
        pPos[i * 3 + 1] = y;
        pPos[i * 3 + 2] = Math.sin(a) * r;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      const particles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: ${pal.particleColor}, size: 0.048, transparent: true, opacity: ${isDark ? "0.75" : "0.65"} })
      );
      rig.add(particles);

      const laserRail = document.getElementById("laser-rail");
      const ledDot = document.getElementById("led-dot");
      const hudShell = document.getElementById("hud-shell");
      const shellStates = ["BASH: UNAME -SR", "DOCKER: PS -A", "GIT: LOG -3", "PG17: ACTIVE"];

      window.renderFrame = function (frameIndex, totalFrames) {
        const t = frameIndex / totalFrames;
        const tau = Math.PI * 2 * t;

        // Paint live Linux terminal screen with animated typing & cursor
        paintTerminal(frameIndex, totalFrames);

        // Smooth cinematic 3D parallax camera orbit (keeps OLED screen crisp & front-facing!)
        camera.position.x = -1.15 + Math.sin(tau) * 0.85;
        camera.position.y = 2.05 + Math.cos(tau) * 0.22;
        camera.position.z = 6.25 + Math.cos(tau) * 0.28;
        camera.lookAt(0.18, 0.08, -0.05);

        // Gentle hover on workstation & server tower
        deckGroup.position.y = -0.58 + Math.sin(tau) * 0.08;
        tower.position.y = 0.06 + Math.cos(tau) * 0.06;
        halo.rotation.z = tau;

        // Blinking server LEDs
        ledMeshes.forEach((m, idx) => {
          const on = Math.sin(tau * 2 + idx * 1.5) > -0.2;
          m.scale.setScalar(on ? 1.0 : 0.45);
        });

        // Orbiting particles
        const arr = pGeo.attributes.position.array;
        for (let i = 0; i < pCount; i++) {
          const m = pMeta[i];
          const a = m.a + tau * m.sp;
          arr[i * 3] = Math.cos(a) * m.r;
          arr[i * 3 + 1] = m.y + Math.sin(tau + i) * 0.08;
          arr[i * 3 + 2] = Math.sin(a) * m.r;
        }
        pGeo.attributes.position.needsUpdate = true;

        hudShell.textContent = shellStates[Math.floor(t * shellStates.length) % shellStates.length];
        laserRail.setAttribute("stroke-dashoffset", String(-Math.round(t * 310)));
        ledDot.style.opacity = String(0.55 + 0.45 * Math.abs(Math.cos(tau)));

        renderer.render(scene, camera);
      };

      window.renderFrame(0, ${FRAMES});
      window.__READY__ = true;
    })();
  </script>
</body>
</html>`;
}

function startStaticServer(threeDir, htmlMap) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === "/dark") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(htmlMap.dark);
      } else if (req.url === "/light") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(htmlMap.light);
      } else if (req.url === "/three.module.js" || req.url === "/three.core.js") {
        const fp = path.join(threeDir, req.url.slice(1));
        res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
        res.end(fs.readFileSync(fp));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function renderTheme(browser, baseUrl, theme) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/${theme}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__READY__ === true, { timeout: 15000 });

  const rgbaFrames = [];
  const delays = [];

  for (let i = 0; i < FRAMES; i++) {
    await page.evaluate((idx, total) => window.renderFrame(idx, total), i, FRAMES);
    const pngBuf = await page.screenshot({ type: "png" });
    if (i === 8 && PREVIEW_DIR) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `hero-linux-${theme}.png`), pngBuf);
    }
    const decoded = UPNG.decode(pngBuf);
    rgbaFrames.push(UPNG.toRGBA8(decoded)[0]);
    delays.push(FRAME_DELAY_MS);
  }

  await page.close();

  const apngBuffer = Buffer.from(UPNG.encode(rgbaFrames, WIDTH, HEIGHT, 256, delays));
  const outPath = path.join(ASSETS_DIR, `hero-3d-${theme}.png`);
  fs.writeFileSync(outPath, apngBuffer);
  const sizeKB = (apngBuffer.length / 1024).toFixed(1);
  console.log(`Rendered ${outPath} (${WIDTH}x${HEIGHT}, ${FRAMES} frames, ${sizeKB} KB)`);
}

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  if (PREVIEW_DIR) fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const chromePath = findChrome();
  const threeDir = getThreeBuildDir();
  const htmlMap = { dark: buildHtml("dark"), light: buildHtml("light") };
  const { server, port } = await startStaticServer(threeDir, htmlMap);
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    await renderTheme(browser, baseUrl, "dark");
    await renderTheme(browser, baseUrl, "light");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
