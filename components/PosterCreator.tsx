
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ImageInput, Layer } from '../types';
import { generateNImages, removeImageBackground, suggestSceneForLayers, generateSingleImage, SceneSuggestionResult } from '../services/geminiService';
import Spinner from './Spinner';
import { Tab } from '../types';

// Icons
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>);
const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>);
const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>);
const LockOpenIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M10.5 10.5V6.75a1.5 1.5 0 0 0-3 0v3.75m0 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>);
const TextIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>);
const WandIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.998 15.998 0 0 1 3.388-1.62" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>);
const StarIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.11a.75.75 0 0 0 .44 1.282l5.214.945 2.125 4.671a.75.75 0 0 0 1.332 0l2.125-4.671 5.214-.945a.75.75 0 0 0 .44-1.282l-3.423-3.11-4.753-.39-1.83-4.401Z" clipRule="evenodd" /></svg>);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.11a.75.75 0 0 0 .44 1.282l5.214.945 2.125 4.671a.75.75 0 0 0 1.332 0l2.125-4.671 5.214-.945a.75.75 0 0 0 .44-1.282l-3.423-3.11-4.753-.39-1.83-4.401Z" clipRule="evenodd" /></svg>);


type InteractionState = { type: 'move' | 'resize'; layerId: string; offsetX: number; offsetY: number; };
type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';
type LayoutType = 'freeform' | 'center-main' | 'side-by-side';

interface PosterCreatorProps {
    sharedImages: string[];
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab }) => void;
}

