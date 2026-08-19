'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlameHairstyleAnchorSystem } from '@/lib/anchors/flame_anchors';

const SKIN = '#5a3a26';
const SKIN_DARK = '#3d2517';
const HAIR_DEFAULT = '#1a110b';
const CLAY_COLOR = '#9e9e9e';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface HeadModelProps {
  hairstyleId: string;
  hairstyleColor?: string;
  lineUpCutoff?: number;
  isAutoRotate?: boolean;
  modelUrl?: string;
  isClayMode?: boolean;
  strictModel?: boolean;
}

export function HeadModel({
  hairstyleId,
  hairstyleColor = HAIR_DEFAULT,
  lineUpCutoff = 50,
  isAutoRotate = false,
  modelUrl,
  isClayMode = false,
  strictModel = true,
}: HeadModelProps) {
  const headGroupRef = useRef<THREE.Group>(null);
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  useEffect(() => {
    if (!modelUrl) {
      setLoadedScene(null);
      setModelState('idle');
      return;
    }

    let cancelled = false;
    setLoadedScene(null);
    setModelState('loading');
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        const scene = gltf.scene;
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && isClayMode) {
            (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
              color: CLAY_COLOR,
              roughness: 0.85,
              metalness: 0.05,
            });
          }
        });
        setLoadedScene(scene);
        setModelState('loaded');
      },
      undefined,
      (error) => {
        if (cancelled) return;
        console.error('[HeadModel] Generated GLB could not be loaded:', error);
        setLoadedScene(null);
        setModelState('error');
      }
    );

    return () => {
      cancelled = true;
    };
  }, [modelUrl, isClayMode]);

  useFrame((_, delta) => {
    if (isAutoRotate && headGroupRef.current) headGroupRef.current.rotation.y += delta * 0.3;
  });

  const hairColor = isClayMode ? '#555555' : hairstyleColor || HAIR_DEFAULT;
  const isBald = hairstyleId === 'bald';
  const renderProceduralBase = !loadedScene && (!modelUrl || !strictModel);
  const renderHair = !isBald && (!strictModel || !modelUrl || modelState === 'loaded');

  const afroClusters = useMemo(() => {
    const random = mulberry32(7);
    return Array.from({ length: 42 }).map(() => {
      const theta = random() * Math.PI * 2;
      const phi = random() * (Math.PI / 2.15);
      const radius = 0.98 + random() * 0.1;
      return {
        pos: [
          radius * Math.sin(phi) * Math.cos(theta),
          1.32 + radius * Math.cos(phi) * 0.92,
          radius * Math.sin(phi) * Math.sin(theta) * 0.96,
        ] as [number, number, number],
        radius: 0.16 + random() * 0.13,
      };
    });
  }, []);

  const anchorTransform = useMemo(
    () => FlameHairstyleAnchorSystem.calculateHairstyleTransform(
      { headWidth: 1.0, headDepth: 1.0, skullHeight: 1.0 },
      lineUpCutoff,
      hairstyleId
    ),
    [lineUpCutoff, hairstyleId]
  );

  return (
    <group ref={headGroupRef} position={[0, -0.55, 0]}>
      {loadedScene ? (
        <primitive object={loadedScene} scale={[1, 1, 1]} position={[0, 0, 0]} />
      ) : renderProceduralBase ? (
        <>
          <mesh position={[0, 0.14, -0.04]}>
            <cylinderGeometry args={[0.3, 0.38, 0.85, 24]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN_DARK} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.34, 0]} scale={[1.6, 0.42, 0.9]}>
            <sphereGeometry args={[0.65, 32, 24]} />
            <meshStandardMaterial color={isClayMode ? '#777' : '#2b2b33'} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.02, 0]} scale={[1, 1.16, 1.02]}>
            <sphereGeometry args={[0.88, 64, 64]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.52} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0.76, 0.14]} scale={[0.8, 0.68, 0.9]}>
            <sphereGeometry args={[0.62, 48, 48]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.52} metalness={0.04} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.86, 1.02, 0.02]} scale={[0.45, 1, 0.75]}>
              <sphereGeometry args={[0.14, 24, 24]} />
              <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN_DARK} roughness={0.55} />
            </mesh>
          ))}
          <mesh position={[0, 0.94, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.13, 0.34, 24]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.45} />
          </mesh>
        </>
      ) : null}

      {renderHair && (
        <group position={anchorTransform.position} scale={anchorTransform.scale} rotation={anchorTransform.rotation}>
          {afroClusters.map((puff, index) => (
            <mesh key={index} position={puff.pos}>
              <sphereGeometry args={[puff.radius, 18, 18]} />
              <meshStandardMaterial color={hairColor} roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export const HairstylePreview3D: React.FC<{
  item: { id: string; color?: string };
  className?: string;
  modelUrl?: string;
  isClayMode?: boolean;
}> = ({ item, className, modelUrl, isClayMode = false }) => (
  <div className={className} aria-hidden="true">
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [1.05, 1.15, 2.5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.35} color="#fff1e0" />
      <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#F3D9C8" />
      <group rotation={[0, 0.55, 0]}>
        <HeadModel
          hairstyleId={item.id}
          hairstyleColor={item.color}
          lineUpCutoff={50}
          isAutoRotate={false}
          modelUrl={modelUrl}
          isClayMode={isClayMode}
        />
      </group>
    </Canvas>
  </div>
);
