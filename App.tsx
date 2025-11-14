
import React, { useState, useEffect } from 'react';
import ImageCreator from './components/ImageCreator';
import ImageEditor from './components/ImageEditor';
import OutfitChanger from './components/OutfitChanger';
import PosterCreator from './components/PosterCreator';
import VideoCreator from './components/VideoCreator';
import MediaLibrary from './components/MediaLibrary';
import SidebarNav from './components/SidebarNav';
import Settings from './components/Settings';
import { MediaLibraryItem, Tab } from './types';
import ProductStudio from './components/ProductStudio';
import FashionMoodboard from './components/FashionMoodboard';
import VirtualStudio from './components/VirtualStudio';


const tabComponents: Record<Tab, React.FC<any>> = {
    creator: ImageCreator,
    productStudio: ProductStudio,
    editor: ImageEditor,
    outfitChanger: OutfitChanger,
    moodboard: FashionMoodboard,
    virtualStudio: VirtualStudio,
    posterCreator: PosterCreator,
    videoCreator: VideoCreator,
    library: MediaLibrary,
    settings: Settings,
};

const defaultSettings = {
    appName: "PHẠM VŨ",
    appSubtitle: "IMAGE STUDIO",
    tabTitles: {
      creator: 'Tạo ảnh thời trang',
      productStudio: 'Studio Sản Phẩm',
      editor: 'Chỉnh sửa & Kết hợp sản phẩm',
      outfitChanger: 'Thay Trang Phục',
      moodboard: 'Phối đồ thời trang',
      virtualStudio: 'Studio ảo',
      posterCreator: 'Tạo Poster Ảnh',
      videoCreator: 'Tạo Video',
      library: 'Thư viện',
      settings: 'Cài đặt',
    }
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('moodboard');
    const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>([]);
    const [appSettings, setAppSettings] = useState(() => {
        try {
            const savedSettings = localStorage.getItem('appSettings');
            return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        } catch (error) {
            console.error("Could not parse settings from localStorage", error);
            return defaultSettings;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('appSettings', JSON.stringify(appSettings));
        } catch (error) {
            console.error("Could not save settings to localStorage", error);
        }
    }, [appSettings]);

    const addToLibrary = (data: { urls: string[], prompt: string, sourceTab: Tab, type?: 'image' | 'video' }) => {
        if (data.sourceTab === 'library' || data.sourceTab === 'settings') {
            return;
        }
        const sourceTab = data.sourceTab;
        const newItems: MediaLibraryItem[] = data.urls.map(url => ({
            id: `${Date.now()}-${Math.random()}`,
            url,
            type: data.type || 'image',
            prompt: data.prompt,
            sourceTab: sourceTab,
            createdAt: new Date().toISOString(),
        }));
        setMediaLibrary(prev => [...newItems, ...prev]);
    };
    
    const deleteFromLibrary = (id: string) => {
        setMediaLibrary(prev => prev.filter(item => item.id !== id));
    };

    const ActiveComponent = tabComponents[activeTab];
    
    const props: any = {};
    const sharedImageUrls = mediaLibrary.filter(item => item.type === 'image').map(item => item.url);

    if (['creator', 'editor', 'outfitChanger', 'posterCreator', 'videoCreator', 'productStudio', 'moodboard', 'virtualStudio'].includes(activeTab)) {
        props.onGenerationComplete = addToLibrary;
    }
     if (['editor', 'outfitChanger', 'posterCreator', 'videoCreator', 'productStudio', 'moodboard', 'virtualStudio'].includes(activeTab)) {
        props.sharedImages = sharedImageUrls;
    }
    if (activeTab === 'library') {
        props.library = mediaLibrary;
        props.onDelete = deleteFromLibrary;
    }
    if (activeTab === 'settings') {
        props.settings = appSettings;
        props.setSettings = setAppSettings;
        props.defaultSettings = defaultSettings;
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col font-sans">
            <SidebarNav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                appName={appSettings.appName}
                appSubtitle={appSettings.appSubtitle}
                tabTitles={appSettings.tabTitles}
            />
            
            <main className="flex-grow flex flex-col">
                <div className="flex-grow flex w-full">
                    <ActiveComponent {...props} />
                </div>
            </main>
        </div>
    );
};

export default App;