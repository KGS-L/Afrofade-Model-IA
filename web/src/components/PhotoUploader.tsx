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
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Étape 1 sur 3
          </span>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            1. Prise de Photos Client (3 Angles)
          </h3>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Prenez 3 photos du client sous l'éclairage du salon pour permettre à l'IA d'analyser la forme du crâne et la ligne d'implantation.
      </p>

      {/* 3 Photo Slot Pickers */}
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const hasPhoto = Boolean(photos[slot.key]);
          return (
            <div
              key={slot.key}
              onClick={() => handleSimulateUpload(slot.key)}
              className={`group relative h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 ${
                hasPhoto
                  ? 'border-emerald-500/60 bg-emerald-950/30 overflow-hidden shadow-lg shadow-emerald-950/50'
                  : 'border-slate-800 bg-slate-950/80 hover:border-amber-500/50 hover:bg-slate-900'
              }`}
            >
              {hasPhoto ? (
                <>
                  <img
                    src={photos[slot.key]}
                    alt={slot.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 rounded-full p-1 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] text-center font-bold text-emerald-400 border border-emerald-500/30">
                    {slot.label} ✓
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1.5 p-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 group-hover:text-amber-400 group-hover:border-amber-500/40 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 block">{slot.label}</span>
                  <span className="text-[9px] text-slate-500 block leading-tight">{slot.desc}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trigger 3D Reconstruction */}
      <button
        disabled={!isReady || isProcessing}
        onClick={handleGenerate}
        className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl ${
          isReady && !isProcessing
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
        }`}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            <span>Inférence 3D & Morphing en cours...</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" />
            <span>Générer la Tête 3D du Client</span>
          </>
        )}
      </button>
    </div>
  );
};
