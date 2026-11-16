import { FormEvent, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Cake, Heart, MessageSquarePlus, Minus, Plus, Star, X } from 'lucide-react';
import {
  CAKE_FLAVOR_OPTIONS,
  CAKE_OCCASION_OPTIONS,
  formatMoney,
  normalizeCategory,
} from '../data/bakeryData';
import { CurrencySymbol, Product, ProductReview } from '../types/bakery';
import { ResilientImage } from './ResilientImage';
import { VegIndicator } from './VegIndicator';

interface ProductModalProps {
  product: Product | null;
  currency: CurrencySymbol;
  user: User | null;
  isWishlisted: boolean;
  reviews: ProductReview[];
  onClose: () => void;
  onToggleWishlist: (productId: string) => void;
  onRequestSignIn: () => void;
  onSubmitReview: (productId: string, rating: number, comment: string) => Promise<void>;
  onAddToCart: (
    product: Product,
    optionId: string,
    quantity: number,
    customizationSummary?: string
  ) => void;
}

export function ProductModal({
  product,
  currency,
  user,
  isWishlisted,
  reviews,
  onClose,
  onToggleWishlist,
  onRequestSignIn,
  onSubmitReview,
  onAddToCart,
}: ProductModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  // Cake customization state
  const [occasion, setOccasion] = useState(CAKE_OCCASION_OPTIONS[0]);
  const [flavor, setFlavor] = useState(CAKE_FLAVOR_OPTIONS[0]);
  const [eggless, setEggless] = useState(true);
  const [cakeMessage, setCakeMessage] = useState('');
  const [designNote, setDesignNote] = useState('');

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    if (product) {
      setSelectedOptionId(product.options[0]?.id ?? '');
      setQuantity(1);
      setOccasion(CAKE_OCCASION_OPTIONS[0]);
      setFlavor(CAKE_FLAVOR_OPTIONS[0]);
      setEggless(product.vegType !== 'egg');
      setCakeMessage('');
      setDesignNote('');
      setReviewRating(5);
      setReviewComment('');
      setReviewFeedback('');
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const displayCategory = normalizeCategory(product.category);
  const isCake = Boolean(product.isCakeCustomizable || displayCategory === 'Cakes');
  const activeOption =
    product.options.find((opt) => opt.id === selectedOptionId) ?? product.options[0];
  const unitPrice = product.price + (activeOption?.priceDelta ?? 0);
  const originalUnitPrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice + (activeOption?.priceDelta ?? 0)
      : null;
  const lineTotal = unitPrice * quantity;

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : product.rating ?? 4.8;
  const totalReviews = reviews.length > 0 ? reviews.length : product.reviewCount ?? 12;

  const buildCustomizationSummary = (): string | undefined => {
    if (!isCake) return undefined;
    const parts = [
      eggless ? 'Eggless' : 'Classic Sponge',
      flavor,
      occasion,
    ];
    if (cakeMessage.trim()) {
      parts.push(`Message: "${cakeMessage.trim()}"`);
    }
    if (designNote.trim()) {
      parts.push(`Design: ${designNote.trim()}`);
    }
    return parts.join(' · ');
  };

  const handleReviewFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequestSignIn();
      return;
    }
    if (!reviewComment.trim()) return;
    setSubmittingReview(true);
    setReviewFeedback('');
    try {
      await onSubmitReview(product.id, reviewRating, reviewComment.trim());
      setReviewComment('');
      setReviewFeedback('Thank you! Your review is live.');
    } catch {
      setReviewFeedback('Could not post review right now.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A180D]/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#FAF5EE] border border-[#E6DDD1] rounded-2xl shadow-2xl grid grid-cols-1 lg:grid-cols-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleWishlist(product.id)}
            aria-label={isWishlisted ? 'Remove from favourites' : 'Save to favourites'}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FFFDF9]/95 text-[#3B2314] border border-[#E6DDD1] hover:border-[#C45512] transition-colors cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 ${isWishlisted ? 'fill-[#C45512] text-[#C45512]' : 'text-[#6D4C3D]'}`}
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FFFDF9]/95 text-[#3B2314] border border-[#E6DDD1] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Left Image & Reviews Column */}
        <div className="lg:col-span-5 bg-[#F3EBDF] flex flex-col justify-between p-5 sm:p-6 space-y-6">
          <div>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EAE0D2]">
              <ResilientImage
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="mt-5 pt-4 border-t border-[#E6DDD1] space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-[#6D4C3D]">Ingredients</p>
                <p className="mt-1 text-[#3B2314] leading-relaxed">
                  {product.ingredients.join(', ')}.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-xs font-medium text-[#6D4C3D]">Allergens</p>
                  <p className="mt-0.5 text-xs text-[#3B2314]">{product.allergens}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#6D4C3D]">Serving Tip</p>
                  <p className="mt-0.5 text-xs text-[#3B2314]">{product.reheatTip}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Reviews & Ratings */}
          <div className="pt-4 border-t border-[#E6DDD1] space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#3B2314] uppercase tracking-wider">
                Customer Reviews
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-mono-tabular font-semibold text-[#3B2314]">
                <Star className="w-3.5 h-3.5 fill-[#E06D1F] text-[#E06D1F]" />
                {avgRating.toFixed(1)} ({totalReviews})
              </span>
            </div>

            {reviews.length > 0 ? (
              <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <li
                    key={rev.id}
                    className="p-2.5 rounded-xl bg-[#FFFDF9] border border-[#E6DDD1] text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#3B2314]">{rev.authorName}</span>
                      <span className="inline-flex items-center gap-0.5 font-mono-tabular text-[#C45512]">
                        {rev.rating}★
                      </span>
                    </div>
                    <p className="mt-1 text-[#6D4C3D] leading-relaxed">{rev.comment}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#6D4C3D]">
                Rated {avgRating.toFixed(1)}/5 by Mangalagiri customers. Be the first to add a written review!
              </p>
            )}

            <form onSubmit={(e) => void handleReviewFormSubmit(e)} className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#6D4C3D] inline-flex items-center gap-1">
                  <MessageSquarePlus className="w-3.5 h-3.5 text-[#C45512]" />
                  <span>Rate this item</span>
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} stars`}
                      className="p-0.5 cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= reviewRating
                            ? 'fill-[#E06D1F] text-[#E06D1F]'
                            : 'text-[#CBBBA7]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={350}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={user ? 'Share taste or freshness feedback...' : 'Sign in to leave a review...'}
                  className="flex-1 px-3 py-1.5 text-xs bg-[#FFFDF9] border border-[#D6C9B8] rounded-lg focus:outline-none focus:border-[#C45512]"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-3 py-1.5 text-xs font-medium bg-[#3B2314] hover:bg-[#52321E] text-white rounded-lg cursor-pointer shrink-0"
                >
                  {user ? (submittingReview ? 'Saving...' : 'Post') : 'Sign In'}
                </button>
              </div>
              {reviewFeedback && (
                <p className="text-[11px] font-medium text-[#15803D]">{reviewFeedback}</p>
              )}
            </form>
          </div>
        </div>

        {/* Right Contiguous Purchase & Cake Customization Module */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center flex-wrap gap-2 text-xs text-[#6D4C3D] pr-20">
              <VegIndicator type={product.vegType ?? 'veg'} showLabel />
              <span aria-hidden="true">·</span>
              <span>{displayCategory}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">Baked {product.bakeTime}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{activeOption?.weightLabel ?? product.weight}</span>
              {product.offerLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#C45512]">{product.offerLabel}</span>
                </>
              )}
            </div>

            <h2
              id="pdp-title"
              className="mt-2 font-display text-2xl sm:text-3xl font-semibold text-[#3B2314] tracking-tight"
            >
              {product.name}
            </h2>

            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-mono-tabular text-xl font-semibold text-[#3B2314]">
                {formatMoney(unitPrice, currency)}
              </span>
              {originalUnitPrice && (
                <span className="font-mono-tabular text-sm text-[#8D7262] line-through">
                  {formatMoney(originalUnitPrice, currency)}
                </span>
              )}
            </div>

            <p className="mt-3 text-[15px] leading-relaxed text-[#6D4C3D]">
              {product.fullDescription}
            </p>

            {/* Variant / Size Selector */}
            <div className="mt-5">
              <p className="text-xs font-medium text-[#6D4C3D] mb-2">
                Select Size / Quantity
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.options.map((option) => {
                  const isSelected = option.id === activeOption?.id;
                  const optionPrice = product.price + option.priceDelta;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#C45512] bg-[#C45512]/8 text-[#3B2314]'
                          : 'border-[#E6DDD1] bg-[#FFFDF9] text-[#6D4C3D] hover:border-[#CBBBA7]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm font-medium text-[#3B2314]">
                        <span className="truncate">{option.label}</span>
                        <span className="font-mono-tabular text-xs shrink-0">
                          {formatMoney(optionPrice, currency)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#6D4C3D] font-mono-tabular">
                        {option.weightLabel}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Occasion & Custom Cake Builder */}
            {isCake && (
              <div className="mt-5 p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DDD1] space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#3B2314]">
                    <Cake className="w-4 h-4 text-[#C45512]" />
                    <span>Custom Celebration Cake Options</span>
                  </div>
                  <div className="inline-flex p-0.5 rounded-lg bg-[#F3EBDF]">
                    {[
                      { label: '100% Eggless', value: true },
                      { label: 'Classic Sponge', value: false },
                    ].map((choice) => (
                      <button
                        key={choice.label}
                        type="button"
                        onClick={() => setEggless(choice.value)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-colors ${
                          eggless === choice.value
                            ? 'bg-[#FFFDF9] text-[#3B2314] shadow-xs'
                            : 'text-[#6D4C3D]'
                        }`}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cake-occasion" className="block text-xs text-[#6D4C3D] mb-1">
                      Special Occasion
                    </label>
                    <select
                      id="cake-occasion"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg focus:outline-none focus:border-[#C45512]"
                    >
                      {CAKE_OCCASION_OPTIONS.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cake-flavor" className="block text-xs text-[#6D4C3D] mb-1">
                      Filling &amp; Flavor
                    </label>
                    <select
                      id="cake-flavor"
                      value={flavor}
                      onChange={(e) => setFlavor(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg focus:outline-none focus:border-[#C45512]"
                    >
                      {CAKE_FLAVOR_OPTIONS.map((flv) => (
                        <option key={flv} value={flv}>
                          {flv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="cake-msg" className="block text-xs text-[#6D4C3D] mb-1">
                    Message on Cake Plaque (Complimentary)
                  </label>
                  <input
                    id="cake-msg"
                    type="text"
                    maxLength={60}
                    value={cakeMessage}
                    onChange={(e) => setCakeMessage(e.target.value)}
                    placeholder="e.g., Happy Birthday Priya!"
                    className="w-full px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg focus:outline-none focus:border-[#C45512]"
                  />
                </div>

                <div>
                  <label htmlFor="cake-design" className="block text-xs text-[#6D4C3D] mb-1">
                    Custom Design / Frosting Notes (Optional)
                  </label>
                  <input
                    id="cake-design"
                    type="text"
                    maxLength={120}
                    value={designNote}
                    onChange={(e) => setDesignNote(e.target.value)}
                    placeholder="e.g., Warm cream frosting, gold drip, less sugar"
                    className="w-full px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg focus:outline-none focus:border-[#C45512]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Primary Purchase CTA */}
          <div className="pt-4 border-t border-[#E6DDD1] flex items-center gap-3">
            <div className="flex items-center border border-[#D6C9B8] rounded-xl bg-[#FFFDF9]">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="w-10 h-11 flex items-center justify-center text-[#3B2314] hover:bg-[#F3EBDF] rounded-l-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-mono-tabular text-sm font-medium text-[#3B2314]">
                {quantity}
              </span>
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="w-10 h-11 flex items-center justify-center text-[#3B2314] hover:bg-[#F3EBDF] rounded-r-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                onAddToCart(product, activeOption.id, quantity, buildCustomizationSummary());
                onClose();
              }}
              className="flex-1 h-11 px-5 bg-[#C45512] hover:bg-[#A9450C] disabled:bg-[#9CA3AF] text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-between cursor-pointer whitespace-nowrap disabled:cursor-not-allowed"
            >
              <span>{product.inStock ? 'Add to Cart' : 'Currently Sold Out'}</span>
              <span className="font-mono-tabular">{formatMoney(lineTotal, currency)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
