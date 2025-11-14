
import React, { useState, useCallback } from 'react';
import { ImageInput, Tab, Quality } from '../types';
import { createFashionMoodboard, generateNImages, suggestLookbookPrompt, suggestOutfitsAndGenerateImages } from '../services/geminiService';
import Spinner from './Spinner';

// --- ICONS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.11a.75.75 0 0 0 .44 1.282l5.214.945 2.125 4.671a.75.75 0 0 0 1.332 0l2.125-4.671 5.214-.945a.75.75 0 0 0 .44-1.282l-3.423-3.11-4.753-.39-1.83-4.401Z" clipRule="evenodd" /></svg>);

interface FashionMoodboardProps {
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab }) => void;
}

type Mode = 'collage' | 'scene';
type AspectRatio = '9:16' | '3:4' | '1:1' | '4:3' | '16:9';
type ImageCount = 1 | 2 | 3 | 4;


const QualityButton: React.FC<{ quality: Quality, selectedQuality: Quality, onClick: (q: Quality) => void, title: string, subtitle: string }> = ({ quality, selectedQuality, onClick, title, subtitle }) => (
    <button
        onClick={() => onClick(quality)}
        className={`p-3 rounded-md text-left transition-all duration-200 border-2 ${selectedQuality === quality ? 'bg-amber-900/50 border-amber-500' : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'}`}
    >
        <p className="font-bold text-sm text-neutral-100">{title}</p>
        <p className="text-xs text-neutral-400">{subtitle}</p>
    </button>
);

