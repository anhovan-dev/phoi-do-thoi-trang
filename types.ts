
export type Quality = 'standard' | 'high' | 'ultra';

export interface Preset {
  id: string;
  name: string;
  industry: string;
  ageGroup: string;
  characterPrompt: string;
  actionPrompt: string;
}

export interface AnalysisResult {
  description: string;
  personality: string;
  styles: string[];
}

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export interface MediaLibraryItem {
    id: string;
    url: string;
    type: 'image' | 'video';
    prompt: string;
    sourceTab: 'creator' | 'editor' | 'outfitChanger' | 'posterCreator' | 'videoCreator' | 'productStudio' | 'moodboard' | 'virtualStudio';
    createdAt: string;
}

export type Tab = 'creator' | 'productStudio' | 'editor' | 'outfitChanger' | 'posterCreator' | 'videoCreator' | 'library' | 'settings' | 'moodboard' | 'virtualStudio';

export type Layer = {
    id: string;
    type: 'image' | 'text';
    image?: ImageInput;
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    zIndex: number;
    visible: boolean;
    locked: boolean;
    aspectRatio?: number;
    isMainProduct?: boolean;
    // Text properties
    fontFamily: string;
    fontSize: number;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
};
