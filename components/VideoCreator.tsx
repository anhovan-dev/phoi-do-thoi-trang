
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ImageInput } from '../types';
import { suggestVideoPrompt } from '../services/geminiService';
import Spinner from './Spinner';
import { Tab } from '../types';

// Assuming window.aistudio is declared elsewhere in the project.


const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
);
const FilmIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>
);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.11a.75.75 0 0 0 .44 1.282l5.214.945 2.125 4.671a.75.75 0 0 0 1.332 0l2.125-4.671 5.214-.945a.75.75 0 0 0 .44-1.282l-3.423-3.11-4.753-.39-1.83-4.401Z" clipRule="evenodd" /></svg>
);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
);

const dataUrlToImageInput = (dataUrl: string): ImageInput => {
    const parts = dataUrl.split(';base64,');
    const mimeType = parts[0].split(':')[1];
    const base64 = parts[1];
    return { base64, mimeType };
};

const extractFrameAtTime = (videoFile: File, timeInSeconds: number): Promise<ImageInput> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        
        video.onloadedmetadata = () => {
            video.currentTime = Math.min(timeInSeconds, video.duration || timeInSeconds);
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            URL.revokeObjectURL(video.src);
            resolve(dataUrlToImageInput(dataUrl));
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(video.src);
            reject(new Error("Failed to load video file for frame extraction."));
        };
    });
};

const loadingMessages = [
    "Initializing video generation...",
    "AI is warming up its creative circuits...",
    "Composing the opening scene...",
    "This process can take a few minutes. Please wait...",
    "Rendering keyframes with artistic flair...",
    "Adding cinematic magic...",
    "Finalizing your video masterpiece...",
];

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return String(error);
};

interface VideoCreatorProps {
    sharedImages: string[];
    onGenerationComplete: (data: { urls: string[], prompt: string, sourceTab: Tab, type: 'video' }) => void;
}

