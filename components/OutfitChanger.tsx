import React, { useState, useCallback, useMemo } from 'react';
import { ImageInput } from '../types';
import { generateFourImages, analyzeImageForPromptPart, analyzeImageForPose, suggestPoses, optimizePosePrompt, analyzeImageForContext } from '../services/geminiService';
import Spinner from './Spinner';
import { Tab } from '../types';

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.11a.75.75 0 0 0 .44 1.282l5.214.945 2.125 4.671a.75.75 0 0 0 1.332 0l2.125-4.671 5.214-.945a.75.75 0 0 0 .44-1.282l-3.423-3.11-4.753-.39-1.83-4.401Z" clipRule="evenodd" /></svg>
);


const staticPoseSuggestions: Record<string, string[]> = {
    "Dáng đứng": [
        "Đứng nghiêng 3/4 người, một vai hướng nhẹ ra trước, tay cầm sản phẩm ngang ngực.",
        "Đứng bắt chéo chân nhẹ, tay nâng sản phẩm lên gần vai, mặt nghiêng theo hướng sản phẩm.",
        "Đứng một tay chống hông, tay kia cầm sản phẩm phía trước.",
        "Đứng thẳng, hai tay nâng sản phẩm ngang cằm, mắt nhìn sản phẩm mỉm cười."
    ],
    "Dáng ngồi": [
        "Ngồi ghế cao, lưng thẳng, một chân duỗi nhẹ, một tay đặt lên đùi, tay kia cầm sản phẩm gần ngực.",
        "Ngồi trên ghế không tựa, hơi nghiêng người về trước, khuỷu tay đặt lên đầu gối, sản phẩm trong tay.",
        "Ngồi nghiêng 3/4 hướng máy ảnh, đặt sản phẩm lên bàn hoặc lòng bàn tay, ánh mắt hướng theo sản phẩm.",
        "Ngồi vắt chân nhẹ, sản phẩm đặt trên đùi hoặc trên tay, tươi cười."
    ],
    "Dáng tay và biểu cảm": [
        "Đưa sản phẩm lên gần má hoặc cằm, nụ cười nhẹ.",
        "Hai tay nâng sản phẩm cao ngang vai, mắt nhìn thẳng camera.",
        "Một tay cầm, một tay chỉ nhẹ vào sản phẩm.",
        "Đưa sản phẩm lên gần ánh sáng hoặc khung cửa sổ, thể hiện sản phẩm “tỏa sáng”."
    ]
};

const dataUrlToImageInput = (dataUrl: string): ImageInput => {
    const parts = dataUrl.split(';base64,');
    const mimeType = parts[0].split(':')[1];
    const base64 = parts[1];
    return { base64, mimeType };
};

