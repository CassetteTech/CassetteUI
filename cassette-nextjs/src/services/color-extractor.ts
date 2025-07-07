export interface ColorExtractionResult {
  dominantColor: string;
  vibrantColor?: string;
  darkColor?: string;
  lightColor?: string;
}

export class ColorExtractor {
  private static readonly CANVAS_SIZE = 200;
  private static readonly MAX_COLORS = 32;
  private static readonly MIN_SATURATION = 0.4;
  private static readonly MIN_LIGHTNESS = 0.3;
  private static readonly MAX_LIGHTNESS = 0.7;
  private static readonly DEFAULT_COLOR = '#3B82F6'; // Blue

  static async extractDominantColor(imageUrl: string): Promise<ColorExtractionResult> {
    try {
      // Create a canvas and context
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      canvas.width = this.CANVAS_SIZE;
      canvas.height = this.CANVAS_SIZE;

      // Create and load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const imageData = await new Promise<ImageData>((resolve, reject) => {
        img.onload = () => {
          try {
            // Draw image to canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve(imageData);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // Extract colors from image data
      const colors = this.extractColorsFromImageData(imageData);
      
      // Filter for vibrant colors
      const vibrantColors = colors
        .filter(color => this.isVibrantColor(color.hex))
        .sort((a, b) => b.count - a.count);

      // Return the most vibrant color or default
      const dominantColor = vibrantColors.length > 0 
        ? vibrantColors[0].hex 
        : this.DEFAULT_COLOR;

      return {
        dominantColor,
        vibrantColor: vibrantColors[0]?.hex,
        darkColor: colors.find(c => this.isDarkColor(c.hex))?.hex,
        lightColor: colors.find(c => this.isLightColor(c.hex))?.hex
      };
    } catch (error) {
      console.error('Error in extractDominantColor:', error);
      return {
        dominantColor: this.DEFAULT_COLOR
      };
    }
  }

  private static extractColorsFromImageData(imageData: ImageData): Array<{hex: string; count: number}> {
    const data = imageData.data;
    const colorCounts = new Map<string, number>();
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Quantize colors to reduce noise
      const quantizedR = Math.round(r / 8) * 8;
      const quantizedG = Math.round(g / 8) * 8;
      const quantizedB = Math.round(b / 8) * 8;
      
      const hex = this.rgbToHex(quantizedR, quantizedG, quantizedB);
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
    
    // Convert to array and sort by count
    return Array.from(colorCounts.entries())
      .map(([hex, count]) => ({ hex, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, this.MAX_COLORS);
  }

  private static isVibrantColor(hex: string): boolean {
    const hsl = this.hexToHsl(hex);
    return hsl.s > this.MIN_SATURATION && 
           hsl.l > this.MIN_LIGHTNESS && 
           hsl.l < this.MAX_LIGHTNESS;
  }

  private static isDarkColor(hex: string): boolean {
    const hsl = this.hexToHsl(hex);
    return hsl.l < 0.3;
  }

  private static isLightColor(hex: string): boolean {
    const hsl = this.hexToHsl(hex);
    return hsl.l > 0.7;
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }

  private static hexToHsl(hex: string): {h: number; s: number; l: number} {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

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
}