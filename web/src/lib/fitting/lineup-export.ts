/**
 * Web 3D Line-Up & Export helper for Afrofade (BMAD Story 9.3).
 * Manages slider state for hairline, fade intensity, and export payload formatting.
 */

export interface LineUpParams {
  hairlineOffsetMm: number;        // Range: -15.0 to +15.0 mm
  taperFadeIntensity: number;     // Range: 0.0 to 1.0
  sideburnContourSharpness: number; // Range: 0.0 to 1.0
}

export interface TryOnExportPayload {
  exportId: string;
  userId: string;
  headId: string;
  headVersion: number;
  styleId: string;
  styleVersion: number;
  lineUp: LineUpParams;
}

export const DEFAULT_LINEUP_PARAMS: LineUpParams = {
  hairlineOffsetMm: 0,
  taperFadeIntensity: 0.5,
  sideburnContourSharpness: 0.5,
};

export function validateLineUpParams(params: LineUpParams): void {
  if (params.hairlineOffsetMm < -15 || params.hairlineOffsetMm > 15) {
    throw new Error('Hairline offset must be between -15mm and +15mm.');
  }
  if (params.taperFadeIntensity < 0 || params.taperFadeIntensity > 1) {
    throw new Error('Taper fade intensity must be between 0.0 and 1.0.');
  }
  if (params.sideburnContourSharpness < 0 || params.sideburnContourSharpness > 1) {
    throw new Error('Sideburn contour sharpness must be between 0.0 and 1.0.');
  }
}

export function buildTryOnExportPayload(
  exportId: string,
  userId: string,
  headId: string,
  headVersion: number,
  styleId: string,
  styleVersion: number,
  lineUp: LineUpParams = DEFAULT_LINEUP_PARAMS
): TryOnExportPayload {
  validateLineUpParams(lineUp);
  return {
    exportId,
    userId,
    headId,
    headVersion,
    styleId,
    styleVersion,
    lineUp,
  };
}
