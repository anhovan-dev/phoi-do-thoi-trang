
import React, { useState, useMemo } from 'react';
import { MediaLibraryItem } from '../types';
// FIX: Import 'Tab' from '../types' instead of '../App'.
import { Tab } from '../types';

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.077-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>);
const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>);

interface MediaLibraryProps {
    library: MediaLibraryItem[];
    onDelete: (id: string) => void;
}

// FIX: Correct the type to match MediaLibraryItem['sourceTab'] and remove invalid keys.
const sourceTabLabels: Record<MediaLibraryItem['sourceTab'], string> = {
    creator: 'Tạo ảnh thời trang',
    productStudio: 'Studio Sản Phẩm',
    editor: 'Chỉnh sửa & Kết hợp sản phẩm',
    outfitChanger: 'Thay Trang Phục',
    posterCreator: 'Tạo Poster Ảnh',
    videoCreator: 'Tạo Video',
    moodboard: 'Phối đồ thời trang',
    virtualStudio: 'Studio ảo',
};

const MediaLibrary: React.FC<MediaLibraryProps> = ({ library, onDelete }) => {
    const [selectedItem, setSelectedItem] = useState<MediaLibraryItem | null>(null);

    const sortedLibrary = useMemo(() => {
        return [...library].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [library]);
    
    if (library.length === 0) {
        return (
            <div className="w-full flex-grow flex flex-col items-center justify-center text-center p-8 text-neutral-600">
                <LibraryIcon className="w-24 h-24 mb-6" />
                <h2 className="text-2xl font-bold text-neutral-300">Thư viện của bạn đang trống</h2>
                <p className="mt-2 max-w-sm">Tất cả hình ảnh và video bạn tạo trong ứng dụng sẽ được tự động lưu ở đây để bạn dễ dàng quản lý và tái sử dụng.</p>
            </div>
        )
    }

    return (
        <div className="w-full flex-grow flex flex-col lg:flex-row p-4 gap-4">
            {selectedItem && (
                 <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center" onClick={() => setSelectedItem(null)}>
                     <div className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-lg p-4" onClick={e => e.stopPropagation()}>
                        {selectedItem.type === 'image' ? (
                            <img src={selectedItem.url} className="w-full h-auto max-h-[85vh] object-contain" />
                        ) : (
                            <video src={selectedItem.url} controls autoPlay loop className="w-full h-auto max-h-[85vh] object-contain" />
                        )}
                        <button onClick={() => setSelectedItem(null)} className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">&times;</button>
                     </div>
                 </div>
            )}
            
            <div className="lg:w-1/3 xl:w-1/4 flex-shrink-0 bg-neutral-900 rounded-lg p-4 flex flex-col">
                <h2 className="text-xl font-bold mb-4">Thông tin</h2>
                {selectedItem ? (
                     <div className="space-y-4 text-sm">
                        <div>
                             <h3 className="font-semibold text-neutral-400">Loại</h3>
                             <p>{selectedItem.type === 'image' ? 'Hình ảnh' : 'Video'}</p>
                        </div>
                        <div>
                             <h3 className="font-semibold text-neutral-400">Nguồn</h3>
                             <p>{sourceTabLabels[selectedItem.sourceTab] || 'Không rõ'}</p>
                        </div>
                        <div>
                             <h3 className="font-semibold text-neutral-400">Ngày tạo</h3>
                             <p>{new Date(selectedItem.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                             <h3 className="font-semibold text-neutral-400">Prompt đã dùng</h3>
                             <textarea readOnly value={selectedItem.prompt} className="w-full h-40 mt-1 p-2 bg-neutral-800 border border-neutral-700 rounded-md text-xs font-mono"></textarea>
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-neutral-800">
                            <a href={selectedItem.url} download={`gemini-studio-${selectedItem.id}.${selectedItem.type === 'image' ? 'png' : 'mp4'}`} className="flex-1 text-center py-2 px-3 font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-black transition-colors">Tải xuống</a>
                            <button onClick={() => {onDelete(selectedItem.id); setSelectedItem(null)}} className="py-2 px-3 font-semibold rounded-md bg-red-800 hover:bg-red-700 text-white transition-colors"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-neutral-600">
                        <p>Chọn một mục để xem chi tiết.</p>
                    </div>
                )}
            </div>
            
            <div className="flex-grow">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {sortedLibrary.map(item => (
                        <div 
                            key={item.id} 
                            className={`relative group aspect-square cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${selectedItem?.id === item.id ? 'ring-4 ring-amber-500 shadow-lg' : 'ring-2 ring-transparent hover:ring-amber-500'}`}
                            onClick={() => setSelectedItem(item)}
                        >
                            {item.type === 'image' ? (
                                <img src={item.url} alt={`Generated content ${item.id}`} className="w-full h-full object-cover" />
                            ) : (
                                <video src={item.url} muted loop className="w-full h-full object-cover" onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {item.type === 'video' && <VideoIcon className="absolute top-2 left-2 w-6 h-6 text-white drop-shadow-lg" />}
                            <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }} title="Thông tin" className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black"><InfoIcon className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); if (selectedItem?.id === item.id) setSelectedItem(null);}} title="Xóa" className="p-1.5 bg-black/50 rounded-full text-white hover:bg-red-700"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const LibraryIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
       <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5-1.5a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5h16.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V3a1.5 1.5 0 0 1 1.5-1.5Z" />
   </svg>
);


export default MediaLibrary;