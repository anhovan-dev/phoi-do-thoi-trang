
import React, { useState, useCallback, useMemo } from 'react';
import { ImageInput } from '../types';
import { generateNImages, removeImageBackground, analyzeImageForContext, suggestScenesForProduct } from '../services/geminiService';
import Spinner from './Spinner';
// FIX: Import 'Tab' from '../types' instead of '../App'.
import { Tab } from '../types';

// --- ICONS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
);
const ProductIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
);
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.11a.75.75 0 0 0 .44 1.282l5.214.945 2.125 4.671a.75.75 0 0 0 1.332 0l2.125-4.671 5.214-.945a.75.75 0 0 0 .44-1.282l-3.423-3.11-4.753-.39-1.83-4.401Z" clipRule="evenodd" /></svg>
);


// --- PROPS & STATE ---
interface ProductStudioProps {
    sharedImages: string[];
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab }) => void;
}
type AspectRatio = '9:16' | '3:4' | '1:1' | '4:3' | '16:9';
type SceneMode = 'ai' | 'manual' | 'concept';

const staticScenePrompts = [
    "Phòng ngủ lãng mạn với rèm cửa voan mỏng, ánh sáng ấm áp và nến thơm, tạo không khí riêng tư và quyến rũ.",
    "Bối cảnh đô thị về đêm với ánh đèn neon lấp lánh và đường chân trời mờ ảo, mang lại vẻ hiện đại và táo bạo.",
    "Khu vườn bí mật với cây cối xanh tươi, hoa nở rộ và ánh nắng ban mai dịu nhẹ, tạo nên vẻ đẹp tự nhiên và mơ màng.",
    "Không gian tối giản, hiện đại với tường màu pastel và các tác phẩm nghệ thuật trừu tượng, làm nổi bật sự tinh tế của sản phẩm.",
    "Phòng boudoir sang trọng với ghế trường kỷ nhung, gương lớn mạ vàng và các chi tiết trang trí cổ điển, toát lên vẻ quý phái và gợi cảm."
];

