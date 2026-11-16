import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CORE_BAKERY_CATEGORIES,
  FESTIVAL_PRESETS,
  formatMoney,
  normalizeCategory,
  PRESET_PRODUCT_IMAGES,
  resolveBakeryImageUrl,
} from '../data/bakeryData';
import { BOOTSTRAPPED_OWNER_EMAILS, emailToOwnerDocId } from '../lib/firebase';
import {
  BakerySettings,
  CurrencySymbol,
  DietaryTag,
  Order,
  OrderStage,
  OwnerAccount,
  PaymentStatus,
  Product,
  ProductCategory,
  ProductOption,
  PromoCodeOffer,
  VegType,
} from '../types/bakery';
import { ResilientImage } from './ResilientImage';
import { PublishTabPanel } from './PublishTabPanel';

interface OwnerStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onRequestOwnerSignIn: () => void;
  products: Product[];
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onToggleStock: (productId: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  settings: BakerySettings;
  onUpdateSettings: (settings: BakerySettings) => Promise<void>;
  orders: Order[];
  onAdvanceOrderStage: (orderId: string) => Promise<void>;
  onUpdatePaymentStatus: (orderId: string, status: PaymentStatus) => Promise<void>;
  owners: OwnerAccount[];
  currentUserEmail: string;
  onAddOwner: (email: string, label?: string) => Promise<void>;
  onRemoveOwner: (ownerId: string) => Promise<void>;
}

const CATEGORIES: ProductCategory[] = CORE_BAKERY_CATEGORIES;

const DIETARY_OPTIONS: DietaryTag[] = ['Vegetarian', 'Vegan', 'Nut-Free'];
const CURRENCIES: CurrencySymbol[] = ['₹', '$', '£', 'AED'];

const STAGE_LABELS: Record<OrderStage, string> = {
  confirmed: 'Order Placed',
  baking: 'Preparing Your Order',
  packed: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
};

const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  upi_prepaid: 'Pay Now via UPI',
  card_on_delivery: 'UPI / Card on Delivery',
  cash_on_delivery: 'Cash on Delivery',
  online_card: 'Credit / Debit Card',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pay on Delivery',
  verification_pending: 'Verify UPI UTR',
  verified: 'UPI Verified',
  paid: 'Paid',
};

function createBlankProduct(): Product {
  return {
    id: `item-${Date.now()}`,
    name: '',
    category: 'Cakes',
    price: 150,
    weight: '250g',
    bakeTime: '07:00',
    shortDescription: '',
    fullDescription: '',
    ingredients: ['Flour', 'Cultured butter', 'Sugar'],
    allergens: 'Wheat, Dairy',
    dietary: ['Vegetarian'],
    vegType: 'veg',
    isBestSeller: false,
    isTodaysSpecial: false,
    isRecommended: true,
    isCakeCustomizable: false,
    reheatTip: 'Serve warm for best taste.',
    image: PRESET_PRODUCT_IMAGES[0].url,
    featuredNote: '',
    inStock: true,
    options: [
      { id: 'standard', label: 'Standard Pack', priceDelta: 0, weightLabel: '250g' },
    ],
  };
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  });
}

