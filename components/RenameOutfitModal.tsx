import React, { useState } from 'react';

interface RenameOutfitModalProps {
    currentName: string;
    onSave: (newName: string) => void;
    onClose: () => void;
}

const RenameOutfitModal: React.FC<RenameOutfitModalProps> = ({ currentName, onSave, onClose }) => {
    const [name, setName] = useState(currentName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-6 w-full max-w-md animate-slideInUp">
                <h2 className="text-xl font-bold mb-4 text-card-foreground">Rename Outfit</h2>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all active:scale-95">Save</button>
                </div>
            </form>
        </div>
    );
};

export default RenameOutfitModal;