import React, { useState } from 'react';
import type { ClothingItem } from '../types';
import { ClothingCategory } from '../types';
import { TrashIcon } from './icons';

interface EditItemModalProps {
  item: ClothingItem;
  onClose: () => void;
  onSave: (item: ClothingItem) => void;
  onDelete: (itemId: string) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: item.name,
        category: item.category,
        color: item.color,
        style: item.style,
    });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...item, ...formData });
    };
    
    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
            onDelete(item.id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-lg relative animate-slideInUp">
                <form onSubmit={handleSave}>
                    <h2 className="text-2xl font-serif font-bold mb-4 text-card-foreground">Edit Item</h2>
                    <div className="flex flex-col md:flex-row gap-6">
                        <img src={item.imageUrl} alt={item.name} className="w-full md:w-1/3 h-64 object-cover rounded-lg"/>
                        <div className="flex-grow space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-foreground/80">Name</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-input border border-border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring"/>
                            </div>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-foreground/80">Category</label>
                                <select name="category" id="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full bg-input border border-border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring">
                                    {Object.values(ClothingCategory).map(cat => (
                                        <option key={cat} value={cat} className="bg-popover text-popover-foreground">{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="color" className="block text-sm font-medium text-foreground/80">Color</label>
                                <input type="text" name="color" id="color" value={formData.color} onChange={handleChange} className="mt-1 block w-full bg-input border border-border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring"/>
                            </div>
                            <div>
                                <label htmlFor="style" className="block text-sm font-medium text-foreground/80">Style</label>
                                <input type="text" name="style" id="style" value={formData.style} onChange={handleChange} className="mt-1 block w-full bg-input border border-border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring"/>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <button type="button" onClick={handleDelete} className="flex items-center px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors font-semibold">
                            <TrashIcon className="h-5 w-5 mr-2" />
                            Delete
                        </button>
                        <div className="space-x-3">
                           <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all active:scale-95">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditItemModal;