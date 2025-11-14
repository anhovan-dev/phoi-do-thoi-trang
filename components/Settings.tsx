
import React from 'react';
// FIX: Import 'Tab' from '../types' instead of '../App'.
import { Tab } from '../types';

interface SettingsProps {
    settings: {
        appName: string;
        appSubtitle: string;
        tabTitles: Record<Tab, string>;
    };
    setSettings: (settings: any) => void;
    defaultSettings: {
        appName: string;
        appSubtitle: string;
        tabTitles: Record<Tab, string>;
    };
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings, defaultSettings }) => {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [section, key] = name.split('.');
        
        if (section === 'tabTitles') {
            setSettings((prev: any) => ({
                ...prev,
                tabTitles: {
                    ...prev.tabTitles,
                    [key]: value
                }
            }));
        } else {
            setSettings((prev: any) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleReset = () => {
        if (window.confirm('Bạn có chắc chắn muốn đặt lại tất cả cài đặt về mặc định không?')) {
            setSettings(defaultSettings);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-neutral-900 rounded-xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-neutral-800 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Cài đặt</h1>
                        <p className="text-neutral-400 mt-1">Tùy chỉnh tên ứng dụng và các chức năng.</p>
                    </div>
                    <button 
                        onClick={handleReset}
                        className="mt-4 md:mt-0 py-2 px-4 text-sm font-semibold rounded-lg transition-colors bg-red-800 hover:bg-red-700 text-white"
                    >
                        Khôi phục mặc định
                    </button>
                </div>
                
                <div className="space-y-8">
                    {/* App Name Settings */}
                    <div>
                        <h2 className="text-lg font-semibold text-amber-500 mb-4">Tên Ứng dụng</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField 
                                label="Tên chính"
                                name="appName"
                                value={settings.appName}
                                onChange={handleInputChange}
                            />
                            <InputField 
                                label="Tên phụ"
                                name="appSubtitle"
                                value={settings.appSubtitle}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* Tab Name Settings */}
                    <div>
                        <h2 className="text-lg font-semibold text-amber-500 mb-4">Tên Chức năng (Tabs)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.keys(settings.tabTitles).map((tabKey) => (
                                <InputField 
                                    key={tabKey}
                                    label={`Tab: ${defaultSettings.tabTitles[tabKey as Tab]}`}
                                    name={`tabTitles.${tabKey}`}
                                    value={settings.tabTitles[tabKey as Tab]}
                                    onChange={handleInputChange}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-neutral-400 mb-2">{label}</label>
        <input
            type="text"
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
        />
    </div>
);

export default Settings;