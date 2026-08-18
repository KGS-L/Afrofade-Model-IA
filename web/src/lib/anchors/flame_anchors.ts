/**
 * Système d'Ancrage Canonique FLAME 2023 pour Coiffures Afro 3D.
 * Calcule dynamiquement la matrice de transformation (Position, Échelle non-uniforme, Rotation)
 * pour adapter parfaitement une coupe Afro (Fade, Locks, Tresses, Twist) à la morphologie du crâne.
 */

export interface SkullDimensions {
  jawWidth: number;       // Largeur mâchoire (-1.0 à +1.0)
  headWidth: number;      // Largeur tempe-à-tempe (X)
  headDepth: number;      // Profondeur front-à-nuque (Z)
  skullHeight: number;    // Hauteur menton-à-sommet (Y)
}

export interface Transform3D {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
}

export class FlameHairstyleAnchorSystem {
  // Indices des sommets canoniques du mesh FLAME 2023
  public static readonly ANCHORS = {
    SCALP_CENTER: 3520,
    HAIRLINE_CENTER: 1245,
    LEFT_TEMPLE: 892,
    RIGHT_TEMPLE: 2410,
    CROWN: 4102,
    OCCIPITAL: 4890,
    LEFT_EAR: 1120,
    RIGHT_EAR: 3150,
    NECK_CENTER: 4999
  };

  /**
   * Calcule la transformation 3D de la coiffure en fonction des dimensions du crâne
   * et de la position souhaitée de la ligne de contour (lineUpCutoff en %).
   */
  public static calculateHairstyleTransform(
    dimensions: Partial<SkullDimensions> = {},
    lineUpCutoff: number = 50,
    hairstyleType: string = 'fade'
  ): Transform3D {
    const jaw = dimensions.jawWidth ?? 0;
    const width = dimensions.headWidth ?? 1.0;
    const depth = dimensions.headDepth ?? 1.0;
    const height = dimensions.skullHeight ?? 1.0;

    // Décalage de la ligne de contour (front) : lineUpCutoff varie de 0 (très bas) à 100 (très haut)
    const hairlineOffsetY = ((lineUpCutoff - 50) / 100) * 0.08;

    // Calcul de l'échelle non-uniforme (X, Y, Z) de la coiffure pour s'ajuster au crâne
    const scaleX = (1.0 + jaw * 0.12) * width;
    const scaleY = (1.0 + (height - 1.0) * 0.5);
    const scaleZ = (1.0 + (depth - 1.0) * 0.4);

    // Ajustements spécifiques par type de coiffure Afro
    let positionY = 0.58 + hairlineOffsetY;
    let positionZ = -0.02;

    if (hairstyleType.includes('locks') || hairstyleType.includes('braids')) {
      positionY += 0.04; // Les tresses/dreadlocks se posent légèrement plus haut sur la couronne
    } else if (hairstyleType.includes('fade') || hairstyleType.includes('taper')) {
      positionY += 0.01;
    }

    return {
      position: [0, positionY, positionZ],
      scale: [scaleX, scaleY, scaleZ],
      rotation: [0, 0, 0]
    };
  }
}
