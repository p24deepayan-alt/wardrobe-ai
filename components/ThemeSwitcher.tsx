import React from 'react';
import useTheme from '../hooks/useTheme';
import { SunIcon, MoonIcon } from './icons';

const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${className}`}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <SunIcon className="h-6 w-6 text-foreground/80" />
            ) : (
                <MoonIcon className="h-6 w-6 text-foreground/80" />
            )}
        </button>
    );
};

export default ThemeSwitcher;
