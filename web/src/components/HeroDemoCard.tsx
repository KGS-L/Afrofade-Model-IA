'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEMO_STEPS = [
  {
    num: 1,
    title: 'Étape 1 — Scan vidéo guidé',
    desc: 'la caméra capture face, profils et nuque',
    img: '/models/demo/client-face.png',
  },
  {
    num: 2,
    title: 'Étape 2 — Reconstruction 3D FLAME',
    desc: 'calcul de la géométrie et maillage du visage',
    img: '/models/demo/client-profil-droit.png',
  },
  {
    num: 3,
    title: 'Étape 3 — Application du Taper Fade',
    desc: 'essayage de la coupe et des contours',
    img: '/models/demo/client-profil-gauche.png',
  },
  {
    num: 4,
    title: 'Étape 4 — Inspection 3D 360°',
    desc: 'validation avec le client avant le fauteuil',
    img: '/models/hairstyles/fade_taper_low/model-1-face.png',
  },
];

export const HeroDemoCard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % DEMO_STEPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const step = DEMO_STEPS[currentStep];

  const handlePrev = () => {
    setCurrentStep((prev) => (prev - 1 + DEMO_STEPS.length) % DEMO_STEPS.length);
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % DEMO_STEPS.length);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Visual Demo Card */}
      <div className="relative w-full aspect-[4/4.2] sm:aspect-[4/3.8] rounded-[24px] overflow-hidden bg-night shadow-soft border border-ink/10 flex flex-col justify-between p-6">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={step.img}
            alt={step.title}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover transition-all duration-700"
            style={{ objectPosition: '50% 28%' }}
          />
        </div>

        {/* Top Badge */}
        <div className="relative z-10 self-start">
          <span className="bg-ink/80 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.18em] uppercase px-3.5 py-1.5 rounded-pill shadow-soft">
            VISUEL DÉMO — RENDU 3D CLIENT
          </span>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          aria-label="Étape précédente"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-ink flex items-center justify-center shadow-soft transition-all hover:scale-105"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          aria-label="Étape suivante"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-ink flex items-center justify-center shadow-soft transition-all hover:scale-105"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bottom Floating Step Card */}
        <div className="relative z-10 w-full bg-white/95 backdrop-blur-md rounded-[16px] px-6 py-4 text-center shadow-soft border border-ink/5">
          <h3 className="font-bold text-ink text-sm sm:text-base">
            {step.title}
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            {step.desc}
          </p>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center gap-2 mt-4">
        {DEMO_STEPS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            aria-label={`Aller à l'étape ${idx + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === currentStep ? 'w-6 bg-terracotta' : 'w-2.5 bg-ink/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
