import React from 'react';
import type { ClothingItem } from '../types';

interface ItemCardProps {
  item: ClothingItem;
  onClick?: (item: ClothingItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const content = (
    <>
      <img src={item.imageUrl} alt={item.name} className="h-48 sm:h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-3 w-full">
        <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
        <p className="text-foreground/70 text-xs">{item.category} &bull; {item.color}</p>
      </div>
    </>
  );

  const baseClasses = "group relative overflow-hidden rounded-lg shadow-lg bg-card border border-border/50 transition-all duration-300 w-full text-left";

  if (onClick) {
    return (
      <button
        onClick={() => onClick(item)}
        className={`${baseClasses} hover:shadow-primary/20 hover:border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`}
      >
        {content}
      </button>
    );
  }
  
  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
};

export default ItemCard;