export function OwnerStudioModal({
  isOpen,
  onClose,
  isOwner,
  onRequestOwnerSignIn,
  products,
  onSaveProduct,
  onDeleteProduct,
  onToggleStock,
  onResetDefaults,
  settings,
  onUpdateSettings,
  orders,
  onAdvanceOrderStage,
  onUpdatePaymentStatus,
  owners,
  currentUserEmail,
  onAddOwner,
  onRemoveOwner,
}: OwnerStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'offers' | 'orders' | 'settings' | 'owners' | 'publish'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [ingredientsText, setIngredientsText] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [savingBusy, setSavingBusy] = useState(false);

  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerLabel, setNewOwnerLabel] = useState('');
  const [ownerError, setOwnerError] = useState('');

  const [settingsDraft, setSettingsDraft] = useState<BakerySettings>(settings);
  const [newZonePrefix, setNewZonePrefix] = useState('');
  const [newZoneNeighborhood, setNewZoneNeighborhood] = useState('');
  const [newZoneEta, setNewZoneEta] = useState('30–40 min');

  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotWindow, setNewSlotWindow] = useState('');

  // New promo code form
  const [newCode, setNewCode] = useState('');
  const [newCodeTitle, setNewCodeTitle] = useState('');
  const [newCodeType, setNewCodeType] = useState<'percent' | 'flat'>('percent');
  const [newCodeValue, setNewCodeValue] = useState(15);
  const [newCodeMinOrder, setNewCodeMinOrder] = useState(299);

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!isOpen) {
      setEditingProduct(null);
      setSavedNotice('');
      setSavingBusy(false);
      setOwnerError('');
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (!isOwner) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm bg-[#FAF9F6] border border-[#E5E3DC] rounded-xl shadow-2xl p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C45512]" />
              <h2 className="font-display text-lg font-semibold text-[#171716]">
                Bakery Owner Login Required
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-[#5C5A55] hover:bg-[#F3F2EE] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-[#5C5A55]">
            Sign in with your authorized Bakery Owner Google account to add/edit menu items, publish festival discounts, and update live orders across all customer devices.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestOwnerSignIn();
            }}
            className="w-full py-2.5 bg-[#C45512] hover:bg-[#A9450C] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Go to Owner Login
          </button>
        </div>
      </div>
    );
  }

  const showNotice = (msg: string) => {
    setSavedNotice(msg);
    window.setTimeout(() => setSavedNotice(''), 2600);
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct({
      ...product,
      category: normalizeCategory(product.category),
      vegType: product.vegType ?? 'veg',
      isBestSeller: Boolean(product.isBestSeller),
      isTodaysSpecial: Boolean(product.isTodaysSpecial),
      isRecommended: Boolean(product.isRecommended),
      isCakeCustomizable: Boolean(product.isCakeCustomizable),
      options: product.options.map((o) => ({ ...o })),
    });
    setIngredientsText(product.ingredients.join(', '));
  };

  const startNewProduct = () => {
    const blank = createBlankProduct();
    setEditingProduct(blank);
    setIngredientsText(blank.ingredients.join(', '));
  };

  const handleImageFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    try {
      const compressed = await compressImageFile(file);
      setEditingProduct({ ...editingProduct, image: compressed });
    } catch {
      showNotice('Could not read selected image.');
    }
  };

  const handleOptionChange = (
    idx: number,
    field: keyof ProductOption,
    value: string | number
  ) => {
    if (!editingProduct) return;
    const updated = editingProduct.options.map((opt, i) =>
      i === idx ? { ...opt, [field]: value } : opt
    );
    setEditingProduct({ ...editingProduct, options: updated });
  };

  const addOptionRow = () => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      options: [
        ...editingProduct.options,
        {
          id: `opt-${Date.now()}`,
          label: 'Family Pack',
          priceDelta: 100,
          weightLabel: '500g',
        },
      ],
    });
  };

  const removeOptionRow = (idx: number) => {
    if (!editingProduct || editingProduct.options.length <= 1) return;
    setEditingProduct({
      ...editingProduct,
      options: editingProduct.options.filter((_, i) => i !== idx),
    });
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;
    setSavingBusy(true);
    try {
      const cleanedIngredients = ingredientsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const finalized: Product = {
        ...editingProduct,
        name: editingProduct.name.trim(),
        shortDescription:
          editingProduct.shortDescription.trim() ||
          'Freshly baked in-house at Indian Bakery & Cafe.',
        fullDescription:
          editingProduct.fullDescription.trim() ||
          editingProduct.shortDescription.trim() ||
          'Freshly baked in-house at Indian Bakery & Cafe.',
        ingredients: cleanedIngredients.length > 0 ? cleanedIngredients : ['Wheat flour', 'Butter'],
        options: editingProduct.options.map((opt, idx) => ({
          ...opt,
          id: opt.id || `opt-${idx}`,
          label: opt.label.trim() || 'Standard',
          weightLabel: opt.weightLabel.trim() || editingProduct.weight,
        })),
      };

      if (!finalized.originalPrice || finalized.originalPrice <= finalized.price) {
        delete finalized.originalPrice;
      }
      if (!finalized.offerLabel?.trim()) {
        delete finalized.offerLabel;
      } else {
        finalized.offerLabel = finalized.offerLabel.trim();
      }
      if (!finalized.featuredNote?.trim()) {
        delete finalized.featuredNote;
      } else {
        finalized.featuredNote = finalized.featuredNote.trim();
      }

      await onSaveProduct(finalized);
      setEditingProduct(null);
      showNotice(`Published "${finalized.name}" live for all customers.`);
    } finally {
      setSavingBusy(false);
    }
  };

  const handleSettingsSave = async (updatedSettings: BakerySettings, message: string) => {
    setSavingBusy(true);
    try {
      await onUpdateSettings(updatedSettings);
      showNotice(message);
    } finally {
      setSavingBusy(false);
    }
  };

  const handleSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await handleSettingsSave(settingsDraft, 'Store & delivery settings saved live.');
  };

  const handleOffersSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await handleSettingsSave(settingsDraft, 'Festival & instant offers updated live.');
  };

  const applyFestivalPreset = (preset: (typeof FESTIVAL_PRESETS)[number]) => {
    const hasCode = settingsDraft.promoCodes.some(
      (c) => c.code.toUpperCase() === preset.offer.code.toUpperCase()
    );
    setSettingsDraft((prev) => ({
      ...prev,
      festivalBanner: {
        active: true,
        campaignName: preset.campaignName,
        headline: preset.headline,
        promoCode: preset.promoCode,
      },
      promoCodes: hasCode
        ? prev.promoCodes.map((c) =>
            c.code.toUpperCase() === preset.offer.code.toUpperCase() ? { ...c, active: true } : c
          )
        : [preset.offer, ...prev.promoCodes],
    }));
  };

  const addPromoCode = () => {
    const cleanedCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanedCode) return;
    const offer: PromoCodeOffer = {
      id: `promo-${Date.now()}`,
      code: cleanedCode,
      title:
        newCodeTitle.trim() ||
        (newCodeType === 'percent'
          ? `${newCodeValue}% Off`
          : `${formatMoney(newCodeValue, settingsDraft.currency)} Off`),
      discountType: newCodeType,
      value: newCodeValue,
      minOrder: newCodeMinOrder,
      active: true,
    };
    setSettingsDraft((prev) => ({
      ...prev,
      promoCodes: [offer, ...prev.promoCodes],
    }));
    setNewCode('');
    setNewCodeTitle('');
  };

  const togglePromoActive = (id: string) => {
    setSettingsDraft((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    }));
  };

  const removePromoCode = (id: string) => {
    setSettingsDraft((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.filter((c) => c.id !== id),
    }));
  };

  const addDeliveryZone = () => {
    if (!newZonePrefix.trim() || !newZoneNeighborhood.trim()) return;
    setSettingsDraft((prev) => ({
      ...prev,
      deliveryZones: [
        ...prev.deliveryZones,
        {
          postalPrefix: newZonePrefix.trim(),
          neighborhood: newZoneNeighborhood.trim(),
          etaMinutes: newZoneEta.trim() || '30–45 min',
          fee: prev.deliveryFee,
        },
      ],
    }));
    setNewZonePrefix('');
    setNewZoneNeighborhood('');
  };

  const removeDeliveryZone = (idx: number) => {
    if (settingsDraft.deliveryZones.length <= 1) return;
    setSettingsDraft((prev) => ({
      ...prev,
      deliveryZones: prev.deliveryZones.filter((_, i) => i !== idx),
    }));
  };

  const addDeliverySlot = () => {
    if (!newSlotLabel.trim() || !newSlotWindow.trim()) return;
    setSettingsDraft((prev) => ({
      ...prev,
      deliverySlots: [
        ...prev.deliverySlots,
        {
          id: `slot-${Date.now()}`,
          label: newSlotLabel.trim(),
          window: newSlotWindow.trim(),
          cutoffNote: 'Custom dispatch',
          spotsRemaining: 10,
        },
      ],
    }));
    setNewSlotLabel('');
    setNewSlotWindow('');
  };

  const removeDeliverySlot = (slotId: string) => {
    if (settingsDraft.deliverySlots.length <= 1) return;
    setSettingsDraft((prev) => ({
      ...prev,
      deliverySlots: prev.deliverySlots.filter((s) => s.id !== slotId),
    }));
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-studio-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#FAF9F6] border border-[#E5E3DC] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-6 py-4 bg-white border-b border-[#E5E3DC] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2
              id="owner-studio-title"
              className="font-display text-xl font-semibold text-[#171716]"
            >
              Owner Studio — {settings.bakeryName}
            </h2>
            <p className="text-xs text-[#5C5A55]">
              Every change syncs live to all customer phones
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-lg">
                <Check className="w-3.5 h-3.5" />
                <span>{savedNotice}</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close owner studio"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-[#5C5A55] hover:text-[#171716] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-3 bg-[#F3F2EE] border-b border-[#E5E3DC] flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex p-1 rounded-lg bg-[#E7E4DC] overflow-x-auto">
            {(
              [
                { id: 'products', label: `Menu (${products.length})` },
                { id: 'offers', label: 'Festival Offers' },
                { id: 'orders', label: `Orders (${orders.length})` },
                { id: 'settings', label: 'Store Settings' },
                { id: 'owners', label: 'Add Owner' },
                { id: 'publish', label: 'Publish Web App' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setEditingProduct(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-[#171716] shadow-xs'
                    : 'text-[#5C5A55] hover:text-[#171716]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'products' && !editingProduct && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void onResetDefaults().then(() =>
                    showNotice('Loaded complete 8-category Indian Bakery menu & festival offers.')
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5C5A55] hover:text-[#171716] bg-white border border-[#D8D5CC] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Load 8-Category Menu</span>
              </button>
              <button
                type="button"
                onClick={startNewProduct}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#C45512] hover:bg-[#A9450C] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: PRODUCTS */}
          {activeTab === 'products' && !editingProduct && (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-4 bg-white border border-[#E5E3DC] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#F3F2EE] shrink-0">
                      <ResilientImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[#5C5A55]">
                        <span>{product.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">{product.weight}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular font-semibold text-[#171716]">
                          {formatMoney(product.price, settings.currency)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="font-mono-tabular line-through text-[#8C8980]">
                            {formatMoney(product.originalPrice, settings.currency)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-[#171716] truncate mt-0.5">
                        {product.name}
                      </h3>
                      <p className="text-xs text-[#5C5A55] truncate mt-0.5">
                        {product.options.length} option{product.options.length > 1 ? 's' : ''} ·{' '}
                        {product.inStock ? 'Available today' : 'Marked Sold Out'}
                        {product.offerLabel ? ` · ${product.offerLabel}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void onToggleStock(product.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        product.inStock
                          ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7]'
                          : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2]'
                      }`}
                    >
                      {product.inStock ? 'In Stock' : 'Sold Out'}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditProduct(product)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F3F2EE] hover:bg-[#E7E4DC] text-[#171716] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void onDeleteProduct(product.id)}
                      aria-label={`Delete ${product.name}`}
                      className="p-2 text-[#5C5A55] hover:text-[#991B1B] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 1B: PRODUCT EDITOR FORM */}
          {activeTab === 'products' && editingProduct && (
            <form
              onSubmit={(e) => void handleProductSubmit(e)}
              className="space-y-6 bg-white p-6 rounded-xl border border-[#E5E3DC]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E3DC]">
                <h3 className="font-display text-lg font-semibold text-[#171716]">
                  {products.some((p) => p.id === editingProduct.id)
                    ? `Edit: ${editingProduct.name}`
                    : 'Add New Bakery Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-xs font-medium text-[#5C5A55] hover:text-[#171716] cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="prod-name" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Product Name
                    </label>
                    <input
                      id="prod-name"
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      placeholder="e.g., Irani Bun Maska & Chai Combo"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg focus:outline-none focus:border-[#C45512]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 sm:col-span-1">
                      <label htmlFor="prod-cat" className="block text-xs font-medium text-[#5C5A55] mb-1">
                        Category
                      </label>
                      <select
                        id="prod-cat"
                        value={editingProduct.category}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            category: e.target.value as ProductCategory,
                          })
                        }
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg focus:outline-none focus:border-[#C45512]"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="prod-price" className="block text-xs font-medium text-[#5C5A55] mb-1">
                        Sale Price ({settings.currency})
                      </label>
                      <input
                        id="prod-price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editingProduct.price}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg focus:outline-none focus:border-[#C45512]"
                      />
                    </div>

                    <div>
                      <label htmlFor="prod-orig" className="block text-xs font-medium text-[#5C5A55] mb-1">
                        MRP / Was ({settings.currency})
                      </label>
                      <input
                        id="prod-orig"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingProduct.originalPrice ?? ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            originalPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="Optional"
                        className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="prod-weight" className="block text-xs font-medium text-[#5C5A55] mb-1">
                        Weight / Pack
                      </label>
                      <input
                        id="prod-weight"
                        type="text"
                        value={editingProduct.weight}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, weight: e.target.value })
                        }
                        placeholder="250g"
                        className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-bake" className="block text-xs font-medium text-[#5C5A55] mb-1">
                        Bake Time
                      </label>
                      <input
                        id="prod-bake"
                        type="text"
                        value={editingProduct.bakeTime}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, bakeTime: e.target.value })
                        }
                        placeholder="06:30"
                        className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="prod-offer" className="block text-xs font-medium text-[#5C5A55] mb-1">
                        Offer Label
                      </label>
                      <input
                        id="prod-offer"
                        type="text"
                        value={editingProduct.offerLabel ?? ''}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, offerLabel: e.target.value })
                        }
                        placeholder="Festive Deal"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="prod-short" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Short Menu Description
                    </label>
                    <textarea
                      id="prod-short"
                      rows={2}
                      value={editingProduct.shortDescription}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          shortDescription: e.target.value,
                        })
                      }
                      placeholder="1–2 line summary displayed on menu cards"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="prod-ing" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Ingredients (comma separated)
                    </label>
                    <input
                      id="prod-ing"
                      type="text"
                      value={ingredientsText}
                      onChange={(e) => setIngredientsText(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-medium text-[#5C5A55] mb-1.5">
                      Veg / Egg / Non-Veg &amp; Highlights
                    </span>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(
                        [
                          { id: 'veg', label: 'Pure Veg' },
                          { id: 'egg', label: 'Contains Egg' },
                          { id: 'non_veg', label: 'Non-Veg' },
                        ] as { id: VegType; label: string }[]
                      ).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            setEditingProduct({ ...editingProduct, vegType: v.id })
                          }
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                            (editingProduct.vegType ?? 'veg') === v.id
                              ? 'bg-[#3B2314] border-[#3B2314] text-white'
                              : 'bg-[#FAF9F6] border-[#D8D5CC] text-[#46443F]'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {(
                        [
                          { key: 'isBestSeller', label: 'Best Seller' },
                          { key: 'isTodaysSpecial', label: "Today's Special" },
                          { key: 'isRecommended', label: 'Recommended' },
                          { key: 'isCakeCustomizable', label: 'Cake Customization' },
                        ] as const
                      ).map((flag) => {
                        const checked = Boolean(editingProduct[flag.key]);
                        return (
                          <button
                            key={flag.key}
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                ...editingProduct,
                                [flag.key]: !checked,
                              })
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                              checked
                                ? 'bg-[#C45512] border-[#C45512] text-white'
                                : 'bg-[#FAF9F6] border-[#D8D5CC] text-[#46443F]'
                            }`}
                          >
                            {flag.label}
                          </button>
                        );
                      })}
                    </div>

                    <span className="block text-xs font-medium text-[#5C5A55] mb-1.5">
                      Dietary Tags
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_OPTIONS.map((tag) => {
                        const checked = editingProduct.dietary.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                ...editingProduct,
                                dietary: checked
                                  ? editingProduct.dietary.filter((t) => t !== tag)
                                  : [...editingProduct.dietary, tag],
                              })
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#171716] border-[#171716] text-white'
                                : 'bg-[#FAF9F6] border-[#D8D5CC] text-[#46443F]'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Photo & Variants */}
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-medium text-[#5C5A55] mb-1.5">
                      Product Photo
                    </span>
                    <div className="aspect-[4/3] w-full max-w-xs rounded-lg overflow-hidden bg-[#F3F2EE] border border-[#E5E3DC] mb-2.5">
                      <ResilientImage
                        src={editingProduct.image}
                        alt={editingProduct.name || 'Preview'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F3F2EE] hover:bg-[#E7E4DC] text-[#171716] rounded-lg cursor-pointer border border-[#D8D5CC]">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handleImageFileUpload(e)}
                          className="sr-only"
                        />
                      </label>

                      <select
                        aria-label="Choose preset bakery photo"
                        value={
                          PRESET_PRODUCT_IMAGES.some(
                            (p) => p.url === resolveBakeryImageUrl(editingProduct.image)
                          )
                            ? resolveBakeryImageUrl(editingProduct.image)
                            : ''
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            setEditingProduct({ ...editingProduct, image: e.target.value });
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                      >
                        <option value="">Pick studio photo...</option>
                        {PRESET_PRODUCT_IMAGES.map((preset) => (
                          <option key={preset.url} value={preset.url}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      value={editingProduct.image}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, image: e.target.value })
                      }
                      placeholder="Or paste image path / URL"
                      className="w-full px-3 py-1.5 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  {/* Size / Pack Options */}
                  <div className="pt-2 border-t border-[#E5E3DC]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#5C5A55]">
                        Sizes / Pack Options
                      </span>
                      <button
                        type="button"
                        onClick={addOptionRow}
                        className="text-xs font-medium text-[#C45512] hover:underline cursor-pointer"
                      >
                        + Add Option
                      </button>
                    </div>

                    <div className="space-y-2">
                      {editingProduct.options.map((opt, idx) => (
                        <div key={opt.id} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                            placeholder="Option label"
                            className="col-span-5 px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#D8D5CC] rounded-md"
                          />
                          <input
                            type="text"
                            value={opt.weightLabel}
                            onChange={(e) =>
                              handleOptionChange(idx, 'weightLabel', e.target.value)
                            }
                            placeholder="Weight"
                            className="col-span-3 px-2.5 py-1.5 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-md"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={opt.priceDelta}
                            onChange={(e) =>
                              handleOptionChange(
                                idx,
                                'priceDelta',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="+Price"
                            title="Extra amount added to base price"
                            className="col-span-3 px-2.5 py-1.5 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeOptionRow(idx)}
                            disabled={editingProduct.options.length <= 1}
                            aria-label="Remove option"
                            className="col-span-1 text-[#5C5A55] hover:text-[#991B1B] disabled:opacity-30 cursor-pointer flex justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E3DC] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-[#5C5A55] bg-[#F3F2EE] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBusy}
                  className="px-5 py-2 text-xs font-medium text-white bg-[#C45512] hover:bg-[#A9450C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {savingBusy ? 'Publishing...' : 'Publish Product Live'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: FESTIVAL OFFERS & PROMO CODES */}
          {activeTab === 'offers' && (
            <form
              onSubmit={(e) => void handleOffersSubmit(e)}
              className="space-y-6 bg-white p-6 rounded-xl border border-[#E5E3DC]"
            >
              {/* 1-Click Festival Templates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C45512]" />
                    <h3 className="text-sm font-semibold text-[#171716]">
                      Festival &amp; Instant Offer Banner
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        festivalBanner: {
                          ...prev.festivalBanner,
                          active: !prev.festivalBanner.active,
                        },
                      }))
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                      settingsDraft.festivalBanner.active
                        ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                        : 'border-[#E5E3DC] bg-[#F3F2EE] text-[#5C5A55]'
                    }`}
                  >
                    {settingsDraft.festivalBanner.active ? 'Banner Live' : 'Banner Hidden'}
                  </button>
                </div>

                <p className="text-xs text-[#5C5A55]">
                  Quick-launch a festival campaign or customize your own instant offer banner shown at the top of the store:
                </p>

                <div className="flex flex-wrap gap-2">
                  {FESTIVAL_PRESETS.map((preset) => (
                    <button
                      key={preset.campaignName}
                      type="button"
                      onClick={() => applyFestivalPreset(preset)}
                      className="px-3 py-1.5 text-xs font-medium bg-[#FAF9F6] hover:bg-[#F3F2EE] border border-[#D8D5CC] rounded-lg text-[#171716] cursor-pointer"
                    >
                      Use: {preset.campaignName}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label htmlFor="fest-name" className="block text-xs text-[#5C5A55] mb-1">
                      Campaign Title
                    </label>
                    <input
                      id="fest-name"
                      type="text"
                      value={settingsDraft.festivalBanner.campaignName}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          festivalBanner: {
                            ...settingsDraft.festivalBanner,
                            campaignName: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="fest-head" className="block text-xs text-[#5C5A55] mb-1">
                      Offer Headline
                    </label>
                    <input
                      id="fest-head"
                      type="text"
                      value={settingsDraft.festivalBanner.headline}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          festivalBanner: {
                            ...settingsDraft.festivalBanner,
                            headline: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="fest-code" className="block text-xs text-[#5C5A55] mb-1">
                      Featured Promo Code
                    </label>
                    <input
                      id="fest-code"
                      type="text"
                      value={settingsDraft.festivalBanner.promoCode}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          festivalBanner: {
                            ...settingsDraft.festivalBanner,
                            promoCode: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular uppercase bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Promo Codes List */}
              <div className="pt-5 border-t border-[#E5E3DC] space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#C45512]" />
                  <h3 className="text-sm font-semibold text-[#171716]">
                    Active Instant Promo Codes
                  </h3>
                </div>

                <div className="space-y-2">
                  {settingsDraft.promoCodes.map((promo) => (
                    <div
                      key={promo.id}
                      className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E5E3DC] flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono-tabular font-semibold text-[#171716]">
                          {promo.code}
                        </span>
                        <span className="mx-2 text-[#C9C5BA]">·</span>
                        <span className="text-[#46443F]">{promo.title}</span>
                        <span className="mx-2 text-[#C9C5BA]">·</span>
                        <span className="font-mono-tabular text-[#5C5A55]">
                          {promo.discountType === 'percent'
                            ? `${promo.value}% off`
                            : `${formatMoney(promo.value, settingsDraft.currency)} off`}{' '}
                          (Min {formatMoney(promo.minOrder, settingsDraft.currency)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePromoActive(promo.id)}
                          className={`px-2.5 py-1 rounded-md border cursor-pointer ${
                            promo.active
                              ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                              : 'border-[#E5E3DC] bg-white text-[#5C5A55]'
                          }`}
                        >
                          {promo.active ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePromoCode(promo.id)}
                          aria-label={`Remove ${promo.code}`}
                          className="p-1.5 text-[#5C5A55] hover:text-[#991B1B] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Promo Code */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="CODE (e.g. DIWALI20)"
                    className="col-span-2 sm:col-span-1 px-2.5 py-2 text-xs font-mono-tabular uppercase bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <input
                    type="text"
                    value={newCodeTitle}
                    onChange={(e) => setNewCodeTitle(e.target.value)}
                    placeholder="Offer title"
                    className="col-span-2 sm:col-span-2 px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <select
                    value={newCodeType}
                    onChange={(e) => setNewCodeType(e.target.value as 'percent' | 'flat')}
                    className="px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  >
                    <option value="percent">% Off</option>
                    <option value="flat">Flat Off</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={newCodeValue}
                    onChange={(e) => setNewCodeValue(parseFloat(e.target.value) || 0)}
                    placeholder="Value"
                    className="px-2.5 py-2 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={newCodeMinOrder}
                      onChange={(e) => setNewCodeMinOrder(parseFloat(e.target.value) || 0)}
                      placeholder="Min"
                      title="Minimum order amount"
                      className="w-full px-2 py-2 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={addPromoCode}
                      className="px-3 py-2 text-xs font-medium bg-[#171716] text-white rounded-lg cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E3DC] flex justify-end">
                <button
                  type="submit"
                  disabled={savingBusy}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-[#C45512] hover:bg-[#A9450C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {savingBusy ? 'Saving...' : 'Save & Publish Offers'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-[#E5E3DC] rounded-xl">
                  <p className="text-xs text-[#5C5A55]">Total Orders</p>
                  <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#171716]">
                    {orders.length}
                  </p>
                </div>
                <div className="p-4 bg-white border border-[#E5E3DC] rounded-xl">
                  <p className="text-xs text-[#5C5A55]">Order Volume</p>
                  <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#171716]">
                    {formatMoney(totalRevenue, settings.currency)}
                  </p>
                </div>
                <div className="p-4 bg-white border border-[#E5E3DC] rounded-xl col-span-2 sm:col-span-1">
                  <p className="text-xs text-[#5C5A55]">Active Dispatch</p>
                  <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#171716]">
                    {orders.filter((o) => o.stage !== 'delivered').length}
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 bg-white border border-[#E5E3DC] rounded-xl text-center text-sm text-[#5C5A55]">
                  No customer orders have been placed yet. Incoming orders will appear here live.
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 bg-white border border-[#E5E3DC] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C5A55]">
                        <span className="font-mono-tabular font-semibold text-[#171716]">
                          #{order.id}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {order.deliveryDay}, {order.deliveryWindow}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#C45512]">
                          {STAGE_LABELS[order.stage]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            order.paymentStatus === 'verified' || order.paymentStatus === 'paid'
                              ? 'font-medium text-[#166534]'
                              : order.paymentStatus === 'verification_pending'
                                ? 'font-medium text-[#92400E]'
                                : 'text-[#5C5A55]'
                          }
                        >
                          {PAYMENT_LABELS[order.paymentMethod]} (
                          {PAYMENT_STATUS_LABELS[order.paymentStatus ?? 'pending']})
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#171716]">
                        {order.customer.fullName} ({order.customer.phone}) — {order.customer.streetAddress} ({order.customer.postalCode})
                      </p>
                      <p className="text-xs text-[#5C5A55]">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')} ·{' '}
                        <span className="font-mono-tabular font-medium text-[#171716]">
                          {formatMoney(order.total, settings.currency)}
                        </span>
                        {order.upiReference && (
                          <>
                            {' · '}
                            <span className="font-mono-tabular text-[#171716]">
                              UTR: {order.upiReference}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {order.paymentStatus !== 'verified' && order.paymentStatus !== 'paid' && (
                        <button
                          type="button"
                          onClick={() =>
                            void onUpdatePaymentStatus(
                              order.id,
                              order.paymentMethod === 'upi_prepaid' ? 'verified' : 'paid'
                            )
                          }
                          className="px-3.5 py-2 text-xs font-medium text-[#166534] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {order.paymentMethod === 'upi_prepaid' ? 'Confirm UPI Paid' : 'Mark Paid'}
                        </button>
                      )}
                      {order.stage !== 'delivered' && (
                        <button
                          type="button"
                          onClick={() => void onAdvanceOrderStage(order.id)}
                          className="px-4 py-2 text-xs font-medium text-white bg-[#171716] hover:bg-[#33322E] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Advance Stage
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <form
              onSubmit={(e) => void handleSettingsSubmit(e)}
              className="space-y-6 bg-white p-6 rounded-xl border border-[#E5E3DC]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="set-name" className="block text-xs font-medium text-[#5C5A55] mb-1">
                    Bakery Name
                  </label>
                  <input
                    id="set-name"
                    type="text"
                    value={settingsDraft.bakeryName}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, bakeryName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="set-tagline" className="block text-xs font-medium text-[#5C5A55] mb-1">
                    Tagline
                  </label>
                  <input
                    id="set-tagline"
                    type="text"
                    value={settingsDraft.tagline}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, tagline: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                </div>

                <div>
                  <label htmlFor="set-address" className="block text-xs font-medium text-[#5C5A55] mb-1">
                    Bakery Address / Landmark
                  </label>
                  <input
                    id="set-address"
                    type="text"
                    value={settingsDraft.address}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, address: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="set-phone" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Primary Contact Number
                    </label>
                    <input
                      id="set-phone"
                      type="text"
                      value={settingsDraft.phone}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="set-phone2" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Secondary Contact Number
                    </label>
                    <input
                      id="set-phone2"
                      type="text"
                      value={settingsDraft.secondaryPhone}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, secondaryPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="set-currency" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Currency
                    </label>
                    <select
                      id="set-currency"
                      value={settingsDraft.currency}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          currency: e.target.value as CurrencySymbol,
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    >
                      {CURRENCIES.map((cur) => (
                        <option key={cur} value={cur}>
                          {cur}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="set-fee" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Delivery Fee
                    </label>
                    <input
                      id="set-fee"
                      type="number"
                      min="0"
                      step="0.5"
                      value={settingsDraft.deliveryFee}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          deliveryFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="set-free" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      Free Above
                    </label>
                    <input
                      id="set-free"
                      type="number"
                      min="0"
                      step="1"
                      value={settingsDraft.freeDeliveryThreshold}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          freeDeliveryThreshold: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="set-tax" className="block text-xs font-medium text-[#5C5A55] mb-1">
                      GST Tax (%)
                    </label>
                    <input
                      id="set-tax"
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={settingsDraft.taxPercent ?? 5}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          taxPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="set-upi" className="block text-xs font-medium text-[#5C5A55] mb-1">
                    Bakery UPI ID for Online QR Payments (GPay / PhonePe / Paytm)
                  </label>
                  <input
                    id="set-upi"
                    type="text"
                    maxLength={80}
                    value={settingsDraft.upiId ?? ''}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, upiId: e.target.value.trim() })
                    }
                    placeholder="e.g., 9491250264@ybl or ibcbakery@okicici"
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg focus:outline-none focus:border-[#C45512]"
                  />
                  <p className="text-xs text-[#5C5A55] mt-1">
                    Customers see a scannable UPI QR &amp; 1-tap UPI app button at checkout once set (zero transaction fees).
                  </p>
                </div>
              </div>

              {/* Delivery Slots */}
              <div className="pt-4 border-t border-[#E5E3DC] space-y-3">
                <h3 className="text-sm font-semibold text-[#171716]">Delivery Windows</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {settingsDraft.deliverySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E5E3DC] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-medium text-[#171716]">{slot.label}</p>
                        <p className="font-mono-tabular text-[#5C5A55]">{slot.window}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeliverySlot(slot.id)}
                        disabled={settingsDraft.deliverySlots.length <= 1}
                        aria-label={`Remove ${slot.label}`}
                        className="text-[#5C5A55] hover:text-[#991B1B] disabled:opacity-30 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    placeholder="Slot label (e.g., Late Evening)"
                    className="px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <input
                    type="text"
                    value={newSlotWindow}
                    onChange={(e) => setNewSlotWindow(e.target.value)}
                    placeholder="Time (e.g., 19:30 – 21:00)"
                    className="px-3 py-1.5 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={addDeliverySlot}
                    className="px-3 py-1.5 text-xs font-medium bg-[#171716] text-white rounded-lg cursor-pointer"
                  >
                    + Add Window
                  </button>
                </div>
              </div>

              {/* Delivery Zones */}
              <div className="pt-4 border-t border-[#E5E3DC] space-y-3">
                <h3 className="text-sm font-semibold text-[#171716]">Delivery Pin Codes / Zones</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {settingsDraft.deliveryZones.map((zone, idx) => (
                    <div
                      key={`${zone.postalPrefix}-${idx}`}
                      className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E5E3DC] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-mono-tabular font-semibold text-[#171716]">
                          {zone.postalPrefix}*
                        </span>
                        <span className="mx-1.5 text-[#C9C5BA]">·</span>
                        <span className="text-[#46443F]">{zone.neighborhood}</span>
                        <span className="mx-1.5 text-[#C9C5BA]">·</span>
                        <span className="font-mono-tabular text-[#5C5A55]">{zone.etaMinutes}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeliveryZone(idx)}
                        disabled={settingsDraft.deliveryZones.length <= 1}
                        aria-label={`Remove ${zone.neighborhood}`}
                        className="text-[#5C5A55] hover:text-[#991B1B] disabled:opacity-30 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newZonePrefix}
                    onChange={(e) => setNewZonePrefix(e.target.value)}
                    placeholder="Pin prefix (e.g., 522503)"
                    className="w-36 px-3 py-1.5 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <input
                    type="text"
                    value={newZoneNeighborhood}
                    onChange={(e) => setNewZoneNeighborhood(e.target.value)}
                    placeholder="Neighborhood name"
                    className="px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <input
                    type="text"
                    value={newZoneEta}
                    onChange={(e) => setNewZoneEta(e.target.value)}
                    placeholder="ETA (30–40 min)"
                    className="w-32 px-3 py-1.5 text-xs font-mono-tabular bg-[#FAF9F6] border border-[#D8D5CC] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={addDeliveryZone}
                    className="px-3 py-1.5 text-xs font-medium bg-[#171716] text-white rounded-lg cursor-pointer"
                  >
                    + Add Zone
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E3DC] flex justify-end">
                <button
                  type="submit"
                  disabled={savingBusy}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-[#C45512] hover:bg-[#A9450C] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                >
                  {savingBusy ? 'Saving...' : 'Save Store Settings'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: AUTHORIZED OWNERS */}
          {activeTab === 'owners' && (
            <div className="space-y-6 bg-white p-6 rounded-xl border border-[#E5E3DC]">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#171716]">
                  Authorized Bakery Owners
                </h3>
                <p className="mt-1 text-xs text-[#5C5A55]">
                  Add another Google email below to give a partner or manager full access to Owner Studio (menu, photos, offers, UPI settings, and orders).
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleaned = newOwnerEmail.trim().toLowerCase();
                  if (!cleaned || !cleaned.includes('@') || cleaned.length < 5) {
                    setOwnerError('Please enter a valid Google email address.');
                    return;
                  }
                  if (
                    BOOTSTRAPPED_OWNER_EMAILS.some((b) => b === cleaned) ||
                    owners.some((o) => o.email.toLowerCase() === cleaned)
                  ) {
                    setOwnerError(`${cleaned} already has Owner access.`);
                    return;
                  }
                  setOwnerError('');
                  setSavingBusy(true);
                  void onAddOwner(cleaned, newOwnerLabel)
                    .then(() => {
                      setNewOwnerEmail('');
                      setNewOwnerLabel('');
                      showNotice(`Added ${cleaned} as Bakery Owner.`);
                    })
                    .finally(() => setSavingBusy(false));
                }}
                className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E3DC] space-y-3"
              >
                <p className="text-xs font-semibold text-[#171716]">Add New Owner Account</p>
                {ownerError && (
                  <p className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-lg">
                    {ownerError}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="email"
                    required
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="Google email (e.g., partner@gmail.com)"
                    className="sm:col-span-6 px-3 py-2 text-sm bg-white border border-[#D8D5CC] rounded-lg focus:outline-none focus:border-[#C45512]"
                  />
                  <input
                    type="text"
                    maxLength={60}
                    value={newOwnerLabel}
                    onChange={(e) => setNewOwnerLabel(e.target.value)}
                    placeholder="Role / Name (optional, e.g., Manager)"
                    className="sm:col-span-4 px-3 py-2 text-sm bg-white border border-[#D8D5CC] rounded-lg focus:outline-none focus:border-[#B91C1C]"
                  />
                  <button
                    type="submit"
                    disabled={savingBusy}
                    className="sm:col-span-2 px-4 py-2 text-xs font-medium bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    {savingBusy ? 'Adding...' : 'Add Owner'}
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[#5C5A55]">Current Owners</p>
                {BOOTSTRAPPED_OWNER_EMAILS.map((email) => (
                  <div
                    key={email}
                    className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E5E3DC] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono-tabular font-semibold text-[#171716]">
                        {email}
                      </span>
                      {currentUserEmail.toLowerCase() === email && (
                        <>
                          <span className="mx-2 text-[#C9C5BA]">·</span>
                          <span className="text-[#166534] font-medium">Signed in now</span>
                        </>
                      )}
                    </div>
                    <span className="text-[#B91C1C] font-medium">Primary Owner</span>
                  </div>
                ))}

                {owners
                  .filter(
                    (o) =>
                      !BOOTSTRAPPED_OWNER_EMAILS.some(
                        (b) => b === o.email.toLowerCase() || emailToOwnerDocId(b) === o.id
                      )
                  )
                  .map((ownerAcc) => (
                    <div
                      key={ownerAcc.id}
                      className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E5E3DC] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-mono-tabular font-semibold text-[#171716]">
                          {ownerAcc.email}
                        </span>
                        {ownerAcc.label && (
                          <>
                            <span className="mx-2 text-[#C9C5BA]">·</span>
                            <span className="text-[#5C5A55]">{ownerAcc.label}</span>
                          </>
                        )}
                        {currentUserEmail.toLowerCase() === ownerAcc.email.toLowerCase() && (
                          <>
                            <span className="mx-2 text-[#C9C5BA]">·</span>
                            <span className="text-[#166534] font-medium">Signed in now</span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void onRemoveOwner(ownerAcc.id).then(() =>
                            showNotice(`Removed owner access for ${ownerAcc.email}.`)
                          );
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#991B1B] hover:bg-[#FEF2F2] rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'publish' && (
            <PublishTabPanel settings={settings} productsCount={products.length} />
          )}
        </div>
      </div>
    </div>
  );
}