const VideoCreator: React.FC<VideoCreatorProps> = ({ sharedImages, onGenerationComplete }) => {
    const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [sampleVideo, setSampleVideo] = useState<File | null>(null);
    const [sampleVideoUrl, setSampleVideoUrl] = useState<string | null>(null);
    
    const [prompt, setPrompt] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const pollIntervalRef = useRef<number | null>(null);
    
    const availableImages = useMemo(() => {
        return Array.from(new Set([...sharedImages, ...uploadedImages]));
    }, [sharedImages, uploadedImages]);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeyReady(hasKey);
            } else {
                console.warn("aistudio API not found. Assuming API key is set in environment.");
                setApiKeyReady(true);
            }
        };
        checkKey();

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setApiKeyReady(true);
        }
    };

    const handleImageToggle = (image: string) => {
        setSelectedImages(prev => 
            prev.includes(image) ? prev.filter(i => i !== image) : [...prev, image]
        );
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            setError('Please select valid image files.');
            return;
        }

        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                if (!uploadedImages.includes(dataUrl)) {
                     setUploadedImages(prev => [...prev, dataUrl]);
                }
            };
            reader.readAsDataURL(file);
        });
        setError(null);
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file: File | undefined = e.target.files?.[0];
        if (file && file.type.startsWith('video/')) {
            setSampleVideo(file);
            if(sampleVideoUrl) URL.revokeObjectURL(sampleVideoUrl);
            setSampleVideoUrl(URL.createObjectURL(file));
            setError(null);
        } else {
            setError('Please select a valid video file.');
        }
    };

    const handleSuggestPrompt = async () => {
        if (!sampleVideo) {
            setError("Please upload a sample video to analyze.");
            return;
        }
        setIsSuggesting(true);
        setError(null);
        try {
            const videoFrame = await extractFrameAtTime(sampleVideo, 1);
            const imageInputs = selectedImages.map(dataUrlToImageInput);
            const suggestion = await suggestVideoPrompt(videoFrame, imageInputs);
            setPrompt(suggestion);
        // FIX: Safely handle the unknown error type by using a helper function to extract the message, avoiding direct property access on 'err' which can cause a runtime crash.
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err);
            if (errorMessage.includes("Requested entity was not found")) {
                setError("API Key error. Please re-select your API key.");
                setApiKeyReady(false);
            } else {
                setError(errorMessage || "Could not generate prompt suggestion.");
            }
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleGenerateVideo = async () => {
        if (!prompt) {
            setError("Prompt cannot be empty.");
            return;
        }
        setIsLoading(true);
        setGeneratedVideoUrl(null);
        setError(null);
        setLoadingMessage(loadingMessages[0]);
        
        let messageIndex = 0;
        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 7000);

        try {
            if (!process.env.API_KEY) throw new Error("API Key is not configured.");

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let operation = await ai.models.generateVideos({
              model: 'veo-3.1-fast-generate-preview',
              prompt,
              image: selectedImages.length > 0 ? dataUrlToImageInput(selectedImages[0]) : undefined,
              config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
              }
            });

            pollIntervalRef.current = window.setInterval(async () => {
                try {
                    const pollingAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    operation = await pollingAi.operations.getVideosOperation({ operation: operation });
                    
                    const op = operation as any;

                    if (op.done) {
                        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                        clearInterval(messageInterval);
                        const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
                        if (downloadLink) {
                            const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
                            const videoBlob: Blob = await videoResponse.blob();
                            const videoUrl = URL.createObjectURL(videoBlob);
                            setGeneratedVideoUrl(videoUrl);
                            setIsLoading(false);
                            onGenerationComplete({ urls: [videoUrl], prompt, sourceTab: 'videoCreator', type: 'video' });
                        } else {
                            throw new Error(
                                getErrorMessage(op.error) || "Video generation finished but no video URI was found."
                            );
                        }
                    }
                // FIX: Safely handle the unknown polling error by extracting a string message. This prevents incorrect assumptions about the error's type, such as treating it as a Blob, which would cause a runtime crash.
                } catch (pollErr: unknown) {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    clearInterval(messageInterval);
                    const errorMessage = getErrorMessage(pollErr);
                    if (errorMessage.includes("Requested entity was not found")) {
                        setError("API Key error. Please re-select your API key.");
                        setApiKeyReady(false);
                    } else {
                        setError(errorMessage || 'An error occurred while polling for video status.');
                    }
                    setIsLoading(false);
                }
            }, 10000);
        } catch (err: unknown) {
            clearInterval(messageInterval);
            const errorMessage = getErrorMessage(err);
            if (errorMessage.includes("API key not valid") || errorMessage.includes("Requested entity was not found")) {
                setError("API Key error. It might be invalid or lack necessary permissions. Please re-select your API key.");
                setApiKeyReady(false);
            } else {
                setError(errorMessage || 'An unexpected error occurred during video generation.');
            }
            setIsLoading(false);
        }
    };


    const renderContent = () => {
        if (apiKeyReady === false) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 rounded-lg p-8">
                    <h3 className="text-xl font-semibold mb-4">API Key Required for Video Generation</h3>
                    <p className="text-neutral-400 mb-6 text-center max-w-md">
                        Video generation with Veo requires a project with billing enabled. Please select your API key to proceed.
                        <br />
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Learn more about billing.</a>
                    </p>
                    <button onClick={handleSelectKey} className="py-3 px-6 text-base font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-black">
                        Select API Key
                    </button>
                </div>
            );
        }

        return (
             <div className="flex-grow flex flex-col lg:flex-row gap-4">
                {/* Controls Panel */}
                <div className="lg:w-2/5 flex-shrink-0 flex flex-col gap-4">
                    <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-base font-bold text-neutral-200">1. Chọn ảnh để làm video</h2>
                             <label htmlFor="image-upload" className="cursor-pointer text-sm font-semibold py-1 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center gap-2">
                                <UploadIcon className="w-4 h-4" />
                                Tải ảnh lên
                            </label>
                            <input id="image-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                        </div>

                        <p className="text-sm text-neutral-400">Chọn một hoặc nhiều ảnh đã tạo hoặc tải lên. Ảnh đầu tiên bạn chọn sẽ được dùng làm ảnh tham chiếu khởi đầu cho video.</p>
                        {availableImages.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                                {availableImages.map((image, index) => (
                                    <div key={index} className="flex-shrink-0 w-24 h-24 relative group cursor-pointer" onClick={() => handleImageToggle(image)}>
                                        <img src={image} alt={`Selectable image ${index + 1}`} className="w-full h-full object-cover rounded-md transition-all group-hover:opacity-70" />
                                        {selectedImages.includes(image) && <div className="absolute inset-0 bg-amber-500/50 border-2 border-amber-400 rounded-md flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.052-.143Z" clipRule="evenodd" /></svg></div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-neutral-700 rounded-lg">
                                 <p className="text-sm text-neutral-500">Chưa có ảnh nào. Tải ảnh lên hoặc tạo ảnh ở các tab khác.</p>
                            </div>
                        )}
                    </div>
                     <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                        <h2 className="text-base font-bold text-neutral-200">2. Tải video mẫu để phân tích</h2>
                        <label htmlFor="video-upload" className="w-full cursor-pointer border-2 border-dashed border-neutral-700 hover:border-amber-500 transition-colors rounded-lg flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                            <UploadIcon className="w-8 h-8 mb-2" />
                            <span className="font-semibold">Nhấn để tải video lên</span>
                            <span className="text-sm">AI sẽ phân tích phong cách của video này</span>
                        </label>
                        <input id="video-upload" type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                        {sampleVideoUrl && <video src={sampleVideoUrl} controls className="w-full rounded-md max-h-48" />}
                    </div>
                    <div className="bg-neutral-900 rounded-lg p-4 space-y-4">
                        <h2 className="text-base font-bold text-neutral-200">3. Prompt tạo video</h2>
                         <button onClick={handleSuggestPrompt} disabled={isSuggesting || !sampleVideo} className="w-full text-sm font-semibold py-2 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSuggesting ? <><Spinner /> Đang phân tích...</> : <><SparklesIcon className="w-4 h-4 text-amber-400"/> Gợi ý prompt từ AI</>}
                        </button>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Prompt sẽ được AI điền vào đây, hoặc bạn có thể tự viết..." className="w-full h-32 p-2 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-sm" />
                    </div>
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-md text-sm" role="alert">{error}</div>}
                    <button onClick={handleGenerateVideo} disabled={isLoading || !prompt} className="w-full py-3 px-4 text-base font-bold rounded-lg transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed">
                        {isLoading ? <><Spinner /> Đang tạo video...</> : 'Tạo video'}
                    </button>
                </div>
                {/* Results Panel */}
                <div className="flex-grow flex flex-col bg-neutral-900 rounded-lg p-4 relative min-h-[500px]">
                    <h2 className="text-base font-bold text-neutral-200 mb-2">Kết quả</h2>
                    <div className="flex-grow flex items-center justify-center rounded-md bg-black/30 aspect-video">
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg text-center p-4">
                                <Spinner />
                                <p className="mt-4 text-lg font-semibold">{loadingMessage}</p>
                            </div>
                        )}
                        {!isLoading && !generatedVideoUrl && (
                            <div className="text-center text-neutral-600 flex flex-col items-center p-8">
                                <FilmIcon className="w-16 h-16 mb-4" />
                                <h3 className="text-xl font-semibold text-neutral-400">Video của bạn sẽ hiện ở đây.</h3>
                            </div>
                        )}
                        {!isLoading && generatedVideoUrl && (
                            <div className="w-full h-full flex flex-col gap-4">
                                <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-md" />
                                <a href={generatedVideoUrl} download={`generated-video.mp4`} title="Download" className="flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors">
                                    <DownloadIcon className="w-4 h-4" /> Tải video
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex-grow flex p-4">
            {renderContent()}
        </div>
    );
};

export default VideoCreator;