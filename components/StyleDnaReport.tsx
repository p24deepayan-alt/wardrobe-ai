import React from 'react';
import type { StyleDNA, ClothingItem } from '../types';
import ItemCard from './ItemCard';
import { DnaIcon, SpinnerIcon } from './icons';

interface StyleDnaReportProps {
    dna: StyleDNA;
    wardrobe: ClothingItem[];
    onReanalyze: () => void;
    isReanalyzing: boolean;
}

const StyleDnaReport: React.FC<StyleDnaReportProps> = ({ dna, wardrobe, onReanalyze, isReanalyzing }) => {
    
    const keyItems = dna.keyPieces
        .map(piece => ({
            ...piece,
            item: wardrobe.find(item => item.id === piece.itemId)
        }))
        .filter(p => p.item);

    // Basic color name to hex mapping for visualization. In a real app, this would be more robust.
    const colorToHex = (color: string) => {
        const colors: { [key: string]: string } = {
            'black': '#000000', 'white': '#FFFFFF', 'gray': '#808080', 'red': '#FF0000',
            'blue': '#0000FF', 'green': '#008000', 'yellow': '#FFFF00', 'purple': '#800080',
            'orange': '#FFA500', 'pink': '#FFC0CB', 'brown': '#A52A2A', 'navy': '#000080',
            'beige': '#F5F5DC', 'olive': '#808000', 'maroon': '#800000', 'teal': '#008080',
        };
        return colors[color.toLowerCase()] || '#CCCCCC'; // Default gray for unknown
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary/50">
                <div className="flex items-start">
                    <DnaIcon className="w-6 h-6 mr-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-lg text-primary">{dna.coreAesthetic.title}</h3>
                        <p className="text-sm text-foreground/90">{dna.coreAesthetic.description}</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background/50 p-4 rounded-lg border border-border">
                    <h4 className="font-bold text-md text-card-foreground mb-2">{dna.colorPalette.name}</h4>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {dna.colorPalette.colors.map((color, index) => (
                             <div key={index} className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: colorToHex(color) }} title={color}></div>
                        ))}
                    </div>
                    <p className="text-sm text-foreground/80">{dna.colorPalette.description}</p>
                </div>
                <div className="bg-background/50 p-4 rounded-lg border border-border">
                     <h4 className="font-bold text-md text-card-foreground mb-2">Style Gaps</h4>
                     <ul className="space-y-2">
                        {dna.styleGaps.map((gap, index) => (
                             <li key={index} className="text-sm">
                                <strong className="text-foreground/90">{gap.name}:</strong>
                                <span className="text-foreground/80 ml-1">{gap.reason}</span>
                            </li>
                        ))}
                     </ul>
                </div>
            </div>

            <div>
                 <h4 className="font-bold text-md text-card-foreground mb-3">Key Pieces</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {keyItems.map(({ item, reason }) => item && (
                        <div key={item.id}>
                           <ItemCard item={item} />
                           <p className="text-xs text-foreground/70 mt-2 p-1 bg-background/50 rounded">{reason}</p>
                        </div>
                    ))}
                 </div>
            </div>
            
             <div className="text-center border-t border-border pt-4">
                <button 
                    onClick={onReanalyze}
                    disabled={isReanalyzing}
                    className="text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
                >
                    {isReanalyzing ? (
                        <span className="flex items-center"><SpinnerIcon className="w-4 h-4 mr-2" /> Re-analyzing...</span>
                    ) : (
                        "Re-analyze My Style DNA"
                    )}
                </button>
            </div>

        </div>
    );
};

export default StyleDnaReport;