const ImageSlot: React.FC<{ title: string; image: ImageInput | null; onImageSelect: (file: File) => void; onImageRemove: () => void; isAnalyzing?: boolean; children?: React.ReactNode; }> = ({ title, image, onImageSelect, onImageRemove, isAnalyzing = false, children }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onImageSelect(file);
    };
    const elementId = `upload-${title.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="flex-1 flex flex-col items-start bg-neutral-900 rounded-lg p-4">
            <h3 className="text-base font-bold mb-3 text-neutral-200">{title}</h3>
            <div className="w-full h-48 relative mb-3">
                <input id={elementId} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                {image ? (
                    <div className="w-full h-full border border-neutral-700 rounded-lg p-1 relative">
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt={title} className="w-full h-full object-contain" />
                        <button onClick={onImageRemove} className="absolute top-1 right-1 bg-amber-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold z-10">&times;</button>
                        {isAnalyzing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg"><Spinner /></div>}
                    </div>
                ) : (
                    <label htmlFor={elementId} className="w-full h-full cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex flex-col items-center justify-center text-center p-4 text-neutral-500">
                        <UploadIcon className="w-8 h-8 mb-2" />
                        <span className="text-sm">Tải ảnh lên</span>
                    </label>
                )}
            </div>
            {children}
        </div>
    );
};

interface OutfitChangerProps {
    sharedImages: string[];
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab }) => void;
}

const OutfitChanger: React.FC<OutfitChangerProps> = ({ sharedImages, onGenerationComplete }) => {
    const [modelImage, setModelImage] = useState<ImageInput | null>(null);
    const [poseImage, setPoseImage] = useState<ImageInput | null>(null);
    const [outfitImage, setOutfitImage] = useState<ImageInput | null>(null);
    const [contextImage, setContextImage] = useState<ImageInput | null>(null);

    const [poseDescription, setPoseDescription] = useState('');
    const [outfitDescription, setOutfitDescription] = useState('');
    const [contextDescription, setContextDescription] = useState('');
    const [supplementaryPrompt, setSupplementaryPrompt] = useState('');
    
    const [useEcomPrompt, setUseEcomPrompt] = useState(false);
    const [useContext, setUseContext] = useState(false);
    
    const [isAnalyzingPose, setIsAnalyzingPose] = useState(false);
    const [isAnalyzingOutfit, setIsAnalyzingOutfit] = useState(false);
    const [isAnalyzingContext, setIsAnalyzingContext] = useState(false);
    const [isSuggestingPose, setIsSuggestingPose] = useState(false);
    
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (file: File, type: 'model' | 'pose' | 'outfit' | 'context') => {
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn một tệp ảnh hợp lệ.');
            return;
        }
        setError(null);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageDataUrl = reader.result as string;
            const imageInput = dataUrlToImageInput(imageDataUrl);
            
            if (type === 'model') {
                setModelImage(imageInput);
            } else if (type === 'pose') {
                setPoseImage(imageInput);
                setIsAnalyzingPose(true);
                setPoseDescription('');
                try {
                    const initialDesc = await analyzeImageForPose(imageInput);
                    setPoseDescription(`(Đang tối ưu hóa...) ${initialDesc}`);
                    const optimizedDesc = await optimizePosePrompt(initialDesc, imageInput);
                    setPoseDescription(optimizedDesc);
                    setPoseImage(null); // Automatically remove image after successful analysis
                } catch (err: any) { 
                    setError(err.message);
                    setPoseDescription('');
                    setPoseImage(null); // Also remove image on error
                } 
                finally { setIsAnalyzingPose(false); }
            } else if (type === 'outfit') {
                setOutfitImage(imageInput);
                setIsAnalyzingOutfit(true);
                try {
                    const desc = await analyzeImageForPromptPart(imageInput, 'outfit');
                    setOutfitDescription(desc);
                } catch (err: any) { setError(err.message); }
                finally { setIsAnalyzingOutfit(false); }
            } else if (type === 'context') {
                setContextImage(imageInput);
                setIsAnalyzingContext(true);
                try {
                    const desc = await analyzeImageForContext(imageInput);
                    setContextDescription(desc);
                    setUseContext(true);
                } catch (err: any) { setError(err.message); }
                finally { setIsAnalyzingContext(false); }
            }
        };
        reader.readAsDataURL(file);
    };

    const handlePoseSuggestionClick = async () => {
        setIsSuggestingPose(true);
        setError(null);
        try {
            const suggestions = await suggestPoses();
            if (suggestions.length > 0) {
                 setPoseDescription(prev => `${prev}\n- ${suggestions[0]}`.trim());
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSuggestingPose(false);
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!modelImage || !outfitImage) {
            setError('Vui lòng chọn ảnh Người mẫu và ảnh Trang phục.');
            return;
        }
        if (!poseImage && !poseDescription.trim()) {
            setError('Vui lòng tải ảnh Tham khảo dáng hoặc mô tả một tư thế.');
            return;
        }
    
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
    
        try {
            const imageInputs: ImageInput[] = [modelImage];
            if (poseImage) {
                imageInputs.push(poseImage);
            }
            if (contextImage) {
                // contextImage is mainly for analysis, but we can include it if the prompt needs it.
                // For now, the description is sufficient.
            }
            imageInputs.push(outfitImage);
    
            let finalPrompt = '';
            const hasPoseDescription = !!poseDescription.trim();
            const hasPoseImage = !!poseImage;
            const hasContextDescription = useContext && !!contextDescription.trim();

            const faceInstruction = "QUAN TRỌNG HÀNG ĐẦU: Giữ nguyên 100% khuôn mặt và các đặc điểm trên mặt của người mẫu trong ảnh tham chiếu (ảnh đầu tiên). Không thay đổi bất cứ điều gì trên khuôn mặt. (Top priority: Preserve the face and all facial features of the model in the reference image (the first one) with 100% accuracy. Do not alter the face in any way.)";

            if (useEcomPrompt) {
                const poseInstruction = poseDescription.trim()
                    ? `The model's pose must be exactly as described: "${poseDescription}".`
                    : "The model must adopt the exact pose from the provided pose reference image.";
                const contextInstruction = hasContextDescription
                    ? `The background and setting should be precisely as described: "${contextDescription}".`
                    : "The lighting and background should be simple and clean, suitable for e-commerce.";
    
                finalPrompt = `${faceInstruction} Generate a high-quality fashion studio image for e-commerce preview. The model is the person from the main reference image. She should be wearing the outfit from the outfit reference image, which is a ${outfitDescription || 'provided outfit'}. ${poseInstruction} ${contextInstruction}`;
            } else {
                const promptParts = [faceInstruction];
                promptParts.push("Tạo ra một bức ảnh tả thực dựa trên các ảnh tham chiếu sau:");
    
                if (hasContextDescription) {
                    promptParts.push("- Ảnh 1 (Người mẫu): Chỉ lấy người mẫu từ ảnh này.");
                } else {
                    promptParts.push("- Ảnh 1 (Người mẫu): Lấy người mẫu và TOÀN BỘ BỐI CẢNH NỀN từ ảnh này.");
                }
                
                if (hasPoseImage) {
                    promptParts.push("- Ảnh 2 (Dáng): Chỉ lấy TƯ THẾ của người trong ảnh này. Bỏ qua quần áo, khuôn mặt và bối cảnh của ảnh này.");
                }
        
                if (hasPoseDescription) {
                    promptParts.push(`- Mô tả dáng: Người mẫu phải tạo dáng chính xác theo mô tả sau: "${poseDescription}".`);
                }
                
                if (hasContextDescription) {
                    promptParts.push(`- Mô tả bối cảnh: Đặt người mẫu vào bối cảnh được mô tả chính xác như sau: "${contextDescription}".`);
                }
                
                const outfitImageIndex = imageInputs.length;
                promptParts.push(`- Ảnh ${outfitImageIndex} (Trang phục): Mặc cho người mẫu trang phục trong ảnh này.`);
        
                if (hasContextDescription) {
                    promptParts.push("Kết quả cuối cùng phải là một bức ảnh liền mạch, trong đó người mẫu từ Ảnh 1, tạo dáng theo yêu cầu, mặc trang phục từ ảnh cuối cùng, và được đặt trong bối cảnh đã mô tả.");
                } else {
                    promptParts.push("Kết quả cuối cùng phải là một bức ảnh liền mạch, trong đó người mẫu từ Ảnh 1 đang ở trong bối cảnh của Ảnh 1, tạo dáng theo yêu cầu, và mặc trang phục từ ảnh cuối cùng.");
                }
        
                finalPrompt = promptParts.join(' ');
            }
            
            if (supplementaryPrompt.trim()) {
                finalPrompt += ` ${supplementaryPrompt.trim()}`;
            }
            
            finalPrompt += " Important instruction for text generation: If the prompt requests to generate text in Vietnamese, you must ensure the font is correct, renders all diacritics (accent marks) properly, and is not garbled or broken. The text must be perfectly legible standard Vietnamese. (Yêu cầu quan trọng về việc tạo chữ: Nếu prompt yêu cầu tạo ra văn bản hoặc chữ viết tiếng Việt, bạn phải đảm bảo rằng font chữ là chính xác, hiển thị đầy đủ dấu và không bị lỗi. Chữ phải là tiếng Việt chuẩn, dễ đọc.)";
            
            const resultUrls = await generateFourImages(finalPrompt, imageInputs);
            setGeneratedImages(resultUrls);
            onGenerationComplete({ urls: resultUrls, prompt: finalPrompt, sourceTab: 'outfitChanger' });
        } catch (err: any)
{
            setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
        } finally {
            setIsLoading(false);
        }
    }, [modelImage, poseImage, outfitImage, contextImage, poseDescription, outfitDescription, contextDescription, useEcomPrompt, useContext, onGenerationComplete, supplementaryPrompt]);

    const canGenerate = useMemo(() => modelImage && outfitImage && (poseImage || poseDescription.trim()), [modelImage, outfitImage, poseImage, poseDescription]);

    return (
        <div className="w-full flex-grow flex flex-col p-2 md:p-4 gap-2 md:gap-4">
            {sharedImages.length > 0 && (
                <div className="bg-neutral-900 rounded-lg p-4">
                    <h2 className="text-base font-bold text-neutral-200 mb-3">1. Chọn ảnh người mẫu từ ảnh đã tạo</h2>
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                        {sharedImages.map((image, index) => (
                            <div key={index} className="flex-shrink-0 w-28 h-28 relative group cursor-pointer" onClick={() => setModelImage(dataUrlToImageInput(image))}>
                                <img src={image} alt={`Generated ${index + 1}`} className={`w-full h-full object-cover rounded-md transition-all group-hover:ring-2 ring-offset-2 ring-offset-neutral-900 ring-amber-500 ${modelImage?.base64 === image.split(',')[1] ? 'ring-2 ring-amber-500' : ''}`} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <ImageSlot title="2. Ảnh Người mẫu" image={modelImage} onImageSelect={(file) => handleFileSelect(file, 'model')} onImageRemove={() => setModelImage(null)} >
                    <p className="text-xs text-neutral-500">Ảnh đã chọn sẽ hiển thị ở đây. Bạn cũng có thể tải lên một ảnh mới.</p>
                 </ImageSlot>

                 <ImageSlot title="3. Tham khảo Dáng (Pose)" image={poseImage} onImageSelect={(file) => handleFileSelect(file, 'pose')} onImageRemove={() => { setPoseImage(null); setPoseDescription(''); }} isAnalyzing={isAnalyzingPose}>
                    <textarea value={poseDescription} onChange={(e) => setPoseDescription(e.target.value)} placeholder="AI sẽ phân tích và tối ưu hóa dáng từ ảnh bạn tải lên, hoặc bạn có thể tự mô tả dáng ở đây..." className="w-full h-20 text-xs p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" />
                     <div className="mt-2 w-full space-y-2">
                        <h4 className="text-xs font-semibold text-neutral-400">Gợi ý tạo dáng:</h4>
                        <div className="max-h-24 overflow-y-auto text-xs space-y-2 pr-2">
                            {Object.entries(staticPoseSuggestions).map(([category, suggestions]) => (
                                <div key={category}>
                                    <p className="font-bold text-neutral-300">{category}</p>
                                    {suggestions.map(s => <p key={s} className="cursor-pointer hover:text-amber-400" onClick={() => setPoseDescription(prev => `${prev}\n- ${s}`.trim())}>- {s}</p>)}
                                </div>
                            ))}
                        </div>
                        <button onClick={handlePoseSuggestionClick} disabled={isSuggestingPose} className="w-full mt-2 text-xs font-semibold py-1.5 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSuggestingPose ? <div className="w-4 h-4 border-2 border-neutral-500 border-t-amber-400 rounded-full animate-spin"></div> : <><SparklesIcon className="w-4 h-4 text-amber-400"/>Gợi ý từ AI</>}
                        </button>
                    </div>
                 </ImageSlot>

                 <ImageSlot title="4. Tham khảo Bối cảnh (Context)" image={contextImage} onImageSelect={(file) => handleFileSelect(file, 'context')} onImageRemove={() => { setContextImage(null); setContextDescription(''); setUseContext(false); }} isAnalyzing={isAnalyzingContext}>
                    <textarea value={contextDescription} onChange={(e) => setContextDescription(e.target.value)} placeholder="AI sẽ phân tích bối cảnh từ ảnh bạn tải lên, hoặc bạn có thể tự mô tả..." className="w-full h-20 text-xs p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" />
                    <p className="text-xs text-neutral-500 mt-2">Bật công tắc bên dưới để sử dụng bối cảnh này.</p>
                 </ImageSlot>

                 <ImageSlot title="5. Ảnh Trang phục" image={outfitImage} onImageSelect={(file) => handleFileSelect(file, 'outfit')} onImageRemove={() => { setOutfitImage(null); setOutfitDescription(''); }} isAnalyzing={isAnalyzingOutfit}>
                    <textarea value={outfitDescription} onChange={(e) => setOutfitDescription(e.target.value)} placeholder="Mô tả sản phẩm (VD: bikini màu đỏ) để sử dụng với prompt E-commerce..." className="w-full h-16 text-xs p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" />
                 </ImageSlot>
            </div>
            
            <div className="bg-neutral-900 rounded-lg p-4">
                <h3 className="text-base font-bold mb-3 text-neutral-200">6. Prompt bổ sung (tùy chọn)</h3>
                <textarea
                    value={supplementaryPrompt}
                    onChange={(e) => setSupplementaryPrompt(e.target.value)}
                    placeholder="Thêm các chi tiết, yêu cầu đặc biệt hoặc từ khóa điều chỉnh (ví dụ: cinematic lighting, poster quảng cáo, chữ 'Mùa Hè Sôi Động')."
                    className="w-full h-24 text-sm p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                />
            </div>

            <div className="bg-neutral-900 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-3">
                    <label htmlFor="context-toggle" className="text-sm font-medium text-neutral-300 cursor-pointer">Sử dụng Bối cảnh tham khảo:</label>
                    <button id="context-toggle" onClick={() => setUseContext(!useContext)} role="switch" aria-checked={useContext} className={`${useContext ? 'bg-amber-500' : 'bg-neutral-700'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                        <span className={`${useContext ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                 </div>
                 <div className="flex items-center gap-3">
                    <label htmlFor="ecom-toggle" className="text-sm font-medium text-neutral-300 cursor-pointer">Sử dụng prompt E-commerce Preview:</label>
                    <button id="ecom-toggle" onClick={() => setUseEcomPrompt(!useEcomPrompt)} role="switch" aria-checked={useEcomPrompt} className={`${useEcomPrompt ? 'bg-amber-500' : 'bg-neutral-700'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                        <span className={`${useEcomPrompt ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                 </div>
                 <p className="text-xs text-neutral-500 flex-grow">(Dùng cho sản phẩm đơn giản, tạo ảnh preview e-commerce)</p>
                 <button onClick={handleGenerate} disabled={!canGenerate || isLoading} className="w-full md:w-auto py-3 px-6 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed">
                    {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo ảnh'}
                 </button>
            </div>
            {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm" role="alert">{error}</div>}

            <div className="flex-grow flex flex-col bg-neutral-900 rounded-lg p-4 relative min-h-[400px]">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-base font-bold text-neutral-200">Kết quả</h2>
                     <button onClick={() => {}} disabled={generatedImages.length === 0} className="flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <DownloadIcon className="w-4 h-4" /> Tải tất cả
                    </button>
                </div>
                <div className="flex-grow flex items-center justify-center rounded-md bg-black/30">
                    {isLoading && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg"><Spinner /><p className="mt-4 text-lg font-semibold">Đang tạo nên tác phẩm của bạn...</p></div>}
                    {!isLoading && generatedImages.length === 0 && <div className="text-center text-neutral-600"><PhotoIcon className="w-16 h-16 mx-auto mb-4" /><h3 className="text-xl font-semibold text-neutral-400">Ảnh của bạn sẽ hiện ở đây.</h3></div>}
                    {!isLoading && generatedImages.length > 0 && (
                         <div className="grid grid-cols-2 gap-2 w-full h-full p-2">
                            {generatedImages.map((src, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img src={src} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    <a href={src} download={`outfit-change-${index + 1}.png`} title="Download" className="absolute bottom-2 right-2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><DownloadIcon className="w-5 h-5" /></a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default OutfitChanger;