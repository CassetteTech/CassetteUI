export interface ColorPalette {
  dominant: string;      // Most prominent color (weighted by frequency + position)
  vibrant: string;       // Most saturated color (accent)
  muted: string;         // Lower saturation (backgrounds)
  dark: string;          // Dark shade (text/shadows)
  light: string;         // Light shade (highlights)
  complementary: string; // Opposite on color wheel
  analogous: [string, string]; // Adjacent colors for harmony
  confidence: number;    // 0-1 extraction quality
}

// Legacy interface for backwards compatibility
export interface ColorExtractionResult {
  dominantColor: string;
  vibrantColor?: string;
  darkColor?: string;
  lightColor?: string;
}

interface WeightedPixel {
  r: number;
  g: number;
  b: number;
  weight: number;
}

interface ColorCluster {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  lab: { l: number; a: number; b: number };
  population: number;
}

interface ExtractionConfig {
  canvasSize: number;
  clusterCount: number;
  centerBias: number;
  minSaturationVibrant: number;
}

export class ColorExtractor {
  private static readonly DEFAULT_CONFIG: ExtractionConfig = {
    canvasSize: 100,
    clusterCount: 8,
    centerBias: 1.5,
    minSaturationVibrant: 0.25,
  };

  // Brand colors from theme.ts for fallback
  private static readonly BRAND_COLORS = {
    red: '#ED2748',
    black: '#1F2327',
    blackL: '#2B3035',
    cream: '#F8F0DE',
    blue: '#3B82F6',
  };

  /**
   * Extract a full color palette from an image
   */
  static async extractPalette(
    imageUrl: string,
    config: Partial<ExtractionConfig> = {}
  ): Promise<ColorPalette> {
    const cfg = { ...this.DEFAULT_CONFIG, ...config };

    try {
      const imageData = await this.loadImage(imageUrl, cfg.canvasSize);
      const pixels = this.extractWeightedPixels(imageData, cfg.centerBias);

      if (pixels.length < 10) {
        return this.getBrandPalette();
      }

      const clusters = this.medianCut(pixels, Math.log2(cfg.clusterCount));

      if (clusters.length === 0) {
        return this.getBrandPalette();
      }

      const basePalette = this.assignPaletteRoles(clusters, cfg);
      return this.generateHarmony(basePalette);
    } catch (error) {
      console.error('Color extraction failed:', error);
      return this.getBrandPalette();
    }
  }

  /**
   * Legacy method for backwards compatibility
   */
  static async extractDominantColor(imageUrl: string): Promise<ColorExtractionResult> {
    const palette = await this.extractPalette(imageUrl);
    return {
      dominantColor: palette.dominant,
      vibrantColor: palette.vibrant,
      darkColor: palette.dark,
      lightColor: palette.light,
    };
  }

  /**
   * Get fallback palette using brand colors
   */
  static getBrandPalette(): ColorPalette {
    return {
      dominant: this.BRAND_COLORS.red,
      vibrant: this.BRAND_COLORS.red,
      muted: this.BRAND_COLORS.blackL,
      dark: this.BRAND_COLORS.black,
      light: this.BRAND_COLORS.cream,
      complementary: '#27ED9F',
      analogous: ['#ED6327', '#ED2795'],
      confidence: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Image Loading
  // ─────────────────────────────────────────────────────────────

  private static async loadImage(imageUrl: string, size: number): Promise<ImageData> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    canvas.width = size;
    canvas.height = size;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        resolve(ctx.getImageData(0, 0, size, size));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Pixel Extraction with Spatial Weighting
  // ─────────────────────────────────────────────────────────────

  private static extractWeightedPixels(
    imageData: ImageData,
    centerBias: number
  ): WeightedPixel[] {
    const { data, width, height } = imageData;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const pixels: WeightedPixel[] = [];

    // Sample every 2nd pixel for balance of accuracy and performance
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Skip near-white and near-black (often background noise)
        const brightness = (r + g + b) / 3;
        if (brightness > 250 || brightness < 5) continue;

        // Calculate spatial weight (gaussian falloff from center)
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const spatialWeight = 1 + (centerBias - 1) * Math.exp(-2 * Math.pow(dist / maxDist, 2));

        pixels.push({ r, g, b, weight: spatialWeight });
      }
    }

    return pixels;
  }