const ProductStudio: React.FC<ProductStudioProps> = ({ sharedImages, onGenerationComplete }) => {
    const [productImage, setProductImage] = useState<ImageInput | null>(null);
    const [modelImage, setModelImage] = useState<ImageInput | null>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    
    const [sceneMode, setSceneMode] = useState<SceneMode>('ai');
    const [conceptImage, setConceptImage] = useState<ImageInput | null>(null);
    const [isAnalyzingConcept, setIsAnalyzingConcept] = useState(false);
    const [selectedScenePrompt, setSelectedScenePrompt] = useState<string>('');
    const [aiGeneratedScenes, setAiGeneratedScenes] = useState<string[]>([]);
    const [isSuggestingScenes, setIsSuggestingScenes] = useState(false);
    
    const [imageCount, setImageCount] = useState<1 | 4>(1);
    const [isHD, setIsHD] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dataUrlToImageInput = (dataUrl: string): ImageInput => {
        const parts = dataUrl.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64 = parts[1];
        return { base64, mimeType };
    };

    const handleUseSharedImage = async (imageUrl: string, type: 'product' | 'model') => {
        const imageInput = dataUrlToImageInput(imageUrl);
        if (type === 'product') {
            try {
                setIsProcessingImage(true);
                setProductImage(imageInput);
                const bgRemovedUrl = await removeImageBackground(imageInput);
                setProductImage(dataUrlToImageInput(bgRemovedUrl));
            } catch (err: any) {
                setError(err.message || 'Không thể tách nền từ ảnh dùng chung.');
            } finally {
                setIsProcessingImage(false);
            }
        } else {
            setModelImage(imageInput);
        }
    };

    const handleFileChange = async (file: File, type: 'product' | 'model' | 'concept') => {
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn một tệp ảnh hợp lệ.');
            return;
        }
        setError(null);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            const imageInput = dataUrlToImageInput(dataUrl);

            switch (type) {
                case 'product':
                    try {
                        setIsProcessingImage(true);
                        setProductImage(imageInput);
                        const bgRemovedUrl = await removeImageBackground(imageInput);
                        setProductImage(dataUrlToImageInput(bgRemovedUrl));
                    } catch (err: any) {
                        setError(err.message || 'Không thể xử lý ảnh.');
                    } finally {
                        setIsProcessingImage(false);
                    }
                    break;
                case 'model':
                    setModelImage(imageInput);
                    break;
                case 'concept':
                    try {
                        setIsAnalyzingConcept(true);
                        setConceptImage(imageInput);
                        const sceneDesc = await analyzeImageForContext(imageInput);
                        setSelectedScenePrompt(sceneDesc);
                    } catch (err: any) {
                        setError(err.message || 'Không thể phân tích ảnh concept.');
                    } finally {
                        setIsAnalyzingConcept(false);
                    }
                    break;
            }
        };
        reader.readAsDataURL(file);
    };
    
    const handleSuggestScenes = async () => {
        if (!productImage) {
            setError("Vui lòng tải ảnh sản phẩm trước để AI có thể gợi ý.");
            return;
        }
        setIsSuggestingScenes(true);
        setError(null);
        try {
            const newScenes = await suggestScenesForProduct(productImage);
            setAiGeneratedScenes(prev => [...newScenes, ...prev]);
        } catch (err: any) {
            setError(err.message || 'Không thể tạo gợi ý bối cảnh.');
        } finally {
            setIsSuggestingScenes(false);
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!productImage) {
            setError('Vui lòng tải lên ảnh sản phẩm.');
            return;
        }
        if (!selectedScenePrompt) {
            setError('Vui lòng chọn hoặc mô tả một bối cảnh.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const imageInputs: ImageInput[] = [];
            
            if (productImage) {
                imageInputs.push(productImage);
            }
            
            if (modelImage) {
                imageInputs.push(modelImage);
            }
            
            if (sceneMode === 'concept' && conceptImage) {
                if (!imageInputs.find(img => img.base64 === conceptImage.base64)) {
                   imageInputs.push(conceptImage);
                }
            }
            
            let prompt = `Tạo một bức ảnh sản phẩm chuyên nghiệp, tả thực. Aspect ratio: ${aspectRatio}.`;
            if (isHD) {
                prompt += " Chất lượng ảnh cao, 4K, chi tiết sắc nét.";
            }

            if (modelImage) {
                prompt += ` Người mẫu trong ảnh phải có khuôn mặt và các đặc điểm giống hệt người trong ảnh tham chiếu người mẫu.`;
            }

            prompt += ` Sản phẩm chính là đối tượng trong ảnh tham chiếu sản phẩm (đã được tách nền).`;
            prompt += ` Đặt sản phẩm (và người mẫu, nếu có) vào bối cảnh sau: "${selectedScenePrompt}".`;
            prompt += ` Bức ảnh cần mang lại cảm giác sang trọng, chuyên nghiệp và phù hợp với sản phẩm.`;
            
            const resultUrls = await generateNImages(prompt, imageInputs, imageCount);
            setGeneratedImages(resultUrls);
            onGenerationComplete({ urls: resultUrls, prompt, sourceTab: 'productStudio' });
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
        } finally {
            setIsLoading(false);
        }
    }, [productImage, modelImage, conceptImage, sceneMode, selectedScenePrompt, imageCount, isHD, aspectRatio, onGenerationComplete]);
    
    const canGenerate = useMemo(() => !isLoading && productImage && selectedScenePrompt, [isLoading, productImage, selectedScenePrompt]);
    
    return (
        <div className="w-full flex-grow flex flex-col lg:flex-row p-4 gap-4">
            {/* Left Panel */}
            <div className="lg:w-2/5 flex-shrink-0 flex flex-col gap-4">
                <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                    <h2 className="text-xl font-bold">1. Tải lên ảnh</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Product Image Slot */}
                        <div className="flex flex-col items-center">
                            <ProductIcon className="w-6 h-6 mb-2 text-amber-500" />
                            <h3 className="font-semibold mb-2">Ảnh Sản phẩm</h3>
                            <label htmlFor="product-upload" className="w-full h-48 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-lg flex items-center justify-center relative">
                                {isProcessingImage && <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg"><Spinner/></div>}
                                {productImage ? <img src={`data:${productImage.mimeType};base64,${productImage.base64}`} alt="Product" className="w-full h-full object-contain p-1" /> : <UploadIcon className="w-8 h-8 text-neutral-500" />}
                            </label>
                            <input id="product-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], 'product')} />
                        </div>
                        {/* Model Image Slot */}
                        <div className="flex flex-col items-center">
                            <UserIcon className="w-6 h-6 mb-2 text-amber-500" />
                            <h3 className="font-semibold mb-2">Ảnh Người mẫu (Tùy chọn)</h3>
                            <label htmlFor="model-upload" className="w-full h-48 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-lg flex items-center justify-center">
                                {modelImage ? <img src={`data:${modelImage.mimeType};base64,${modelImage.base64}`} alt="Model" className="w-full h-full object-contain p-1" /> : <UploadIcon className="w-8 h-8 text-neutral-500" />}
                            </label>
                            <input id="model-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], 'model')} />
                        </div>
                    </div>
                     <p className="text-xs text-neutral-500 text-center">Mẹo: Ảnh sản phẩm sẽ được tự động tách nền. Bạn cũng có thể chọn ảnh đã tạo từ thư viện bên dưới.</p>
                </div>

                {sharedImages.length > 0 && (
                    <div className="bg-neutral-900 rounded-lg p-4">
                        <h2 className="text-lg font-semibold mb-3">Sử dụng ảnh đã tạo</h2>
                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                            {sharedImages.map((image, index) => (
                                <div key={index} className="flex-shrink-0 w-24 h-24 text-center">
                                    <img src={image} alt={`Generated ${index}`} className="w-full h-full object-cover rounded-md" />
                                    <div className="flex justify-center gap-1 mt-1">
                                        <button onClick={() => handleUseSharedImage(image, 'product')} className="text-xs px-2 py-0.5 bg-neutral-700 hover:bg-amber-600 rounded">Sản phẩm</button>
                                        <button onClick={() => handleUseSharedImage(image, 'model')} className="text-xs px-2 py-0.5 bg-neutral-700 hover:bg-amber-600 rounded">Người mẫu</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel */}
            <div className="flex-grow flex flex-col gap-4">
                <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                    <h2 className="text-xl font-bold">2. Chọn bối cảnh</h2>
                     <div className="flex bg-neutral-800 rounded-lg p-1">
                        <button onClick={() => setSceneMode('ai')} className={`flex-1 text-sm py-2 rounded-md transition-colors ${sceneMode === 'ai' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}>Gợi ý từ AI</button>
                        <button onClick={() => setSceneMode('manual')} className={`flex-1 text-sm py-2 rounded-md transition-colors ${sceneMode === 'manual' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}>Tự mô tả</button>
                        <button onClick={() => setSceneMode('concept')} className={`flex-1 text-sm py-2 rounded-md transition-colors ${sceneMode === 'concept' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}>Ảnh Concept</button>
                    </div>

                    {sceneMode === 'ai' && (
                        <div className="space-y-2">
                             <button onClick={handleSuggestScenes} disabled={isSuggestingScenes || !productImage} className="w-full text-sm font-semibold py-2 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSuggestingScenes ? <Spinner /> : <><SparklesIcon className="w-4 h-4 text-amber-400"/> Gợi ý bối cảnh mới</>}
                            </button>
                            <div className="max-h-48 overflow-y-auto space-y-2 p-1">
                                {[...staticScenePrompts, ...aiGeneratedScenes].map((prompt, index) => (
                                    <button key={index} onClick={() => setSelectedScenePrompt(prompt)} className={`w-full text-left text-xs p-3 rounded-md transition-colors ${selectedScenePrompt === prompt ? 'bg-amber-900/50 border border-amber-500' : 'bg-neutral-800 hover:bg-neutral-700'}`}>{prompt}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {sceneMode === 'manual' && <textarea value={selectedScenePrompt} onChange={(e) => setSelectedScenePrompt(e.target.value)} placeholder="Mô tả bối cảnh bạn muốn, ví dụ: 'một bãi biển nhiệt đới lúc hoàng hôn'..." className="w-full h-32 p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"/>}
                    {sceneMode === 'concept' && (
                        <div className="relative">
                            <label htmlFor="concept-upload" className="w-full h-32 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-lg flex items-center justify-center">
                                {isAnalyzingConcept && <Spinner />}
                                {!isAnalyzingConcept && (conceptImage ? <img src={`data:${conceptImage.mimeType};base64,${conceptImage.base64}`} alt="Concept" className="w-full h-full object-contain p-1" /> : <UploadIcon className="w-8 h-8 text-neutral-500" />)}
                            </label>
                            <input id="concept-upload" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], 'concept')} />
                        </div>
                    )}
                </div>

                <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                     <h2 className="text-xl font-bold">3. Tùy chọn</h2>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Tỷ lệ khung hình</label>
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none">
                                <option value="3:4">Chân dung (3:4)</option>
                                <option value="1:1">Vuông (1:1)</option>
                                <option value="4:3">Ngang (4:3)</option>
                                <option value="16:9">Rộng (16:9)</option>
                                <option value="9:16">Story (9:16)</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-neutral-400 mb-1">Số lượng</label>
                             <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value) as 1 | 4)} className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none">
                                <option value={1}>1 ảnh</option>
                                <option value={4}>4 ảnh</option>
                            </select>
                        </div>
                         <div className="flex items-center justify-center bg-neutral-800 p-2 rounded-lg">
                            <label htmlFor="hd-toggle" className="text-sm font-medium text-neutral-300 cursor-pointer mr-2">Chất lượng cao</label>
                            <button id="hd-toggle" onClick={() => setIsHD(!isHD)} role="switch" aria-checked={isHD} className={`${isHD ? 'bg-amber-500' : 'bg-neutral-700'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                                <span className={`${isHD ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                         </div>
                     </div>
                </div>

                {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm" role="alert">{error}</div>}

                <button onClick={handleGenerate} disabled={!canGenerate} className="w-full py-3 px-4 text-base font-bold rounded-lg transition-all bg-amber-500 hover:bg-amber-600 text-black disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading ? <><Spinner /> Đang tạo ảnh...</> : 'Tạo ảnh'}
                </button>
                
                 <div className="flex-grow flex flex-col bg-neutral-900 rounded-lg p-4 relative">
                    <h2 className="text-lg font-bold text-neutral-200 mb-2">Kết quả</h2>
                    <div className="flex-grow flex items-center justify-center rounded-md bg-black/30">
                        {isLoading && (<div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg"><Spinner /><p className="mt-4 font-semibold">Đang tạo...</p></div>)}
                        {!isLoading && generatedImages.length === 0 && (<div className="text-center text-neutral-600 p-8"><PhotoIcon className="w-16 h-16 mx-auto mb-4" /></div>)}
                        {!isLoading && generatedImages.length > 0 && (
                            <div className={`grid gap-2 w-full h-full ${generatedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {generatedImages.map((src, index) => (
                                    <div key={index} className="relative group">
                                        <img src={src} alt={`Generated ${index + 1}`} className="w-full h-full object-contain rounded-md" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductStudio;