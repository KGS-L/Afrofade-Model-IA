'use client';

import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  onPhotosComplete: (photos: string[]) => void;
  isProcessing: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotosComplete,
  isProcessing,
}) => {
  const [photos, setPhotos] = useState<{ [key: string]: string }>({
    face: '',
    profil_gauche: '',
    profil_droit: '',
  });

  const slots = [
    { key: 'face', label: 'Face', desc: 'Vue de face & contours' },
    { key: 'profil_gauche', label: 'Profil G.', desc: 'Oreille & dégradé gauche' },
    { key: 'profil_droit', label: 'Profil D.', desc: 'Oreille & dégradé droit' },
  ];

  const handleSimulateUpload = (key: string) => {
    // Authentic African Model Photo Assets
    const sampleAvatars: { [key: string]: string } = {
      face: '/models/afro_taper_fade.png',
      profil_gauche: '/models/afro_beard_sculpted.png',
      profil_droit: '/models/afro_dreadlocks.png',
    };
    setPhotos((prev) => ({ ...prev, [key]: sampleAvatars[key] }));
  };

  const isReady = Object.values(photos).every((url) => url !== '');

  const handleGenerate = () => {
    if (isReady) {
      onPhotosComplete(Object.values(photos));
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
            Prise de photos du client (3 angles)
          </h3>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Prenez 3 photos du client sous l'éclairage du salon pour permettre à
        l'IA d'analyser la forme du crâne et la ligne d'implantation. JPG · PNG
        · HEIC.
      </p>

      {/* 3 Photo Slot Pickers — dropzone blanche bordure dashed terracotta */}
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const hasPhoto = Boolean(photos[slot.key]);
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
              className={`group relative h-36 rounded-frame border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                hasPhoto
                  ? 'border-terracotta bg-cream shadow-soft'
                  : 'border-terracotta/60 bg-card hover:bg-terracotta-wash'
              }`}
            >
              {hasPhoto ? (
                <>
                  <img
                    src={photos[slot.key]}
                    alt={slot.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
