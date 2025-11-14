
import React from 'react';
import { MoodboardIcon } from './Icons';
import { Tab } from '../types';

interface SidebarNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  appName: string;
  appSubtitle: string;
  tabTitles: Record<Tab, string>;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activeTab, setActiveTab, appName, appSubtitle, tabTitles }) => {
  const navItems = [
    { id: 'moodboard', icon: <MoodboardIcon />, label: tabTitles.moodboard },
  ];

  return (
    <header className="w-full bg-neutral-900 border-b border-neutral-800 p-4 flex justify-between items-center z-20 flex-shrink-0">
      <div className="flex items-center gap-4 w-48">
        <div className="text-left">
            <h1 className="text-xl font-bold tracking-wider text-white">{appName}</h1>
            <p className="text-xs font-semibold tracking-widest text-amber-500">{appSubtitle}</p>
        </div>
      </div>
      <nav className="flex-grow flex justify-center items-center">
        <ul className="flex items-center gap-2 flex-wrap justify-center">
          {navItems.map(item => (
            <li key={item.id}>
              <button 
                onClick={() => setActiveTab(item.id as Tab)}
                className={`flex flex-col items-center justify-center w-28 h-20 px-2 py-2 rounded-lg transition-colors duration-200 ${activeTab === item.id ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                title={item.label}
              >
                {React.cloneElement(item.icon, { className: 'w-7 h-7' })}
                <span className="text-xs mt-1.5 font-medium text-center">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="w-48"></div> 
    </header>
  );
};

export default SidebarNav;