export interface CropSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SourceImage {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  name: string;
  crop: CropSettings;
}

export enum SliceMode {
  FIXED_HEIGHT = 'FIXED_HEIGHT',
  EQUAL_PARTS = 'EQUAL_PARTS',
}

export interface SliceSettings {
  mode: SliceMode;
  value: number; // Height in px OR number of parts
  prefix: string;
  format: 'png' | 'jpeg';
  quality: number;
}

export interface GeneratedSlice {
  id: string;
  blob: Blob;
  url: string;
  filename: string;
  width: number;
  height: number;
}

export interface Preset {
  id: string;
  name: string;
  settings: SliceSettings;
}
