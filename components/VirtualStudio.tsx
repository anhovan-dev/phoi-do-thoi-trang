import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageInput, Tab } from '../types';
import { generateNImages, getDirectorSuggestion, DirectorSuggestion, analyzeImageForContext, generateSingleVideo } from '../services/geminiService';
import Spinner from './Spinner';
import { GridIcon, LightbulbIcon, SunIcon, PaintBrushIcon, ClapperboardIcon, MotionIcon, PersonRunningIcon, SaveIcon } from './Icons';

// --- ICONS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-1.35-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>);
const ResetIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-4.991-2.691v4.992" /></svg>);
const FilmIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>);

interface VirtualStudioProps {
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab, type?: 'image' | 'video' }) => void;
}

type Light = {
    id: 'key' | 'fill' | 'rim';
    name: string;
    position: { x: number; y: number };
    color: string;
    intensity: number;
    hardness: number;
};

const defaultLights: Light[] = [
    { id: 'key', name: 'Chính', position: { x: 25, y: 25 }, color: '#FFFFFF', intensity: 100, hardness: 50 },
    { id: 'fill', name: 'Phụ', position: { x: 75, y: 75 }, color: '#FFFFFF', intensity: 30, hardness: 0 },
    { id: 'rim', name: 'Viền', position: { x: 75, y: 25 }, color: '#FFFFFF', intensity: 60, hardness: 80 },
];

const colorGrades = [
    { name: 'Tắt', prompt: '' }, { name: 'Teal & Orange', prompt: 'apply a cinematic teal and orange color grade' },
    { name: 'Vintage Film', prompt: 'apply a vintage film look' }, { name: 'Cyberpunk Neon', prompt: 'apply a cyberpunk neon color grade' },
    { name: 'Noir', prompt: 'apply a high-contrast black and white noir look' }, { name: 'Pastel Dream', prompt: 'apply a dreamy pastel color grade' },
];

const poseLibrary = {
    "Dáng đứng": {
        "Nghiêng 3/4": "standing in a three-quarters pose, one shoulder angled slightly toward the camera, looking confidently forward.",
        "Chống hông": "standing with one hand on her hip, the other arm relaxed, exuding confidence.",
        "Sải bước": "captured mid-stride as if walking forward, with natural arm swing and a dynamic feel.",
    },
    "Dáng ngồi": {
        "Bắt chéo chân": "sitting elegantly on a chair with legs crossed, maintaining a straight posture.",
        "Ngả người về trước": "sitting on a stool, leaning forward with elbows resting on knees, creating an engaging and thoughtful look.",
        "Thư giãn trên sofa": "lounging comfortably on a sofa, one arm resting along the back of the couch."
    }
};

const SliderControl: React.FC<{label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void; onReset: () => void;}> = ({ label, value, min, max, step, unit = '', onChange, onReset }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-neutral-400">{label}</label>
            <div className="flex items-center gap-1">
                <span className="text-sm font-mono text-neutral-300">{value}{unit}</span>
                <button onClick={onReset} className="p-1 text-neutral-500 hover:text-white" title="Reset"><ResetIcon className="w-4 h-4" /></button>
            </div>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
    </div>
);

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
};

const loadingMessages = ["Initializing video generation...", "AI is warming up its creative circuits...", "Composing the opening scene...", "This can take a few minutes...", "Rendering keyframes...", "Adding cinematic magic...", "Finalizing your masterpiece...",];

