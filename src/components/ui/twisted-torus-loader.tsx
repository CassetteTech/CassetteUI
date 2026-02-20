'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import * as THREE from 'three';
import { BackButton } from '@/components/ui/back-button';
import styles from './twisted-torus-loader.module.css';

interface TwistedTorusLoaderProps {
  isDesktop?: boolean;
}

export const TwistedTorusLoader: React.FC<TwistedTorusLoaderProps> = ({ 
  isDesktop = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    donut: THREE.Mesh;
    shape: THREE.TorusGeometry;
  } | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isThreeLoaded, setIsThreeLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });

    const canvasSize = isDesktop ? 240 : 200;
    renderer.setSize(canvasSize, canvasSize);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 500;

    // Create twisted torus
    const shape = new THREE.TorusGeometry(70, 20, 60, 160);
    const material = new THREE.MeshPhongMaterial({
      color: 0xED2748, // Your brand red
      shininess: 30,
      opacity: 0.9,
      transparent: true
    });
    const donut = new THREE.Mesh(shape, material);
    scene.add(donut);

    // Lighting setup
    const lightTop = new THREE.DirectionalLight(0xFFFFFF, 0.4);
    lightTop.position.set(0, 200, 0);
    lightTop.castShadow = true;
    scene.add(lightTop);

    const frontTop = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    frontTop.position.set(0, 0, 300);
    frontTop.castShadow = true;
    scene.add(frontTop);

    scene.add(new THREE.AmbientLight(0xF8F0DE, 0.3)); // Your brand cream

    sceneRef.current = { scene, camera, donut, shape };

    // Twist function
    function twist(geometry: THREE.TorusGeometry, amount: number) {
      const quaternion = new THREE.Quaternion();
      const vertices = geometry.attributes.position.array;
      
      for(let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        quaternion.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          (Math.PI / 180) * (x / amount)
        );
        
        const vertex = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        vertex.applyQuaternion(quaternion);
        
        vertices[i] = vertex.x;
        vertices[i + 1] = vertex.y;
        vertices[i + 2] = vertex.z;
      }
      geometry.attributes.position.needsUpdate = true;
    }

    let mat = Math.PI;
    const speed = Math.PI / 120;
    let forwards = 1;

    // Animation loop
    const render = () => {
      if (!sceneRef.current || !rendererRef.current) return;

      const { scene, camera, donut, shape } = sceneRef.current;

      donut.rotation.x -= speed * forwards;
      mat = mat - speed;

      if(mat <= 0) {
        mat = Math.PI;
        forwards = forwards * -1;
      }

      twist(shape, (mat >= Math.PI / 2 ? -120 : 120) * forwards);

      rendererRef.current.render(scene, camera);
      animationRef.current = requestAnimationFrame(render);
    };

    render();
    
    // Mark Three.js as loaded after first render
    setIsThreeLoaded(true);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [isDesktop]);

  return (
    <div className="fixed inset-0 z-50">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />
      
      {/* Header Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-4 pb-6 px-3">
        <div className="flex items-center justify-between">
          <BackButton className="pointer-events-none opacity-50" />
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Loader Container */}
      <div className={styles.loaderContainer}>
          {/* Loading Text with Logo */}
          <div className={styles.loadingSection}>
            <div className={styles.logoContainer}>
              <Image
                src="/images/cassette_logo.png"
                alt="Cassette Logo"
                width={32}
                height={32}
                className={styles.logo}
              />
            </div>
            <div className={styles.loadingText}>
              <span>Converting</span>
              <div className={styles.dots}>
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            </div>
          </div>

          {/* Canvas Container */}
          <div className={styles.canvasContainer}>
            <canvas 
              ref={canvasRef}
              className={`${styles.canvas} ${isThreeLoaded ? styles.loaded : styles.loading}`}
              width={isDesktop ? 240 : 200}
              height={isDesktop ? 240 : 200}
            />
            
            {/* Fallback loader while Three.js initializes */}
            {!isThreeLoaded && (
              <div className={styles.fallbackLoader}>
                <div className={styles.fallbackSpinner} />
              </div>
            )}
          </div>
        </div>
    </div>
  );
};