import { Check, Heart, Plus, Sparkles, Star } from 'lucide-react';
import { formatMoney, normalizeCategory } from '../data/bakeryData';
import { CurrencySymbol, Product } from '../types/bakery';
import { ResilientImage } from './ResilientImage';
import { VegIndicator } from './VegIndicator';

interface ProductCardProps {
  product: Product;
  currency: CurrencySymbol;
  isWishlisted: boolean;
  isJustAdded: boolean;
  ratingValue?: number;
  reviewCount?: number;
  onOpenProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductCard({
  product,
  currency,
  isWishlisted,
  isJustAdded,
  ratingValue,
  reviewCount,
  onOpenProduct,
  onQuickAdd,
  onToggleWishlist,
}: ProductCardProps) {
  const displayCategory = normalizeCategory(product.category);
  const hasOffer =
    product.originalPrice !== undefined && product.originalPrice > product.price;
  const rating = ratingValue ?? product.rating ?? 4.8;
  const reviews = reviewCount ?? product.reviewCount ?? 12;
  const isCake = product.isCakeCustomizable || displayCategory === 'Cakes';

  return (
    <article
      className={`group bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(59,35,20,0.08)] ${
        !product.inStock ? 'opacity-80' : ''
      }`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpenProduct(product)}
          className="block w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C45512]"
        >
          <div className="aspect-[4/3] w-full overflow-hidden bg-[#F3EBDF]">
            <ResilientImage
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={isWishlisted ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#FFFDF9]/92 border border-[#E6DDD1] flex items-center justify-center text-[#3B2314] hover:border-[#C45512] transition-colors cursor-pointer shadow-xs"
        >
          <Heart
            className={`w-4 h-4 ${isWishlisted ? 'fill-[#C45512] text-[#C45512]' : 'text-[#6D4C3D]'}`}
          />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Unboxed clean metadata */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs text-[#6D4C3D]">
            <VegIndicator type={product.vegType ?? 'veg'} />
            <span>{displayCategory}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{product.weight}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-0.5 font-mono-tabular text-[#3B2314] font-medium">
              <Star className="w-3 h-3 fill-[#E06D1F] text-[#E06D1F]" />
              {rating.toFixed(1)}
              <span className="text-[#8D7262]">({reviews})</span>
            </span>
            {!product.inStock ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#B91C1C]">Sold Out</span>
              </>
            ) : product.offerLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#C45512]">{product.offerLabel}</span>
              </>
            ) : null}
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#3B2314] leading-snug">
              <button
                type="button"
                onClick={() => onOpenProduct(product)}
                className="text-left hover:text-[#C45512] transition-colors cursor-pointer"
              >
                {product.name}
              </button>
            </h3>
            <div className="flex items-baseline gap-1.5 shrink-0">
              {hasOffer && product.originalPrice && (
                <span className="font-mono-tabular text-xs text-[#8D7262] line-through">
                  {formatMoney(product.originalPrice, currency)}
                </span>
              )}
              <span className="font-mono-tabular text-[15px] font-semibold text-[#3B2314]">
                {formatMoney(product.price, currency)}
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-[#6D4C3D] line-clamp-2">
            {product.shortDescription}
          </p>

          {isCake && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#C45512]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Custom flavor, eggless &amp; cake message available</span>
            </p>
          )}
        </div>

        <div className="pt-3.5 border-t border-[#F0E7DB] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenProduct(product)}
            className="text-xs font-medium text-[#6D4C3D] hover:text-[#3B2314] underline underline-offset-4 cursor-pointer whitespace-nowrap"
          >
            {isCake ? 'Customize & Details' : 'Details & Reviews'}
          </button>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => (isCake ? onOpenProduct(product) : onQuickAdd(product))}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:bg-[#9CA3AF] disabled:cursor-not-allowed ${
              isJustAdded
                ? 'bg-[#15803D] text-white'
                : 'bg-[#C45512] hover:bg-[#A9450C] text-white'
            }`}
          >
            {!product.inStock ? (
              <span>Sold Out</span>
            ) : isJustAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : isCake ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Customize Cake</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
