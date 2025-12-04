import React from 'react';
import { SourceImage } from '../types';
import { Icons } from './Icon';

interface Props {
  images: SourceImage[];
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  texts: {
    sourceImages: string;
    dimensions: string;
  };
}

export const ImageList: React.FC<Props> = ({ images, onRemove, onMove, texts }) => {
  if (images.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
        <span>{texts.sourceImages} ({images.length})</span>
        <span>{texts.dimensions}</span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {images.map((img, index) => (
          <div 
            key={img.id} 
            className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group"
          >
            <div className="relative w-12 h-12 bg-slate-900 rounded overflow-hidden flex-shrink-0">
              <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{img.name}</p>
              <p className="text-xs text-slate-400">
                {img.width} × {img.height}px
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Icons.MoveUp size={16} />
              </button>
              <button 
                onClick={() => onMove(index, 1)}
                disabled={index === images.length - 1}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <Icons.MoveDown size={16} />
              </button>
              <button 
                onClick={() => onRemove(img.id)}
                className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 ml-1"
              >
                <Icons.Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
