import React from 'react';
import type { ClothingItem } from '../types';

interface ItemCardProps {
  item: ClothingItem;
  onClick?: (item: ClothingItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const content = (
    <>
      <div className="aspect-[4/5] w-full overflow-hidden bg-background/50">
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate text-card-foreground">{item.name}</h3>
        <p className="text-foreground/70 text-xs">{item.category}</p>
      </div>
    </>
  );

  const baseClasses = "group bg-card border border-border/50 hover:shadow-lg transition-all duration-300 w-full text-left rounded-lg overflow-hidden flex flex-col";

  if (onClick) {
    return (
      <button
        onClick={() => onClick(item)}
        className={`${baseClasses} focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`}
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