  // ─────────────────────────────────────────────────────────────
  // Median Cut Algorithm
  // ─────────────────────────────────────────────────────────────

  private static medianCut(pixels: WeightedPixel[], depth: number): ColorCluster[] {
    if (depth === 0 || pixels.length < 2) {
      return pixels.length > 0 ? [this.createCluster(pixels)] : [];
    }

    // Find dimension with largest range
    const ranges = {
      r: this.getRange(pixels, 'r'),
      g: this.getRange(pixels, 'g'),
      b: this.getRange(pixels, 'b'),
    };

    const maxDim = (Object.entries(ranges) as [keyof typeof ranges, number][])
      .sort((a, b) => b[1] - a[1])[0][0];

    // Sort by largest dimension
    const sorted = [...pixels].sort((a, b) => a[maxDim] - b[maxDim]);

    // Find weighted median
    const totalWeight = sorted.reduce((sum, p) => sum + p.weight, 0);
    let accWeight = 0;
    let medianIndex = Math.floor(sorted.length / 2);

    for (let i = 0; i < sorted.length; i++) {
      accWeight += sorted[i].weight;
      if (accWeight >= totalWeight / 2) {
        medianIndex = Math.max(1, i);
        break;
      }
    }

    const left = sorted.slice(0, medianIndex);
    const right = sorted.slice(medianIndex);

    return [
      ...this.medianCut(left, depth - 1),
      ...this.medianCut(right, depth - 1),
    ];
  }

  private static getRange(pixels: WeightedPixel[], dim: 'r' | 'g' | 'b'): number {
    if (pixels.length === 0) return 0;
    const values = pixels.map(p => p[dim]);
    return Math.max(...values) - Math.min(...values);
  }

