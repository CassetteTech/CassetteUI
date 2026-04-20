'use client';

import type { Area } from 'react-easy-crop';

const SUPPORTED_OUTPUT_TYPES = new Set(['image/jpeg', 'image/webp']);
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};
const MAX_AVATAR_DIMENSION = 512;
const DEFAULT_EXPORT_QUALITY = 0.82;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for cropping.'));
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality = DEFAULT_EXPORT_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export cropped image.'));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function replaceFileExtension(fileName: string, mimeType: string): string {
  const extension = EXTENSION_BY_TYPE[mimeType];
  if (!extension) {
    return fileName;
  }

  const nextName = fileName.replace(/\.[^.]+$/, '');
  if (nextName !== fileName) {
    return `${nextName}${extension}`;
  }

  return `${fileName}${extension}`;
}

export async function cropAvatarFile(file: File, croppedAreaPixels: Area): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const width = Math.max(1, Math.round(croppedAreaPixels.width));
    const height = Math.max(1, Math.round(croppedAreaPixels.height));
    const maxX = Math.max(0, image.naturalWidth - width);
    const maxY = Math.max(0, image.naturalHeight - height);
    const sourceX = Math.min(Math.max(0, Math.round(croppedAreaPixels.x)), maxX);
    const sourceY = Math.min(Math.max(0, Math.round(croppedAreaPixels.y)), maxY);
    const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to prepare image crop.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      sourceX,
      sourceY,
      width,
      height,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    const blob = await canvasToBlob(canvas, outputType);
    const resolvedType = SUPPORTED_OUTPUT_TYPES.has(blob.type) ? blob.type : outputType;

    return new File([blob], replaceFileExtension(file.name, resolvedType), {
      type: resolvedType,
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