const FashionMoodboard: React.FC<FashionMoodboardProps> = ({ onGenerationComplete }) => {
    const [mode, setMode] = useState<Mode>('scene');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [outputImages, setOutputImages] = useState<string[]>([]);
    const [quality, setQuality] = useState<Quality>('ultra');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
    const [imageCount, setImageCount] = useState<ImageCount>(4);

    const [collageInputImage, setCollageInputImage] = useState<ImageInput | null>(null);
    const [collageInputUrl, setCollageInputUrl] = useState<string | null>(null);

    const [characterImage, setCharacterImage] = useState<ImageInput | null>(null);
    const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
    const [outfitQuery, setOutfitQuery] = useState<string>('');
    const [isSuggestingOutfits, setIsSuggestingOutfits] = useState(false);
    const [suggestionText, setSuggestionText] = useState<string | null>(null);

    const [sceneInputImages, setSceneInputImages] = useState<ImageInput[]>([]);
    const [sceneInputUrls, setSceneInputUrls] = useState<string[]>([]);
    const [scenePrompt, setScenePrompt] = useState<string>('');
    const [isSuggesting, setIsSuggesting] = useState<boolean>(false);

    const dataUrlToImageInput = (dataUrl: string): ImageInput => {
        const parts = dataUrl.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const base64 = parts[1];
        return { base64, mimeType };
    };
    
    const fileToImageInput = (file: File): Promise<{ imageInput: ImageInput, dataUrl: string }> => {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('Vui lòng chọn một tệp ảnh hợp lệ.'));
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve({ imageInput: dataUrlToImageInput(dataUrl), dataUrl });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setError(null);
        setOutputImages([]);

        if (mode === 'collage') {
            try {
                const { imageInput, dataUrl } = await fileToImageInput(files[0]);
                setCollageInputImage(imageInput);
                setCollageInputUrl(dataUrl);
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            try {
                const newImages = await Promise.all(Array.from(files).map(fileToImageInput));
                setSceneInputImages(prev => [...prev, ...newImages.map(i => i.imageInput)]);
                setSceneInputUrls(prev => [...prev, ...newImages.map(i => i.dataUrl)]);
            } catch (err: any) {
                setError(err.message);
            }
        }
    };
    
    const handleCharacterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { imageInput, dataUrl } = await fileToImageInput(file);
            setCharacterImage(imageInput);
            setCharacterImageUrl(dataUrl);
            setSuggestionText(null);
            setOutfitQuery('');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSuggestOutfits = async () => {
        if (!characterImage) {
            setError("Vui lòng tải ảnh nhân vật để AI tư vấn.");
            return;
        }
        if (!outfitQuery.trim()) {
            setError("Vui lòng cho AI biết bạn cần trang phục cho dịp nào.");
            return;
        }
    
        setIsSuggestingOutfits(true);
        setError(null);
        setSuggestionText(null);
    
        try {
            const result = await suggestOutfitsAndGenerateImages(characterImage, outfitQuery);
            setSuggestionText(result.textualSuggestion);
    
            const newUrls = result.imageUrls;
            const newImageInputs = newUrls.map(dataUrlToImageInput);
    
            setSceneInputUrls(prev => [...prev, ...newUrls]);
            setSceneInputImages(prev => [...prev, ...newImageInputs]);
    
        } catch (err: any) {
            setError(err.message || "Không thể tạo gợi ý trang phục.");
        } finally {
            setIsSuggestingOutfits(false);
        }
    };
    
    const handleRemoveSceneImage = (index: number) => {
        setSceneInputImages(prev => prev.filter((_, i) => i !== index));
        setSceneInputUrls(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSuggestPrompt = async () => {
        const allImages = characterImage ? [characterImage, ...sceneInputImages] : sceneInputImages;
        if (allImages.length === 0) {
            setError("Vui lòng tải lên ảnh tham khảo để AI có thể gợi ý.");
            return;
        }
        setIsSuggesting(true);
        setError(null);
        try {
            const suggestion = await suggestLookbookPrompt(allImages);
            setScenePrompt(suggestion);
        } catch (err: any) {
            setError(err.message || 'Không thể tạo gợi ý prompt.');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setOutputImages([]);

        try {
            let resultUrls: string[];
            let finalPrompt: string;

            if (mode === 'collage') {
                if (!collageInputImage) throw new Error("Vui lòng tải lên một ảnh để tạo collage.");
                finalPrompt = "Tạo một moodboard thời trang từ ảnh."; 
                const promises = Array(imageCount).fill(0).map(() => createFashionMoodboard(collageInputImage, quality, aspectRatio));
                resultUrls = await Promise.all(promises);
            } else {
                if (sceneInputImages.length === 0 && !characterImage) throw new Error("Vui lòng tải lên ít nhất một ảnh tham khảo.");
                if (!scenePrompt.trim()) throw new Error("Vui lòng nhập prompt để mô tả cảnh.");
    
                const finalImageInputs: ImageInput[] = [...sceneInputImages];
                let promptBody = scenePrompt.trim();

                if (characterImage) {
                    finalImageInputs.unshift(characterImage);
                    const faceInstruction = "QUAN TRỌNG HÀNG ĐẦU: Giữ nguyên 100% khuôn mặt và các đặc điểm trên mặt của người mẫu trong ảnh tham chiếu (ảnh đầu tiên). Không thay đổi bất cứ điều gì trên khuôn mặt. (Top priority: Preserve the face and all facial features of the model in the reference image (the first one) with 100% accuracy. Do not alter the face in any way.)";
                    promptBody = `${faceInstruction}\n\n${promptBody}`;
                }
                
                promptBody += ` Aspect ratio: ${aspectRatio}.`;
    
                if (quality === 'ultra') promptBody += " Image quality ultra, 8K, hyperrealistic, tack sharp, professional photography.";
                else if (quality === 'high') promptBody += " Image quality high, 4K, detailed photography.";
                else promptBody += " Image quality standard.";
                
                finalPrompt = promptBody;
                resultUrls = await generateNImages(finalPrompt, finalImageInputs, imageCount);
                if (resultUrls.length === 0) throw new Error("API không trả về ảnh nào.");
            }

            setOutputImages(resultUrls);
            onGenerationComplete({ urls: resultUrls, prompt: finalPrompt, sourceTab: 'moodboard' });
        } catch (err: any) {
            setError(err.message || 'Đã có lỗi xảy ra.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setCollageInputImage(null);
        setCollageInputUrl(null);
        setCharacterImage(null);
        setCharacterImageUrl(null);
        setOutfitQuery('');
        setSuggestionText(null);
        setSceneInputImages([]);
        setSceneInputUrls([]);
        setScenePrompt('');
        setOutputImages([]);
        setError(null);
        setIsLoading(false);
        setQuality('ultra');
        setAspectRatio('3:4');
        setImageCount(4);
    };
    
    const canGenerate = !isLoading && ((mode === 'collage' && !!collageInputImage) || (mode === 'scene' && (sceneInputImages.length > 0 || !!characterImage) && !!scenePrompt.trim()));
    const imageCountOptions: ImageCount[] = [1, 2, 3, 4];

    return (
        <div className="w-full flex-grow p-4 gap-4 grid lg:grid-cols-2">
            <div className="bg-neutral-900 rounded-xl p-6 flex flex-col h-full overflow-y-auto">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4 text-center">Công cụ phối đồ</h2>
                    <div className="flex bg-neutral-800 rounded-lg p-1 mb-6">
                        <button onClick={() => setMode('collage')} className={`flex-1 text-sm py-2 rounded-md transition-colors ${mode === 'collage' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}>Tạo Moodboard</button>
                        <button onClick={() => setMode('scene')} className={`flex-1 text-sm py-2 rounded-md transition-colors ${mode === 'scene' ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-neutral-700'}`}>Tạo Lookbook</button>
                    </div>

                    {mode === 'collage' ? (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-center">Tải ảnh để tạo Moodboard</h3>
                            <div className="w-full aspect-square max-w-sm mx-auto bg-neutral-800 rounded-lg flex items-center justify-center">
                                {collageInputUrl ? (
                                    <img src={collageInputUrl} alt="Input" className="max-w-full max-h-full object-contain rounded-lg" />
                                ) : (
                                    <label htmlFor="moodboard-upload" className="w-full h-full cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                                        <UploadIcon className="w-12 h-12 mb-4 text-neutral-500" />
                                        <span className="font-semibold">Tải lên ảnh người mẫu</span>
                                        <span className="text-sm">AI sẽ phân tích trang phục</span>
                                    </label>
                                )}
                                <input id="moodboard-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-800 p-4 rounded-lg">
                                <div className="flex flex-col items-center">
                                    <h3 className="text-sm font-semibold mb-2 text-neutral-300">Ảnh Nhân Vật</h3>
                                    <label htmlFor="character-upload" className="w-full h-40 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-lg flex items-center justify-center relative">
                                        {characterImageUrl ? <img src={characterImageUrl} alt="Character" className="w-full h-full object-contain p-1" /> : <div className="text-center text-neutral-500"><UploadIcon className="w-8 h-8 mx-auto mb-2" /><span className="text-xs">Tải ảnh để AI tư vấn</span></div>}
                                    </label>
                                    <input id="character-upload" type="file" className="hidden" accept="image/*" onChange={handleCharacterFileChange} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-semibold mb-2 text-neutral-300">Hỏi AI: "Hôm nay mặc gì?"</h3>
                                    <textarea value={outfitQuery} onChange={(e) => setOutfitQuery(e.target.value)} placeholder="Ví dụ: Tôi đi đám cưới cuối tuần..." className="w-full h-20 text-xs p-2 bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none" disabled={!characterImage} />
                                    <button onClick={handleSuggestOutfits} disabled={isSuggestingOutfits || !characterImage || !outfitQuery.trim()} className="w-full mt-2 text-xs font-semibold py-1.5 px-3 rounded-md bg-neutral-700 hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isSuggestingOutfits ? <Spinner /> : "Gợi ý trang phục"}
                                    </button>
                                    {suggestionText && <div className="mt-2 p-2 bg-neutral-900 rounded-md text-xs text-neutral-300 border border-amber-500/30"><p className="font-bold text-amber-400">Gợi ý từ AI:</p><p>{suggestionText}</p></div>}
                                </div>
                            </div>

                            <p className="text-sm text-neutral-400 text-center">Trang phục & Phụ kiện (ảnh do AI gợi ý sẽ hiện ở đây)</p>
                            <div className="w-full min-h-[12rem] bg-neutral-800 rounded-lg p-2">
                                <div className="grid grid-cols-4 gap-2">
                                    {sceneInputUrls.map((url, index) => (
                                        <div key={index} className="relative aspect-square group">
                                            <img src={url} className="w-full h-full object-cover rounded-md" />
                                            <button onClick={() => handleRemoveSceneImage(index)} className="absolute top-0 right-0 bg-black/60 rounded-bl-md p-1 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4 text-white" /></button>
                                        </div>
                                    ))}
                                    {sceneInputUrls.length < 12 && (<label htmlFor="scene-upload" className="aspect-square cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex items-center justify-center"><UploadIcon className="w-6 h-6 text-neutral-500" /></label>)}
                                </div>
                                <input id="scene-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                            </div>
                            <div className="relative">
                                <textarea value={scenePrompt} onChange={(e) => setScenePrompt(e.target.value)} placeholder="Mô tả chi tiết lookbook bạn muốn tạo..." className="w-full h-28 p-2 pr-24 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors" />
                                <button onClick={handleSuggestPrompt} disabled={isSuggesting || (sceneInputImages.length === 0 && !characterImage) } className="absolute top-2 right-2 text-xs font-semibold py-1.5 px-3 rounded-md bg-neutral-700 hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSuggesting ? <div className="w-4 h-4 border-2 border-neutral-500 border-t-amber-400 rounded-full animate-spin"></div> : <><SparklesIcon className="w-4 h-4 text-amber-400"/>Gợi ý Prompt</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="w-full max-w-md mx-auto mt-6">
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <h3 className="text-base font-semibold mb-2 text-neutral-300">Số lượng ảnh</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {imageCountOptions.map(count => (
                                        <button key={count} onClick={() => setImageCount(count)} className={`py-2 text-center text-sm rounded-lg font-bold ${imageCount === count ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>{count}</button>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h3 className="text-base font-semibold mb-2 text-neutral-300">Tỷ lệ khung hình</h3>
                                <div className="flex gap-2">
                                    {(['3:4', '1:1', '16:9'] as AspectRatio[]).map(ar => (
                                        <button key={ar} onClick={() => setAspectRatio(ar)} className={`flex-1 py-2 text-center text-xs rounded-lg font-bold ${aspectRatio === ar ? 'bg-amber-500 text-black' : 'bg-neutral-800'}`}>{ar}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold mb-2 text-neutral-300">Chất lượng đầu ra</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <QualityButton quality="standard" selectedQuality={quality} onClick={setQuality} title="Standard" subtitle="Chất lượng tốt" />
                                <QualityButton quality="high" selectedQuality={quality} onClick={setQuality} title="2K - 4K (High)" subtitle="Chi tiết sắc nét" />
                                <QualityButton quality="ultra" selectedQuality={quality} onClick={setQuality} title="8K (Ultra)" subtitle="Siêu thực" />
                            </div>
                        </div>
                    </div>

                    {error && <div className="mt-4 bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm" role="alert">{error}</div>}
                    
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button onClick={handleGenerate} disabled={!canGenerate} className="w-full max-w-xs py-4 px-4 text-lg font-bold rounded-lg transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed">
                            {isLoading ? "Đang xử lý..." : "Tạo ảnh"}
                        </button>
                        <button onClick={handleReset} className="py-4 px-6 text-lg font-medium rounded-lg transition-colors bg-neutral-800 hover:bg-neutral-700">Làm lại</button>
                    </div>
                </div>
            </div>

            <div className="bg-neutral-900 rounded-xl p-6 flex flex-col h-full relative">
                 {isLoading && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
                        <Spinner />
                        <p className="mt-4 text-lg font-semibold">Đang tạo nên tác phẩm của bạn...</p>
                    </div>
                )}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white text-center">Kết Quả</h2>
                </div>
                <div className="flex-grow bg-neutral-800 rounded-lg flex items-center justify-center p-4">
                    {outputImages.length > 0 ? (
                        <div className={`w-full h-full grid gap-4 ${outputImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {outputImages.map((image, index) => (
                                <div key={index} className="relative group w-full h-full rounded-lg">
                                    <img src={image} alt={`Output ${index + 1}`} className="w-full h-full object-contain rounded-lg" />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                        <a href={image} download={`fashion-creation-${index + 1}.png`} title="Download" className="p-3 bg-neutral-900/80 rounded-full text-white hover:bg-amber-500 hover:text-black">
                                            <DownloadIcon className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center text-neutral-600 flex flex-col items-center p-8">
                            <PhotoIcon className="w-24 h-24 mb-6" />
                            <h3 className="text-2xl font-semibold text-neutral-300">Tác phẩm của bạn sẽ hiện ở đây.</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FashionMoodboard;