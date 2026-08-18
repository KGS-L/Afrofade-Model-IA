'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Tête 3D procédurale partagée : viewport du studio ET aperçus de la
 * grille « Nos styles ». Géométrie volumique (crâne ellipsoïdal, mâchoire,
 * cou, oreilles, nez), peau brun chaud et coiffures afro en grappes de
 * volumes plutôt qu'en sphères lisses.
 */

const SKIN = '#5a3a26';
const SKIN_DARK = '#3d2517';
const HAIR_DEFAULT = '#1a110b';

/** RNG déterministe (mulberry32) — grappes de volumes stables entre rendus */
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
}

export function HeadModel({
  hairstyleId,
  hairstyleColor = HAIR_DEFAULT,
  lineUpCutoff = 50,
  isAutoRotate = false,
}: HeadModelProps) {
  const headGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (isAutoRotate && headGroupRef.current) {
      headGroupRef.current.rotation.y += delta * 0.3;
    }
  });

  const hairColor = hairstyleColor || HAIR_DEFAULT;
  const hairVolume = 0.85 + (lineUpCutoff / 100) * 0.35;
  const isBald = hairstyleId === 'bald';
  const hasBeard = hairstyleId.includes('barbe') || hairstyleId.includes('full');

  /* Afro : grappe de sphères répartie sur une calotte sphérieure */
  const afroClusters = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: 42 }).map(() => {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * (Math.PI / 2.15); // calotte supérieure
      const r = 0.98 + rand() * 0.1;
      return {
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          1.32 + r * Math.cos(phi) * 0.92,
          r * Math.sin(phi) * Math.sin(theta) * 0.96,
        ] as [number, number, number],
        radius: 0.16 + rand() * 0.13,
      };
    });
  }, []);

  /* Fade low : volumes serrés plaqués contre le crâne */
  const fadeClusters = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: 60 }).map(() => {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * (Math.PI / 1.8);
      const r = 0.9;
      return {
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          1.02 + r * Math.cos(phi) * 0.98,
          r * Math.sin(phi) * Math.sin(theta) * 0.98,
        ] as [number, number, number],
        radius: 0.09 + rand() * 0.06,
      };
    });
  }, []);

  /* Locks : cylindres tombants à léger tilting aléatoire */
  const locks = useMemo(() => {
    const rand = mulberry32(23);
    return Array.from({ length: 26 }).map((_, i) => {
      const angle = (i / 26) * Math.PI * 2;
      const radius = 0.72 + rand() * 0.16;
      return {
        pos: [
          Math.cos(angle) * radius,
          1.16 + rand() * 0.14,
          Math.sin(angle) * radius * 0.94,
        ] as [number, number, number],
        rot: [0.12 + rand() * 0.1, angle, (rand() - 0.5) * 0.24] as [
          number,
          number,
          number
        ],
        len: 0.72 + rand() * 0.28,
      };
    });
  }, []);

  /* Cornrows : rangées de torus en quinconce sur le cuir chevelu */
  const cornrows = useMemo(() => {
    const rows: { pos: [number, number, number]; rotZ: number }[] = [];
    for (let row = 0; row < 5; row++) {
      const phi = 0.32 + row * 0.42; // du sommet vers la nuque
      for (let col = 0; col < 7; col++) {
        const theta = (col / 7) * Math.PI * 2 + (row % 2) * 0.22;
        const r = 0.95;
        rows.push({
          pos: [
            r * Math.sin(phi) * Math.cos(theta),
            1.16 + r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta) * 0.97,
          ],
          rotZ: theta,
        });
      }
    }
    return rows;
  }, []);

  return (
    <group ref={headGroupRef} position={[0, -0.55, 0]}>
      {/* Cou */}
      <mesh position={[0, 0.14, -0.04]}>
        <cylinderGeometry args={[0.3, 0.38, 0.85, 24]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
      </mesh>
      {/* Épaules suggérées */}
      <mesh position={[0, -0.34, 0]} scale={[1.6, 0.42, 0.9]}>
        <sphereGeometry args={[0.65, 32, 24]} />
        <meshStandardMaterial color="#2b2b33" roughness={0.85} />
      </mesh>

      {/* Crâne ellipsoïdal */}
      <mesh position={[0, 1.02, 0]} scale={[1, 1.16, 1.02]}>
        <sphereGeometry args={[0.88, 64, 64]} />
        <meshStandardMaterial color={SKIN} roughness={0.52} metalness={0.04} />
      </mesh>
      {/* Mâchoire / bas du visage */}
      <mesh position={[0, 0.76, 0.14]} scale={[0.8, 0.68, 0.9]}>
        <sphereGeometry args={[0.62, 48, 48]} />
        <meshStandardMaterial color={SKIN} roughness={0.52} metalness={0.04} />
      </mesh>

      {/* Oreilles */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.86, 1.02, 0.02]} scale={[0.45, 1, 0.75]}>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial color={SKIN_DARK} roughness={0.55} />
        </mesh>
      ))}

      {/* Nez */}
      <mesh position={[0, 0.94, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.13, 0.34, 24]} />
        <meshStandardMaterial color={SKIN} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.88, 0.86]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.45} />
      </mesh>

      {/* Arcade sourcilière */}
      {[-1, 1].map((side) => (
        <mesh key={`brow-${side}`} position={[side * 0.3, 1.16, 0.74]} rotation={[0, 0, side * -0.12]}>
          <boxGeometry args={[0.34, 0.07, 0.1]} />
          <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
        </mesh>
      ))}

      {/* Yeux : sclère + pupille + reflet */}
      {[-1, 1].map((side) => (
        <group key={`eye-${side}`} position={[side * 0.31, 1.08, 0.72]}>
          <mesh scale={[1, 0.72, 0.6]}>
            <sphereGeometry args={[0.11, 20, 20]} />
            <meshStandardMaterial color="#f2ede6" roughness={0.18} />
          </mesh>
          <mesh position={[0, 0, 0.07]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#140d08" roughness={0.1} />
          </mesh>
          <mesh position={[side * 0.02, 0.02, 0.11]}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Lèvres */}
      <mesh position={[0, 0.6, 0.76]} rotation={[0.2, 0, 0]} scale={[1, 0.5, 0.6]}>
        <torusGeometry args={[0.14, 0.055, 12, 24, Math.PI]} />
        <meshStandardMaterial color="#4a2b20" roughness={0.35} />
      </mesh>

      {/* Coiffures */}
      {!isBald && (
        <group scale={[1, hairVolume, 1]}>
          {hairstyleId.includes('locks') ? (
            <>
              {locks.map((lock, i) => (
                <mesh key={i} position={lock.pos} rotation={lock.rot}>
                  <cylinderGeometry args={[0.06, 0.045, lock.len, 12]} />
                  <meshStandardMaterial color={hairColor} roughness={0.92} />
                </mesh>
              ))}
              {/* calotte sommet */}
              <mesh position={[0, 1.5, 0]} scale={[1, 0.62, 1]}>
                <sphereGeometry args={[0.82, 32, 32]} />
                <meshStandardMaterial color={hairColor} roughness={0.92} />
              </mesh>
            </>
          ) : hairstyleId.includes('tresses') ? (
            <>
              {cornrows.map((braid, i) => (
                <mesh
                  key={i}
                  position={braid.pos}
                  rotation={[braid.rotZ * 0.3, braid.rotZ, 0]}
                >
                  <torusGeometry args={[0.1, 0.045, 10, 20]} />
                  <meshStandardMaterial color={hairColor} roughness={0.85} />
                </mesh>
              ))}
            </>
          ) : hairstyleId.includes('fade') || hairstyleId.includes('sponge') ? (
            <>
              {fadeClusters.map((puff, i) => (
                <mesh key={i} position={puff.pos}>
                  <sphereGeometry args={[puff.radius, 16, 16]} />
                  <meshStandardMaterial color={hairColor} roughness={0.95} />
                </mesh>
              ))}
              {/* volume supérieur du fade */}
              {hairstyleId.includes('sponge') || hairstyleId.includes('burst') ? (
                afroClusters.slice(0, 18).map((puff, i) => (
                  <mesh key={`top-${i}`} position={puff.pos}>
                    <sphereGeometry args={[puff.radius * 0.75, 16, 16]} />
                    <meshStandardMaterial color={hairColor} roughness={0.95} />
                  </mesh>
                ))
              ) : null}
            </>
          ) : (
            /* Afro par défaut : grappe volumineuse */
            <>
              {afroClusters.map((puff, i) => (
                <mesh key={i} position={puff.pos}>
                  <sphereGeometry args={[puff.radius, 18, 18]} />
                  <meshStandardMaterial color={hairColor} roughness={0.95} />
                </mesh>
              ))}
              <mesh position={[0, 1.62, -0.06]} scale={[1, 0.72, 0.94]}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshStandardMaterial color={hairColor} roughness={0.95} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Barbe sculptée */}
      {hasBeard && (
        <>
          <mesh position={[0, 0.62, 0.44]} rotation={[0.35, 0, 0]}>
            <torusGeometry args={[0.5, 0.16, 14, 32, Math.PI * 1.15]} />
            <meshStandardMaterial color={HAIR_DEFAULT} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.72, 0.66]} scale={[1, 0.45, 0.5]}>
            <torusGeometry args={[0.16, 0.05, 10, 20, Math.PI]} />
            <meshStandardMaterial color={HAIR_DEFAULT} roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** Aperçu 3D compact pour la grille « Nos styles » — rendu unique, léger. */
export const HairstylePreview3D: React.FC<{
  item: { id: string; color?: string };
  className?: string;
}> = ({ item, className }) => (
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
        />
      </group>
    </Canvas>
  </div>
);
