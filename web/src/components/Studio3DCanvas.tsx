'use client';

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCw, Sun, Download, Sliders, Sparkles } from 'lucide-react';

interface Studio3DCanvasProps {
  hasModel: boolean;
  selectedHairstyle: {
    id: string;
    title: string;
    color: string;
    isPremium: boolean;
  } | null;
  lineUpCutoff: number; // 0 to 100 for hairline adjustment
  onLineUpChange: (val: number) => void;
  onSaveRender: () => void;
}

// 3D Procedural Mesh representation for client head & Afro hairstyles
function HeadModel({
  hairstyleColor,
  hairstyleId,
  lineUpCutoff,
  isAutoRotate,
}: {
  hairstyleColor: string;
  hairstyleId: string;
  lineUpCutoff: number;
  isAutoRotate: boolean;
}) {
  const headGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (isAutoRotate && headGroupRef.current) {
      headGroupRef.current.rotation.y += delta * 0.3;
    }
  });

  // Calculate hair volume scale based on hairline fine-tuning
  const hairScaleY = 0.8 + (lineUpCutoff / 100) * 0.3;

  return (
    <group ref={headGroupRef} position={[0, -0.4, 0]}>
      {/* 3D Head Skull Mesh (Melanin Skin Tone) */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.9, 64, 64]} />
        <meshStandardMaterial
          color="#3d2314"
          roughness={0.45}
          metalness={0.1}
        />
      </mesh>

      {/* 3D Facial Morph Features (Nose, Jawline) */}
      <mesh position={[0, 0.9, 0.85]}>
        <coneGeometry args={[0.15, 0.4, 32]} />
        <meshStandardMaterial color="#351e11" roughness={0.5} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.32, 1.05, 0.78]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#1a0e07" roughness={0.2} />
      </mesh>
      <mesh position={[0.32, 1.05, 0.78]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#1a0e07" roughness={0.2} />
      </mesh>

      {/* 3D Afro Hairstyle Overlay (Procedural Geometry matching Afro Textures) */}
      {hairstyleId !== 'bald' && (
        <group position={[0, 1.35, 0]} scale={[1, hairScaleY, 1]}>
          {hairstyleId.includes('locks') ? (
            // Dreadlocks Mesh Simulation
            Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const radius = 0.88;
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              return (
                <mesh key={i} position={[x, 0.1, z]} rotation={[0.2, angle, 0.1]}>
                  <cylinderGeometry args={[0.07, 0.05, 0.8, 16]} />
                  <meshStandardMaterial color={hairstyleColor} roughness={0.9} />
                </mesh>
              );
            })
          ) : hairstyleId.includes('tresses') ? (
            // Braids Mesh Simulation
            Array.from({ length: 18 }).map((_, i) => {
              const angle = (i / 18) * Math.PI * 2;
              const x = Math.cos(angle) * 0.85;
              const z = Math.sin(angle) * 0.85;
              return (
                <mesh key={i} position={[x, -0.1, z]}>
                  <torusGeometry args={[0.1, 0.04, 12, 24]} />
                  <meshStandardMaterial color={hairstyleColor} roughness={0.8} />
                </mesh>
              );
            })
          ) : (
            // Afro Fade / Low Cut Volume Mesh
            <mesh position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.96, 48, 48]} />
              <meshStandardMaterial
                color={hairstyleColor}
                roughness={0.95}
                bumpScale={0.05}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Beard & Mustache Mesh (if selected) */}
      {(hairstyleId.includes('barbe') || hairstyleId.includes('full')) && (
        <mesh position={[0, 0.45, 0.5]}>
          <torusGeometry args={[0.65, 0.18, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#1a110b" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

export const Studio3DCanvas: React.FC<Studio3DCanvasProps> = ({
  hasModel,
  selectedHairstyle,
  lineUpCutoff,
  onLineUpChange,
  onSaveRender,
}) => {
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [lightPreset, setLightPreset] = useState<'salon' | 'studio' | 'warm'>('salon');

  return (
    <div className="relative w-full h-[520px] bg-card border border-ink/10 rounded-card overflow-hidden shadow-soft flex flex-col justify-between">
      {/* Top Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <div className="bg-card/90 backdrop-blur-sm border border-ink/10 px-3 py-1.5 rounded-pill pointer-events-auto flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasModel ? 'bg-terracotta' : 'bg-ink/30'} ${hasModel ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-bold text-ink">
            {hasModel ? 'Rendu 3D miroir actif' : 'En attente des photos…'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            aria-pressed={isAutoRotate}
            className={`w-11 h-11 rounded-pill border backdrop-blur-sm transition-all flex items-center justify-center ${
              isAutoRotate
                ? 'bg-terracotta text-white border-terracotta shadow-soft'
                : 'bg-card/90 text-ink border-ink/10 hover:bg-cream'
            }`}
            title="Rotation 360° automatique"
          >
            <RotateCw className={`w-4 h-4 ${isAutoRotate ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() =>
              setLightPreset((prev) =>
                prev === 'salon' ? 'studio' : prev === 'studio' ? 'warm' : 'salon'
              )
            }
            className="w-11 h-11 rounded-pill bg-card/90 text-terracotta border border-ink/10 hover:bg-cream backdrop-blur-sm transition-all flex items-center justify-center"
            title={`Éclairage : ${lightPreset}`}
          >
            <Sun className="w-4 h-4" />
          </button>

          {hasModel && (
            <button
              onClick={onSaveRender}
              className="min-h-[44px] inline-flex items-center gap-1.5 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-xs px-4 rounded-pill backdrop-blur-sm transition-colors shadow-soft"
            >
              <Download className="w-4 h-4" />
              <span>Enregistrer 3D</span>
            </button>
          )}
        </div>
      </div>

      {/* 3D Canvas R3F — fond chaud lumineux */}
      <div className="w-full h-full bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)]">
        {hasModel ? (
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 1, 3.2]} fov={45} />

            {/* Lighting Studio — lumière de remplissage chaude */}
            <ambientLight intensity={lightPreset === 'warm' ? 1.2 : 0.8} />
            <directionalLight
              position={[5, 5, 5]}
              intensity={lightPreset === 'studio' ? 1.8 : 1.2}
              color={lightPreset === 'warm' ? '#ffedd5' : '#ffffff'}
            />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#F3D9C8" />

            <HeadModel
              hairstyleColor={selectedHairstyle?.color || '#1c1917'}
              hairstyleId={selectedHairstyle?.id || 'fade'}
              lineUpCutoff={lineUpCutoff}
              isAutoRotate={isAutoRotate}
            />

            <ContactShadows position={[0, -0.4, 0]} opacity={0.6} scale={4} blur={1.5} />
            <OrbitControls
              enablePan={false}
              minDistance={2.0}
              maxDistance={4.5}
              maxPolarAngle={Math.PI / 2 + 0.1}
            />
          </Canvas>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3 bg-card">
            <div className="w-16 h-16 rounded-full bg-terracotta-wash border border-terracotta/30 flex items-center justify-center text-terracotta animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-display text-lg">Le Rituel du Miroir 3D</h3>
            <p className="text-xs text-ink-soft max-w-sm">
              Ajoutez les 3 photos du client à gauche pour générer la tête 3D
              interactive et tester les contours et coiffures afro.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar (Hairline Fine-Tuning Slider) */}
      {hasModel && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-card/95 backdrop-blur-sm border border-ink/10 p-3 rounded-card flex items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold text-terracotta-dark whitespace-nowrap">
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Ajustement des contours (line-up) :</span>
            <span className="sm:hidden">Line-up :</span>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-[10px] text-ink-soft">Bas</span>
            <input
              type="range"
              min="0"
              max="100"
              value={lineUpCutoff}
              onChange={(e) => onLineUpChange(Number(e.target.value))}
              aria-label="Ajustement de la ligne de contours"
              className="w-full h-1.5 bg-ink/10 rounded-lg appearance-none cursor-pointer accent-terracotta"
            />
            <span className="text-[10px] text-ink-soft">Haut</span>
          </div>

          <span className="text-xs font-mono font-bold text-ink bg-cream px-2 py-1 rounded-md border border-ink/10">
            {lineUpCutoff}%
          </span>
        </div>
      )}
    </div>
  );
};
