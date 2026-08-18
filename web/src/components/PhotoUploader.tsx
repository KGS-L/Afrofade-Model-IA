'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Upload, CheckCircle2, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { uploadClientPhoto } from '@/lib/storage';

interface PhotoUploaderProps {
  onPhotosComplete: (photos: string[]) => void;
  isProcessing: boolean;
}

type AngleKey = 'face' | 'profil_gauche' | 'profil_droit' | 'arriere';

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
  const [photoUrls, setPhotoUrls] = useState<Record<AngleKey, string | null>>({
    face: null,
    profil_gauche: null,
    profil_droit: null,
    arriere: null,
  });

  const [uploadingAngle, setUploadingAngle] = useState<AngleKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentAngleRef = useRef<AngleKey>('face');

  const slots: { key: AngleKey; label: string; desc: string }[] = [
    { key: 'face', label: 'Face', desc: 'Regard droit vers l’objectif' },
    { key: 'profil_gauche', label: 'Profil gauche', desc: 'Oreille & dégradé gauches' },
    { key: 'profil_droit', label: 'Profil droit', desc: 'Oreille & dégradé droits' },
    { key: 'arriere', label: 'Arrière', desc: 'Nuque & ligne arrière' },
  ];

  const triggerFilePick = (key: AngleKey) => {
    currentAngleRef.current = key;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const angle = currentAngleRef.current;
    if (!file) return;

    setUploadingAngle(angle);
    setErrorMessage(null);

    try {
      const { publicUrl, error } = await uploadClientPhoto(file);
      if (error) throw new Error(error);

      setPhotoUrls((prev) => ({ ...prev, [angle]: publicUrl }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur d’upload';
      setErrorMessage(message);
    } finally {
      setUploadingAngle(null);
    }
  };

  const handleDemoPhoto = (key: AngleKey) => {
    setPhotoUrls((prev) => ({ ...prev, [key]: SAMPLE_PHOTOS[key].src }));
  };

  const isReady = Object.values(photoUrls).every((url) => url !== null);

  const handleGenerate = () => {
    if (isReady) {
      onPhotosComplete([
        photoUrls.face || SAMPLE_PHOTOS.face.src,
        photoUrls.profil_gauche || SAMPLE_PHOTOS.profil_gauche.src,
        photoUrls.profil_droit || SAMPLE_PHOTOS.profil_droit.src,
        photoUrls.arriere || SAMPLE_PHOTOS.arriere.src,
      ]);
    }
  };

  return (
    <div className="bg-card rounded-card p-6 space-y-5 shadow-soft">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />

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
        Prenez ou téléchargez 4 photos du client (face, profil gauche, profil droit et arrière) sous l’éclairage du salon pour l’analyse 3D IA. Max 10 Mo par photo (JPG, PNG, WEBP).
      </p>

      {errorMessage && (
        <div className="rounded-input bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4 slots d’angles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slots.map((slot) => {
          const photoUrl = photoUrls[slot.key];
          const isUploadingThis = uploadingAngle === slot.key;
          const sample = SAMPLE_PHOTOS[slot.key];
          const displaySrc = photoUrl || sample.src;

          return (
            <div key={slot.key} className="relative group">
              <button
                type="button"
                onClick={() => triggerFilePick(slot.key)}
                disabled={isUploadingThis}
                aria-label={`Ajouter photo ${slot.label}`}
                className={`w-full h-40 rounded-frame border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 overflow-hidden relative ${
                  photoUrl
                    ? 'border-terracotta bg-cream shadow-soft'
                    : 'border-terracotta/60 bg-card hover:bg-terracotta-wash'
                }`}
              >
                {isUploadingThis ? (
                  <div className="flex flex-col items-center gap-2 text-terracotta">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] font-bold">Upload…</span>
                  </div>
                ) : photoUrl ? (
                  <>
                    <Image
                      src={displaySrc}
                      alt={`Photo client — ${slot.label}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 140px"
                      className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
                        sample.mirror && !photoUrl.startsWith('data:') && !photoUrl.startsWith('http') ? 'scale-x-[-1]' : ''
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
              {!photoUrl && (
                <button
                  type="button"
                  onClick={() => handleDemoPhoto(slot.key)}
                  className="w-full text-center text-[9px] font-medium text-terracotta hover:underline mt-1"
                >
                  (Charger démo)
                </button>
              )}
            </div>
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
