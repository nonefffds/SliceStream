import React, { useCallback, useState } from 'react';
import { Icons } from './Icon';
import { SourceImage } from '../types';
import * as CanvasUtils from '../utils/canvas';

interface Props {
  onImagesAdded: (images: SourceImage[]) => void;
  texts: {
    title: string;
    sub: string;
  };
}

export const UploadZone: React.FC<Props> = ({ onImagesAdded, texts }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const promises: Promise<SourceImage>[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        promises.push(CanvasUtils.loadImage(files[i]));
      }
    }
    const newImages = await Promise.all(promises);
    onImagesAdded(newImages);
  }, [onImagesAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer group
        ${isDragging 
          ? 'border-primary bg-primary/10 scale-[1.01]' 
          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
        }
      `}
    >
      <input 
        type="file" 
        multiple 
        accept="image/*"
        className="hidden" 
        id="fileInput"
        onChange={(e) => processFiles(e.target.files)}
      />
      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center gap-4">
        <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'}`}>
          <Icons.Upload size={32} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-200">{texts.title}</h3>
          <p className="text-sm text-slate-400 mt-1">{texts.sub}</p>
        </div>
      </label>
    </div>
  );
};
