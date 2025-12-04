import React, { useState } from 'react';
import { SourceImage } from '../types';
import { Icons } from './Icon';

interface Props {
  images: SourceImage[];
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onUpdateCrop: (id: string, crop: SourceImage['crop']) => void;
  texts: {
    sourceImages: string;
    dimensions: string;
    crop: string;
    cropHelp: string;
    top: string;
    bottom: string;
    left: string;
    right: string;
    pixels: string;
  };
}

export const ImageList: React.FC<Props> = ({ images, onRemove, onMove, onUpdateCrop, texts }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (images.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleCropChange = (id: string, field: keyof SourceImage['crop'], value: string) => {
    const img = images.find(i => i.id === id);
    if (!img) return;
    
    // Allow negative values for padding
    const numVal = parseInt(value) || 0;
    
    onUpdateCrop(id, {
      ...img.crop,
      [field]: numVal
    });
  };

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
        <span>{texts.sourceImages} ({images.length})</span>
        <span>{texts.dimensions}</span>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {images.map((img, index) => (
          <div key={img.id} className="bg-surface rounded-lg border border-slate-700 overflow-hidden">
            <div 
              className="flex items-center gap-3 p-2 hover:bg-slate-700/30 transition-colors group"
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

              <div className="flex items-center gap-1">
                 <button 
                  onClick={() => toggleExpand(img.id)}
                  className={`p-1.5 rounded transition-colors ${expandedId === img.id ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                  title={texts.crop}
                >
                  <Icons.Crop size={14} />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
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

            {/* Crop Settings Panel */}
            {expandedId === img.id && (
              <div className="p-3 bg-slate-900/50 border-t border-slate-700 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                     <Icons.Scissors size={10} /> {texts.crop}
                   </span>
                   <span className="text-[10px] text-slate-500">{texts.cropHelp}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Top */}
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">{texts.top}</label>
                    <input 
                      type="number" 
                      value={img.crop.top} 
                      onChange={(e) => handleCropChange(img.id, 'top', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:border-primary outline-none"
                    />
                  </div>
                  {/* Bottom */}
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">{texts.bottom}</label>
                    <input 
                      type="number" 
                      value={img.crop.bottom} 
                      onChange={(e) => handleCropChange(img.id, 'bottom', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:border-primary outline-none"
                    />
                  </div>
                  {/* Left */}
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">{texts.left}</label>
                    <input 
                      type="number" 
                      value={img.crop.left} 
                      onChange={(e) => handleCropChange(img.id, 'left', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:border-primary outline-none"
                    />
                  </div>
                  {/* Right */}
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">{texts.right}</label>
                    <input 
                      type="number" 
                      value={img.crop.right} 
                      onChange={(e) => handleCropChange(img.id, 'right', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-center focus:border-primary outline-none"
                    />
                  </div>
                </div>
                
                <div className="mt-2 text-[10px] text-slate-600 font-mono text-center border-t border-slate-800 pt-1">
                   {/* Preview final dimensions */}
                   {Math.max(0, img.width - img.crop.left - img.crop.right)} x {Math.max(0, img.height - img.crop.top - img.crop.bottom)} px
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
