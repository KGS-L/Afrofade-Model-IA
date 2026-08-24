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
  renderHead?: boolean;
}

export function HeadModel({
  hairstyleId,
  hairstyleColor = HAIR_DEFAULT,
  lineUpCutoff = 50,
  isAutoRotate = false,
  modelUrl,
  isClayMode = false,
  strictModel = true,
  renderHead = true,
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
  const isHeadAsset = hairstyleId.includes('head') || hairstyleId.includes('african') || hairstyleId === 'bald';
  const renderProceduralBase = !loadedScene && (!modelUrl || !strictModel);
  const renderHair = !isBald && !isHeadAsset && !loadedScene && (!strictModel || !modelUrl || modelState === 'loaded');

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
      ) : (renderProceduralBase && renderHead) ? (
        <group position={[0, 0, 0]}>
          {/* Cou & Tronc Ergonomique */}
          <mesh position={[0, 0.18, -0.05]} rotation={[0.08, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.40, 0.75, 32]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN_DARK} roughness={0.55} metalness={0.02} />
          </mesh>

          {/* Épaules / Buste */}
          <mesh position={[0, -0.32, -0.02]} scale={[1.65, 0.45, 0.95]}>
            <sphereGeometry args={[0.65, 32, 32]} />
            <meshStandardMaterial color={isClayMode ? '#666' : '#231f20'} roughness={0.8} />
          </mesh>

          {/* Boîte Crânienne (Crâne principal) */}
          <mesh position={[0, 1.08, -0.02]} scale={[0.92, 1.08, 0.98]}>
            <sphereGeometry args={[0.82, 64, 64]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.44} metalness={0.03} />
          </mesh>

          {/* Visage Avant & Mâchoire (Mandibule sculptée) */}
          <mesh position={[0, 0.82, 0.18]} scale={[0.78, 0.85, 0.88]}>
            <sphereGeometry args={[0.68, 64, 64]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.44} metalness={0.03} />
          </mesh>

          {/* Menton Sculpté */}
          <mesh position={[0, 0.46, 0.42]} scale={[0.42, 0.32, 0.45]}>
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.44} metalness={0.03} />
          </mesh>

          {/* Pommettes & Joues */}
          {[-1, 1].map((side) => (
            <mesh key={`cheek-${side}`} position={[side * 0.38, 0.84, 0.45]} scale={[0.38, 0.32, 0.35]}>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.44} metalness={0.03} />
            </mesh>
          ))}

          {/* Nez Photoréaliste (Arête + Bout + Narines) */}
          <group position={[0, 0.86, 0.72]}>
            {/* Arête du nez */}
            <mesh position={[0, 0.08, 0.02]} rotation={[-0.22, 0, 0]}>
              <boxGeometry args={[0.12, 0.28, 0.14]} />
              <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.40} />
            </mesh>
            {/* Bout du nez */}
            <mesh position={[0, -0.06, 0.08]} scale={[0.16, 0.14, 0.15]}>
              <sphereGeometry args={[0.8, 32, 32]} />
              <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN} roughness={0.40} />
            </mesh>
            {/* Narines (gauche & droite) */}
            {[-1, 1].map((side) => (
              <mesh key={`nostril-${side}`} position={[side * 0.09, -0.08, 0.04]} scale={[0.08, 0.06, 0.08]}>
                <sphereGeometry args={[0.7, 16, 16]} />
                <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN_DARK} roughness={0.6} />
              </mesh>
            ))}
          </group>

          {/* Yeux Anatomiques Complet (Globes + Iris + Pupilles + Paupières) */}
          {[-1, 1].map((side) => (
            <group key={`eye-${side}`} position={[side * 0.28, 0.96, 0.62]}>
              {/* Globe Oculaire (Sclère Blanche) */}
              <mesh scale={[0.12, 0.09, 0.10]}>
                <sphereGeometry args={[0.9, 32, 32]} />
                <meshStandardMaterial color="#f0ede6" roughness={0.15} metalness={0.1} />
              </mesh>
              {/* Iris Marron Chaud */}
              <mesh position={[0, 0, 0.07]} scale={[0.06, 0.06, 0.02]}>
                <cylinderGeometry args={[0.9, 0.9, 0.5, 32]} />
                <meshStandardMaterial color="#2d1a0e" roughness={0.2} />
              </mesh>
              {/* Pupille Noire */}
              <mesh position={[0, 0, 0.08]} scale={[0.03, 0.03, 0.02]}>
                <cylinderGeometry args={[0.9, 0.9, 0.5, 32]} />
                <meshStandardMaterial color="#050505" roughness={0.1} />
              </mesh>
              {/* Arcade Sourcilière */}
              <mesh position={[0, 0.09, -0.02]} rotation={[0, 0, side * -0.15]} scale={[0.18, 0.04, 0.08]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={isClayMode ? CLAY_COLOR : '#1b110b'} roughness={0.9} />
              </mesh>
            </group>
          ))}

          {/* Lèvres Humaines Dessinées (Philtrum + Lèvre Supérieure + Lèvre Inférieure) */}
          <group position={[0, 0.66, 0.70]}>
            {/* Lèvre Supérieure */}
            <mesh position={[0, 0.025, 0]} scale={[0.24, 0.05, 0.10]}>
              <sphereGeometry args={[0.8, 32, 32]} />
              <meshStandardMaterial color={isClayMode ? CLAY_COLOR : '#683e33'} roughness={0.45} />
            </mesh>
            {/* Lèvre Inférieure */}
            <mesh position={[0, -0.025, 0.01]} scale={[0.22, 0.06, 0.11]}>
              <sphereGeometry args={[0.8, 32, 32]} />
              <meshStandardMaterial color={isClayMode ? CLAY_COLOR : '#724338'} roughness={0.45} />
            </mesh>
          </group>

          {/* Oreilles Détaillées (Helix & Lobe) */}
          {[-1, 1].map((side) => (
            <group key={`ear-${side}`} position={[side * 0.72, 0.92, -0.02]} rotation={[0.1, side * 0.2, side * -0.1]}>
              {/* Pavillon */}
              <mesh scale={[0.10, 0.26, 0.18]}>
                <sphereGeometry args={[0.8, 32, 32]} />
                <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN_DARK} roughness={0.5} />
              </mesh>
              {/* Lobe */}
              <mesh position={[0, -0.18, 0.02]} scale={[0.08, 0.10, 0.09]}>
                <sphereGeometry args={[0.8, 24, 24]} />
                <meshStandardMaterial color={isClayMode ? CLAY_COLOR : SKIN_DARK} roughness={0.5} />
              </mesh>
            </group>
          ))}
        </group>
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
