import React, { useState } from 'react';
import Wardrobe from './Wardrobe';
import DailyStyle from './DailyStyle';
import Enhancements from './Enhancements';
import StyleProfile from './StyleProfile';
import SavedOutfits from './SavedOutfits';
import SeasonalSwap from './SeasonalSwap';
import CommunityFeed from './CommunityFeed';
import { WardrobeIcon, StyleIcon, EnhanceIcon, UserIcon, BookmarkIcon, LeafIcon, GlobeIcon } from './icons';

type Tab = 'wardrobe' | 'style' | 'enhancements' | 'profile' | 'saved' | 'seasonal' | 'community';

const UserDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('wardrobe');

  const renderContent = () => {
    switch (activeTab) {
      case 'wardrobe':
        return <Wardrobe />;
      case 'style':
        return <DailyStyle />;
      case 'enhancements':
        return <Enhancements />;
      case 'profile':
        return <StyleProfile />;
      case 'saved':
        return <SavedOutfits />;
      case 'seasonal':
        return <SeasonalSwap />;
      case 'community':
        return <CommunityFeed />;
      default:
        return <Wardrobe />;
    }
  };

  const NavItem: React.FC<{ tabName: Tab; icon: React.ReactNode; label: string }> = ({ tabName, icon, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`relative flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
        activeTab === tabName
          ? 'bg-primary/20 text-primary'
          : 'text-foreground/80 hover:bg-card'
      }`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 rounded-r-lg bg-primary transition-opacity ${activeTab === tabName ? 'opacity-100' : 'opacity-0'}`}></span>
      {icon}
      <span className="ml-4">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-60 flex-shrink-0">
        <nav className="flex md:flex-col p-2 space-x-2 md:space-x-0 md:space-y-2 bg-card border border-border rounded-xl shadow-lg">
            <NavItem tabName="wardrobe" icon={<WardrobeIcon className="h-5 w-5"/>} label="My Wardrobe" />
            <NavItem tabName="style" icon={<StyleIcon className="h-5 w-5"/>} label="Daily Style" />
            <NavItem tabName="saved" icon={<BookmarkIcon className="h-5 w-5"/>} label="Saved Outfits" />
            <NavItem tabName="community" icon={<GlobeIcon className="h-5 w-5"/>} label="Community" />
            <NavItem tabName="seasonal" icon={<LeafIcon className="h-5 w-5"/>} label="Seasonal Swap" />
            <NavItem tabName="enhancements" icon={<EnhanceIcon className="h-5 w-5"/>} label="Enhancements" />
            <NavItem tabName="profile" icon={<UserIcon className="h-5 w-5"/>} label="Style Profile" />
        </nav>
      </aside>
      <div className="flex-grow">
        {renderContent()}
      </div>
    </div>
  );
};

export default UserDashboard;