  private static createCluster(pixels: WeightedPixel[]): ColorCluster {
    const totalWeight = pixels.reduce((sum, p) => sum + p.weight, 0);

    const r = Math.round(pixels.reduce((sum, p) => sum + p.r * p.weight, 0) / totalWeight);
    const g = Math.round(pixels.reduce((sum, p) => sum + p.g * p.weight, 0) / totalWeight);
    const b = Math.round(pixels.reduce((sum, p) => sum + p.b * p.weight, 0) / totalWeight);

    const hex = this.rgbToHex(r, g, b);
    const hsl = this.rgbToHsl(r, g, b);
    const lab = this.rgbToLab(r, g, b);

    return {
      hex,
      rgb: { r, g, b },
      hsl,
      lab,
      population: totalWeight,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Palette Role Assignment
  // ─────────────────────────────────────────────────────────────

  private static assignPaletteRoles(
    clusters: ColorCluster[],
    config: ExtractionConfig
  ): Omit<ColorPalette, 'complementary' | 'analogous'> {
    // Sort by population for dominant
    const byPopulation = [...clusters].sort((a, b) => b.population - a.population);
    const dominant = byPopulation[0];

    // Find most vibrant (highest saturation with reasonable lightness)
    const vibrantCandidates = clusters
      .filter(c => c.hsl.l > 0.15 && c.hsl.l < 0.85 && c.hsl.s >= config.minSaturationVibrant)
      .sort((a, b) => b.hsl.s - a.hsl.s);
    const vibrant = vibrantCandidates[0] || dominant;

    // Find muted (moderate saturation, good for backgrounds)
    const mutedCandidates = clusters
      .filter(c => c.hsl.s < 0.5 && c.hsl.l > 0.25 && c.hsl.l < 0.75)
      .sort((a, b) => b.population - a.population);
    const muted = mutedCandidates[0] || this.desaturate(dominant);

    // Find darkest usable color
    const darkCandidates = clusters
      .filter(c => c.hsl.l < 0.4)
      .sort((a, b) => a.hsl.l - b.hsl.l);
    const dark = darkCandidates[0] || this.darken(dominant);

    // Find lightest usable color
    const lightCandidates = clusters
      .filter(c => c.hsl.l > 0.6)
      .sort((a, b) => b.hsl.l - a.hsl.l);
    const light = lightCandidates[0] || this.lighten(dominant);

    // Calculate confidence based on cluster diversity and population spread
    const confidence = this.calculateConfidence(clusters);

    return {
      dominant: dominant.hex,
      vibrant: vibrant.hex,
      muted: muted.hex,
      dark: dark.hex,
      light: light.hex,
      confidence,
    };
  }

  private static calculateConfidence(clusters: ColorCluster[]): number {
    if (clusters.length === 0) return 0;
    if (clusters.length === 1) return 0.3;

    // Higher confidence with more diverse, well-distributed clusters
    const totalPop = clusters.reduce((sum, c) => sum + c.population, 0);
    const normalized = clusters.map(c => c.population / totalPop);

    // Entropy-based measure
    const entropy = -normalized.reduce((sum, p) => {
      return p > 0 ? sum + p * Math.log2(p) : sum;
    }, 0);

    const maxEntropy = Math.log2(clusters.length);
    return Math.min(1, entropy / maxEntropy);
  }

  // ─────────────────────────────────────────────────────────────
  // Color Harmony Generation
  // ─────────────────────────────────────────────────────────────

  private static generateHarmony(
    basePalette: Omit<ColorPalette, 'complementary' | 'analogous'>
  ): ColorPalette {
    const dominantHsl = this.hexToHsl(basePalette.dominant);

    // Complementary: 180 degrees opposite on color wheel
    const complementary = this.hslToHex({
      h: (dominantHsl.h + 0.5) % 1,
      s: Math.min(dominantHsl.s * 0.9, 0.7),
      l: Math.max(0.35, Math.min(0.65, dominantHsl.l)),
    });

    // Analogous: 30 degrees on either side
    const analogous: [string, string] = [
      this.hslToHex({
        h: (dominantHsl.h - 0.083 + 1) % 1,
        s: dominantHsl.s * 0.85,
        l: Math.max(0.35, Math.min(0.65, dominantHsl.l)),
      }),
      this.hslToHex({
        h: (dominantHsl.h + 0.083) % 1,
        s: dominantHsl.s * 0.85,
        l: Math.max(0.35, Math.min(0.65, dominantHsl.l)),
      }),
    ];

    return { ...basePalette, complementary, analogous };
  }

  // ─────────────────────────────────────────────────────────────
  // Color Manipulation Helpers
  // ─────────────────────────────────────────────────────────────

  private static desaturate(cluster: ColorCluster): ColorCluster {
    const newHsl = { ...cluster.hsl, s: cluster.hsl.s * 0.3 };
    const hex = this.hslToHex(newHsl);
    const rgb = this.hexToRgb(hex);
    return {
      hex,
      rgb,
      hsl: newHsl,
      lab: this.rgbToLab(rgb.r, rgb.g, rgb.b),
      population: cluster.population * 0.5,
    };
  }

  private static darken(cluster: ColorCluster): ColorCluster {
    const newHsl = { ...cluster.hsl, l: Math.max(0.1, cluster.hsl.l * 0.4) };
    const hex = this.hslToHex(newHsl);
    const rgb = this.hexToRgb(hex);
    return {
      hex,
      rgb,
      hsl: newHsl,
      lab: this.rgbToLab(rgb.r, rgb.g, rgb.b),
      population: cluster.population * 0.5,
    };
  }

  private static lighten(cluster: ColorCluster): ColorCluster {
    const newHsl = { ...cluster.hsl, l: Math.min(0.9, cluster.hsl.l + (1 - cluster.hsl.l) * 0.6) };
    const hex = this.hslToHex(newHsl);
    const rgb = this.hexToRgb(hex);
    return {
      hex,
      rgb,
      hsl: newHsl,
      lab: this.rgbToLab(rgb.r, rgb.g, rgb.b),
      population: cluster.population * 0.5,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Color Space Conversions
  // ─────────────────────────────────────────────────────────────

  private static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0'))
      .join('');
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  private static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  private static hexToHsl(hex: string): { h: number; s: number; l: number } {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHsl(r, g, b);
  }

  private static hslToHex(hsl: { h: number; s: number; l: number }): string {
    const { h, s, l } = hsl;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return this.rgbToHex(gray, gray, gray);
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return this.rgbToHex(r, g, b);
  }

  private static rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
    // RGB to XYZ
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;

    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

    rr *= 100;
    gg *= 100;
    bb *= 100;

    const x = rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375;
    const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750;
    const z = rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041;

    // XYZ to LAB (D65 illuminant)
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1/3) : (7.787 * x / xn) + 16/116;
    const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1/3) : (7.787 * y / yn) + 16/116;
    const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1/3) : (7.787 * z / zn) + 16/116;

    return {
      l: (116 * fy) - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz),
    };
  }
}
