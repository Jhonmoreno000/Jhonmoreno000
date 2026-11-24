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
const FRAME_DELAY_MS = 55; // ~18.2 fps, 2.2s silky seamless 360-degree loop

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
        accent4: "#ff3366",
        textMain: "#f8fafc",
        textSub: "#94a3b8",
        textDim: "#475569",
        pillBg: "rgba(6, 20, 32, 0.85)",
        pillBorder: "rgba(0, 255, 136, 0.35)",
        cardBg: "rgba(7, 15, 24, 0.78)",
        cardBorder: "rgba(30, 48, 68, 0.9)",
        dotColor: "rgba(0, 229, 255, 0.14)",
        headerBg: "rgba(6, 12, 20, 0.88)",
        glowA: "rgba(0, 255, 136, 0.13)",
        glowB: "rgba(0, 229, 255, 0.15)",
        nameGrad: "linear-gradient(92deg, #ffffff 0%, #e2e8f0 45%, #00ff88 78%, #00e5ff 100%)",
        threeBg: 0x050a10,
        coreColor: 0x0b1d2e,
        coreEmissive: 0x004d3a,
        wireColor: 0x00ff88,
        ring1Color: 0x00e5ff,
        ring2Color: 0x00ff88,
        ring3Color: 0x38bdf8,
        satColor: 0x0c2438,
        satEdge: 0x00e5ff,
        gridColor1: 0x00e5ff,
        gridColor2: 0x0e2236,
        particleColor: 0x00ff88,
        light1: 0x00ff88,
        light2: 0x00e5ff,
        lightAmb: 0x335577,
        specLabelBg: "rgba(4, 12, 20, 0.86)",
      }
    : {
        bgOuter: "#eef2f6",
        bgInner1: "#f8fafc",
        bgInner2: "#eef4f9",
        border: "#cbd5e1",
        accent1: "#059669",
        accent2: "#0284c7",
        accent3: "#d97706",
        accent4: "#e11d48",
        textMain: "#0f172a",
        textSub: "#475569",
        textDim: "#64748b",
        pillBg: "rgba(255, 255, 255, 0.92)",
        pillBorder: "rgba(5, 150, 105, 0.35)",
        cardBg: "rgba(255, 255, 255, 0.88)",
        cardBorder: "rgba(203, 213, 225, 0.95)",
        dotColor: "rgba(15, 23, 42, 0.09)",
        headerBg: "rgba(241, 245, 249, 0.92)",
        glowA: "rgba(5, 150, 105, 0.10)",
        glowB: "rgba(2, 132, 199, 0.12)",
        nameGrad: "linear-gradient(92deg, #0f172a 0%, #1e293b 50%, #059669 80%, #0284c7 100%)",
        threeBg: 0xf4f7fb,
        coreColor: 0x334155,
        coreEmissive: 0x064e3b,
        wireColor: 0x059669,
        ring1Color: 0x0284c7,
        ring2Color: 0x059669,
        ring3Color: 0x475569,
        satColor: 0xf8fafc,
        satEdge: 0x0284c7,
        gridColor1: 0x0284c7,
        gridColor2: 0xcbd5e1,
        particleColor: 0x059669,
        light1: 0x34d399,
        light2: 0x38bdf8,
        lightAmb: 0xe2e8f0,
        specLabelBg: "rgba(255, 255, 255, 0.92)",
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
    width: 480px;
    height: 360px;
    background: radial-gradient(circle, ${pal.glowA} 0%, transparent 70%);
    pointer-events: none;
  }
  .glow-r {
    position: absolute;
    right: -40px;
    top: 10px;
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

  /* Top tactical bar */
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
    letter-spacing: 1.8px;
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
    letter-spacing: 1.4px;
    color: ${pal.textSub};
  }
  .topbar-right span {
    color: ${pal.accent2};
  }

  /* Left identity column */
  .left-col {
    position: absolute;
    top: 56px;
    left: 36px;
    width: 565px;
    z-index: 10;
  }
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 5px 14px;
    background: ${pal.pillBg};
    border: 1px solid ${pal.pillBorder};
    border-left: 3px solid ${pal.accent1};
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.8px;
    color: ${pal.accent1};
    margin-bottom: 14px;
  }
  .role-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${pal.accent1};
  }
  .hero-name {
    font-size: 38px;
    font-weight: 900;
    letter-spacing: 1.6px;
    line-height: 1.06;
    background: ${pal.nameGrad};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
  }
  .hero-subline {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 1.5px;
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

  /* 4 hardware specification cards */
  .spec-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    width: 548px;
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
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: ${pal.textDim};
    margin-bottom: 4px;
  }
  .spec-v {
    font-size: 14px;
    font-weight: 900;
    color: ${pal.textMain};
    letter-spacing: 0.4px;
    margin-bottom: 2px;
  }
  .spec-s {
    font-size: 8.5px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: 0.5px;
  }

  /* Bottom precision footer inside hero */
  .hero-coords {
    position: absolute;
    left: 36px;
    bottom: 16px;
    display: flex;
    gap: 18px;
    font-size: 9.2px;
    font-weight: 700;
    letter-spacing: 1.3px;
    color: ${pal.textDim};
    z-index: 10;
  }
  .hero-coords b {
    color: ${pal.accent1};
  }

  /* Right WebGL 3D Viewport */
  #webgl-stage {
    position: absolute;
    top: 38px;
    right: 0;
    width: 500px;
    height: ${HEIGHT - 54}px;
    z-index: 5;
  }
  canvas#three-canvas {
    width: 500px;
    height: ${HEIGHT - 54}px;
    display: block;
  }

  /* Floating 3D HUD reticles over WebGL viewport */
  .hud-tag {
    position: absolute;
    padding: 4px 10px;
    background: ${pal.specLabelBg};
    border: 1px solid ${pal.border};
    border-left: 3px solid var(--c);
    font-size: 8.8px;
    font-weight: 800;
    letter-spacing: 1.4px;
    color: var(--c);
    z-index: 15;
  }
  .hud-tl { top: 52px; right: 344px; --c: ${pal.accent2}; }
  .hud-tr { top: 52px; right: 26px; --c: ${pal.accent1}; }
  .hud-bl { bottom: 18px; right: 318px; --c: ${pal.accent3}; }
  .hud-br { bottom: 18px; right: 26px; --c: ${pal.accent4}; }
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
          <span>ZERO-TRUST KERNEL // 3D COMMAND INTERFACE</span>
        </div>
        <div class="topbar-right mono">
          NODE: <span>JHONMORENO000</span> &nbsp;|&nbsp; MEDELLIN, CO <span>[UTC-5]</span> &nbsp;|&nbsp; CLEARANCE: <span>ASVS-L2</span>
        </div>
      </div>

      <div class="left-col">
        <div class="role-badge mono">
          <div class="role-dot"></div>
          <span>CYBERSECURITY ARCHITECTURE · BACKEND · DEVSECOPS</span>
        </div>
        <div class="hero-name mono">JHON ANDERSON<br/>MORENO POSSO</div>
        <div class="hero-subline mono">// SYSTEMS ENGINEER · RED/BLUE DEFENSE · LOCAL AI SAST</div>
        <div class="hero-desc">
          Ingenieria de infraestructuras backend blindadas, motores transaccionales
          <strong>PostgreSQL ACID</strong> y estaciones de auditoria <strong>SAST con IA offline</strong>
          (Qwen 2.5 Coder 7B) verificadas criptograficamente.
        </div>

        <div class="spec-grid">
          <div class="spec-card" style="--accent: ${pal.accent1}">
            <div class="spec-k mono">RUNTIMES</div>
            <div class="spec-v mono">JAVA·TS·C#</div>
            <div class="spec-s mono">21 · 5.3 · .NET10</div>
          </div>
          <div class="spec-card" style="--accent: ${pal.accent2}">
            <div class="spec-k mono">DATA LAYER</div>
            <div class="spec-v mono">PG 16 / 17</div>
            <div class="spec-s mono">SERIALIZABLE</div>
          </div>
          <div class="spec-card" style="--accent: ${pal.accent3}">
            <div class="spec-k mono">LOCAL SAST</div>
            <div class="spec-v mono">QWEN 7B</div>
            <div class="spec-s mono">ZERO LEAK AI</div>
          </div>
          <div class="spec-card" style="--accent: ${pal.accent4}">
            <div class="spec-k mono">PERIMETER</div>
            <div class="spec-v mono">WAF // L7</div>
            <div class="spec-s mono">HMAC-SHA256</div>
          </div>
        </div>
      </div>

      <div class="hero-coords mono">
        <span>PROTOCOL: <b>TLS_1.3 + OIDC</b></span>
        <span>CONTAINERS: <b>DOCKER UID 10001</b></span>
        <span>RENDER: <b>3D WEBGL</b></span>
      </div>

      <div id="webgl-stage">
        <canvas id="three-canvas" width="500" height="${HEIGHT - 54}"></canvas>
      </div>

      <div class="hud-tag hud-tl mono">AEGIS_CORE // 3D</div>
      <div class="hud-tag hud-tr mono" id="hud-angle">ORBIT: 000 DEG</div>
      <div class="hud-tag hud-bl mono">SAST_ENGINE: ARMED</div>
      <div class="hud-tag hud-br mono">THREATS: MITIGATED</div>
    </div>

    <!-- Crisp Die-Cut Vector Perimeter Overlay -->
    <svg class="chassis-outline" viewBox="0 0 ${WIDTH - 16} ${HEIGHT - 16}" xmlns="http://www.w3.org/2000/svg">
      <path d="M 26,1 L 240,1 L 254,11 L 840,11 L 854,1 L ${WIDTH - 42},1 L ${WIDTH - 17},26 L ${WIDTH - 17},${HEIGHT - 42} L ${WIDTH - 42},${HEIGHT - 17} L 26,${HEIGHT - 17} L 1,${HEIGHT - 42} L 1,26 Z"
            fill="none" stroke="${pal.border}" stroke-width="1.5"/>
      <path id="laser-rail"
            d="M 26,1 L 240,1 L 254,11 L 840,11 L 854,1 L ${WIDTH - 42},1 L ${WIDTH - 17},26 L ${WIDTH - 17},${HEIGHT - 42} L ${WIDTH - 42},${HEIGHT - 17} L 26,${HEIGHT - 17} L 1,${HEIGHT - 42} L 1,26 Z"
            fill="none" stroke="${pal.accent1}" stroke-width="1.6" stroke-opacity="0.72"
            stroke-dasharray="90 220" stroke-dashoffset="0"/>
      <!-- Precision Corner Calibration Marks -->
      <path d="M 26,1 L 78,1" stroke="${pal.accent1}" stroke-width="3"/>
      <path d="M ${WIDTH - 94},1 L ${WIDTH - 42},1" stroke="${pal.accent2}" stroke-width="3"/>
    </svg>
  </div>

  <script type="module">
    import * as THREE from "/three.module.js";
    (function initThree() {
      const canvas = document.getElementById("three-canvas");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(500, ${HEIGHT - 54}, false);
      renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = ${isDark ? "1.35" : "1.15"};

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 500 / ${HEIGHT - 54}, 0.1, 100);
      camera.position.set(0, 1.55, 7.85);
      camera.lookAt(0, -0.08, 0);

      // Lighting rig
      scene.add(new THREE.AmbientLight(${pal.lightAmb}, ${isDark ? "1.35" : "2.6"}));

      const keyLight = new THREE.DirectionalLight(${pal.light1}, ${isDark ? "3.0" : "2.8"});
      keyLight.position.set(4, 6, 5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(${pal.light2}, ${isDark ? "2.8" : "2.6"});
      rimLight.position.set(-5, 3, -4);
      scene.add(rimLight);

      const frontFill = new THREE.DirectionalLight(0xffffff, ${isDark ? "0.9" : "1.6"});
      frontFill.position.set(0, 2, 6);
      scene.add(frontFill);

      const bottomLight = new THREE.PointLight(${pal.light2}, ${isDark ? "3.4" : "1.8"}, 12);
      bottomLight.position.set(0, -3, 2);
      scene.add(bottomLight);

      // Root group for balanced centered framing
      const rig = new THREE.Group();
      rig.position.set(0.05, 0.08, 0);
      rig.scale.setScalar(0.88);
      scene.add(rig);

      // 1. Isometric Floor Holographic Base Grid
      const floorGroup = new THREE.Group();
      floorGroup.position.y = -1.65;
      const gridHelper = new THREE.GridHelper(6.2, 16, ${pal.gridColor1}, ${pal.gridColor2});
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = ${isDark ? "0.35" : "0.42"};
      floorGroup.add(gridHelper);

      const baseRingGeo = new THREE.RingGeometry(1.55, 1.62, 64);
      const baseRingMat = new THREE.MeshBasicMaterial({
        color: ${pal.ring1Color},
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ${isDark ? "0.55" : "0.45"},
      });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.rotation.x = -Math.PI / 2;
      baseRing.position.y = 0.02;
      floorGroup.add(baseRing);

      const baseRing2 = new THREE.Mesh(
        new THREE.RingGeometry(2.05, 2.08, 64),
        new THREE.MeshBasicMaterial({
          color: ${pal.ring2Color},
          side: THREE.DoubleSide,
          transparent: true,
          opacity: ${isDark ? "0.38" : "0.35"},
        })
      );
      baseRing2.rotation.x = -Math.PI / 2;
      baseRing2.position.y = 0.02;
      floorGroup.add(baseRing2);
      rig.add(floorGroup);

      // 2. Central Zero-Trust Aegis Core (Solid Metallic Icosahedron + Glowing Cage + Inner Octahedron)
      const coreGroup = new THREE.Group();
      const icoGeo = new THREE.IcosahedronGeometry(1.02, 0);
      const icoMat = new THREE.MeshPhysicalMaterial({
        color: ${pal.coreColor},
        emissive: ${pal.coreEmissive},
        emissiveIntensity: ${isDark ? "0.95" : "0.45"},
        metalness: 0.78,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        flatShading: true,
      });
      const icoMesh = new THREE.Mesh(icoGeo, icoMat);
      coreGroup.add(icoMesh);

      const wireGeo = new THREE.IcosahedronGeometry(1.06, 0);
      const wireMat = new THREE.MeshBasicMaterial({
        color: ${pal.wireColor},
        wireframe: true,
        transparent: true,
        opacity: ${isDark ? "0.85" : "0.75"},
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      coreGroup.add(wireMesh);

      // Inner crystal energy octahedron visible via outer translucent cage
      const outerShellGeo = new THREE.OctahedronGeometry(1.38, 0);
      const outerShellEdges = new THREE.EdgesGeometry(outerShellGeo);
      const outerShellLine = new THREE.LineSegments(
        outerShellEdges,
        new THREE.LineBasicMaterial({ color: ${pal.ring1Color}, transparent: true, opacity: ${isDark ? "0.55" : "0.52"} })
      );
      coreGroup.add(outerShellLine);
      rig.add(coreGroup);

      // 3. Three Interlocking Precision Gyroscope Rings
      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(1.78, 0.032, 16, 96),
        new THREE.MeshStandardMaterial({
          color: ${pal.ring1Color},
          emissive: ${pal.ring1Color},
          emissiveIntensity: ${isDark ? "0.75" : "0.3"},
          metalness: 0.85,
          roughness: 0.2,
        })
      );
      ring1.rotation.x = Math.PI * 0.34;
      rig.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.08, 0.022, 14, 96),
        new THREE.MeshStandardMaterial({
          color: ${pal.ring2Color},
          emissive: ${pal.ring2Color},
          emissiveIntensity: ${isDark ? "0.7" : "0.3"},
          metalness: 0.85,
          roughness: 0.2,
        })
      );
      ring2.rotation.x = -Math.PI * 0.28;
      ring2.rotation.y = Math.PI * 0.22;
      rig.add(ring2);

      // Segmented Outer Technical Halo (dashed arcs built as individual torus segments)
      const haloGroup = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Mesh(
          new THREE.TorusGeometry(2.36, 0.018, 10, 28, Math.PI / 4.2),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? ${pal.ring1Color} : ${pal.ring2Color},
            transparent: true,
            opacity: ${isDark ? "0.7" : "0.6"},
          })
        );
        seg.rotation.z = (i * Math.PI) / 3;
        haloGroup.add(seg);
      }
      haloGroup.rotation.x = Math.PI * 0.42;
      rig.add(haloGroup);

      // 4. Four Orbiting Holographic Crystal Satellite Nodes + Energy Tether Beams
      const satGroup = new THREE.Group();
      const satNodes = [];
      const satColors = [${pal.wireColor}, ${pal.ring1Color}, 0xf59e0b, 0xff3366];
      for (let i = 0; i < 4; i++) {
        const nodeWrap = new THREE.Group();
        const crystalGeo = new THREE.OctahedronGeometry(0.24, 0);
        const crystalMat = new THREE.MeshPhysicalMaterial({
          color: ${pal.satColor},
          emissive: satColors[i],
          emissiveIntensity: ${isDark ? "0.55" : "0.28"},
          metalness: 0.78,
          roughness: 0.15,
          clearcoat: 1.0,
          flatShading: true,
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(crystalGeo),
          new THREE.LineBasicMaterial({ color: satColors[i] })
        );
        crystal.add(edges);
        nodeWrap.add(crystal);

        // Energy tether line back to core
        const tetherGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1, 0, 0),
        ]);
        const tetherMat = new THREE.LineBasicMaterial({
          color: satColors[i],
          transparent: true,
          opacity: ${isDark ? "0.42" : "0.35"},
        });
        const tether = new THREE.Line(tetherGeo, tetherMat);
        satGroup.add(tether);

        satGroup.add(nodeWrap);
        satNodes.push({ wrap: nodeWrap, mesh: crystal, tether, idx: i });
      }
      rig.add(satGroup);

      // 5. Orbiting 3D Photon Data Field (deterministic pseudo-random so reproducible)
      const pCount = 110;
      const pPositions = new Float32Array(pCount * 3);
      const pMeta = [];
      let seed = 4201337;
      function rand() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      }
      for (let i = 0; i < pCount; i++) {
        const radius = 1.65 + rand() * 1.45;
        const angle = rand() * Math.PI * 2;
        const y = (rand() - 0.5) * 2.6;
        const speed = (rand() > 0.5 ? 1 : -1);
        pMeta.push({ radius, angle, y, speed });
        pPositions[i * 3] = Math.cos(angle) * radius;
        pPositions[i * 3 + 1] = y;
        pPositions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({
        color: ${pal.particleColor},
        size: 0.055,
        transparent: true,
        opacity: ${isDark ? "0.85" : "0.75"},
      });
      const particles = new THREE.Points(pGeo, pMat);
      rig.add(particles);

      const laserRail = document.getElementById("laser-rail");
      const hudAngle = document.getElementById("hud-angle");
      const ledDot = document.getElementById("led-dot");

      // Deterministic frame renderer (t in [0, 1) => exact 2*PI seamless loop!)
      window.renderFrame = function (frameIndex, totalFrames) {
        const t = frameIndex / totalFrames;
        const tau = Math.PI * 2 * t;

        // Core harmonic rotation (exact periodic loop)
        icoMesh.rotation.y = tau;
        icoMesh.rotation.x = Math.sin(tau) * 0.32;
        wireMesh.rotation.y = tau;
        wireMesh.rotation.x = Math.sin(tau) * 0.32;
        outerShellLine.rotation.y = -tau;
        outerShellLine.rotation.z = Math.cos(tau) * 0.25;

        // Vertical subtle float
        coreGroup.position.y = Math.sin(tau) * 0.14;

        // Gyroscope rings harmonic rotation
        ring1.rotation.z = tau;
        ring1.rotation.y = Math.sin(tau) * 0.22;
        ring2.rotation.z = -tau;
        ring2.rotation.x = -Math.PI * 0.28 + Math.cos(tau) * 0.18;
        haloGroup.rotation.z = tau;

        // Floor subtle pulse
        baseRing.scale.setScalar(1 + Math.sin(tau) * 0.035);
        floorGroup.rotation.y = tau * 0.25; // Quarter-turn symmetry matches 4-fold grid!

        // Orbiting crystal satellites + laser tethers to core
        for (const s of satNodes) {
          const a = tau + (s.idx * Math.PI) / 2;
          const r = 2.28;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a * 2 + s.idx) * 0.42;
          const sz = Math.sin(a) * r * 0.72;
          s.wrap.position.set(sx, sy, sz);
          s.mesh.rotation.y = -a * 2;
          s.mesh.rotation.x = Math.sin(tau + s.idx) * 0.45;
          const tArr = s.tether.geometry.attributes.position.array;
          tArr[0] = 0; tArr[1] = coreGroup.position.y; tArr[2] = 0;
          tArr[3] = sx; tArr[4] = sy; tArr[5] = sz;
          s.tether.geometry.attributes.position.needsUpdate = true;
        }

        // Orbiting photon particles
        const pos = pGeo.attributes.position.array;
        for (let i = 0; i < pCount; i++) {
          const m = pMeta[i];
          const a = m.angle + tau * m.speed;
          pos[i * 3] = Math.cos(a) * m.radius;
          pos[i * 3 + 1] = m.y + Math.sin(tau + i) * 0.09;
          pos[i * 3 + 2] = Math.sin(a) * m.radius;
        }
        pGeo.attributes.position.needsUpdate = true;

        // Sync perimeter HUD laser & angle readout
        const deg = String(Math.round(t * 360) % 360).padStart(3, "0");
        hudAngle.textContent = "ORBIT: " + deg + " DEG";
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
    await page.evaluate(
      (idx, total) => window.renderFrame(idx, total),
      i,
      FRAMES
    );
    const pngBuf = await page.screenshot({ type: "png" });
    if (i === 5 && PREVIEW_DIR) {
      fs.writeFileSync(path.join(PREVIEW_DIR, `hero-preview-${theme}.png`), pngBuf);
    }
    const decoded = UPNG.decode(pngBuf);
    const rgba = UPNG.toRGBA8(decoded)[0];
    rgbaFrames.push(rgba);
    delays.push(FRAME_DELAY_MS);
  }

  await page.close();

  // Encode seamless adaptive APNG (crisp look, frame-delta cropped, fast GitHub load)
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
