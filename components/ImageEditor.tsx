import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    generateFourImages, 
    analyzeImageForContext, 
    analyzeImageForStyle
} from '../services/geminiService';
import { ImageInput, Quality } from '../types';
import Spinner from './Spinner';
import { Tab } from '../types';

// --- ICONS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);


// --- HELPER FUNCTIONS & COMPONENTS ---

const fileToImageInput = (file: File): Promise<ImageInput> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return reject(new Error('Invalid file type.'));
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(';base64,');
            resolve({ mimeType: parts[0].split(':')[1], base64: parts[1] });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const dataUrlToImageInput = (dataUrl: string): ImageInput => {
    const parts = dataUrl.split(';base64,');
    return { mimeType: parts[0].split(':')[1], base64: parts[1] };
};

const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

const QualityButton: React.FC<{ quality: Quality, selectedQuality: Quality, onClick: (q: Quality) => void, title: string, subtitle: string }> = ({ quality, selectedQuality, onClick, title, subtitle }) => (
    <button
        onClick={() => onClick(quality)}
        className={`p-3 rounded-md text-left transition-all duration-200 border-2 ${selectedQuality === quality ? 'bg-amber-900/50 border-amber-500' : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'}`}
    >
        <p className="font-bold text-sm text-neutral-100">{title}</p>
        <p className="text-xs text-neutral-400">{subtitle}</p>
    </button>
);