const PosterCreator: React.FC<PosterCreatorProps> = ({ sharedImages, onGenerationComplete }) => {
    const [uploadedImages, setUploadedImages] = useState<Record<string, { url: string; loading: boolean }>>({});
    const [logoImage, setLogoImage] = useState<ImageInput | null>(null);
    const [background, setBackground] = useState<ImageInput | null>(null);
    const [layers, setLayers] = useState<Layer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [modelFaceImage, setModelFaceImage] = useState<ImageInput | null>(null);
    
    // New state for AI Scene generation
    const [scenePrompt, setScenePrompt] = useState('');
    const [stagePrompt, setStagePrompt] = useState('');
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [isSuggestingScene, setIsSuggestingScene] = useState(false);
    const [sceneSuggestions, setSceneSuggestions] = useState<SceneSuggestionResult | null>(null);
    
    // New state for creative direction
    const [lightingStyle, setLightingStyle] = useState('');
    const [atmosphereStyle, setAtmosphereStyle] = useState('');
    const [supplementaryPrompt, setSupplementaryPrompt] = useState('');
    
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<InteractionState | null>(null);

    const availableImages = useMemo(() => {
        const shared = sharedImages.map(url => ({ url, loading: false }));
        const uploaded = Object.values(uploadedImages);
        const all = [...shared, ...uploaded];
        const uniqueUrls = Array.from(new Set(all.map(item => item.url)));
        return uniqueUrls.map(url => ({
            url,
            loading: uploadedImages[url]?.loading || false
        }));
    }, [sharedImages, uploadedImages]);
    
    const dataUrlToImageInput = (dataUrl: string): ImageInput => {
        const parts = dataUrl.split(';base64,');
        return { mimeType: parts[0].split(':')[1], base64: parts[1] };
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    setUploadedImages(prev => ({...prev, [dataUrl]: { url: dataUrl, loading: false }}));
                };
                reader.readAsDataURL(file);
            }
        });
    };
    
    const handleModelFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const imageInput = dataUrlToImageInput(dataUrl);
                setModelFaceImage(imageInput);
            };
            reader.readAsDataURL(file);
        }
    };

     const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const imageInput = dataUrlToImageInput(dataUrl);
                setLogoImage(imageInput);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const addLogoToCanvas = () => {
        if (!logoImage) return;
        const img = new Image();
        img.onload = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            const initialWidth = 100;
            const newLayer: Layer = {
                id: `layer-logo-${Date.now()}`,
                type: 'image',
                image: logoImage,
                x: 20, y: 20,
                width: initialWidth,
                height: initialWidth / aspectRatio,
                rotation: 0, opacity: 1,
                zIndex: (layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) : 0) + 10, // Ensure logo is on top
                visible: true, locked: false,
                fontFamily: 'Arial', fontSize: 48, color: '#000000', fontWeight: 'normal', fontStyle: 'normal',
                aspectRatio: aspectRatio,
            };
            setLayers(prev => [...prev, newLayer]);
            setSelectedLayerId(newLayer.id);
        };
        img.src = `data:${logoImage.mimeType};base64,${logoImage.base64}`;
    };


    const handleRemoveBg = async (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation();
        setUploadedImages(prev => ({ ...prev, [imageUrl]: { ...prev[imageUrl], loading: true } }));
        setError(null);
        try {
            const imageInput = dataUrlToImageInput(imageUrl);
            const resultUrl = await removeImageBackground(imageInput);
            setUploadedImages(prev => {
                const newState = { ...prev };
                delete newState[imageUrl];
                newState[resultUrl] = { url: resultUrl, loading: false };
                return newState;
            });
        } catch (err: any) {
            setError(err.message || "Failed to remove background.");
        } finally {
             setUploadedImages(prev => prev[imageUrl] ? ({ ...prev, [imageUrl]: { ...prev[imageUrl], loading: false } }) : prev);
        }
    };
    
    const handleGenerateBackground = async () => {
        if (!scenePrompt && !stagePrompt) {
            setError("Vui lòng mô tả bối cảnh hoặc sân khấu.");
            return;
        }
        setIsGeneratingBackground(true);
        setError(null);
        try {
            const prompt = `Tạo một ảnh nền photorealistic, chất lượng cao để chụp ảnh sản phẩm.
            - Bối cảnh chính là: "${scenePrompt || 'một không gian studio sạch sẽ'}".
            - Trong bối cảnh đó, có một sân khấu hoặc khu vực nổi bật để đặt sản phẩm, được mô tả là: "${stagePrompt || 'một bề mặt đơn giản'}".
            - Bức ảnh phải có không gian và ánh sáng phù hợp để thêm các sản phẩm vào sau. Chỉ trả về hình ảnh.`;
            const resultUrl = await generateSingleImage(prompt);
            setBackground(dataUrlToImageInput(resultUrl));
        } catch (err: any) {
            setError(err.message || "Không thể tạo nền.");
        } finally {
            setIsGeneratingBackground(false);
        }
    };
    
    const handleSuggestScene = async () => {
        if (layers.length === 0) {
            setError("Vui lòng thêm sản phẩm, logo hoặc text vào poster để AI có thể gợi ý.");
            return;
        }
        setIsSuggestingScene(true);
        setError(null);
        setSceneSuggestions(null);
        try {
            const imageLayers = layers
                .filter(l => l.type === 'image' && l.image && l.visible)
                .map(l => l.image!);
            const textLayers = layers
                .filter(l => l.type === 'text' && l.text && l.visible)
                .map(l => l.text!);
            
            const suggestions = await suggestSceneForLayers(imageLayers, textLayers);
            setSceneSuggestions(suggestions);

        } catch (err: any) {
            setError(err.message || "Không thể tạo gợi ý.");
        } finally {
            setIsSuggestingScene(false);
        }
    };

    const handleImageClick = (dataUrl: string) => {
        const imageInput = dataUrlToImageInput(dataUrl);
        const img = new Image();
        img.onload = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            const canvasRect = canvasRef.current!.getBoundingClientRect();
            const initialWidth = Math.min(200, canvasRect.width * 0.4);
            const newLayer: Layer = {
                id: `layer-${Date.now()}`,
                type: 'image',
                image: imageInput,
                x: 20, y: 20,
                width: initialWidth,
                height: initialWidth / aspectRatio,
                rotation: 0, opacity: 1,
                zIndex: (layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) : 0) + 1,
                visible: true, locked: false,
                fontFamily: 'Arial', fontSize: 48, color: '#000000', fontWeight: 'normal', fontStyle: 'normal',
                aspectRatio: aspectRatio,
            };
            setLayers(prev => [...prev, newLayer]);
            setSelectedLayerId(newLayer.id);
        };
        img.src = dataUrl;
    };
    
    const addTextLayer = () => {
        const newLayer: Layer = {
            id: `layer-${Date.now()}`,
            type: 'text',
            text: 'Nhập văn bản',
            x: 50, y: 50, width: 250, height: 60, rotation: 0, opacity: 1,
            zIndex: (layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) : 0) + 1,
            visible: true, locked: false,
            fontFamily: 'Arial', fontSize: 48, color: '#FFFFFF', fontWeight: 'normal', fontStyle: 'normal'
        };
        setLayers(prev => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
    };

    const handleLayerInteractionStart = (e: React.MouseEvent<HTMLDivElement>, layerId: string, type: 'move' | 'resize') => {
        e.preventDefault();
        e.stopPropagation();
        const layer = layers.find(l => l.id === layerId);
        if (!layer || layer.locked) return;
        
        setSelectedLayerId(layerId);
        if (!canvasRef.current) return;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX - canvasRect.left;
        const startY = e.clientY - canvasRect.top;

        interactionRef.current = { type, layerId, offsetX: startX - layer.x, offsetY: startY - layer.y };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!interactionRef.current || !canvasRef.current) return;
        const { type, layerId, offsetX, offsetY } = interactionRef.current;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();

        setLayers(prevLayers => prevLayers.map(l => {
            if (l.id === layerId) {
                const mouseX = e.clientX - canvasRect.left;
                const mouseY = e.clientY - canvasRect.top;

                if (type === 'move') {
                    return { ...l, x: mouseX - offsetX, y: mouseY - offsetY };
                }
                if (type === 'resize') {
                    const newWidth = Math.max(20, mouseX - l.x);
                    if (l.type === 'image' && l.aspectRatio) {
                        const newHeight = newWidth / l.aspectRatio;
                        return { ...l, width: newWidth, height: newHeight };
                    }
                    const newHeight = Math.max(20, mouseY - l.y);
                    return { ...l, width: newWidth, height: newHeight };
                }
            }
            return l;
        }));
    }, []);


    const handleMouseUp = useCallback(() => {
        interactionRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const updateLayer = (layerId: string, updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => {
            // If setting one layer as main product, unset others
            if (updates.isMainProduct === true) {
                if (l.id === layerId) return {...l, isMainProduct: true };
                return {...l, isMainProduct: false };
            }
            if (l.id === layerId) return {...l, ...updates};
            return l;
        }));
    };
    
    const deleteLayer = (layerId: string) => {
        setLayers(prev => prev.filter(l => l.id !== layerId));
        if(selectedLayerId === layerId) setSelectedLayerId(null);
    };

    const applyLayout = (type: LayoutType) => {
        if (!canvasRef.current || layers.length === 0) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const { width: W, height: H } = canvasRect;
        const PADDING = W * 0.05;

        const mainProduct = layers.find(l => l.isMainProduct) || layers.find(l => l.type === 'image');
        const texts = layers.filter(l => l.type === 'text');

        let newLayers = [...layers];

        switch (type) {
            case 'center-main':
                if (mainProduct) {
                    const newWidth = W * 0.6;
                    const newHeight = newWidth / (mainProduct.aspectRatio || 1.5);
                    newLayers = newLayers.map(l => l.id === mainProduct.id ? {...l, x: (W - newWidth)/2, y: (H - newHeight)/2, width: newWidth, height: newHeight} : l);
                }
                if (texts.length > 0) {
                    const title = texts[0];
                    newLayers = newLayers.map(l => l.id === title.id ? {...l, x: (W - l.width)/2, y: H * 0.1 } : l);
                }
                break;
            case 'side-by-side':
                if (mainProduct) {
                    const newWidth = W * 0.4;
                    const newHeight = newWidth / (mainProduct.aspectRatio || 1);
                    newLayers = newLayers.map(l => l.id === mainProduct.id ? {...l, x: PADDING, y: (H - newHeight)/2, width: newWidth, height: newHeight} : l);
                }
                 if (texts.length > 0) {
                    const title = texts[0];
                    newLayers = newLayers.map(l => l.id === title.id ? {...l, x: W * 0.5, y: H * 0.4 } : l);
                }
                break;
        }
        setLayers(newLayers);
    };
    
    const handleGenerate = async () => {
        if (!background) {
            setError("Vui lòng tạo hoặc tải lên một ảnh nền.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        try {
            const tempCanvas = document.createElement('canvas');
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                bgImg.onload = () => resolve();
                bgImg.onerror = () => reject(new Error("Không thể tải ảnh nền."));
                bgImg.src = `data:${background.mimeType};base64,${background.base64}`;
            });

            const outputWidth = 1024;
            const aspectParts = aspectRatio.split(':').map(Number);
            const outputHeight = outputWidth * (aspectParts[1] / aspectParts[0]);
            
            tempCanvas.width = outputWidth;
            tempCanvas.height = outputHeight;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error("Không thể lấy context của canvas.");

            const canvasAspect = outputWidth / outputHeight;
            const bgAspect = bgImg.naturalWidth / bgImg.naturalHeight;
            let drawWidth, drawHeight, dx, dy;

            if (bgAspect > canvasAspect) {
                drawHeight = outputHeight;
                drawWidth = drawHeight * bgAspect;
                dx = (outputWidth - drawWidth) / 2;
                dy = 0;
            } else {
                drawWidth = outputWidth;
                drawHeight = drawWidth / bgAspect;
                dx = 0;
                dy = (outputHeight - drawHeight) / 2;
            }
            ctx.drawImage(bgImg, dx, dy, drawWidth, drawHeight);

            const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
            const canvasRect = canvasRef.current!.getBoundingClientRect();
            const scale = tempCanvas.width / canvasRect.width;

            for (const layer of sortedLayers) {
                if (!layer.visible) continue;
                
                ctx.save();
                ctx.globalAlpha = layer.opacity;
                
                const centerX = (layer.x + layer.width / 2) * scale;
                const centerY = (layer.y + layer.height / 2) * scale;
                
                ctx.translate(centerX, centerY);
                ctx.rotate(layer.rotation * Math.PI / 180);

                if (layer.type === 'image' && layer.image) {
                    const layerImg = new Image();
                    layerImg.crossOrigin = 'anonymous';
                    await new Promise<void>((resolve, reject) => {
                        layerImg.onload = () => resolve();
                        layerImg.onerror = () => reject(new Error(`Could not load layer image ${layer.id}.`));
                        layerImg.src = `data:${layer.image.mimeType};base64,${layer.image.base64}`;
                    });
                    ctx.drawImage(layerImg, -layer.width / 2 * scale, -layer.height / 2 * scale, layer.width * scale, layer.height * scale);
                } else if (layer.type === 'text' && layer.text) {
                    ctx.font = `${layer.fontStyle === 'italic' ? 'italic ' : ''}${layer.fontWeight === 'bold' ? 'bold ' : ''}${layer.fontSize * scale}px ${layer.fontFamily}`;
                    ctx.fillStyle = layer.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(layer.text, 0, 0);
                }
                ctx.restore();
            }
            
            const originalComposition = tempCanvas.toDataURL('image/jpeg');
            const compositeImageForAI = dataUrlToImageInput(originalComposition);
            
            const allImageInputs = [compositeImageForAI];
            if (modelFaceImage) allImageInputs.push(modelFaceImage);

            let promptForAI = `Dựa trên bố cục poster được cung cấp (ảnh tham chiếu đầu tiên), hãy tái tạo và biến nó thành 3 phiên bản ảnh quảng cáo photorealistic, chuyên nghiệp và gắn kết.`;
            
            if (modelFaceImage) {
                promptForAI += `\n**QUAN TRỌNG NHẤT (ƯU TIÊN HÀNG ĐẦU):** Đối với bất kỳ nhân vật nào trong ảnh, bạn PHẢI sử dụng khuôn mặt từ ảnh tham chiếu người mẫu (ảnh thứ hai). Giữ nguyên 100% khuôn mặt và các đặc điểm. Không thay đổi khuôn mặt.`;
            }

            const mainProductLayer = layers.find(l => l.isMainProduct);
            if (mainProductLayer) {
                 promptForAI += `\n- **SẢN PHẨM CHÍNH:** Đặc biệt chú ý đến lớp được đánh dấu là sản phẩm chính. Hãy làm cho nó trông hấp dẫn nhất và được tích hợp liền mạch vào bối cảnh.`;
            }

            if (lightingStyle) {
                 promptForAI += `\n- **PHONG CÁCH ÁNH SÁNG:** Áp dụng phong cách ánh sáng '${lightingStyle}'.`;
            }
            if (atmosphereStyle) {
                 promptForAI += `\n- **KHÔNG KHÍ:** Tạo ra không khí '${atmosphereStyle}'.`;
            }
             if (supplementaryPrompt.trim()) {
                promptForAI += `\n- **CHỈ DẪN BỔ SUNG:** ${supplementaryPrompt.trim()}`;
            }

            promptForAI += `\n- **YÊU CẦU CHUNG:** Kết quả cuối cùng phải trông giống như một bức ảnh chụp chuyên nghiệp, không phải ảnh ghép. Hãy hòa trộn tất cả các yếu tố một cách tự nhiên.`;

            const aiVariations = await generateNImages(promptForAI, allImageInputs, 3);
            
            const finalResults = [originalComposition, ...aiVariations];
            setGeneratedImages(finalResults);
            onGenerationComplete({ urls: finalResults, prompt: promptForAI, sourceTab: 'posterCreator' });
            
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const selectedLayer = useMemo(() => layers.find(l => l.id === selectedLayerId), [layers, selectedLayerId]);

    const aspectClassMap: Record<AspectRatio, string> = { '1:1': 'aspect-square', '4:5': 'aspect-[4/5]', '9:16': 'aspect-[9/16]', '16:9': 'aspect-video' };
    const aspectRatioOptions: { key: AspectRatio; label: string }[] = [
        { key: '1:1', label: 'Vuông (1:1)' },
        { key: '4:5', label: 'Chân dung (4:5)' },
        { key: '9:16', label: 'Story (9:16)' },
        { key: '16:9', label: 'Rộng (16:9)' },
    ];

    const lightingOptions = ["", "Ánh sáng studio dịu nhẹ", "Nắng gắt, bóng đổ rõ rệt", "Ánh sáng tự nhiên buổi sáng", "Hoàng hôn ấm áp", "Ánh đèn neon đô thị"];
    const atmosphereOptions = ["", "Trong trẻo và tươi sáng", "Huyền ảo, có sương mù", "Kịch tính và tương phản cao", "Cổ điển và hoài niệm", "Tươi vui, rực rỡ"];
    
    const textStylePresets: Record<string, Partial<Layer>> = {
        "Tiêu đề Lớn": { fontSize: 72, fontWeight: 'bold', fontFamily: 'Impact, sans-serif', color: '#FFFFFF' },
        "Thanh lịch": { fontSize: 48, fontWeight: 'normal', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#EAEAEA' },
        "Tối giản": { fontSize: 32, fontWeight: 'normal', fontFamily: 'Arial, sans-serif', color: '#DDDDDD' },
        "Rực rỡ": { fontSize: 60, fontWeight: 'bold', fontFamily: 'Comic Sans MS, cursive', color: '#FFD700' },
    };

    return (
        <div className="w-full flex-grow flex flex-col lg:grid lg:grid-cols-[28rem_1fr_24rem] p-4 gap-4">
            {/* Left Panel: Library & Layers */}
            <div className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-4 h-full">
                 {/* Logo & Library */}
                <div className="space-y-3">
                     <h2 className="text-lg font-bold">Thư viện & Logo</h2>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-semibold text-neutral-400 mb-1">Logo Thương hiệu</label>
                             <label htmlFor="logo-upload" className="w-full h-16 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-md flex items-center justify-center">
                                {logoImage ? <img src={`data:${logoImage.mimeType};base64,${logoImage.base64}`} className="h-full object-contain p-1"/> : <span className="text-xs text-neutral-500">Tải lên</span>}
                            </label>
                            <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload}/>
                            {logoImage && <button onClick={addLogoToCanvas} className="w-full mt-2 text-xs py-1 bg-neutral-700 hover:bg-neutral-600 rounded-md">Thêm Logo vào Poster</button>}
                        </div>
                         <div className="flex flex-col">
                             <label className="block text-xs font-semibold text-neutral-400 mb-1">Thư viện ảnh</label>
                            <label htmlFor="poster-upload" className="w-full h-16 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-md flex items-center justify-center">
                                <span className="text-xs text-neutral-500 text-center">Tải ảnh sản phẩm, đạo cụ...</span>
                            </label>
                             <input id="poster-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                        </div>
                     </div>
                    <div className="grid grid-cols-4 gap-2 h-40 overflow-y-auto pr-2">
                        {availableImages.map(({ url, loading }) => (
                             <div key={url} className="relative group aspect-square cursor-pointer" onClick={() => handleImageClick(url)}>
                                 <img src={url} className="w-full h-full object-cover rounded-md"/>
                                 {loading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md"><Spinner/></div>}
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <button onClick={(e) => handleRemoveBg(e, url)} title="Tách nền" className="p-1 bg-white/20 rounded-full text-white hover:bg-white/40"><WandIcon className="w-4 h-4"/></button>
                                 </div>
                             </div>
                        ))}
                    </div>
                </div>
                 {/* Layers Panel */}
                <div className="flex-grow flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold">Các lớp (Layers)</h2>
                        <button onClick={addTextLayer} className="text-sm font-semibold py-1 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center gap-2"><TextIcon className="w-4 h-4"/>Thêm chữ</button>
                    </div>
                    <div className="flex-grow bg-neutral-950 rounded-lg p-2 space-y-2 overflow-y-auto">
                        {background && <div className="flex items-center gap-2 p-2 bg-neutral-800 rounded-md">
                            <img src={`data:${background.mimeType};base64,${background.base64}`} className="w-8 h-8 object-cover rounded"/>
                            <span className="flex-grow text-sm font-semibold">Nền</span>
                             <button onClick={() => setBackground(null)}><TrashIcon className="w-4 h-4 text-neutral-500 hover:text-red-500"/></button>
                        </div>}
                         {[...layers].sort((a,b) => b.zIndex - a.zIndex).map(layer => (
                            <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${selectedLayerId === layer.id ? 'bg-amber-500/20' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
                                {layer.type === 'image' && layer.image ? <img src={`data:${layer.image.mimeType};base64,${layer.image.base64}`} className="w-8 h-8 object-contain rounded bg-neutral-700"/> : <TextIcon className="w-6 h-6 p-1"/>}
                                <span className="flex-grow text-sm truncate">{layer.type === 'text' ? layer.text : `Ảnh ${layer.id.slice(-4)}`}</span>
                                {layer.isMainProduct && <StarIcon className="w-4 h-4 text-amber-400" title="Sản phẩm chính"/>}
                                <button onClick={(e) => {e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible })}}>{layer.visible ? <EyeIcon className="w-4 h-4"/> : <EyeSlashIcon className="w-4 h-4 text-neutral-500"/>}</button>
                                <button onClick={(e) => {e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked })}}>{layer.locked ? <LockClosedIcon className="w-4 h-4 text-amber-400"/> : <LockOpenIcon className="w-4 h-4"/>}</button>
                                <button onClick={(e) => {e.stopPropagation(); deleteLayer(layer.id)}}><TrashIcon className="w-4 h-4 text-neutral-500 hover:text-red-500"/></button>
                            </div>
                         ))}
                    </div>
                </div>
            </div>

            {/* Middle Panel: Canvas */}
            <div className="bg-neutral-900 rounded-xl p-4 flex flex-col h-full">
                <div ref={canvasRef} onClick={() => setSelectedLayerId(null)} className={`relative mx-auto my-auto w-full bg-neutral-950/50 rounded-md overflow-hidden ${aspectClassMap[aspectRatio]}`}>
                    {background ? <img src={`data:${background.mimeType};base64,${background.base64}`} className="absolute inset-0 w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-neutral-600">Chọn hoặc tạo nền...</div>}
                    {layers.map(layer => (
                        <div key={layer.id}
                            className={`absolute select-none ${!layer.visible ? 'hidden' : ''}`}
                            style={{
                                left: `${layer.x}px`, top: `${layer.y}px`, width: `${layer.width}px`, height: `${layer.height}px`,
                                transform: `rotate(${layer.rotation}deg)`, opacity: layer.opacity, zIndex: layer.zIndex,
                                border: selectedLayerId === layer.id ? '2px solid #f59e0b' : 'none',
                            }}
                            onMouseDown={(e) => handleLayerInteractionStart(e, layer.id, 'move')}
                        >
                            {layer.type === 'image' && layer.image && <img src={`data:${layer.image.mimeType};base64,${layer.image.base64}`} className="w-full h-full object-contain pointer-events-none" />}
                            {layer.type === 'text' && <div className="w-full h-full flex items-center justify-center pointer-events-none" style={{ fontFamily: layer.fontFamily, fontSize: `${layer.fontSize}px`, color: layer.color, fontWeight: layer.fontWeight, fontStyle: layer.fontStyle, whiteSpace: 'nowrap' }}>{layer.text}</div>}
                            {selectedLayerId === layer.id && !layer.locked && <>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-neutral-900 cursor-se-resize" onMouseDown={(e) => handleLayerInteractionStart(e, layer.id, 'resize')} />
                            </>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Settings */}
            <div className="bg-neutral-900 rounded-xl p-4 flex flex-col gap-4 h-full">
                <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                     <details open className="space-y-2">
                        <div className="flex items-center justify-between">
                            <summary className="text-lg font-bold cursor-pointer">Dàn dựng Bối cảnh AI</summary>
                            <button onClick={handleSuggestScene} disabled={isSuggestingScene || layers.length === 0} className="text-xs font-semibold py-1 px-2 rounded-md bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 flex items-center gap-1">
                                {isSuggestingScene ? <Spinner/> : <><SparklesIcon className="w-3 h-3"/> Gợi ý</>}
                            </button>
                        </div>
                         <textarea value={scenePrompt} onChange={e => setScenePrompt(e.target.value)} rows={2} className="w-full p-2 bg-neutral-800 border-neutral-700 rounded-md text-sm" placeholder="Mô tả Bối cảnh (vd: bãi biển nhiệt đới)"/>
                         {sceneSuggestions && <div className="flex flex-wrap gap-1">{sceneSuggestions.scenes.map(s => <button key={s} onClick={() => setScenePrompt(s)} className="text-[10px] bg-neutral-700 px-2 py-0.5 rounded-full">{s}</button>)}</div>}
                         <textarea value={stagePrompt} onChange={e => setStagePrompt(e.target.value)} rows={2} className="w-full p-2 bg-neutral-800 border-neutral-700 rounded-md text-sm" placeholder="Mô tả Sân khấu (vd: khối đá cẩm thạch)"/>
                         {sceneSuggestions && <div className="flex flex-wrap gap-1">{sceneSuggestions.stages.map(s => <button key={s} onClick={() => setStagePrompt(s)} className="text-[10px] bg-neutral-700 px-2 py-0.5 rounded-full">{s}</button>)}</div>}
                        <button onClick={handleGenerateBackground} disabled={isGeneratingBackground} className="w-full py-2 text-sm font-bold rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 flex items-center justify-center gap-2">{isGeneratingBackground ? <Spinner/> : "Tạo Nền"}</button>
                     </details>

                    <details open className="space-y-2 pt-2">
                        <summary className="text-lg font-bold cursor-pointer">Chỉ dẫn Sáng tạo cho AI</summary>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block text-sm font-medium text-neutral-400 mb-1">Phong cách Ánh sáng</label><select value={lightingStyle} onChange={e => setLightingStyle(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-xs">{lightingOptions.map(opt => <option key={opt} value={opt}>{opt || '-- Chọn --'}</option>)}</select></div>
                             <div><label className="block text-sm font-medium text-neutral-400 mb-1">Không khí</label><select value={atmosphereStyle} onChange={e => setAtmosphereStyle(e.target.value)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-xs">{atmosphereOptions.map(opt => <option key={opt} value={opt}>{opt || '-- Chọn --'}</option>)}</select></div>
                        </div>
                         <textarea value={supplementaryPrompt} onChange={e => setSupplementaryPrompt(e.target.value)} rows={3} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm" placeholder="Prompt bổ sung (vd: poster cho lễ hội âm nhạc mùa hè...)"/>
                    </details>
                    
                    <details open className="space-y-2 pt-2">
                        <summary className="text-lg font-bold cursor-pointer">Bố cục & Lớp</summary>
                         <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-neutral-400 mb-1">Tỷ lệ</label><select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-xs">{aspectRatioOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-neutral-400 mb-1">Ảnh người mẫu</label><label htmlFor="model-face-upload" className="w-full h-10 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-md flex items-center justify-center">{modelFaceImage ? <img src={`data:${modelFaceImage.mimeType};base64,${modelFaceImage.base64}`} className="h-full object-contain p-1"/> : <span className="text-xs text-neutral-500">Giữ nguyên mặt</span>}</label><input id="model-face-upload" type="file" className="hidden" accept="image/*" onChange={handleModelFaceUpload}/></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Bố cục tự động</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => applyLayout('center-main')} className="text-xs py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md">Sản phẩm Trung tâm</button>
                                <button onClick={() => applyLayout('side-by-side')} className="text-xs py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md">Sản phẩm & Text</button>
                            </div>
                        </div>
                        {selectedLayer && (
                            <div className="space-y-3 pt-3 border-t border-neutral-800">
                                <h3 className="text-base font-semibold">Lớp: {selectedLayer.type === 'text' ? `"${selectedLayer.text?.substring(0,10)}..."` : `Ảnh ${selectedLayer.id.slice(-4)}`}</h3>
                                {selectedLayer.type === 'image' && <button onClick={() => updateLayer(selectedLayerId!, { isMainProduct: !selectedLayer.isMainProduct })} className={`w-full py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 ${selectedLayer.isMainProduct ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}><StarIcon className="w-4 h-4"/>Đặt làm Sản phẩm chính</button>}
                                {selectedLayer.type === 'text' && (<>
                                    <input type="text" value={selectedLayer.text} onChange={e => updateLayer(selectedLayerId!, { text: e.target.value })} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm"/>
                                    <div>
                                        <label className="text-xs text-neutral-400">Phong cách chữ</label>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {Object.entries(textStylePresets).map(([name, style]) => <button key={name} onClick={() => updateLayer(selectedLayerId!, style)} className="flex-1 py-1 px-2 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-md whitespace-nowrap">{name}</button>)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4"><input type="color" value={selectedLayer.color} onChange={e => updateLayer(selectedLayerId!, { color: e.target.value })} className="w-10 h-10 p-1 bg-neutral-800 border border-neutral-700 rounded-md"/></div>
                                </>)}
                                <div><label className="text-xs">Độ mờ: {Math.round(selectedLayer.opacity*100)}%</label><input type="range" min="0" max="1" step="0.01" value={selectedLayer.opacity} onChange={e => updateLayer(selectedLayerId!, { opacity: Number(e.target.value) })} className="w-full accent-amber-500"/></div>
                                <div><label className="text-xs">Xoay: {selectedLayer.rotation}°</label><input type="range" min="-180" max="180" step="1" value={selectedLayer.rotation} onChange={e => updateLayer(selectedLayerId!, { rotation: Number(e.target.value) })} className="w-full accent-amber-500"/></div>
                            </div>
                        )}
                    </details>
                </div>
                
                 <div className="mt-auto pt-4 border-t border-neutral-800">
                    {error && <div className="mb-2 bg-red-900/50 border border-red-500 text-red-300 px-3 py-2 rounded-md text-xs">{error}</div>}
                    <button onClick={handleGenerate} disabled={isLoading || !background} className="w-full py-3 text-sm font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? <Spinner /> : "Tạo Poster"}
                    </button>
                 </div>
            </div>

             {/* Bottom Panel: Generated Results */}
            <div className="lg:col-span-3 bg-neutral-900 rounded-xl p-4 flex flex-col">
                <h2 className="text-lg font-bold mb-3">Kết quả</h2>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {generatedImages.length > 0 ? generatedImages.map((src, index) => (
                        <div key={index} className="relative group aspect-square">
                            <img src={src} alt={`Generated ${index}`} className="w-full h-full object-contain rounded-md bg-neutral-950"/>
                             <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                <a href={src} download={`poster-${index}.png`} className="p-3 bg-white/20 rounded-full text-white hover:bg-white/40"><DownloadIcon className="w-5 h-5"/></a>
                             </div>
                        </div>
                    )) : Array(4).fill(0).map((_, i) => <div key={i} className="aspect-square bg-neutral-950 rounded-md flex items-center justify-center"><PhotoIcon className="w-12 h-12 text-neutral-800"/></div>)}
                </div>
            </div>
        </div>
    );
};

export default PosterCreator;
