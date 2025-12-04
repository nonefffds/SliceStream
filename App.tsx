import React, { useState, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { ImageList } from './components/ImageList';
import { Icons } from './components/Icon';
import { SourceImage, SliceSettings, SliceMode, GeneratedSlice, Preset } from './types';
import * as CanvasUtils from './utils/canvas';
import { translations, Language } from './locales';

function App() {
  const [images, setImages] = useState<SourceImage[]>([]);
  const [stitchedImage, setStitchedImage] = useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [slices, setSlices] = useState<GeneratedSlice[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'preview'>('setup');
  
  // App State
  const [lang, setLang] = useState<Language>('zh'); 
  const [customWidth, setCustomWidth] = useState<number | ''>(''); 
  
  // Settings
  const [settings, setSettings] = useState<SliceSettings>({
    mode: SliceMode.FIXED_HEIGHT,
    value: 1000,
    prefix: 'slice',
    format: 'jpeg',
    quality: 0.92
  });

  // Presets State
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Help UI State
  const [showPatternHelp, setShowPatternHelp] = useState(false);

  const t = translations[lang];

  // Load Presets on Mount
  useEffect(() => {
    const saved = localStorage.getItem('slicestream_presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, []);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name: newPresetName,
      settings: { ...settings }
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('slicestream_presets', JSON.stringify(updated));
    setActivePresetId(newPreset.id);
    setShowSavePreset(false);
    setNewPresetName('');
  };

  const handleLoadPreset = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      setSettings(preset.settings);
      setActivePresetId(id);
    } else {
      setActivePresetId(null);
    }
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('slicestream_presets', JSON.stringify(updated));
    if (activePresetId === id) setActivePresetId(null);
  };

  // Stitch effect
  useEffect(() => {
    const performStitch = async () => {
      if (images.length === 0) {
        setStitchedImage(null);
        return;
      }
      setIsProcessing(true);
      try {
        const widthToUse = customWidth === '' ? undefined : Number(customWidth);
        const result = await CanvasUtils.stitchImages(images, widthToUse);
        setStitchedImage(result);
      } catch (e) {
        console.error("Stitching failed", e);
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Debounce slightly to avoid rapid restitching on drag or type
    const timeout = setTimeout(performStitch, 500);
    return () => clearTimeout(timeout);
  }, [images, customWidth]);

  const handleRemove = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    setImages(prev => {
      const newImages = [...prev];
      const temp = newImages[index];
      newImages[index] = newImages[index + direction];
      newImages[index + direction] = temp;
      return newImages;
    });
  };

  const handleUpdateCrop = (id: string, crop: SourceImage['crop']) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, crop } : img
    ));
  };

  const handleSlice = async () => {
    if (!stitchedImage) return;
    setIsProcessing(true);
    try {
      const results = await CanvasUtils.sliceImage(
        stitchedImage.url,
        settings,
        stitchedImage.width,
        stitchedImage.height
      );
      setSlices(results);
      setActiveTab('preview');
    } catch (e) {
      console.error(e);
      alert('Error processing slices');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    slices.forEach(slice => {
      const a = document.createElement('a');
      a.href = slice.url;
      a.download = slice.filename;
      a.click();
    });
  };

  return (
    <div className="flex h-full text-slate-200">
      {/* Sidebar Controls */}
      <div className="w-[400px] flex-shrink-0 bg-surface border-r border-slate-800 flex flex-col h-full z-10 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-lg text-primary">
                <Icons.Layers size={24} />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">{t.title}</h1>
            </div>
            
            {/* Language Switcher */}
            <div className="flex bg-slate-900 rounded-lg p-1 gap-1">
              {(['zh', 'ja', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 text-xs font-bold rounded uppercase transition-colors ${lang === l ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 ml-12">{t.subtitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">1</span>
              {t.step1}
            </h2>
            <UploadZone 
              onImagesAdded={(newImgs) => setImages(prev => [...prev, ...newImgs])} 
              texts={{ title: t.step1Desc, sub: t.step1Sub }}
            />
            <ImageList 
              images={images} 
              onRemove={handleRemove} 
              onMove={handleMove} 
              onUpdateCrop={handleUpdateCrop}
              texts={{ 
                sourceImages: t.sourceImages, 
                dimensions: t.dimensions,
                crop: t.crop,
                cropHelp: t.cropHelp,
                top: t.top,
                bottom: t.bottom,
                left: t.left,
                right: t.right,
                pixels: t.pixels
              }}
            />
          </div>

          <div className="mb-8 border-t border-slate-800 pt-8">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">2</span>
              {t.step2}
            </h2>
            
            {/* Custom Width Input */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t.outputWidth} (px)
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={t.autoWidth}
                  value={customWidth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomWidth(val === '' ? '' : parseInt(val));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          <div className="mb-8 border-t border-slate-800 pt-8">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">3</span>
                  {t.step3}
                </h2>
                
                {/* Save Preset Button */}
                {!showSavePreset && (
                  <button 
                    onClick={() => setShowSavePreset(true)}
                    className="text-xs text-primary hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Icons.Save size={14} />
                    {t.savePreset}
                  </button>
                )}
             </div>
            
            <div className="space-y-4">
              {/* Presets UI */}
              <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                {showSavePreset ? (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder={t.presetName}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded text-xs px-2 py-1.5 outline-none focus:border-primary"
                    />
                    <button onClick={handleSavePreset} className="text-emerald-500 hover:text-emerald-400 p-1"><Icons.Check size={16} /></button>
                    <button onClick={() => setShowSavePreset(false)} className="text-slate-500 hover:text-slate-300 p-1"><Icons.X size={16} /></button>
                  </div>
                ) : (
                  <div className="relative group">
                    <select 
                      value={activePresetId || ''} 
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded text-xs px-2 py-2 outline-none focus:border-primary appearance-none text-slate-300"
                    >
                      <option value="">-- {t.presets} ({presets.length}) --</option>
                      {presets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-2.5 pointer-events-none text-slate-500">
                      <Icons.ChevronDown size={14} />
                    </div>
                    {/* Delete Preset Button */}
                    {activePresetId && (
                      <button 
                        onClick={(e) => handleDeletePreset(activePresetId, e)}
                        className="absolute right-8 top-1.5 p-1 text-slate-600 hover:text-red-400 transition-colors"
                        title={t.delete}
                      >
                         <Icons.Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg">
                <button
                  onClick={() => setSettings(s => ({ ...s, mode: SliceMode.FIXED_HEIGHT, value: 1000 }))}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${settings.mode === SliceMode.FIXED_HEIGHT ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.modeFixed}
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, mode: SliceMode.EQUAL_PARTS, value: 3 }))}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${settings.mode === SliceMode.EQUAL_PARTS ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.modeEqual}
                </button>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {settings.mode === SliceMode.FIXED_HEIGHT ? `${t.sliceHeight} (px)` : t.numberOfParts}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.value}
                    onChange={(e) => {
                      setSettings(s => ({ ...s, value: parseInt(e.target.value) || 0 }));
                      setActivePresetId(null); // Modify clears preset selection
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-slate-600 font-medium">
                    {settings.mode === SliceMode.FIXED_HEIGHT ? 'PX' : 'QTY'}
                  </div>
                </div>
              </div>

              {/* Filename & Format & Quality */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                   <div className="flex items-center justify-between mb-1.5">
                     <label className="block text-xs font-medium text-slate-400">{t.prefix}</label>
                     <button 
                       onClick={() => setShowPatternHelp(!showPatternHelp)}
                       className={`text-[10px] flex items-center gap-1 hover:text-white transition-colors ${showPatternHelp ? 'text-primary' : 'text-primary/70'}`}
                     >
                       <Icons.Info size={12} />
                       {t.patternHelp}
                     </button>
                   </div>
                   <input
                    type="text"
                    value={settings.prefix}
                    onChange={(e) => {
                      setSettings(s => ({ ...s, prefix: e.target.value }));
                      setActivePresetId(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                   <label className="block text-xs font-medium text-slate-400 mb-1.5">{t.format}</label>
                   <select
                    value={settings.format}
                    onChange={(e) => {
                      setSettings(s => ({ ...s, format: e.target.value as any }));
                      setActivePresetId(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                  </select>
                </div>

                {/* Quality Control (Only for JPEG) */}
                {settings.format === 'jpeg' && (
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                       <label className="block text-xs font-medium text-slate-400">{t.quality}</label>
                       <span className="text-xs font-mono text-primary">{Math.round(settings.quality * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1.0" 
                      step="0.05"
                      value={settings.quality}
                      onChange={(e) => setSettings(s => ({ ...s, quality: parseFloat(e.target.value) }))}
                      className="w-full accent-primary h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
              
              {/* Detailed Help Box */}
              {showPatternHelp && (
                 <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
                   <div className="font-semibold text-slate-300">{t.helpTitle}</div>
                   <p className="text-slate-400">{t.helpDesc}</p>
                   <ul className="space-y-1 text-slate-400 pl-1">
                     <li><code className="bg-slate-900 px-1 py-0.5 rounded text-primary">&lt;YYMMDD&gt;</code> - {t.tagDate}</li>
                     <li><code className="bg-slate-900 px-1 py-0.5 rounded text-primary">&lt;NO&gt;</code> - {t.tagNo}</li>
                   </ul>
                   <div className="pt-1 border-t border-slate-700/50 mt-1">
                     <span className="text-slate-500">{t.example}: </span>
                     <span className="font-mono text-slate-300">img-&lt;YYMMDD&gt;-&lt;NO&gt;</span>
                     <span className="text-slate-500"> → </span>
                     <span className="font-mono text-emerald-400">img-251204-1.jpg</span>
                   </div>
                 </div>
              )}

              <div className="pt-4">
                <button
                  disabled={!stitchedImage || isProcessing}
                  onClick={handleSlice}
                  className="w-full bg-primary hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
                >
                  {isProcessing ? (
                     <Icons.RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Icons.Scissors size={20} className="group-hover:-rotate-12 transition-transform" />
                      <span>{t.generate}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-background/80 backdrop-blur z-20">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('setup')}
              className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${activeTab === 'setup' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t.tabPreview}
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={slices.length === 0}
              className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${activeTab === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}
            >
              {t.tabOutput} ({slices.length})
            </button>
          </div>
          
          {stitchedImage && (
             <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
               <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {t.width}: <span className="text-slate-300">{stitchedImage.width}px</span>
               </span>
               <span className="w-px h-4 bg-slate-800"></span>
               <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {t.height}: <span className="text-slate-300">{stitchedImage.height}px</span>
               </span>
             </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5 relative p-8">
           {!stitchedImage && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none">
               <Icons.Image size={64} className="mb-4 opacity-20" />
               <p className="text-lg">{t.uploadPrompt}</p>
             </div>
           )}

           {activeTab === 'setup' && stitchedImage && (
             <div className="w-full flex justify-center min-h-min">
                <div className="relative shadow-2xl shadow-black/50 ring-1 ring-white/10">
                  <img src={stitchedImage.url} alt="Stitched" className="max-w-[800px] w-full h-auto block" />
                  
                  {/* Visual Slice Guides Overlay */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {(() => {
                      const lines = [];
                      if (settings.mode === SliceMode.EQUAL_PARTS) {
                        for(let i=1; i<settings.value; i++) {
                           lines.push(
                             <div 
                                key={i}
                                className="absolute w-full border-t border-red-500/50 border-dashed flex items-center"
                                style={{ top: `${(i/settings.value) * 100}%` }}
                             >
                               <span className="bg-red-500 text-white text-[10px] px-1 ml-2 rounded opacity-75">{t.cut} {i}</span>
                             </div>
                           );
                        }
                      } else {
                         // Fixed Height Visualization
                         let currentH = settings.value;
                         let idx = 1;
                         while (currentH < stitchedImage.height) {
                           const pct = (currentH / stitchedImage.height) * 100;
                           lines.push(
                             <div 
                                key={currentH}
                                className="absolute w-full border-t border-indigo-500/50 border-dashed flex items-center"
                                style={{ top: `${pct}%` }}
                             >
                               <span className="bg-indigo-500 text-white text-[10px] px-1 ml-2 rounded opacity-75">{t.slice} {idx}</span>
                             </div>
                           );
                           currentH += settings.value;
                           idx++;
                         }
                      }
                      return lines;
                    })()}
                  </div>
                </div>
             </div>
           )}

           {activeTab === 'preview' && slices.length > 0 && (
             <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">{t.tabOutput}</h3>
                  <button 
                    onClick={downloadAll}
                    className="bg-white text-slate-900 hover:bg-slate-200 px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-lg transition-colors"
                  >
                    <Icons.Download size={18} />
                    {t.downloadAll}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                  {slices.map((slice, idx) => (
                    <div key={slice.id} className="group bg-surface rounded-xl overflow-hidden border border-slate-700 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                       <div className="aspect-[4/5] bg-slate-900 relative p-4 flex items-center justify-center overflow-hidden">
                          <img src={slice.url} className="max-w-full max-h-full shadow-lg" alt="Slice" />
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                            {slice.width}x{slice.height}
                          </div>
                       </div>
                       <div className="p-4 bg-surface border-t border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-xs font-bold text-slate-500 uppercase">{t.slice} {idx + 1}</span>
                             <span className="text-[10px] text-slate-500 font-mono">{(slice.blob.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <p className="text-sm font-medium text-slate-200 truncate mb-3" title={slice.filename}>
                            {slice.filename}
                          </p>
                          <a 
                            href={slice.url} 
                            download={slice.filename}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                          >
                            <Icons.Download size={14} /> {t.download}
                          </a>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

export default App;