const ImageSlot: React.FC<{ title: string; image: ImageInput | null; onFileSelect: (file: File) => void; onRemove: () => void; }> = ({ title, image, onFileSelect, onRemove }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
    };
    const elementId = `upload-${title.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="bg-neutral-900 rounded-lg p-4 space-y-3">
            <h3 className="text-base font-bold text-neutral-200">{title}</h3>
            <label htmlFor={elementId} className="w-full h-40 cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex items-center justify-center relative">
                {image ? (
                    <>
                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt={title} className="w-full h-full object-contain p-1" />
                        <button onClick={(e) => { e.preventDefault(); onRemove(); }} className="absolute top-1 right-1 bg-amber-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold z-10">&times;</button>
                    </>
                ) : (
                    <div className="text-center text-neutral-500">
                        <UploadIcon className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm">Tải ảnh lên</span>
                    </div>
                )}
            </label>
            <input id={elementId} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>
    );
};


// --- MAIN COMPONENT ---

interface ImageEditorProps {
    sharedImages: string[];
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab }) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ sharedImages, onGenerationComplete }) => {
    const [characterImage, setCharacterImage] = useState<ImageInput | null>(null);
    const [mainProductImage, setMainProductImage] = useState<ImageInput | null>(null);
    const [detailImages, setDetailImages] = useState<ImageInput[]>([]);
    const [contextImage, setContextImage] = useState<ImageInput | null>(null);
    const [styleImage, setStyleImage] = useState<ImageInput | null>(null);

    const [contextDescription, setContextDescription] = useState('');
    const [styleDescription, setStyleDescription] = useState('');
    const [finalPrompt, setFinalPrompt] = useState('');

    const [isAnalyzingContext, setIsAnalyzingContext] = useState(false);
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

    const [keepFace, setKeepFace] = useState(true);
    const [quality, setQuality] = useState<Quality>('high');
    const [resultImages, setResultImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignmentPopover, setAssignmentPopover] = useState<{ image: string; top: number; left: number; } | null>(null);

    // Auto-generate prompt when dependencies change
    useEffect(() => {
        const parts: string[] = [];
        
        if (keepFace && characterImage) {
            parts.push("QUAN TRỌNG HÀNG ĐẦU: Giữ nguyên 100% khuôn mặt và các đặc điểm trên mặt của nhân vật trong ảnh tham chiếu. Không thay đổi bất cứ điều gì trên khuôn mặt. (Top priority: Preserve the face and all facial features of the person in the reference image with 100% accuracy. Do not alter the face in any way.)");
        }
        
        parts.push("Tạo một bức ảnh giới thiệu sản phẩm chuyên nghiệp, tả thực.");

        if (characterImage) parts.push("NHÂN VẬT: Sử dụng người từ ảnh Nhân vật tham chiếu.");
        if (mainProductImage) parts.push("SẢN PHẨM CHÍNH: Làm nổi bật sản phẩm từ ảnh Sản phẩm chính tham chiếu.");
        if (detailImages.length > 0) parts.push(`CHI TIẾT PHỤ: Kết hợp các yếu tố từ ${detailImages.length} ảnh chi tiết phụ.`);
        if (contextDescription) parts.push(`BỐI CẢNH: Đặt nhân vật và sản phẩm trong bối cảnh được mô tả như sau: "${contextDescription}".`);
        if (styleDescription) parts.push(`PHONG CÁCH: Bức ảnh phải có phong cách nghệ thuật như sau: "${styleDescription}".`);

        if (quality === 'ultra') parts.push("Chất lượng ảnh: siêu thực 8K, chi tiết sắc nét.");
        else if (quality === 'high') parts.push("Chất lượng ảnh: cao cấp 4K, chi tiết.");

        setFinalPrompt(parts.join('\n'));
    }, [characterImage, mainProductImage, detailImages, contextDescription, styleDescription, keepFace, quality]);

    const handleFileSelect = async (file: File, type: 'character' | 'product' | 'context' | 'style') => {
        try {
            const imageInput = await fileToImageInput(file);
            switch (type) {
                case 'character': setCharacterImage(imageInput); break;
                case 'product': setMainProductImage(imageInput); break;
                case 'context':
                    setContextImage(imageInput);
                    setIsAnalyzingContext(true);
                    setContextDescription('');
                    try {
                        const desc = await analyzeImageForContext(imageInput);
                        setContextDescription(desc);
                    } catch (e: any) { setError(e.message) } 
                    finally { setIsAnalyzingContext(false) }
                    break;
                case 'style':
                    setStyleImage(imageInput);
                    setIsAnalyzingStyle(true);
                    setStyleDescription('');
                    try {
                        const desc = await analyzeImageForStyle(imageInput);
                        setStyleDescription(desc);
                    } catch (e: any) { setError(e.message) }
                    finally { setIsAnalyzingStyle(false) }
                    break;
            }
        } catch (err: any) {
            setError(err.message || 'Tệp không hợp lệ.');
        }
    };

    const handleDetailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        try {
            const newImages = await Promise.all(Array.from(files).map(fileToImageInput));
            setDetailImages(prev => [...prev, ...newImages].slice(0, 4)); // Limit to 4
        } catch (err: any) {
            setError(err.message || 'Một vài tệp không hợp lệ.');
        }
    };
    
    const removeDetailImage = (index: number) => {
        setDetailImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleImageFromGalleryClick = (e: React.MouseEvent, image: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setAssignmentPopover({ image, top: rect.bottom + window.scrollY + 5, left: rect.left + window.scrollX });
    };

    const handleAssignImage = (type: 'character' | 'product' | 'context' | 'style') => {
        if (!assignmentPopover) return;
        const file = dataUrlToFile(assignmentPopover.image, `${type}.png`);
        handleFileSelect(file, type);
        setAssignmentPopover(null);
    };

    const handleSubmit = async () => {
        if (!characterImage && !mainProductImage) {
            setError("Vui lòng tải lên ít nhất ảnh Nhân vật hoặc ảnh Sản phẩm.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResultImages([]);

        try {
            const imageInputs: ImageInput[] = [];
            if (characterImage) imageInputs.push(characterImage);
            if (mainProductImage) imageInputs.push(mainProductImage);
            imageInputs.push(...detailImages);
            if (contextImage) imageInputs.push(contextImage);
            if (styleImage) imageInputs.push(styleImage);

            const uniqueImageInputs = Array.from(new Map(imageInputs.map(item => [item.base64, item])).values());

            const resultUrls = await generateFourImages(finalPrompt, uniqueImageInputs);
            setResultImages(resultUrls);
            onGenerationComplete({ urls: resultUrls, prompt: finalPrompt, sourceTab: 'editor' });
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi không mong muốn khi tạo ảnh.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const canSubmit = useMemo(() => !isLoading && (!!characterImage || !!mainProductImage), [isLoading, characterImage, mainProductImage]);

    return (
        <div className="w-full flex-grow flex flex-col lg:flex-row gap-2 md:gap-4 p-2 md:p-4">
            {assignmentPopover && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setAssignmentPopover(null)} />
                    <div className="absolute bg-neutral-800 border border-neutral-700 rounded-md shadow-lg p-2 flex flex-col gap-1 z-50" style={{ top: assignmentPopover.top, left: assignmentPopover.left }}>
                        <button onClick={() => handleAssignImage('character')} className="w-full text-left text-sm px-3 py-1.5 hover:bg-neutral-700 rounded">Dùng làm Nhân vật</button>
                        <button onClick={() => handleAssignImage('product')} className="w-full text-left text-sm px-3 py-1.5 hover:bg-neutral-700 rounded">Dùng làm Sản phẩm</button>
                        <button onClick={() => handleAssignImage('context')} className="w-full text-left text-sm px-3 py-1.5 hover:bg-neutral-700 rounded">Dùng làm Bối cảnh</button>
                        <button onClick={() => handleAssignImage('style')} className="w-full text-left text-sm px-3 py-1.5 hover:bg-neutral-700 rounded">Dùng làm Phong cách</button>
                    </div>
                </>
            )}

            {/* Left Panel */}
            <div className="lg:w-2/5 flex-shrink-0 flex flex-col gap-4">
                {sharedImages.length > 0 && (
                    <div className="bg-neutral-900 rounded-lg p-4">
                        <h2 className="text-base font-bold text-neutral-200 mb-3">Chọn ảnh đã tạo để sử dụng</h2>
                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                            {sharedImages.map((image, index) => (
                                <div key={index} className="flex-shrink-0 w-24 h-24 relative group cursor-pointer" onClick={(e) => handleImageFromGalleryClick(e, image)}>
                                    <img src={image} alt={`Generated ${index}`} className="w-full h-full object-cover rounded-md transition-all group-hover:ring-2 ring-offset-2 ring-offset-neutral-900 ring-amber-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <ImageSlot title="1. Ảnh Nhân Vật (Model)" image={characterImage} onFileSelect={(file) => handleFileSelect(file, 'character')} onRemove={() => setCharacterImage(null)} />
                <ImageSlot title="2. Ảnh Sản Phẩm Chính (Main Product)" image={mainProductImage} onFileSelect={(file) => handleFileSelect(file, 'product')} onRemove={() => setMainProductImage(null)} />
                <div className="bg-neutral-900 rounded-lg p-4 space-y-3">
                    <h3 className="text-base font-bold text-neutral-200">3. Ảnh Chi Tiết Phụ (tối đa 4)</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {detailImages.map((img, index) => (
                            <div key={index} className="relative aspect-square">
                                <img src={`data:${img.mimeType};base64,${img.base64}`} className="w-full h-full object-cover rounded-md" />
                                <button onClick={() => removeDetailImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">&times;</button>
                            </div>
                        ))}
                        {detailImages.length < 4 && (
                            <label htmlFor="detail-upload" className="aspect-square cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex items-center justify-center">
                                <UploadIcon className="w-6 h-6 text-neutral-500" />
                            </label>
                        )}
                    </div>
                    <input id="detail-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleDetailImageUpload} />
                </div>
                <ImageSlot title="4. Ảnh Bối Cảnh (Context Reference)" image={contextImage} onFileSelect={(file) => handleFileSelect(file, 'context')} onRemove={() => { setContextImage(null); setContextDescription(''); }} />
                <ImageSlot title="5. Ảnh Phong Cách (Style Reference)" image={styleImage} onFileSelect={(file) => handleFileSelect(file, 'style')} onRemove={() => { setStyleImage(null); setStyleDescription(''); }} />
            </div>

            {/* Right Panel */}
            <div className="flex-grow flex flex-col gap-4">
                <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                    <h2 className="text-base font-bold text-neutral-200">Prompt & Cài đặt</h2>
                    <div className="relative">
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Mô tả bối cảnh (từ AI)</label>
                        <textarea readOnly value={contextDescription} placeholder="Phân tích bối cảnh sẽ hiện ở đây..." className="w-full h-20 p-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm font-mono text-neutral-400"/>
                        {isAnalyzingContext && <div className="absolute top-8 right-2"><Spinner/></div>}
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Mô tả phong cách (từ AI)</label>
                        <textarea readOnly value={styleDescription} placeholder="Phân tích phong cách sẽ hiện ở đây..." className="w-full h-20 p-2 bg-neutral-950 border border-neutral-700 rounded-md text-sm font-mono text-neutral-400"/>
                        {isAnalyzingStyle && <div className="absolute top-8 right-2"><Spinner/></div>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Prompt hoàn chỉnh (có thể chỉnh sửa)</label>
                        <textarea value={finalPrompt} onChange={(e) => setFinalPrompt(e.target.value)} className="w-full h-48 p-2 bg-neutral-800 border border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold mb-2 text-neutral-300">Chất lượng</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <QualityButton quality="standard" selectedQuality={quality} onClick={setQuality} title="Nhanh" subtitle="Chất lượng tốt" />
                                <QualityButton quality="high" selectedQuality={quality} onClick={setQuality} title="2K-4K" subtitle="Chi tiết" />
                                <QualityButton quality="ultra" selectedQuality={quality} onClick={setQuality} title="8K" subtitle="Siêu thực" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-neutral-800/50 p-3 rounded-lg">
                            <span className="text-sm text-neutral-300 font-semibold">Giữ lại khuôn mặt tuyệt đối</span>
                            <button onClick={() => setKeepFace(!keepFace)} role="switch" aria-checked={keepFace} className={`${keepFace ? 'bg-amber-500' : 'bg-neutral-700'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                                <span className={`${keepFace ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                            </button>
                        </div>
                    </div>
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm" role="alert">{error}</div>}
                    <button onClick={handleSubmit} disabled={!canSubmit} className="w-full py-3 px-4 text-base font-bold rounded-lg transition-all bg-amber-500 hover:bg-amber-600 text-black disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo ảnh'}
                    </button>
                </div>
                
                <div className="flex-grow flex flex-col bg-neutral-900 rounded-lg p-4 relative">
                    <h2 className="text-base font-bold text-neutral-200 mb-2">Kết quả</h2>
                    <div className="flex-grow flex items-center justify-center rounded-md bg-black/30 aspect-square">
                        {isLoading && (<div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg"><Spinner /><p className="mt-4 font-semibold">Đang tạo nên tác phẩm của bạn...</p></div>)}
                        {!isLoading && resultImages.length === 0 && (<div className="text-center text-neutral-600 p-8"><PhotoIcon className="w-16 h-16 mx-auto mb-4" /><h3 className="text-xl font-semibold text-neutral-400">Kết quả sẽ hiện ở đây.</h3></div>)}
                        {!isLoading && resultImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 w-full h-full">
                                {resultImages.map((src, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img src={src} alt={`Generated ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                        <a href={src} download={`result-${index + 1}.png`} title="Download" className="absolute bottom-2 right-2 bg-black/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100"><DownloadIcon className="w-5 h-5" /></a>
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

export default ImageEditor;