const VirtualStudio: React.FC<VirtualStudioProps> = ({ onGenerationComplete }) => {
    const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);
    const [characterImage, setCharacterImage] = useState<ImageInput | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<ImageInput | null>(null);
    const [isAnalyzingBg, setIsAnalyzingBg] = useState(false);
    const [savedCharacters, setSavedCharacters] = useState<ImageInput[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);

    const [generationType, setGenerationType] = useState<'image' | 'animation'>('image');
    
    // Camera Rig State
    const [isSettingEndFrame, setIsSettingEndFrame] = useState(false);
    const [orbitalRotationY, setOrbitalRotationY] = useState(0); 
    const [orbitalRotationX, setOrbitalRotationX] = useState(0); 
    const [focalLength, setFocalLength] = useState(50);
    const [aperture, setAperture] = useState(5.6);

    const [endOrbitalRotationY, setEndOrbitalRotationY] = useState(0); 
    const [endOrbitalRotationX, setEndOrbitalRotationX] = useState(0); 
    const [endFocalLength, setEndFocalLength] = useState(50);
    const [endAperture, setEndAperture] = useState(5.6);
    
    const [lights, setLights] = useState<Light[]>(defaultLights);
    const [sceneDescription, setSceneDescription] = useState<string>('');
    const [weather, setWeather] = useState({ rain: 0, fog: 0, snow: 0 });
    const [selectedColorGrade, setSelectedColorGrade] = useState<string>('');
    const [filmGrain, setFilmGrain] = useState<number>(0);
    const [lensFlare, setLensFlare] = useState<number>(0);
    
    const [sceneIntent, setSceneIntent] = useState<string>('');
    const [isDirecting, setIsDirecting] = useState<boolean>(false);
    const [actionAndProps, setActionAndProps] = useState<string>('');
    const [facialExpression, setFacialExpression] = useState<string>('');
    const [isPoseModalOpen, setIsPoseModalOpen] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            if (generationType === 'animation') {
                if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                    const hasKey = await window.aistudio.hasSelectedApiKey();
                    setApiKeyReady(hasKey);
                } else {
                    setApiKeyReady(true); // Assume env var is set
                }
            } else {
                setApiKeyReady(true);
            }
        };
        checkKey();
    }, [generationType]);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setApiKeyReady(true);
        }
    };
    
    const fileToImageInput = (file: File): Promise<ImageInput> => {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) reject(new Error('Invalid file type.'));
            const reader = new FileReader();
            reader.onloadend = () => resolve({ mimeType: file.type, base64: (reader.result as string).split(',')[1] });
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (file: File, type: 'character' | 'background') => {
        try {
            const imageInput = await fileToImageInput(file);
            if (type === 'character') {
                setCharacterImage(imageInput);
            } else {
                setBackgroundImage(imageInput);
                setIsAnalyzingBg(true);
                setError(null);
                try {
                    const desc = await analyzeImageForContext(imageInput);
                    setSceneDescription(desc);
                } catch (err: any) { setError(getErrorMessage(err)); } 
                finally { setIsAnalyzingBg(false); }
            }
        } catch (err: any) { setError(getErrorMessage(err)); }
    };

    const buildPrompt = () => {
        const promptParts: string[] = [];
        if (generationType === 'animation') {
             promptParts.push("Create a photorealistic, high-quality 5-second video clip. Aspect ratio 9:16.");
        } else {
            promptParts.push("Create a photorealistic, high-quality image. Aspect ratio 3:4.");
        }

        if (characterImage) {
            promptParts.push("The main character must have the exact same face and facial features as the person in the reference image.");
        }
        if (actionAndProps.trim()) {
            promptParts.push(`The character is ${actionAndProps}.`);
        }
        if (facialExpression.trim()) {
            promptParts.push(`The character's expression is ${facialExpression}.`);
        }
        
        // Camera & Lighting
        const startFocal = `a ${focalLength < 35 ? 'wide-angle' : focalLength > 85 ? 'telephoto' : 'standard'} ${focalLength}mm lens`;
        const startAngle = `at a ${orbitalRotationX > 10 ? 'high' : orbitalRotationX < -10 ? 'low' : 'eye-level'} angle`;
        const startDOF = aperture < 4.0 ? `with shallow depth of field (f/${aperture.toFixed(1)})` : '';
        let cameraDesc = `The scene is shot with ${startFocal}, ${startAngle} ${startDOF}.`;

        if (generationType === 'animation') {
            const endFocal = `a ${endFocalLength < 35 ? 'wide-angle' : endFocalLength > 85 ? 'telephoto' : 'standard'} ${endFocalLength}mm lens`;
            const endAngle = `at a ${endOrbitalRotationX > 10 ? 'high' : endOrbitalRotationX < -10 ? 'low' : 'eye-level'} angle`;
            const endDOF = endAperture < 4.0 ? `with shallow depth of field (f/${endAperture.toFixed(1)})` : '';
            cameraDesc = `The camera smoothly transitions from an initial shot (${startFocal}, ${startAngle}, ${startDOF}) to a final shot (${endFocal}, ${endAngle}, ${endDOF}).`
        }
        promptParts.push(cameraDesc);
        
        // Environment & Post-Pro
        if (sceneDescription) promptParts.push(`The environment is: "${sceneDescription}".`);
        
        const weatherDescs = [];
        if (weather.rain > 0) weatherDescs.push(`${weather.rain > 50 ? 'heavy' : 'light'} rain`);
        if (weather.fog > 0) weatherDescs.push(`${weather.fog > 50 ? 'dense' : 'light'} fog`);
        if (weather.snow > 0) weatherDescs.push(`${weather.snow > 50 ? 'heavy' : 'light'} snow`);
        if (weatherDescs.length > 0) promptParts.push(`The weather includes ${weatherDescs.join(', ')}.`);

        const grade = colorGrades.find(g => g.name === selectedColorGrade);
        if (grade?.prompt) promptParts.push(grade.prompt);
        if (filmGrain > 10) promptParts.push(`add ${filmGrain}% film grain.`);
        if (lensFlare > 10) promptParts.push(`include ${lensFlare}% lens flare.`);
        
        return promptParts.join(' ');
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setGeneratedVideo(null);
        
        let messageInterval: number;
        if (generationType === 'animation') {
            setLoadingMessage(loadingMessages[0]);
            let messageIndex = 0;
            messageInterval = window.setInterval(() => {
                messageIndex = (messageIndex + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[messageIndex]);
            }, 7000);
        }

        try {
            const finalPrompt = buildPrompt();
            
            if (generationType === 'image') {
                const imageInputs: ImageInput[] = [];
                if (characterImage) imageInputs.push(characterImage);
                if (backgroundImage) imageInputs.push(backgroundImage);
                const resultUrls = await generateNImages(finalPrompt, imageInputs, 4);
                setGeneratedImages(resultUrls);
                onGenerationComplete({ urls: resultUrls, prompt: finalPrompt, sourceTab: 'virtualStudio', type: 'image' });
            } else { // Animation
                if (!apiKeyReady) {
                    handleSelectKey();
                    throw new Error("API Key required for video generation.");
                }
                const resultUrl = await generateSingleVideo(finalPrompt, characterImage || backgroundImage);
                setGeneratedVideo(resultUrl);
                onGenerationComplete({ urls: [resultUrl], prompt: finalPrompt, sourceTab: 'virtualStudio', type: 'video' });
            }
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err);
            if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("API key not valid")) {
                setError("API Key error. Please re-select your API key.");
                setApiKeyReady(false);
            } else {
                setError(errorMessage || 'An error occurred during generation.');
            }
        } finally {
            setIsLoading(false);
            if (messageInterval) clearInterval(messageInterval);
        }
    };
    
    const handleDirectorSuggestion = async () => {
        if (!sceneIntent.trim()) { setError("Please enter a scene intent."); return; }
        setIsDirecting(true);
        setError(null);
        try {
            const suggestion: DirectorSuggestion = await getDirectorSuggestion(sceneIntent);
            // Apply to start frame
            setOrbitalRotationY(suggestion.orbitalRotationY);
            setOrbitalRotationX(suggestion.orbitalRotationX);
            setFocalLength(suggestion.focalLength);
            setAperture(suggestion.aperture);
            // Also apply to end frame for a static shot suggestion
            setEndOrbitalRotationY(suggestion.orbitalRotationY);
            setEndOrbitalRotationX(suggestion.orbitalRotationX);
            setEndFocalLength(suggestion.focalLength);
            setEndAperture(suggestion.aperture);
            
            setLights(suggestion.lights);
            setSelectedColorGrade(suggestion.colorGrade || '');
            setFilmGrain(suggestion.filmGrain);
            setLensFlare(suggestion.lensFlare);
        } catch(err: any) {
            setError(getErrorMessage(err));
        } finally {
            setIsDirecting(false);
        }
    };

    const handleSaveCharacter = () => {
        if (characterImage && !savedCharacters.find(c => c.base64 === characterImage.base64)) {
            setSavedCharacters(prev => [...prev, characterImage]);
        }
    };
    
    return (
        <div className="w-full flex-grow flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)] p-4 gap-4">
            {isPoseModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center" onClick={() => setIsPoseModalOpen(false)}>
                    <div className="bg-neutral-900 rounded-lg p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">Chọn một tư thế</h2>
                        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                            {Object.entries(poseLibrary).map(([category, poses]) => (
                                <div key={category} className="space-y-2">
                                    <h3 className="font-semibold text-amber-500">{category}</h3>
                                    {Object.entries(poses).map(([name, desc]) => (
                                        <button key={name} onClick={() => { setActionAndProps(prev => `${prev} ${desc}`.trim()); setIsPoseModalOpen(false); }}
                                            className="w-full text-left p-3 bg-neutral-800 hover:bg-neutral-700 rounded-md">
                                            <p className="font-bold text-sm">{name}</p>
                                            <p className="text-xs text-neutral-400">{desc}</p>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- Column 1: Inputs --- */}
            <div className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-4 h-full overflow-y-auto">
                <h2 className="text-xl font-bold text-white">1. Nguyên liệu</h2>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-semibold text-neutral-300">Ảnh Nhân vật</h3>
                        <button onClick={handleSaveCharacter} disabled={!characterImage} className="text-xs font-semibold py-1 px-2 rounded-md bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 flex items-center gap-1"><SaveIcon className="w-3 h-3"/> Lưu</button>
                    </div>
                    <label htmlFor="char-upload" className="w-full h-48 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-lg flex items-center justify-center relative">
                        {characterImage ? <img src={`data:${characterImage.mimeType};base64,${characterImage.base64}`} alt="Character" className="w-full h-full object-contain p-1" /> : <div className="text-center text-neutral-500"><UploadIcon className="w-8 h-8 mx-auto mb-2" /><span className="text-xs">Tải lên</span></div>}
                    </label>
                    <input id="char-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], 'character')} />
                    {savedCharacters.length > 0 && <div className="mt-2 grid grid-cols-4 gap-2">{savedCharacters.map((sc, i) => <img key={i} src={`data:${sc.mimeType};base64,${sc.base64}`} onClick={() => setCharacterImage(sc)} className="w-full aspect-square object-cover rounded-md cursor-pointer hover:ring-2 ring-amber-500"/>)}</div>}
                    <input value={facialExpression} onChange={e => setFacialExpression(e.target.value)} placeholder="Biểu cảm khuôn mặt..." className="mt-2 w-full text-xs p-2 bg-neutral-800 border-neutral-700 border rounded-md"/>
                </div>
                 <div>
                    <h3 className="text-base font-semibold text-neutral-300 mb-2">Ảnh Bối cảnh</h3>
                    <label htmlFor="bg-upload" className="w-full h-48 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-lg flex items-center justify-center relative">
                        {isAnalyzingBg && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg"><Spinner /></div>}
                        {backgroundImage ? <img src={`data:${backgroundImage.mimeType};base64,${backgroundImage.base64}`} alt="Background" className="w-full h-full object-contain p-1" /> : <div className="text-center text-neutral-500"><UploadIcon className="w-8 h-8 mx-auto mb-2" /><span className="text-xs">Tải lên</span></div>}
                    </label>
                    <input id="bg-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], 'background')} />
                </div>
            </div>

            {/* --- Column 2: Results --- */}
            <div className="bg-neutral-900 rounded-xl p-4 flex flex-col h-full relative">
                <h2 className="text-xl font-bold text-white mb-4 text-center">Kết Quả</h2>
                <div className="flex-grow bg-neutral-950 rounded-lg flex items-center justify-center p-2">
                    {isLoading && <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl"><Spinner /><p className="mt-4">{loadingMessage || "Đang tạo..."}</p></div>}
                    {!isLoading && generatedImages.length === 0 && !generatedVideo && <div className="text-center text-neutral-600"><PhotoIcon className="w-24 h-24 mb-6" /></div>}
                    {generatedImages.length > 0 && <div className="w-full h-full grid grid-cols-2 gap-2">{generatedImages.map((image, index) => <div key={index} className="relative group w-full h-full rounded-lg"><img src={image} alt={`Output ${index}`} className="w-full h-full object-contain rounded-lg" /></div>)}</div>}
                    {generatedVideo && <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain rounded-md" />}
                </div>
            </div>

            {/* --- Column 3: Camera Rig --- */}
            <div className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-2 h-full overflow-y-auto">
                <h2 className="text-xl font-bold text-white">Xưởng Phim AI</h2>
                <div className="space-y-2 flex-grow overflow-y-auto pr-2 -mr-2">
                    <details open><summary className="text-lg font-semibold text-neutral-300 cursor-pointer">Bố cục & Camera</summary>
                        {generationType === 'animation' && <div className="flex bg-neutral-800 rounded-lg p-1 my-2"><button onClick={() => setIsSettingEndFrame(false)} className={`flex-1 text-xs py-1 rounded-md ${!isSettingEndFrame ? 'bg-amber-500 text-black' : ''}`}>Khung hình Đầu</button><button onClick={() => setIsSettingEndFrame(true)} className={`flex-1 text-xs py-1 rounded-md ${isSettingEndFrame ? 'bg-amber-500 text-black' : ''}`}>Khung hình Cuối</button></div>}
                        <div className="space-y-4 p-2 bg-neutral-800/50 rounded-md">
                            <SliderControl label="Tiêu cự" value={isSettingEndFrame ? endFocalLength : focalLength} min={20} max={200} step={5} unit="mm" onChange={v => isSettingEndFrame ? setEndFocalLength(v) : setFocalLength(v)} onReset={() => isSettingEndFrame ? setEndFocalLength(50) : setFocalLength(50)} />
                            <SliderControl label="Khẩu độ" value={isSettingEndFrame ? endAperture : aperture} min={1.2} max={22} step={0.1} unit="f" onChange={v => isSettingEndFrame ? setEndAperture(v) : setAperture(v)} onReset={() => isSettingEndFrame ? setEndAperture(5.6) : setAperture(5.6)} />
                            <SliderControl label="Góc quay dọc" value={isSettingEndFrame ? endOrbitalRotationX : orbitalRotationX} min={-45} max={45} step={1} unit="°" onChange={v => isSettingEndFrame ? setEndOrbitalRotationX(v) : setOrbitalRotationX(v)} onReset={() => isSettingEndFrame ? setEndOrbitalRotationX(0) : setOrbitalRotationX(0)} />
                            <SliderControl label="Góc quay ngang" value={isSettingEndFrame ? endOrbitalRotationY : orbitalRotationY} min={-90} max={90} step={1} unit="°" onChange={v => isSettingEndFrame ? setEndOrbitalRotationY(v) : setOrbitalRotationY(v)} onReset={() => isSettingEndFrame ? setEndOrbitalRotationY(0) : setOrbitalRotationY(0)} />
                        </div>
                    </details>
                    <details><summary className="flex items-center gap-2 text-lg font-semibold text-neutral-300 cursor-pointer"><SunIcon className="w-6 h-6 text-amber-400" />Môi trường</summary>
                        <textarea value={sceneDescription} onChange={e => setSceneDescription(e.target.value)} placeholder="Mô tả bối cảnh..." className="w-full h-20 text-xs p-2 bg-neutral-800 border-neutral-700 border rounded-md" />
                        <SliderControl label="Mưa" value={weather.rain} min={0} max={100} step={1} unit="%" onChange={v => setWeather(w => ({...w, rain: v}))} onReset={() => setWeather(w => ({...w, rain: 0}))} />
                        <SliderControl label="Sương mù" value={weather.fog} min={0} max={100} step={1} unit="%" onChange={v => setWeather(w => ({...w, fog: v}))} onReset={() => setWeather(w => ({...w, fog: 0}))} />
                        <SliderControl label="Tuyết" value={weather.snow} min={0} max={100} step={1} unit="%" onChange={v => setWeather(w => ({...w, snow: v}))} onReset={() => setWeather(w => ({...w, snow: 0}))} />
                    </details>
                    <details><summary className="flex items-center gap-2 text-lg font-semibold text-neutral-300 cursor-pointer"><PaintBrushIcon className="w-6 h-6 text-amber-400" />Hậu kỳ</summary><div className="grid grid-cols-3 gap-2 mb-2">{colorGrades.map(g => <button key={g.name} onClick={() => setSelectedColorGrade(g.name)} className={`py-1.5 text-[10px] rounded font-semibold ${selectedColorGrade === g.name ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>{g.name}</button>)}</div><SliderControl label="Nhiễu hạt" value={filmGrain} min={0} max={100} step={1} unit="%" onChange={setFilmGrain} onReset={() => setFilmGrain(0)} /><SliderControl label="Lóa ống kính" value={lensFlare} min={0} max={100} step={1} unit="%" onChange={setLensFlare} onReset={() => setLensFlare(0)} /></details>
                    <details open><summary className="flex items-center gap-2 text-lg font-semibold text-neutral-300 cursor-pointer"><ClapperboardIcon className="w-6 h-6 text-amber-400" />Đạo diễn AI</summary>
                        <div className="relative"><textarea value={actionAndProps} onChange={e => setActionAndProps(e.target.value)} placeholder="Hành động & Đạo cụ..." className="w-full h-20 text-xs p-2 bg-neutral-800 border-neutral-700 border rounded-md" /><button onClick={() => setIsPoseModalOpen(true)} className="absolute top-1 right-1 p-1 bg-neutral-700 rounded-md hover:bg-neutral-600"><PersonRunningIcon className="w-4 h-4"/></button></div>
                        <textarea value={sceneIntent} onChange={e => setSceneIntent(e.target.value)} placeholder="Ý đồ cảnh quay, ví dụ: 'cảnh phim lãng mạn'" className="w-full h-20 text-xs p-2 bg-neutral-800 border-neutral-700 border rounded-md" /><button onClick={handleDirectorSuggestion} disabled={isDirecting} className="w-full py-2 text-sm font-bold rounded-lg bg-amber-800 hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2">{isDirecting ? <Spinner /> : "Gợi ý của Đạo diễn"}</button>
                    </details>
                </div>
                {error && <div className="mt-2 bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm">{error}</div>}
                
                {apiKeyReady === false && generationType === 'animation' && (
                     <div className="mt-auto p-2 border-t border-neutral-800 text-center">
                        <p className="text-xs text-amber-400 mb-2">Chức năng tạo Hoạt cảnh yêu cầu API Key có bật thanh toán.</p>
                        <button onClick={handleSelectKey} className="w-full py-2 text-sm font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-600">Chọn API Key</button>
                    </div>
                )}
                
                <div className="mt-auto space-y-2 pt-2 border-t border-neutral-800">
                     <div className="flex bg-neutral-800 rounded-lg p-1">
                        <button onClick={() => setGenerationType('image')} className={`flex-1 text-sm py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${generationType === 'image' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}><PhotoIcon className="w-4 h-4"/> Ảnh</button>
                        <button onClick={() => setGenerationType('animation')} className={`flex-1 text-sm py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${generationType === 'animation' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}><MotionIcon className="w-4 h-4"/> Hoạt cảnh (5s)</button>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || (!characterImage && !backgroundImage)} className="w-full py-3 text-sm font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50">{generationType === 'image' ? "Tạo ảnh" : "Tạo hoạt cảnh"}</button>
                </div>
            </div>
        </div>
    );
};

export default VirtualStudio;