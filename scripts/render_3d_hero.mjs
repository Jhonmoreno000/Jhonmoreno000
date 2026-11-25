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
const FRAMES = 48;
const FRAME_DELAY_MS = 85; // ~11.8 fps, 4.08s ultra-calm, smooth breathing loop

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
        accent2: "#1793d1", // Authentic Arch Linux Blue
        accent3: "#f59e0b",
        accent4: "#38bdf8",
        textMain: "#f8fafc",
        textSub: "#94a3b8",
        textDim: "#64748b",
        pillBg: "rgba(6, 20, 32, 0.85)",
        pillBorder: "rgba(23, 147, 209, 0.45)",
        cardBg: "rgba(7, 15, 24, 0.82)",
        cardBorder: "rgba(30, 48, 68, 0.9)",
        dotColor: "rgba(23, 147, 209, 0.14)",
        headerBg: "rgba(6, 12, 20, 0.88)",
        glowA: "rgba(0, 255, 136, 0.08)",
        glowB: "rgba(23, 147, 209, 0.16)",
        nameGrad: "linear-gradient(92deg, #ffffff 0%, #e2e8f0 48%, #38bdf8 80%, #00ff88 100%)",
        specLabelBg: "rgba(4, 12, 20, 0.90)",
        // 3D Laptop Materials (Matte Anodized Carbon / ThinkPad-inspired)
        bodyColor: 0x1a232e,
        bodyLidColor: 0x151d27,
        wellColor: 0x0b1017,
        keyColor: 0x121923,
        keyHighlight: 0x1793d1,
        hingeColor: 0x3b4a5e,
        padColor: 0x131b26,
        portColor: 0x05080d,
        trimEdge: 0x1793d1,
        gridMain: 0x1793d1,
        gridSub: 0x0d1e2e,
        shadowOp: 0.55,
        lightAmb: 0x64748b,
        lightKey: 0xe2f1ff,
        lightRim: 0x1793d1,
        lightFill: 0x00ff88,
      }
    : {
        bgOuter: "#eef2f6",
        bgInner1: "#f8fafc",
        bgInner2: "#eef4f9",
        border: "#cbd5e1",
        accent1: "#059669",
        accent2: "#1793d1", // Authentic Arch Linux Blue
        accent3: "#d97706",
        accent4: "#0284c7",
        textMain: "#0f172a",
        textSub: "#475569",
        textDim: "#64748b",
        pillBg: "rgba(255, 255, 255, 0.94)",
        pillBorder: "rgba(23, 147, 209, 0.42)",
        cardBg: "rgba(255, 255, 255, 0.92)",
        cardBorder: "rgba(203, 213, 225, 0.95)",
        dotColor: "rgba(15, 23, 42, 0.08)",
        headerBg: "rgba(241, 245, 249, 0.94)",
        glowA: "rgba(5, 150, 105, 0.07)",
        glowB: "rgba(23, 147, 209, 0.11)",
        nameGrad: "linear-gradient(92deg, #0f172a 0%, #1e293b 52%, #1793d1 80%, #059669 100%)",
        specLabelBg: "rgba(255, 255, 255, 0.94)",
        // 3D Laptop Materials (Brushed Space-Gray Aluminum)
        bodyColor: 0x94a3b8,
        bodyLidColor: 0x64748b,
        wellColor: 0x334155,
        keyColor: 0x1e293b,
        keyHighlight: 0x1793d1,
        hingeColor: 0x475569,
        padColor: 0x7b8ba1,
        portColor: 0x0f172a,
        trimEdge: 0x475569,
        gridMain: 0x1793d1,
        gridSub: 0xcbd5e1,
        shadowOp: 0.22,
        lightAmb: 0xf1f5f9,
        lightKey: 0xffffff,
        lightRim: 0x38bdf8,
        lightFill: 0x10b981,
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
    right: -10px;
    top: 20px;
    width: 560px;
    height: 380px;
    background: radial-gradient(circle, ${pal.glowB} 0%, transparent 66%);
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
    color: ${pal.accent2};
  }
  .led {
    width: 8px;
    height: 8px;
    background: ${pal.accent2};
    box-shadow: 0 0 8px ${pal.accent2};
  }
  .topbar-right {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: ${pal.textSub};
  }
  .topbar-right span {
    color: ${pal.accent1};
  }

  .left-col {
    position: absolute;
    top: 54px;
    left: 34px;
    width: 546px;
    z-index: 10;
  }
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 5px 13px;
    background: ${pal.pillBg};
    border: 1px solid ${pal.pillBorder};
    border-left: 3px solid ${pal.accent2};
    font-size: 9.8px;
    font-weight: 800;
    letter-spacing: 1.3px;
    color: ${pal.accent2};
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
    max-width: 528px;
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
    width: 536px;
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
    color: ${pal.accent2};
  }

  /* Right WebGL 3D Laptop Viewport (dedicated space, centered cleanly) */
  #webgl-stage {
    position: absolute;
    top: 38px;
    right: 0;
    width: 525px;
    height: ${HEIGHT - 54}px;
    z-index: 5;
  }
  canvas#three-canvas {
    width: 525px;
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
  .hud-tl { top: 50px; right: 364px; --c: ${pal.accent2}; }
  .hud-tr { top: 50px; right: 24px; --c: ${pal.accent1}; }
  .hud-bl { bottom: 16px; right: 342px; --c: ${pal.accent2}; }
  .hud-br { bottom: 16px; right: 24px; --c: ${pal.accent3}; }
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
          <span>ARCH LINUX WORKSTATION // JHONMORENO000</span>
        </div>
        <div class="topbar-right mono">
          FORMACION: <span>SENA ADSO</span> &nbsp;|&nbsp; MEDELLIN, ANTIOQUIA <span>[CO]</span> &nbsp;|&nbsp; GITHUB DESDE <span>2024</span>
        </div>
      </div>

      <div class="left-col">
        <div class="role-badge mono">
          <div class="role-dot"></div>
          <span>ESTUDIANTE ADSO (SENA) · BACKEND · ARCH LINUX · CIBERSEGURIDAD</span>
        </div>
        <div class="hero-name mono">JHON ANDERSON<br/>MORENO POSSO</div>
        <div class="hero-subline mono">// ANALISIS Y DESARROLLO DE SOFTWARE · BASES DE DATOS · REDES</div>
        <div class="hero-desc">
          Estudiante de Tecnologia en <strong>Analisis y Desarrollo de Software (ADSO)</strong> en el SENA.
          Construyo proyectos practicos en <strong>Java, TypeScript, C#, Python y SQL</strong>,
          profundizando en entornos <strong>Arch Linux</strong>, Docker y fundamentos de ciberseguridad.
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
            <div class="spec-v mono">ARCH LINUX</div>
            <div class="spec-s mono">Docker · Git</div>
          </div>
        </div>
      </div>

      <div class="hero-coords mono">
        <span>DISTRO: <b>ARCH LINUX x86_64</b></span>
        <span>DB: <b>POSTGRES · MYSQL · MONGO</b></span>
        <span>MODO: <b>EN FORMACION</b></span>
      </div>

      <div id="webgl-stage">
        <canvas id="three-canvas" width="525" height="${HEIGHT - 54}"></canvas>
      </div>

      <div class="hud-tag hud-tl mono">ARCH // FASTFETCH</div>
      <div class="hud-tag hud-tr mono">KERNEL: 6.x-ARCH</div>
      <div class="hud-tag hud-bl mono">ZSH · NEOVIM · GIT</div>
      <div class="hud-tag hud-br mono">DOCKER · SSH</div>
    </div>

    <svg class="chassis-outline" viewBox="0 0 ${WIDTH - 16} ${HEIGHT - 16}" xmlns="http://www.w3.org/2000/svg">
      <path d="M 26,1 L 240,1 L 254,11 L 840,11 L 854,1 L ${WIDTH - 42},1 L ${WIDTH - 17},26 L ${WIDTH - 17},${HEIGHT - 42} L ${WIDTH - 42},${HEIGHT - 17} L 26,${HEIGHT - 17} L 1,${HEIGHT - 42} L 1,26 Z"
            fill="none" stroke="${pal.border}" stroke-width="1.5"/>
      <path id="laser-rail"
            d="M 26,1 L 240,1 L 254,11 L 840,11 L 854,1 L ${WIDTH - 42},1 L ${WIDTH - 17},26 L ${WIDTH - 17},${HEIGHT - 42} L ${WIDTH - 42},${HEIGHT - 17} L 26,${HEIGHT - 17} L 1,${HEIGHT - 42} L 1,26 Z"
            fill="none" stroke="${pal.accent2}" stroke-width="1.5" stroke-opacity="0.65"
            stroke-dasharray="85 240" stroke-dashoffset="0"/>
      <path d="M 26,1 L 78,1" stroke="${pal.accent2}" stroke-width="3"/>
      <path d="M ${WIDTH - 94},1 L ${WIDTH - 42},1" stroke="${pal.accent1}" stroke-width="3"/>
    </svg>
  </div>

  <script type="module">
    import * as THREE from "/three.module.js";

    (function initArchLaptop3D() {
      const W = 525;
      const H = ${HEIGHT - 54};
      const canvas = document.getElementById("three-canvas");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(W, H, false);
      renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = ${isDark ? "1.26" : "1.12"};

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);

      // Clean Studio Three-Point Lighting (no harsh neon clutter)
      scene.add(new THREE.AmbientLight(${pal.lightAmb}, ${isDark ? "1.55" : "2.35"}));

      const keyLight = new THREE.DirectionalLight(${pal.lightKey}, ${isDark ? "2.1" : "2.0"});
      keyLight.position.set(3.5, 6.5, 5.5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(${pal.lightRim}, ${isDark ? "2.2" : "1.6"});
      rimLight.position.set(-5.0, 3.5, -3.5);
      scene.add(rimLight);

      const fillLight = new THREE.DirectionalLight(${pal.lightFill}, ${isDark ? "0.95" : "0.85"});
      fillLight.position.set(4.0, 2.0, -2.5);
      scene.add(fillLight);

      const screenGlow = new THREE.PointLight(0x1793d1, ${isDark ? "1.45" : "0.5"}, 5.5);
      screenGlow.position.set(0, 0.85, 0.9);
      scene.add(screenGlow);

      // ================================================================
      // HI-DPI 1280x800 ARCH LINUX OLED SCREEN TEXTURE (RAZOR-SHARP)
      // ================================================================
      const termCanvas = document.createElement("canvas");
      termCanvas.width = 1280;
      termCanvas.height = 800;
      const ctx = termCanvas.getContext("2d");
      const termTex = new THREE.CanvasTexture(termCanvas);
      termTex.minFilter = THREE.LinearMipmapLinearFilter;
      termTex.magFilter = THREE.LinearFilter;
      termTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // Authentic Official Arch Linux Crystal/A Logo Path (Normalized to 200x200 box)
      function drawArchLogo(c, cx, cy, size) {
        c.save();
        c.translate(cx, cy);
        const s = size / 200;
        c.scale(s, s);

        // Soft ambient glow behind Arch emblem
        const grd = c.createRadialGradient(0, 10, 8, 0, 10, 118);
        grd.addColorStop(0, "rgba(23, 147, 209, 0.32)");
        grd.addColorStop(1, "rgba(23, 147, 209, 0)");
        c.fillStyle = grd;
        c.beginPath();
        c.arc(0, 10, 118, 0, Math.PI * 2);
        c.fill();

        // Main Arch Linux geometric "A" shape (faithful silhouette with curved side notches + arched inner cutout)
        const grad = c.createLinearGradient(-80, -95, 80, 95);
        grad.addColorStop(0, "#38bdf8");
        grad.addColorStop(0.45, "#1793d1");
        grad.addColorStop(1, "#0d6fa3");

        c.fillStyle = grad;
        c.beginPath();
        // Peak
        c.moveTo(0, -96);
        // Right upper edge curving into the signature right-hand notch
        c.bezierCurveTo(10, -72, 20, -48, 30, -24);
        c.quadraticCurveTo(14, -31, -2, -33);
        c.quadraticCurveTo(18, -24, 34, -13);
        // Outer right leg sweeping down to sharp point
        c.bezierCurveTo(54, 28, 76, 66, 94, 92);
        // Bottom right arch into inner rounded cavity
        c.bezierCurveTo(64, 75, 42, 65, 22, 62);
        c.bezierCurveTo(25, 48, 25, 34, 18, 20);
        c.bezierCurveTo(12, 8, 5, 4, 0, 4);
        c.bezierCurveTo(-5, 4, -12, 8, -18, 20);
        c.bezierCurveTo(-25, 34, -25, 48, -22, 62);
        // Bottom left arch sweeping to outer left point
        c.bezierCurveTo(-42, 65, -64, 75, -94, 92);
        // Outer left leg up to signature left-hand upper notch
        c.bezierCurveTo(-72, 58, -50, 18, -32, -20);
        c.quadraticCurveTo(-18, -12, -4, -9);
        c.quadraticCurveTo(-20, -18, -28, -30);
        c.bezierCurveTo(-18, -54, -9, -76, 0, -96);
        c.closePath();
        c.fill();

        // Crisp subtle edge highlight on left facet (gives real 3D vector depth)
        c.strokeStyle = "rgba(186, 230, 253, 0.55)";
        c.lineWidth = 2.2;
        c.stroke();

        // Subtle label underneath Arch mark
        c.font = "bold 24px Consolas, monospace";
        c.fillStyle = "#38bdf8";
        c.textAlign = "center";
        c.fillText("ARCH LINUX", 0, 134);
        c.restore();
      }

      const cmdText = "fastfetch && docker ps --format '{{.Names}}'";

      function paintArchScreen(frameIdx, totalFrames) {
        const t = frameIdx / totalFrames;

        // Deep Arch OLED background
        const bgGrad = ctx.createLinearGradient(0, 0, 1280, 800);
        bgGrad.addColorStop(0, "#070c12");
        bgGrad.addColorStop(1, "#0b141f");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1280, 800);

        // Minimalist Hyprland / Waybar Top Status Bar
        ctx.fillStyle = "#0e1824";
        ctx.fillRect(0, 0, 1280, 52);
        ctx.fillStyle = "#1793d1";
        ctx.fillRect(0, 50, 1280, 2);

        // Workspaces pills on top-left
        [1, 2, 3, 4].forEach((n, i) => {
          const active = n === 1;
          ctx.fillStyle = active ? "#1793d1" : "#152436";
          ctx.fillRect(24 + i * 44, 12, 34, 28);
          ctx.font = "bold 18px Consolas, monospace";
          ctx.fillStyle = active ? "#040a10" : "#94a3b8";
          ctx.textAlign = "center";
          ctx.fillText(String(n), 41 + i * 44, 32);
        });

        ctx.textAlign = "center";
        ctx.font = "bold 19px Consolas, monospace";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText("jhon@archlinux — ~/proyectos [zsh]", 595, 33);

        ctx.textAlign = "right";
        ctx.fillStyle = "#00ff88";
        ctx.fillText("6.12-ARCH  |  BAT 100%", 1252, 33);
        ctx.textAlign = "left";

        // Kitty Terminal Window Frame inside Hyprland desktop
        ctx.fillStyle = "rgba(8, 15, 24, 0.92)";
        ctx.fillRect(28, 76, 1224, 696);
        ctx.strokeStyle = "#1793d1";
        ctx.lineWidth = 3;
        ctx.strokeRect(28, 76, 1224, 696);

        // Draw Official Arch Linux Logo on Left Side
        drawArchLogo(ctx, 250, 355, 270);

        // Fastfetch System Output on Right Side (large crisp font for 100% readability!)
        const sx = 468;
        ctx.font = "bold 36px Consolas, monospace";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("jhon", sx, 158);
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("@", sx + 86, 158);
        ctx.fillStyle = "#00ff88";
        ctx.fillText("archlinux", sx + 112, 158);

        ctx.fillStyle = "#264059";
        ctx.fillRect(sx, 178, 720, 3);

        const specs = [
          ["OS     ", "Arch Linux x86_64", "#38bdf8"],
          ["Kernel ", "6.12.x-arch1-1", "#e2e8f0"],
          ["Rol    ", "Estudiante SENA ADSO", "#00ff88"],
          ["Ciudad ", "Medellin, Colombia", "#e2e8f0"],
          ["Shell  ", "zsh 5.9 / bash", "#38bdf8"],
          ["Stack  ", "Java 21 · TS · C# · Python", "#00ff88"],
          ["Datos  ", "PostgreSQL · MySQL · Mongo", "#38bdf8"],
          ["Tools  ", "Docker · Git · Neovim", "#fbbf24"],
        ];

        ctx.font = "bold 27px Consolas, monospace";
        specs.forEach(([k, v, col], idx) => {
          const yy = 228 + idx * 50;
          ctx.fillStyle = "#1793d1";
          ctx.fillText(k, sx, yy);
          ctx.fillStyle = "#475569";
          ctx.fillText(":", sx + 116, yy);
          ctx.fillStyle = col;
          ctx.fillText(v, sx + 144, yy);
        });

        // Authentic fastfetch 8-color palette strip
        const swatches = ["#1e293b", "#ef4444", "#00ff88", "#fbbf24", "#1793d1", "#a855f7", "#38bdf8", "#f8fafc"];
        swatches.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(sx + i * 54, 616, 46, 22);
        });

        // Calm Typing Command Bar at Bottom
        ctx.fillStyle = "#060d15";
        ctx.fillRect(58, 676, 1164, 68);
        ctx.strokeStyle = "#1e3a52";
        ctx.lineWidth = 2;
        ctx.strokeRect(58, 676, 1164, 68);

        // Smooth single-cycle typing then steady hold (no hectic blinking/jumping)
        const shown = t < 0.55
          ? Math.max(8, Math.floor((t / 0.55) * cmdText.length))
          : cmdText.length;
        const typed = cmdText.slice(0, shown);

        ctx.font = "bold 27px Consolas, monospace";
        ctx.fillStyle = "#1793d1";
        ctx.fillText("[jhon@arch ~]$", 82, 720);
        ctx.fillStyle = "#f1f5f9";
        ctx.fillText(typed, 326, 720);

        // Calm smooth cursor pulse
        const curAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.cos(t * Math.PI * 6));
        const cw = ctx.measureText(typed).width;
        ctx.fillStyle = "rgba(0, 255, 136, " + curAlpha.toFixed(2) + ")";
        ctx.fillRect(334 + cw, 694, 16, 32);

        termTex.needsUpdate = true;
      }

      // ================================================================
      // DETAILED 3D LAPTOP HARDWARE MODEL (CENTERED, NO TOWER, NO PARTICLES)
      // ================================================================
      const studioGroup = new THREE.Group();
      studioGroup.position.set(0, -0.35, 0);
      scene.add(studioGroup);

      // Subtle Clean Minimalist Studio Base Grid + Realistic Contact Shadow
      const grid = new THREE.GridHelper(6.4, 16, ${pal.gridMain}, ${pal.gridSub});
      grid.position.y = -0.78;
      grid.material.transparent = true;
      grid.material.opacity = ${isDark ? "0.28" : "0.38"};
      studioGroup.add(grid);

      // Soft Contact Shadow Texture beneath Laptop
      const shCanvas = document.createElement("canvas");
      shCanvas.width = 256; shCanvas.height = 256;
      const shCtx = shCanvas.getContext("2d");
      const shGrad = shCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
      shGrad.addColorStop(0, "rgba(0,0,0,0.85)");
      shGrad.addColorStop(0.65, "rgba(0,0,0,0.35)");
      shGrad.addColorStop(1, "rgba(0,0,0,0)");
      shCtx.fillStyle = shGrad;
      shCtx.fillRect(0, 0, 256, 256);
      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 3.0),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCanvas), transparent: true, opacity: ${pal.shadowOp} })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.set(0, -0.77, 0.12);
      studioGroup.add(shadowPlane);

      // Laptop Assembly Root (resting firmly on studio surface — zero vertical bobbing!)
      const laptop = new THREE.Group();
      laptop.position.set(0, -0.68, 0.12);
      studioGroup.add(laptop);

      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: ${pal.bodyColor},
        metalness: 0.78,
        roughness: 0.28,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
      });
      const lidMat = new THREE.MeshPhysicalMaterial({
        color: ${pal.bodyLidColor},
        metalness: 0.80,
        roughness: 0.26,
        clearcoat: 0.55,
      });
      const wellMat = new THREE.MeshStandardMaterial({
        color: ${pal.wellColor},
        metalness: 0.4,
        roughness: 0.55,
      });
      const hingeMat = new THREE.MeshStandardMaterial({
        color: ${pal.hingeColor},
        metalness: 0.9,
        roughness: 0.2,
      });
      const edgeLineMat = new THREE.LineBasicMaterial({
        color: ${pal.trimEdge},
        transparent: true,
        opacity: ${isDark ? "0.48" : "0.35"},
      });

      // 1. Machined Unibody Lower Deck (2-tier tapered chassis + rubber feet)
      const deckW = 3.36, deckD = 2.22, deckH = 0.115;
      const mainBaseGeo = new THREE.BoxGeometry(deckW, deckH, deckD);
      const mainBase = new THREE.Mesh(mainBaseGeo, bodyMat);
      mainBase.add(new THREE.LineSegments(new THREE.EdgesGeometry(mainBaseGeo), edgeLineMat));
      laptop.add(mainBase);

      // Tapered slim bottom sub-belly plate
      const bellyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(deckW - 0.14, 0.04, deckD - 0.14),
        wellMat
      );
      bellyMesh.position.set(0, -0.072, 0);
      laptop.add(bellyMesh);

      // 4 subtle rubber anti-slip feet
      const footGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
      [[-1.38, -0.86], [1.38, -0.86], [-1.38, 0.86], [1.38, 0.86]].forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(footGeo, wellMat);
        foot.position.set(fx, -0.095, fz);
        laptop.add(foot);
      });

      // Front center thumb-opening notch + tiny front status LED
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.045, 0.04), wellMat);
      notch.position.set(0, 0.02, deckD / 2 + 0.002);
      laptop.add(notch);

      const frontLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.016, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      frontLed.position.set(1.22, 0.0, deckD / 2 + 0.005);
      laptop.add(frontLed);

      // Side I/O Ports (USB-C / HDMI / Audio Jack along left & right edges)
      const portMat = new THREE.MeshStandardMaterial({ color: ${pal.portColor}, metalness: 0.3, roughness: 0.6 });
      // Left edge: 2x USB-C + HDMI + 3.5mm
      [-0.68, -0.44].forEach((pz) => {
        const usbc = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.032, 0.11), portMat);
        usbc.position.set(-deckW / 2 - 0.003, -0.005, pz);
        laptop.add(usbc);
      });
      const hdmi = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.17), portMat);
      hdmi.position.set(-deckW / 2 - 0.003, -0.005, -0.14);
      laptop.add(hdmi);
      const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 12), portMat);
      jack.rotation.z = Math.PI / 2;
      jack.position.set(-deckW / 2 - 0.003, -0.005, 0.14);
      laptop.add(jack);
      // Right edge: USB-A + USB-C + Kensington lock slot
      const usba = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.044, 0.17), portMat);
      usba.position.set(deckW / 2 + 0.003, -0.005, -0.52);
      laptop.add(usba);
      const usbcR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.032, 0.11), portMat);
      usbcR.position.set(deckW / 2 + 0.003, -0.005, -0.26);
      laptop.add(usbcR);

      // 2. Recessed Keyboard Well + Side Micro-Perforated Speaker Grilles
      const wellMesh = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.02, 1.06), wellMat);
      wellMesh.position.set(0, deckH / 2 + 0.001, -0.22);
      laptop.add(wellMesh);

      // Subtle cool Arch-Blue keyboard backlight glow plane
      const kbBacklight = new THREE.Mesh(
        new THREE.PlaneGeometry(2.62, 1.0),
        new THREE.MeshBasicMaterial({ color: ${pal.keyHighlight}, transparent: true, opacity: ${isDark ? "0.26" : "0.14"} })
      );
      kbBacklight.rotation.x = -Math.PI / 2;
      kbBacklight.position.set(0, deckH / 2 + 0.012, -0.22);
      laptop.add(kbBacklight);

      // Left & Right Stereo Speaker Grilles
      [-1.50, 1.50].forEach((sx) => {
        for (let i = 0; i < 11; i++) {
          const slit = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.022), wellMat);
          slit.position.set(sx, deckH / 2 + 0.003, -0.66 + i * 0.088);
          laptop.add(slit);
        }
      });

      // 3. Realistic Staggered QWERTY Mechanical Keycap Layout (Variable Key Widths!)
      const keyMat = new THREE.MeshStandardMaterial({ color: ${pal.keyColor}, metalness: 0.25, roughness: 0.42 });
      const keyTopAccentMat = new THREE.MeshStandardMaterial({ color: 0x1793d1, metalness: 0.4, roughness: 0.3 });

      function addKeyRow(zPos, rowH, widths, startX = -1.27) {
        let cx = startX;
        const gap = 0.026;
        for (const item of widths) {
          const w = typeof item === "number" ? item : item.w;
          const special = typeof item === "object" && item.accent;
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, 0.036, rowH),
            special ? keyTopAccentMat : keyMat
          );
          mesh.position.set(cx + w / 2, deckH / 2 + 0.024, zPos);
          laptop.add(mesh);
          cx += w + gap;
        }
      }

      // Row 0: Slim Function Row (Esc + F1..F12 + Power Button)
      addKeyRow(-0.67, 0.095, [
        { w: 0.16, accent: true },
        0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.155, 0.19
      ]);
      // Row 1: Number Row + wide Backspace
      addKeyRow(-0.515, 0.135, [0.145, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.295]);
      // Row 2: Tab + QWERTY + Slash
      addKeyRow(-0.345, 0.135, [0.23, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.21]);
      // Row 3: Caps + ASDFGHJKL + Wide Enter (Arch Blue accent!)
      addKeyRow(-0.175, 0.135, [0.275, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, { w: 0.34, accent: true }]);
      // Row 4: Left Shift + ZXCVBNM + Right Shift
      addKeyRow(-0.005, 0.135, [0.355, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.44]);
      // Row 5: Ctrl + Super + Alt + Wide Spacebar + Alt + Arrow cluster
      addKeyRow(0.165, 0.135, [0.21, 0.17, 0.19, 1.05, 0.18, 0.18, 0.145, 0.145, 0.145]);

      // Iconic subtle ThinkPad-style Arch-Cyan TrackPoint nub centered between G-H-B
      const trackpoint = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.04, 0.042, 16),
        new THREE.MeshStandardMaterial({ color: 0x1793d1, emissive: 0x0d5c85, emissiveIntensity: 0.6, roughness: 0.35 })
      );
      trackpoint.position.set(-0.08, deckH / 2 + 0.032, -0.10);
      laptop.add(trackpoint);

      // 4. Precision Glass Trackpad with Machined Bevel Rim
      const padGeo = new THREE.BoxGeometry(1.06, 0.016, 0.60);
      const padMesh = new THREE.Mesh(
        padGeo,
        new THREE.MeshPhysicalMaterial({ color: ${pal.padColor}, metalness: 0.55, roughness: 0.15, clearcoat: 0.9 })
      );
      padMesh.position.set(0, deckH / 2 + 0.005, 0.67);
      padMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(padGeo), edgeLineMat));
      laptop.add(padMesh);

      // 5. Dual Machined Metallic Barrel Hinges
      const hingeGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.48, 20);
      [-1.02, 1.02].forEach((hx) => {
        const hMesh = new THREE.Mesh(hingeGeo, hingeMat);
        hMesh.rotation.z = Math.PI / 2;
        hMesh.position.set(hx, deckH / 2 + 0.035, -deckD / 2 + 0.06);
        laptop.add(hMesh);
      });

      // 6. Ultra-Thin Display Lid + Top Webcam Array + HiDPI Arch OLED Screen
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, deckH / 2 + 0.035, -deckD / 2 + 0.06);
      lidPivot.rotation.x = -0.17; // Clean ergonomic ~100 deg open angle

      const lidW = 3.36, lidH = 2.16, lidT = 0.075;
      const lidGeo = new THREE.BoxGeometry(lidW, lidH, lidT);
      const lidMesh = new THREE.Mesh(lidGeo, lidMat);
      lidMesh.position.set(0, lidH / 2 + 0.02, 0);
      lidMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(lidGeo), edgeLineMat));
      lidPivot.add(lidMesh);

      // Glossy Dark Inner Screen Glass Bezel
      const bezelMesh = new THREE.Mesh(
        new THREE.BoxGeometry(lidW - 0.08, lidH - 0.08, 0.014),
        new THREE.MeshStandardMaterial({ color: 0x05080d, metalness: 0.3, roughness: 0.2 })
      );
      bezelMesh.position.set(0, lidH / 2 + 0.02, lidT / 2 + 0.004);
      lidPivot.add(bezelMesh);

      // Top Center Webcam Lens + Tiny Privacy Indicator LED
      const camLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 })
      );
      camLens.rotation.x = Math.PI / 2;
      camLens.position.set(0, lidH - 0.035, lidT / 2 + 0.012);
      lidPivot.add(camLens);

      const camLed = new THREE.Mesh(
        new THREE.CircleGeometry(0.009, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ff88 })
      );
      camLed.position.set(0.065, lidH - 0.035, lidT / 2 + 0.016);
      lidPivot.add(camLed);

      // HiDPI 1280x800 Arch Linux OLED Display Plane
      const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(lidW - 0.22, lidH - 0.24),
        new THREE.MeshBasicMaterial({ map: termTex })
      );
      screenMesh.position.set(0, lidH / 2 + 0.01, lidT / 2 + 0.014);
      lidPivot.add(screenMesh);

      laptop.add(lidPivot);

      const laserRail = document.getElementById("laser-rail");
      const ledDot = document.getElementById("led-dot");

      // ================================================================
      // ULTRA-CALM STUDIO MOTION (NO PARTICLES, NO JERKY SWING, NO BOBBING)
      // ================================================================
      window.renderFrame = function (frameIndex, totalFrames) {
        const t = frameIndex / totalFrames;
        const tau = Math.PI * 2 * t;

        paintArchScreen(frameIndex, totalFrames);

        // Gentle, calm studio showcase parallax showing FULL sculpted laptop (palmrest, trackpad, ports & shadow!)
        camera.position.x = -0.68 + Math.sin(tau) * 0.24;
        camera.position.y = 2.38 + Math.cos(tau) * 0.03;
        camera.position.z = 6.95 + Math.cos(tau) * 0.06;
        camera.lookAt(0.0, 0.02, -0.02);

        // Subtle perimeter rail & top LED breathing
        laserRail.setAttribute("stroke-dashoffset", String(-Math.round(t * 325)));
        ledDot.style.opacity = String(0.68 + 0.32 * Math.cos(tau));

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
    if (i === 18 && PREVIEW_DIR) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `hero-arch-${theme}.png`), pngBuf);
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
