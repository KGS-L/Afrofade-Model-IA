'use client';

import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  onPhotosComplete: (photos: string[]) => void;
  isProcessing: boolean;
}

type AngleKey = 'face' | 'profil_gauche' | 'profil_droit' | 'arriere';

/**
 * Silhouettes d'orientation — même « client » vu sous les 4 angles.
 * Chaque vue respecte strictement son côté : le profil gauche regarde
 * vers la gauche du spectateur, le droit vers la droite, l'arrière ne
 * montre aucun trait de visage.
 */
const AngleSilhouette: React.FC<{ angle: AngleKey; className?: string }> = ({
  angle,
  className,
}) => {
  const skin = '#A97C50';
  const hair = '#1F1B17';
  const line = '#3d2314';
  return (
    <svg
      viewBox="0 0 64 72"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* cou */}
      <rect x="27" y="52" width="10" height="12" rx="4" fill={skin} />
      {/* oreilles */}
      {(angle === 'face' || angle === 'arriere') && (
        <>
          <circle cx="17" cy="32" r="3.4" fill={skin} stroke={line} strokeWidth="1" />
          <circle cx="47" cy="32" r="3.4" fill={skin} stroke={line} strokeWidth="1" />
        </>
      )}
      {angle === 'profil_gauche' && (
        <circle cx="45" cy="32" r="3.4" fill={skin} stroke={line} strokeWidth="1" />
      )}
      {angle === 'profil_droit' && (
        <circle cx="19" cy="32" r="3.4" fill={skin} stroke={line} strokeWidth="1" />
      )}
      {/* tête — le nez dessine la direction du regard */}
      {angle === 'face' && (
        <>
          <ellipse cx="32" cy="30" rx="15" ry="18" fill={skin} stroke={line} strokeWidth="1.2" />
          <path d="M17 22 Q22 6 32 6 Q42 6 47 22 Q40 16 32 16 Q24 16 17 22 Z" fill={hair} />
          <circle cx="26" cy="29" r="1.7" fill={line} />
          <circle cx="38" cy="29" r="1.7" fill={line} />
          <path d="M30 34 L34 34 L32 38 Z" fill={line} opacity="0.65" />
          <path d="M28 43 Q32 45 36 43" stroke={line} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </>
      )}
      {angle === 'profil_gauche' && (
        <>
          <path
            d="M20 14 Q24 8 33 8 Q46 8 46 26 L46 40 Q46 52 33 52 Q22 52 19 42 L15 34 Q14 31 17 30 L20 29 Z"
            fill={skin}
            stroke={line}
            strokeWidth="1.2"
          />
          <path d="M20 14 Q24 8 33 8 Q46 8 46 26 Q40 14 30 16 Q24 17 20 22 Z" fill={hair} />
          <circle cx="31" cy="27" r="1.7" fill={line} />
          <path d="M27 39 Q30 41 33 40" stroke={line} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {angle === 'profil_droit' && (
        <>
          <path
            d="M44 14 Q40 8 31 8 Q18 8 18 26 L18 40 Q18 52 31 52 Q42 52 45 42 L49 34 Q50 31 47 30 L44 29 Z"
            fill={skin}
            stroke={line}
            strokeWidth="1.2"
          />
          <path d="M44 14 Q40 8 31 8 Q18 8 18 26 Q24 14 34 16 Q40 17 44 22 Z" fill={hair} />
          <circle cx="33" cy="27" r="1.7" fill={line} />
          <path d="M37 39 Q34 41 31 40" stroke={line} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      )}
      {angle === 'arriere' && (
        <>
          <ellipse cx="32" cy="30" rx="15" ry="18" fill={skin} stroke={line} strokeWidth="1.2" />
          {/* vue arrière : masse capillaire pleine, nuque dégagée */}
          <path
            d="M17 30 Q17 8 32 8 Q47 8 47 30 Q47 40 40 44 L38 50 L26 50 L24 44 Q17 40 17 30 Z"
            fill={hair}
          />
          <path d="M29 46 Q32 49 35 46" stroke={line} strokeWidth="1" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
};

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotosComplete,
  isProcessing,
}) => {
  const [photos, setPhotos] = useState<{ [key: string]: boolean }>({
    face: false,
    profil_gauche: false,
    profil_droit: false,
    arriere: false,
  });

  const slots: { key: AngleKey; label: string; desc: string }[] = [
    { key: 'face', label: 'Face', desc: 'Regard droit vers l’objectif' },
    { key: 'profil_gauche', label: 'Profil gauche', desc: 'Oreille & dégradé gauches' },
    { key: 'profil_droit', label: 'Profil droit', desc: 'Oreille & dégradé droits' },
    { key: 'arriere', label: 'Arrière', desc: 'Nuque & ligne arrière' },
  ];

  const handleSimulateUpload = (key: AngleKey) => {
    setPhotos((prev) => ({ ...prev, [key]: true }));
  };

  const isReady = Object.values(photos).every(Boolean);

  const handleGenerate = () => {
    if (isReady) {
      // 4 URL envoyées au mock de reconstruction (une par angle)
      onPhotosComplete([
        '/models/face.jpg',
        '/models/profil-gauche.jpg',
        '/models/profil-droit.jpg',
        '/models/arriere.jpg',
      ]);
    }
  };

  return (
    <div className="bg-card rounded-card p-6 space-y-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-2.5 py-1 rounded-pill">
            Étape 1 sur 3
          </span>
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Camera className="w-4 h-4 text-terracotta" />
            Prise de photos du client (4 angles)
          </h3>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Prenez 4 photos du client — face, profil gauche, profil droit et arrière —
        sous l’éclairage du salon pour permettre à l’IA d’analyser la forme du
        crâne et la ligne d’implantation. JPG · PNG · HEIC.
      </p>

      {/* 4 slots d’angles — chaque vue respecte son orientation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slots.map((slot) => {
          const hasPhoto = photos[slot.key];
          return (
            <button
              type="button"
              key={slot.key}
              onClick={() => handleSimulateUpload(slot.key)}
              aria-label={
                hasPhoto
                  ? `Photo ${slot.label} ajoutée — toucher pour reprendre`
                  : `Ajouter la photo ${slot.label}`
              }
              className={`group relative h-40 rounded-frame border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                hasPhoto
                  ? 'border-terracotta bg-cream shadow-soft'
                  : 'border-terracotta/60 bg-card hover:bg-terracotta-wash'
              }`}
            >
              {hasPhoto ? (
                <>
                  <AngleSilhouette
                    angle={slot.key}
                    className="w-20 h-[88px] group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-terracotta text-white rounded-full p-1 shadow-soft">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-ink/85 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-center font-bold text-white">
                    {slot.label} ✓
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1.5 p-2">
                  <div className="w-8 h-8 rounded-full bg-terracotta-wash border border-terracotta/30 flex items-center justify-center mx-auto text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-ink block">
                    {slot.label}
                  </span>
                  <span className="text-[9px] text-ink-soft block leading-tight">
                    {slot.desc}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Trigger 3D Reconstruction */}
      <button
        disabled={!isReady || isProcessing}
        onClick={handleGenerate}
        className={`w-full min-h-[48px] rounded-pill font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
          isReady && !isProcessing
            ? 'bg-terracotta hover:bg-terracotta-dark text-white shadow-soft'
            : 'bg-ink/10 text-ink-soft/70 cursor-not-allowed border border-ink/10'
        }`}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-terracotta" />
            <span>Analyse IA — reconstruction en cours…</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            <span>Générer la tête 3D du client</span>
          </>
        )}
      </button>
    </div>
  );
};
