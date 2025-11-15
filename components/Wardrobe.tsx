import React, { useState, useEffect, useMemo } from 'react';
import type { ClothingItem } from '../types';
import { ClothingCategory } from '../types';
import ItemCard from './ItemCard';
import { PlusIcon, SpinnerIcon, SearchIcon, CloseIcon } from './icons';
import { analyzeImage } from '../services/geminiService';
import { getItemsByUserId, addItems, updateItem, deleteItem } from '../services/storageService';
import useAuth from '../hooks/useAuth';
import EditItemModal from './EditItemModal';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface StagedImage {
    file: File;
    previewUrl: string;
}

const AddItemModal: React.FC<{ onClose: () => void, onAddItems: (items: ClothingItem[]) => void }> = ({ onClose, onAddItems }) => {
    const { user } = useAuth();
    const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
    const [imageUrl, setImageUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setError('');
            const files = Array.from(e.target.files);
            e.target.value = ''; 
            try {
                const newStagedImages = await Promise.all(
                    files.map(async (file) => {
                        const previewUrl = await fileToBase64(file);
                        return { file, previewUrl };
                    })
                );
                setStagedImages(prev => [...prev, ...newStagedImages]);
            } catch (err) {
                 setError("Could not process one or more files.");
            }
        }
    };

    const handleUrlAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl.trim()) return;
        setIsProcessing(true);
        setError('');
        try {
            new URL(imageUrl); // Basic URL validation
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch image. Status: ${response.status}`);
            
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error('URL does not point to a valid image type.');
            
            const fileName = imageUrl.substring(imageUrl.lastIndexOf('/') + 1) || 'pasted-image';
            const file = new File([blob], fileName, { type: blob.type });
            const previewUrl = await fileToBase64(file);
            
            setStagedImages(prev => [...prev, { file, previewUrl }]);
            setImageUrl('');
        } catch (err) {
            setError(err instanceof Error ? `Invalid URL or failed to fetch image: ${err.message}` : 'An unknown error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveStaged = (index: number) => {
        setStagedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (stagedImages.length === 0 || !user) return;

        setIsProcessing(true);
        setError('');

        const analysisPromises = stagedImages.map(img => analyzeImage(img.file));
        const results = await Promise.allSettled(analysisPromises);
        
        const newItems: ClothingItem[] = [];
        const failedItems: string[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const analysis = result.value;
                const stagedImage = stagedImages[index];
                newItems.push({
                    id: `item-${Date.now()}-${index}`,
                    userId: user.id,
                    imageUrl: stagedImage.previewUrl,
                    purchaseDate: new Date(),
                    name: analysis.name || 'New Item',
                    category: analysis.category || ClothingCategory.TOP,
                    color: analysis.color || 'Unknown',
                    style: analysis.style || 'Unknown',
                });
            } else {
                console.error("Failed to analyze one image:", result.reason);
                failedItems.push(stagedImages[index].file.name);
            }
        });

        if (newItems.length > 0) {
            onAddItems(newItems);
        }

        if (failedItems.length > 0) {
            setError(`Successfully added ${newItems.length} items. Failed to analyze: ${failedItems.join(', ')}.`);
            setIsProcessing(false);
            setStagedImages(stagedImages.filter(img => !failedItems.includes(img.file.name)));
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-slideInUp">
                <h2 className="text-xl font-bold mb-4 flex-shrink-0 text-card-foreground">Add New Item(s)</h2>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <div>
                         <label className="block w-full cursor-pointer border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                            <span className="block text-primary font-semibold">Upload from device</span>
                            <span className="block text-sm text-foreground/70 mt-1">Select one or more images</span>
                            <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden"/>
                        </label>
                    </div>
                    <div className="flex items-center gap-4">
                        <hr className="flex-grow border-border"/>
                        <span className="text-foreground/50 text-sm">OR</span>
                        <hr className="flex-grow border-border"/>
                    </div>
                    <form onSubmit={handleUrlAdd} className="flex gap-2">
                        <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste an image URL" className="flex-grow bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring px-4 py-2"/>
                        <button type="submit" className="px-4 py-2 bg-input text-foreground rounded-lg hover:bg-border transition-colors" disabled={isProcessing}>Add URL</button>
                    </form>

                    {stagedImages.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-card-foreground">Staged Images ({stagedImages.length})</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {stagedImages.map((image, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img src={image.previewUrl} alt={`preview ${index}`} className="h-full w-full object-cover rounded-md"/>
                                        <button onClick={() => handleRemoveStaged(index)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CloseIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {error && <p className="text-sm text-accent text-center mt-2 flex-shrink-0">{error}</p>}

                <div className="mt-6 flex justify-end space-x-3 flex-shrink-0 border-t border-border pt-4">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={stagedImages.length === 0 || isProcessing} className="px-5 py-2.5 min-w-[150px] bg-primary text-primary-foreground font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 flex items-center justify-center transition-all active:scale-95">
                        {isProcessing ? <SpinnerIcon className="h-5 w-5" /> : `Analyze & Add ${stagedImages.length > 0 ? `(${stagedImages.length})` : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};


const Wardrobe: React.FC = () => {
    const { user } = useAuth();
    const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'All'>('All');
    const [selectedColor, setSelectedColor] = useState<string>('All');
    const [selectedStyle, setSelectedStyle] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            setWardrobeItems(getItemsByUserId(user.id));
        }
    }, [user]);

    const handleAddItems = (items: ClothingItem[]) => {
        addItems(items);
        setWardrobeItems(prev => [...items, ...prev]);
    };

    const handleUpdateItem = (updated: ClothingItem) => {
        updateItem(updated);
        setWardrobeItems(prev => prev.map(item => item.id === updated.id ? updated : item));
        setSelectedItem(null);
    };

    const handleDeleteItem = (itemId: string) => {
        deleteItem(itemId);
        setWardrobeItems(prev => prev.filter(item => item.id !== itemId));
        setSelectedItem(null);
    };
    
    const uniqueColors = useMemo(() => ['All', ...Array.from(new Set(wardrobeItems.map(item => item.color)))], [wardrobeItems]);
    const uniqueStyles = useMemo(() => ['All', ...Array.from(new Set(wardrobeItems.map(item => item.style)))], [wardrobeItems]);

    const filteredItems = useMemo(() => {
      return wardrobeItems.filter(item => {
        const categoryMatch = activeCategory === 'All' || item.category === activeCategory;
        const colorMatch = selectedColor === 'All' || item.color === selectedColor;
        const styleMatch = selectedStyle === 'All' || item.style === selectedStyle;
        const searchMatch = searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && colorMatch && styleMatch && searchMatch;
      });
    }, [wardrobeItems, activeCategory, selectedColor, selectedStyle, searchTerm]);

    return (
        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-card-foreground">My Wardrobe</h1>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-all transform active:scale-95">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Item
                </button>
            </div>
            
            <div className="mb-6 space-y-4 p-4 bg-background/50 rounded-lg border border-border">
                <div className="flex flex-wrap gap-2">
                    {['All', ...Object.values(ClothingCategory)].map(cat => (
                         <button key={cat} onClick={() => setActiveCategory(cat as any)} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground font-semibold' : 'bg-input text-foreground/80 hover:bg-border'}`}>{cat}</button>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="w-full bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2">
                        {uniqueColors.map(color => <option key={color} value={color} className="bg-popover text-popover-foreground">{color === 'All' ? 'All Colors' : color}</option>)}
                    </select>
                    <select value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)} className="w-full bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2">
                        {uniqueStyles.map(style => <option key={style} value={style} className="bg-popover text-popover-foreground">{style === 'All' ? 'All Styles' : style}</option>)}
                    </select>
                    <div className="relative">
                        <SearchIcon className="w-5 h-5 text-foreground/50 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                        <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                </div>
            </div>

            {wardrobeItems.length > 0 ? (
                filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredItems.map(item => <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />)}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                        <p className="text-foreground/70">No items match your filters.</p>
                        <p className="text-foreground/50 text-sm mt-1">Try adjusting your search criteria.</p>
                    </div>
                )
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
                    <p className="text-foreground/70">Your wardrobe is empty.</p>
                    <p className="text-foreground/50 text-sm mt-1">Click "Add Item" to start your collection!</p>
                </div>
            )}
            {isModalOpen && <AddItemModal onClose={() => setIsModalOpen(false)} onAddItems={handleAddItems} />}
            {selectedItem && (
                <EditItemModal 
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onSave={handleUpdateItem}
                    onDelete={handleDeleteItem}
                />
            )}
        </div>
    );
};

export default Wardrobe;