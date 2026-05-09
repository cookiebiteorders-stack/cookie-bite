"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { morphFragmentShader, morphVertexShader } from "@/lib/morph/morph-shaders";

export type MorphDirection = 1 | -1;

type MorphCanvasProps = {
  dataUrlA: string;
  dataUrlB: string;
  direction: MorphDirection;
  /** إحداثيات نقرة المستخدم: x,y من 0–1 من زاوية العرض (أعلى = 0 لـ y) */
  originNorm?: { x: number; y: number };
  onComplete: () => void;
  /** Optional subtle ripple click */
  playSound?: boolean;
};

function loadTextureFromDataUrl(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

function playRippleSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(420, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.35);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.36);
    setTimeout(() => ctx.close(), 500);
  } catch {
    /* ignore */
  }
}

/** تحويل y من نمط CSS (أعلى الشاشة = 0) إلى مساحة vUv للنسيج مع flipY */
function originCssToUv(originNorm: { x: number; y: number }): THREE.Vector2 {
  return new THREE.Vector2(originNorm.x, 1 - originNorm.y);
}

export function MorphCanvas({
  dataUrlA,
  dataUrlB,
  direction,
  originNorm,
  onComplete,
  playSound = false,
}: MorphCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let mesh: THREE.Mesh | null = null;
    let tex0: THREE.Texture | null = null;
    let tex1: THREE.Texture | null = null;
    let raf = 0;
    const uniforms = {
      uTex0: { value: null as THREE.Texture | null },
      uTex1: { value: null as THREE.Texture | null },
      uProgress: { value: 0 },
      uDirection: { value: direction },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uZoom: { value: 0 },
      uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
    };

    let tl: gsap.core.Timeline | null = null;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      cancelAnimationFrame(raf);
      if (tl) tl.kill();
      if (mesh) {
        scene?.remove(mesh);
        (mesh.geometry as THREE.BufferGeometry).dispose();
      }
      material?.dispose();
      tex0?.dispose();
      tex1?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        mount.removeChild(renderer.domElement);
      }
      onComplete();
    };

    (async () => {
      if (playSound) playRippleSound();

      tex0 = await loadTextureFromDataUrl(dataUrlA);
      tex1 = await loadTextureFromDataUrl(dataUrlB);
      uniforms.uTex0.value = tex0;
      uniforms.uTex1.value = tex1;

      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      uniforms.uResolution.value.set(w, h);

      const ox = originNorm?.x ?? 0.5;
      const oyCss = originNorm?.y ?? 0.08;
      uniforms.uOrigin.value.copy(originCssToUv({ x: ox, y: oyCss }));

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: morphVertexShader,
        fragmentShader: morphFragmentShader,
        glslVersion: THREE.GLSL1,
        depthTest: false,
        depthWrite: false,
      });

      mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), material);
      scene.add(mesh);

      const clock = new THREE.Clock();
      const tick = () => {
        uniforms.uTime.value = clock.getElapsedTime();
        if (renderer && scene && camera) renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      tl = gsap.timeline({
        defaults: { ease: "cubic-bezier(0.45, 0.02, 0.12, 1)" },
        onComplete: finish,
      });

      tl.to(uniforms.uProgress, { value: 1, duration: 1.15 }, 0).to(
        uniforms.uZoom,
        {
          value: 0.02,
          duration: 0.58,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1,
        },
        0,
      );
    })().catch(() => {
      finish();
    });

    const onResize = () => {
      if (!renderer || !mount) return;
      const rw = mount.clientWidth || window.innerWidth;
      const rh = mount.clientHeight || window.innerHeight;
      renderer.setSize(rw, rh, false);
      uniforms.uResolution.value.set(rw, rh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      doneRef.current = true;
      cancelAnimationFrame(raf);
      if (tl) tl.kill();
      if (mesh) {
        scene?.remove(mesh);
        (mesh.geometry as THREE.BufferGeometry).dispose();
      }
      material?.dispose();
      tex0?.dispose();
      tex1?.dispose();
      if (renderer && mount.contains(renderer.domElement)) {
        renderer.dispose();
        renderer.forceContextLoss();
        mount.removeChild(renderer.domElement);
      }
    };
  }, [dataUrlA, dataUrlB, direction, originNorm?.x, originNorm?.y, onComplete, playSound]);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
