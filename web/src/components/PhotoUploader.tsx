'use client';

import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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
    { key: 'face', label: 'Face', desc: 'Regard droit' },
    { key: 'profil_gauche', label: 'Profil G.', desc: 'Oreille gauche' },
    { key: 'profil_droit', label: 'Profil D.', desc: 'Oreille droite' },
  ];

  const handleSimulateUpload = (key: string) => {
    // Demo placeholders for instant feedback during "Rituel du Miroir"
    const sampleAvatars: { [key: string]: string } = {
      face: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      profil_gauche: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      profil_droit: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            1. Consultation & Photos Client
          </h2>
          <p className="text-xs text-slate-400">
            Prenez 3 photos sous le bon éclairage du salon.
          </p>
        </div>
        <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-1 rounded-md border border-amber-500/20">
          Étape 1 sur 3
        </span>
      </div>

      {/* 3 Photo Slot Pickers */}
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const hasPhoto = Boolean(photos[slot.key]);
          return (
            <div
              key={slot.key}
              onClick={() => handleSimulateUpload(slot.key)}
              className={`group relative h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
                hasPhoto
                  ? 'border-emerald-500/50 bg-emerald-950/20 overflow-hidden'
                  : 'border-slate-700 bg-slate-950 hover:border-amber-500/50 hover:bg-slate-800/40'
              }`}
            >
              {hasPhoto ? (
                <>
                  <img
                    src={photos[slot.key]}
                    alt={slot.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 rounded-full p-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 bg-slate-950/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-[10px] text-center font-medium text-emerald-400">
                    {slot.label} ✓
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1">
                  <Upload className="w-5 h-5 mx-auto text-slate-500 group-hover:text-amber-400 transition-colors" />
                  <span className="text-xs font-bold text-slate-300 block">{slot.label}</span>
                  <span className="text-[9px] text-slate-500 block">{slot.desc}</span>
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
        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
          isReady && !isProcessing
            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
        }`}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            <span>Reconstruction 3D en cours (DECA Engine)...</span>
          </>
        ) : (
          <>
            <span>Générer le Modèle 3D du Client</span>
          </>
        )}
      </button>
    </div>
  );
};
