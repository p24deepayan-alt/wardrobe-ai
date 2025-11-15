import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { CameraIcon, TrashIcon, SpinnerIcon } from './icons';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const StyleProfile: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [newImage, setNewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setError('');
            setIsLoading(true);
            try {
                if(file.size > 4 * 1024 * 1024) {
                    throw new Error("Image is too large. Please select a file under 4MB.");
                }
                const base64 = await fileToBase64(file);
                setNewImage(base64);
            } catch (err) {
                 setError(err instanceof Error ? err.message : "Could not process file.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSave = async () => {
        if (user && newImage) {
            await updateUser({ ...user, tryOnImageUrl: newImage });
            setNewImage(null); // Clear the staging area
        }
    };

    const handleRemove = async () => {
        if (user) {
            // Create a new object without the tryOnImageUrl property
            const { tryOnImageUrl, ...userWithoutImage } = user;
            await updateUser(userWithoutImage);
        }
    };
    
    const currentImage = newImage || user?.tryOnImageUrl;

    return (
        <div className="bg-card border border-border p-6 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-card-foreground mb-2">Style Profile</h1>
            <p className="text-foreground/70 mb-6">Upload a photo of yourself for the Virtual Try-On feature. A clear, front-facing photo works best.</p>

            <div className="w-full max-w-sm mx-auto space-y-4">
                <div className="aspect-square w-full bg-background/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden">
                    {currentImage ? (
                        <img src={currentImage} alt="Your profile" className="h-full w-full object-cover" />
                    ) : (
                        <div className="text-center text-foreground/50 p-4">
                            <CameraIcon className="w-12 h-12 mx-auto mb-2" />
                            <p>No Photo Uploaded</p>
                        </div>
                    )}
                     {isLoading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><SpinnerIcon className="w-8 h-8"/></div>}
                </div>
                
                {error && <p className="text-sm text-accent text-center">{error}</p>}
                
                <div className="flex gap-3">
                    <label className="flex-1 cursor-pointer px-4 py-2.5 bg-input text-foreground font-semibold rounded-lg hover:bg-border transition-colors text-center">
                        {user?.tryOnImageUrl ? 'Change Photo' : 'Upload Photo'}
                        <input type="file" accept="image/jpeg, image/png" onChange={handleFileChange} className="hidden"/>
                    </label>
                    {user?.tryOnImageUrl && !newImage && (
                        <button onClick={handleRemove} className="p-2.5 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    )}
                </div>

                {newImage && (
                    <div className="flex gap-3">
                        <button onClick={() => setNewImage(null)} className="flex-1 px-4 py-2.5 bg-input text-foreground rounded-lg hover:bg-border transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StyleProfile;
