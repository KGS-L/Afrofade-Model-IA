'use client';

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCw, Sun, Download, Sliders, Sparkles } from 'lucide-react';
import { HeadModel } from './HeadModel3D';

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
    <div className="relative w-full h-[520px] bg-card border border-ink/10 rounded-card overflow-hidden shadow-soft flex flex-col justify-between select-none">
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

      {/* 3D Canvas R3F — fond chaud lumineux, tone mapping cinéma */}
      <div className="w-full h-full bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)] touch-none">
        {hasModel ? (
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.12;
            }}
          >
            <PerspectiveCamera makeDefault position={[0, 1, 3.4]} fov={42} />

            {/* Éclairage 3 points : key chaude, fill douce, rim détachant le profil */}
            <ambientLight intensity={lightPreset === 'warm' ? 0.85 : 0.6} />
            <directionalLight
              position={[4, 6, 4]}
              intensity={lightPreset === 'studio' ? 1.7 : 1.35}
              color={lightPreset === 'warm' ? '#ffedd5' : '#fff1e0'}
            />
            <directionalLight position={[-4, 2, 2]} intensity={0.45} color="#F3D9C8" />
            <directionalLight position={[0, 4, -6]} intensity={0.9} color="#ffffff" />

            <HeadModel
              hairstyleColor={selectedHairstyle?.color || '#1a110b'}
              hairstyleId={selectedHairstyle?.id || 'fade'}
              lineUpCutoff={lineUpCutoff}
              isAutoRotate={isAutoRotate}
            />

            <ContactShadows position={[0, -0.75, 0]} opacity={0.45} scale={4} blur={2} far={2} />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              rotateSpeed={0.8}
              zoomSpeed={0.8}
              minDistance={2.0}
              maxDistance={4.5}
              target={[0, 0.7, 0]}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2 + 0.15}
            />
          </Canvas>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3 bg-card">
            <div className="w-16 h-16 rounded-full bg-terracotta-wash border border-terracotta/30 flex items-center justify-center text-terracotta animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-display text-lg">Le Rituel du Miroir 3D</h3>
            <p className="text-xs text-ink-soft max-w-sm">
              Ajoutez les 4 photos du client à gauche pour générer la tête 3D
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
