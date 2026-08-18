'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Camera, Upload, CheckCircle2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  onPhotosComplete: (photos: string[]) => void;
  isProcessing: boolean;
}

type AngleKey = 'face' | 'profil_gauche' | 'profil_droit' | 'arriere';

/**
 * Photos de démonstration (licence Pexels — voir models/CREDITS.md).
 * La vue de profil droit sert de base ; le profil gauche est généré par
 * miroir, conformément au flux « une photo, les autres angles dérivés ».
 */
const SAMPLE_PHOTOS: Record<AngleKey, { src: string; mirror?: boolean }> = {
  face: { src: '/models/client-face.jpg' },
  profil_gauche: { src: '/models/client-profil.jpg', mirror: true },
  profil_droit: { src: '/models/client-profil.jpg' },
  arriere: { src: '/models/client-arriere.jpg' },
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
      // 4 vues envoyées au mock de reconstruction (une par angle)
      onPhotosComplete([
        SAMPLE_PHOTOS.face.src,
        SAMPLE_PHOTOS.profil_gauche.src,
        SAMPLE_PHOTOS.profil_droit.src,
        SAMPLE_PHOTOS.arriere.src,
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

      {/* 4 slots d’angles — vraies photos, profil gauche généré par miroir */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slots.map((slot) => {
          const hasPhoto = photos[slot.key];
          const sample = SAMPLE_PHOTOS[slot.key];
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
                  <Image
                    src={sample.src}
                    alt={`Photo client — ${slot.label}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 140px"
                    className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
                      sample.mirror ? 'scale-x-[-1]' : ''
                    }`}
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
