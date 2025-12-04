import { SourceImage, SliceSettings, SliceMode, GeneratedSlice } from '../types';

export const loadImage = (file: File): Promise<SourceImage> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        id: Math.random().toString(36).substring(7),
        file,
        url,
        width: img.width,
        height: img.height,
        name: file.name.split('.')[0],
        crop: { top: 0, bottom: 0, left: 0, right: 0 },
      });
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Creates a new Canvas/Image with crop/pad applied.
 * Positive values remove pixels. Negative values add white pixels.
 */
const getProcessedImage = async (img: SourceImage): Promise<{ cvs: HTMLCanvasElement; width: number; height: number }> => {
  const domImg = new Image();
  domImg.src = img.url;
  await domImg.decode();

  const { top, bottom, left, right } = img.crop;

  // Original dimensions
  const ow = img.width;
  const oh = img.height;

  // New dimensions
  // width = original - left_cut - right_cut
  // If left is -10 (padding), we add 10px. 
  // Formula: newW = ow - left - right
  const newWidth = ow - left - right;
  const newHeight = oh - top - bottom;

  if (newWidth <= 0 || newHeight <= 0) {
     throw new Error(`Invalid crop dimensions for image ${img.name}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Context error');

  // Fill white background (for padding)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, newWidth, newHeight);

  // Draw image
  // The source image is always drawn starting at (-left, -top) relative to the new canvas origin.
  // Example: 
  // 1. Crop 10px left (left=10). We draw at x = -10. Result: first 10px hidden.
  // 2. Pad 10px left (left=-10). We draw at x = 10. Result: 10px white bar on left.
  ctx.drawImage(domImg, -left, -top);

  return { cvs: canvas, width: newWidth, height: newHeight };
};

export const stitchImages = async (
  images: SourceImage[], 
  targetWidth?: number
): Promise<{ blob: Blob; width: number; height: number; url: string } | null> => {
  if (images.length === 0) return null;

  // 1. Process all images first to get their "effective" dimensions after crop/pad
  const processedImages = [];
  for (const img of images) {
    processedImages.push(await getProcessedImage(img));
  }

  // 2. Determine common width based on processed images
  const maxProcessedWidth = Math.max(...processedImages.map(p => p.width));
  const finalTargetWidth = (targetWidth && targetWidth > 0) ? targetWidth : maxProcessedWidth;

  // 3. Calculate scaling and total height
  const scalingFactors = processedImages.map(p => finalTargetWidth / p.width);
  const scaledHeights = processedImages.map((p, i) => Math.round(p.height * scalingFactors[i]));
  const totalHeight = scaledHeights.reduce((acc, h) => acc + h, 0);

  // 4. Create Main Canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalTargetWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // 5. Draw processed images
  let currentY = 0;
  for (let i = 0; i < processedImages.length; i++) {
    const pImg = processedImages[i];
    const h = scaledHeights[i];
    
    // Draw the processed canvas scaled to target width
    ctx.drawImage(pImg.cvs, 0, currentY, finalTargetWidth, h);
    currentY += h;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          width: finalTargetWidth,
          height: totalHeight,
          url: URL.createObjectURL(blob),
        });
      }
    }, 'image/png');
  });
};

export const sliceImage = async (
  sourceUrl: string,
  settings: SliceSettings,
  totalWidth: number,
  totalHeight: number
): Promise<GeneratedSlice[]> => {
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No context');

  const img = new Image();
  img.src = sourceUrl;
  await img.decode();
  ctx.drawImage(img, 0, 0);

  const slices: GeneratedSlice[] = [];
  let sliceHeights: number[] = [];

  // Calculate slice heights based on mode
  if (settings.mode === SliceMode.EQUAL_PARTS) {
    const partHeight = Math.floor(totalHeight / settings.value);
    const remainder = totalHeight % settings.value;
    for (let i = 0; i < settings.value; i++) {
      // Add remainder pixel to the last slice or distribute? Let's add to last.
      if (i === settings.value - 1) {
        sliceHeights.push(partHeight + remainder);
      } else {
        sliceHeights.push(partHeight);
      }
    }
  } else {
    // FIXED_HEIGHT
    let remaining = totalHeight;
    while (remaining > 0) {
      const h = Math.min(settings.value, remaining);
      sliceHeights.push(h);
      remaining -= h;
    }
  }

  // Generate Date string for filename
  const now = new Date();
  const yymmdd = [
    now.getFullYear().toString().slice(-2),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0')
  ].join('');

  // Generate blobs
  let currentY = 0;
  for (let i = 0; i < sliceHeights.length; i++) {
    const h = sliceHeights[i];
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = totalWidth;
    sliceCanvas.height = h;
    const sliceCtx = sliceCanvas.getContext('2d');
    
    if (sliceCtx) {
      // Draw portion
      sliceCtx.drawImage(canvas, 0, currentY, totalWidth, h, 0, 0, totalWidth, h);
      
      const blob = await new Promise<Blob | null>((resolve) => 
        sliceCanvas.toBlob(resolve, `image/${settings.format}`, settings.quality)
      );

      if (blob) {
        // Construct filename
        let filenameBase = settings.prefix;
        
        // Replace <YYMMDD>
        filenameBase = filenameBase.replace(/<YYMMDD>/gi, yymmdd);

        // Replace <NO>
        if (/<NO>/i.test(filenameBase)) {
          filenameBase = filenameBase.replace(/<NO>/gi, (i + 1).toString());
        } else {
          // Fallback if no placeholder provided, to ensure uniqueness and backward compatibility
          const indexStr = (i + 1).toString().padStart(2, '0');
          filenameBase = `${filenameBase}_${indexStr}`;
        }

        const id = Math.random().toString(36).substring(7);
        slices.push({
          id,
          blob,
          url: URL.createObjectURL(blob),
          filename: `${filenameBase}.${settings.format}`,
          width: totalWidth,
          height: h
        });
      }
    }
    currentY += h;
  }

  return slices;
};
