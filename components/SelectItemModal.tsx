import React, { useState, useMemo } from 'react';
import type { ClothingItem } from '../types';
import ItemCard from './ItemCard';
import { SearchIcon } from './icons';

interface SelectItemModalProps {
    items: ClothingItem[];
    onClose: () => void;
    onSelect: (item: ClothingItem) => void;
}

const SelectItemModal: React.FC<SelectItemModalProps> = ({ items, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        return items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col animate-slideInUp">
                <h2 className="text-2xl font-serif font-bold mb-4 flex-shrink-0 text-card-foreground">Select an Item to Style</h2>
                
                <div className="relative mb-4 flex-shrink-0">
                    <SearchIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                    <input 
                        type="text" 
                        placeholder="Search your wardrobe..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" 
                    />
                </div>

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {filteredItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredItems.map(item => (
                                <ItemCard key={item.id} item={item} onClick={() => onSelect(item)} />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                            <p className="text-foreground/70">No items match your search.</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 flex justify-end flex-shrink-0 border-t border-border pt-4">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default SelectItemModal;