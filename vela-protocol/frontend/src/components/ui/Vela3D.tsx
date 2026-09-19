import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Vela3DProps = { className?: string; active?: boolean; celebration?: boolean };

const material = (color: number, metalness = .15, roughness = .34) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

export const Vela3D: React.FC<Vela3DProps> = ({ className = '', active = false, celebration = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    camera.position.set(0, .15, 9.5);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const robot = new THREE.Group();
    scene.add(robot);
    const violet = material(0x5d63d8, .28, .27);
    const violetLight = material(0x8993ff, .2, .24);
    const navy = material(0x10162f, .4, .2);
    const joint = material(0x1d2344, .3, .38);
    const cyan = new THREE.MeshStandardMaterial({ color: 0x6ef4e1, emissive: 0x20bfae, emissiveIntensity: 2, metalness: .1, roughness: .2 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xcba45d, emissive: 0x4b3210, emissiveIntensity: .2, metalness: .65, roughness: .24 });

    const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, position: [number, number, number], scale: [number, number, number]) => {
      const item = new THREE.Mesh(geometry, mat);
      item.position.set(...position); item.scale.set(...scale); item.castShadow = true; robot.add(item); return item;
    };

    mesh(new THREE.SphereGeometry(1, 40, 28), violet, [0, 1.15, 0], [1.25, .92, .92]);
    mesh(new THREE.SphereGeometry(1, 40, 28), navy, [0, 1.13, .69], [.92, .57, .17]);
    mesh(new THREE.BoxGeometry(.17, .13, .08), cyan, [-.31, 1.15, .87], [1, 1, 1]);
    mesh(new THREE.BoxGeometry(.12, .25, .08), cyan, [.34, 1.15, .87], [1, 1, 1]);
    mesh(new THREE.CylinderGeometry(.32, .32, .18, 32), violetLight, [-1.12, 1.15, 0], [1, 1, 1]).rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(.32, .32, .18, 32), violetLight, [1.12, 1.15, 0], [1, 1, 1]).rotation.z = Math.PI / 2;
    mesh(new THREE.TorusGeometry(.29, .045, 12, 36), cyan, [-1.22, 1.15, 0], [1, 1, 1]).rotation.y = Math.PI / 2;
    mesh(new THREE.TorusGeometry(.29, .045, 12, 36), cyan, [1.22, 1.15, 0], [1, 1, 1]).rotation.y = Math.PI / 2;

    mesh(new THREE.SphereGeometry(1, 32, 24), violet, [0, -.35, 0], [.75, .95, .56]);
    mesh(new THREE.SphereGeometry(1, 24, 18), joint, [0, .25, 0], [.35, .18, .3]);
    const vLeft = mesh(new THREE.BoxGeometry(.13, .58, .07), cyan, [-.13, -.26, .58], [1, 1, 1]); vLeft.rotation.z = -.48;
    const vRight = mesh(new THREE.BoxGeometry(.13, .58, .07), cyan, [.13, -.26, .58], [1, 1, 1]); vRight.rotation.z = .48;
    mesh(new THREE.SphereGeometry(1, 20, 16), brass, [0, -.03, .64], [.08, .08, .05]);

    const limb = (x: number) => {
      mesh(new THREE.SphereGeometry(1, 22, 16), violetLight, [x * .82, .02, 0], [.28, .31, .3]);
      const arm = mesh(new THREE.CylinderGeometry(.15, .18, .72, 20), joint, [x * 1.02, -.45, 0], [1, 1, 1]); arm.rotation.z = x * -.22;
      mesh(new THREE.SphereGeometry(1, 22, 16), violet, [x * 1.12, -.88, 0], [.3, .38, .29]);
      mesh(new THREE.SphereGeometry(1, 22, 16), violetLight, [x * .4, -1.22, 0], [.36, .48, .35]);
      mesh(new THREE.CylinderGeometry(.2, .25, .76, 22), violet, [x * .46, -1.78, 0], [1, 1, 1]);
      mesh(new THREE.SphereGeometry(1, 22, 16), violet, [x * .48, -2.18, .12], [.37, .24, .58]);
      mesh(new THREE.BoxGeometry(.18, .05, .11), cyan, [x * .48, -2.25, .64], [1, 1, 1]);
    };
    limb(-1); limb(1);

    scene.add(new THREE.HemisphereLight(0xeaf8ff, 0x1b1730, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 3.1); key.position.set(4, 6, 6); scene.add(key);
    const rim = new THREE.PointLight(0x5ff2dc, 7, 12); rim.position.set(-3, 1, 3); scene.add(rim);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const clock = new THREE.Clock();
    let frame = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const render = () => {
      const t = clock.getElapsedTime();
      const pace = active ? 1.7 : .65;
      robot.rotation.y = reduceMotion ? -.12 : Math.sin(t * pace) * (celebration ? .5 : .28);
      robot.rotation.x = reduceMotion ? 0 : Math.sin(t * .45) * .025;
      robot.position.y = reduceMotion ? .35 : .35 + Math.sin(t * (active ? 2.4 : 1.25)) * .07;
      if (celebration) robot.rotation.z = Math.sin(t * 2.2) * .04;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      robot.traverse(item => { if (item instanceof THREE.Mesh) { item.geometry.dispose(); const mats = Array.isArray(item.material) ? item.material : [item.material]; mats.forEach(mat => mat.dispose()); } });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [active, celebration]);

  return <div ref={mountRef} className={`vela-3d ${className}`} role="img" aria-label="Animated 3D Vela robot" />;
};
