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
      });
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const stitchImages = async (
  images: SourceImage[], 
  targetWidth?: number
): Promise<{ blob: Blob; width: number; height: number; url: string } | null> => {
  if (images.length === 0) return null;

  // 1. Determine common width
  // If targetWidth is provided and valid (>0), use it. Otherwise find max width.
  const maxWidth = (targetWidth && targetWidth > 0) 
    ? targetWidth 
    : Math.max(...images.map((img) => img.width));

  // 2. Calculate total height
  // Scale every image to match maxWidth
  const scalingFactors = images.map((img) => maxWidth / img.width);
  const scaledHeights = images.map((img, i) => Math.round(img.height * scalingFactors[i]));
  const totalHeight = scaledHeights.reduce((acc, h) => acc + h, 0);

  // 3. Create Canvas
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // 4. Draw images
  let currentY = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const domImg = new Image();
    domImg.src = img.url;
    await domImg.decode(); // Ensure loaded
    
    const h = scaledHeights[i];
    // Draw scaled to maxWidth
    ctx.drawImage(domImg, 0, currentY, maxWidth, h);
    currentY += h;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          width: maxWidth,
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
