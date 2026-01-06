'use client';

import Link from 'next/link';
import { Package, Wrench, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { InventoryItem, getCategoryLabel } from '@/types/inventory';
import { StockLevelBadge } from './StockLevelBadge';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface InventoryItemCardProps {
  item: InventoryItem;
  stock?: {
    quantity: number;
    locationName?: string;
  };
  href?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function InventoryItemCard({
  item,
  stock,
  href,
  onEdit,
  onDelete,
  showActions = false,
}: InventoryItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const Icon = item.category === 'tool' ? Wrench : Package;

  const content = (
    <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-gold/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              item.category === 'tool' ? 'bg-blue-500/10' : 'bg-gold/10'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                item.category === 'tool' ? 'text-blue-500' : 'text-gold'
              )}
            />
          </div>
          <div>
            <h3 className="text-white font-medium">{item.name}</h3>
            {item.sku && (
              <p className="text-gray-500 text-xs font-mono">{item.sku}</p>
            )}
            <p className="text-gray-400 text-sm mt-1">
              {getCategoryLabel(item.category)} • {item.unitOfMeasure}
            </p>
          </div>
        </div>

        {showActions && (onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-20 py-1 min-w-32">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {stock !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">
              {stock.locationName || 'Stock'}
            </span>
            <StockLevelBadge
              quantity={stock.quantity}
              parLevel={item.parLevel}
            />
          </div>
        </div>
      )}

      {item.description && (
        <p className="text-gray-500 text-sm mt-2 line-clamp-2">
          {item.description}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
