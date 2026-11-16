import { FormEvent, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  BookmarkCheck,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { DEFAULT_BAKERY_SETTINGS, formatMoney, resolveDeliveryZone } from '../data/bakeryData';
import {
  BakerySettings,
  CartItem,
  CustomerProfile,
  Order,
  OrderCustomerDetails,
  PaymentMethod,
  SavedAddress,
} from '../types/bakery';
import { ResilientImage } from './ResilientImage';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  customerProfile: CustomerProfile | null;
  items: CartItem[];
  settings: BakerySettings;
  appliedPromoCode: string;
  onApplyPromoCode: (code: string) => void;
  selectedSlotId: string;
  onSelectSlot: (slotId: string) => void;
  deliveryDay: 'Today' | 'Tomorrow';
  onSelectDeliveryDay: (day: 'Today' | 'Tomorrow') => void;
  postalCode: string;
  onPostalCodeChange: (zip: string) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onRequestSignIn: () => void;
  onSaveAddress: (address: Omit<SavedAddress, 'id'>) => Promise<void>;
  onPlaceOrder: (order: Omit<Order, 'customerId' | 'customerEmail'>) => Promise<void>;
}

export function CartCheckoutDrawer({
  isOpen,
  onClose,
  user,
  customerProfile,
  items,
  settings,
  appliedPromoCode,
  onApplyPromoCode,
  selectedSlotId,
  onSelectSlot,
  deliveryDay,
  onSelectDeliveryDay,
  postalCode,
  onPostalCodeChange,
  onUpdateQuantity,
  onRemoveItem,
  onRequestSignIn,
  onSaveAddress,
  onPlaceOrder,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout'>('bag');
  const [tip, setTip] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi_prepaid');
  const [upiReference, setUpiReference] = useState<string>('');
  const [cardPreference, setCardPreference] = useState<string>('Visa / Mastercard / RuPay');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [saveAddressChecked, setSaveAddressChecked] = useState<boolean>(false);
  const [addressLabel, setAddressLabel] = useState<string>('Home');
  const [draftOrderId, setDraftOrderId] = useState<string>(
    () => `IBC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`
  );
  const [formError, setFormError] = useState<string>('');
  const [promoInput, setPromoInput] = useState(appliedPromoCode);
  const [promoFeedback, setPromoFeedback] = useState('');
  const [orderNote, setOrderNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState<OrderCustomerDetails>({
    fullName: '',
    phone: '',
    streetAddress: '',
    apartment: '',
    postalCode: postalCode || '522503',
    instructions: '',
  });

  useEffect(() => {
    setPromoInput(appliedPromoCode);
  }, [appliedPromoCode]);

  useEffect(() => {
    setCustomer({
      fullName: user?.displayName || '',
      phone: '',
      streetAddress: '',
      apartment: '',
      postalCode: postalCode || '522503',
      instructions: '',
    });
  }, [user?.uid]);

  useEffect(() => {
    if (customerProfile) {
      setCustomer((prev) => ({
        fullName: prev.fullName || customerProfile.fullName || user?.displayName || '',
        phone: prev.phone || customerProfile.phone || '',
        streetAddress: prev.streetAddress || customerProfile.streetAddress || '',
        apartment: prev.apartment || customerProfile.apartment || '',
        postalCode: prev.postalCode || customerProfile.postalCode || postalCode || '522503',
        instructions: prev.instructions || customerProfile.instructions || '',
      }));
    } else if (user?.displayName) {
      setCustomer((prev) => ({
        ...prev,
        fullName: prev.fullName || user.displayName || '',
      }));
    }
  }, [customerProfile, user, postalCode]);

  useEffect(() => {
    if (postalCode) {
      setCustomer((prev) => ({ ...prev, postalCode }));
    }
  }, [postalCode]);

  useEffect(() => {
    if (!isOpen) {
      setStep('bag');
      setFormError('');
      setPromoFeedback('');
      setSubmitting(false);
      setUpiReference('');
      setCopiedUpi(false);
    } else {
      setDraftOrderId(`IBC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const activeOffer = settings.promoCodes.find(
    (offer) =>
      offer.active &&
      offer.code.toUpperCase() === appliedPromoCode.trim().toUpperCase() &&
      subtotal >= offer.minOrder
  );

  const discount = activeOffer
    ? activeOffer.discountType === 'percent'
      ? Math.round((subtotal * activeOffer.value) / 100)
      : Math.min(subtotal, activeOffer.value)
    : 0;

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxPercent = settings.taxPercent ?? 5;
  const taxAmount =
    items.length === 0 ? 0 : Math.round((discountedSubtotal * taxPercent) / 100);
  const zone = resolveDeliveryZone(customer.postalCode || postalCode, settings);
  const qualifiesFreeDelivery = discountedSubtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = items.length === 0 ? 0 : qualifiesFreeDelivery ? 0 : zone.fee;
  const remainingForFree = Math.max(0, settings.freeDeliveryThreshold - discountedSubtotal);
  const progressPct =
    settings.freeDeliveryThreshold > 0
      ? Math.min(100, Math.round((discountedSubtotal / settings.freeDeliveryThreshold) * 100))
      : 100;
  const bagTotal = discountedSubtotal + taxAmount + deliveryFee;
  const total = bagTotal + (items.length > 0 ? tip : 0);
  const activeSlot =
    settings.deliverySlots.find((s) => s.id === selectedSlotId) ??
    settings.deliverySlots[0] ??
    DEFAULT_BAKERY_SETTINGS.deliverySlots[0];

  const tipPresets =
    settings.currency === '₹' ? [0, 20, 40, 60] : [0, 2, 4, 6];

  const savedAddresses = customerProfile?.savedAddresses ?? [];

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setCustomer({
      fullName: addr.fullName,
      phone: addr.phone,
      streetAddress: addr.streetAddress,
      apartment: addr.apartment,
      postalCode: addr.postalCode,
      instructions: addr.instructions,
    });
    onPostalCodeChange(addr.postalCode);
  };

  const handlePromoApply = (codeToApply?: string) => {
    const cleaned = (codeToApply ?? promoInput).trim().toUpperCase();
    if (!cleaned) {
      onApplyPromoCode('');
      setPromoFeedback('');
      return;
    }
    const found = settings.promoCodes.find(
      (o) => o.active && o.code.toUpperCase() === cleaned
    );
    if (!found) {
      setPromoFeedback(`Offer code "${cleaned}" is not active.`);
      return;
    }
    if (subtotal < found.minOrder) {
      onApplyPromoCode(cleaned);
      setPromoFeedback(
        `Code ${cleaned} saved—add ${formatMoney(found.minOrder - subtotal, settings.currency)} more to unlock.`
      );
      return;
    }
    onApplyPromoCode(cleaned);
    setPromoFeedback(`Applied ${found.title}!`);
  };

  const merchantUpiId = (settings.upiId ?? '').trim();
  const upiUri = merchantUpiId
    ? `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(
        settings.bakeryName
      )}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${draftOrderId}`)}`
    : '';

  const handleCopyUpi = async () => {
    if (!merchantUpiId) return;
    try {
      await navigator.clipboard.writeText(merchantUpiId);
      setCopiedUpi(true);
      window.setTimeout(() => setCopiedUpi(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequestSignIn();
      return;
    }
    if (
      customer.fullName.trim().length < 1 ||
      customer.phone.trim().length < 5 ||
      customer.streetAddress.trim().length < 3 ||
      customer.postalCode.trim().length < 3
    ) {
      setFormError(
        'Please enter your full name, valid phone number (5+ digits), full street address, and pin code.'
      );
      return;
    }

    if (paymentMethod === 'upi_prepaid') {
      if (!merchantUpiId) {
        setFormError(
          'Online UPI ID is not configured yet. Please select Cash on Delivery, Credit/Debit Card, or UPI on Delivery.'
        );
        return;
      }
      if (upiReference.trim().length < 4) {
        setFormError(
          'After paying via UPI, please enter your 12-digit UPI Reference / UTR number so we can verify payment.'
        );
        return;
      }
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (saveAddressChecked && user) {
        await onSaveAddress({
          label: addressLabel.trim() || 'Home',
          fullName: customer.fullName.trim(),
          phone: customer.phone.trim(),
          streetAddress: customer.streetAddress.trim(),
          apartment: customer.apartment.trim(),
          postalCode: customer.postalCode.trim(),
          instructions: customer.instructions.trim(),
        });
      }

      const combinedNote = [
        orderNote.trim(),
        paymentMethod === 'online_card' ? `Card Payment Request (${cardPreference})` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await onPlaceOrder({
        id: draftOrderId,
        createdAtLabel: nowTime,
        deliveryDay,
        deliveryWindow: activeSlot.window,
        neighborhood: zone.neighborhood,
        customer: {
          fullName: customer.fullName.trim(),
          phone: customer.phone.trim(),
          streetAddress: customer.streetAddress.trim(),
          apartment: customer.apartment.trim(),
          postalCode: customer.postalCode.trim(),
          instructions: customer.instructions.trim(),
        },
        paymentMethod,
        paymentStatus: paymentMethod === 'upi_prepaid' ? 'verification_pending' : 'pending',
        upiReference: paymentMethod === 'upi_prepaid' ? upiReference.trim() : undefined,
        items: [...items],
        subtotal,
        discount: discount > 0 ? discount : undefined,
        promoCode: activeOffer?.code,
        tax: taxAmount > 0 ? taxAmount : undefined,
        deliveryFee,
        tip,
        total,
        stage: 'confirmed',
        courierName: 'Assigned upon dispatch',
        note: combinedNote || undefined,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to place order right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#2A180D]/50"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart and checkout"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-[#FAF5EE] border-l border-[#E6DDD1] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E6DDD1] flex items-center justify-between gap-4 bg-[#FFFDF9]">
          <div className="flex items-center gap-3">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('bag')}
                aria-label="Back to cart"
                className="p-2 -ml-2 rounded-lg text-[#6D4C3D] hover:text-[#3B2314] hover:bg-[#F3EBDF] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-xl font-semibold text-[#3B2314]">
              {step === 'bag' ? 'Your Shopping Cart' : 'Checkout & Payment'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#6D4C3D] hover:text-[#3B2314] hover:bg-[#F3EBDF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        {items.length > 0 && (
          <div className="px-6 py-3 bg-[#F3EBDF] border-b border-[#E6DDD1]">
            <div className="flex items-center justify-between text-xs text-[#6D4C3D] mb-1.5">
              {qualifiesFreeDelivery ? (
                <span className="font-medium text-[#15803D] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Complimentary home delivery unlocked
                </span>
              ) : (
                <span>
                  Add{' '}
                  <strong className="font-mono-tabular font-semibold text-[#3B2314]">
                    {formatMoney(remainingForFree, settings.currency)}
                  </strong>{' '}
                  for free home delivery
                </span>
              )}
              <span className="font-mono-tabular text-[#6D4C3D]">{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#E6DDD1] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C45512] transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-full bg-[#F3EBDF] border border-[#E6DDD1] flex items-center justify-center text-[#6D4C3D] mb-4">
                <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <p className="font-display text-lg font-semibold text-[#3B2314]">
                Your cart is empty
              </p>
              <p className="mt-1.5 text-sm text-[#6D4C3D] max-w-xs">
                Add celebration cakes, puffs, Osmania biscuits, sweets, or Irani chai combos to get started.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-5 py-2.5 bg-[#C45512] hover:bg-[#A9450C] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                Explore Menu
              </button>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-6">
              {/* Itemized List */}
              <ul className="divide-y divide-[#E6DDD1]">
                {items.map((item) => (
                  <li key={item.cartItemId} className="py-4 first:pt-0 flex gap-4">
                    <div className="w-20 h-16 rounded-xl overflow-hidden bg-[#EAE0D2] shrink-0">
                      <ResilientImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#3B2314] truncate">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[#6D4C3D] mt-0.5">{item.optionLabel}</p>
                          {item.customizationSummary && (
                            <p className="text-[11px] text-[#C45512] mt-1 leading-snug">
                              {item.customizationSummary}
                            </p>
                          )}
                        </div>
                        <span className="font-mono-tabular text-sm font-medium text-[#3B2314] shrink-0">
                          {formatMoney(item.unitPrice * item.quantity, settings.currency)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#D6C9B8] rounded-lg bg-[#FFFDF9]">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartItemId, -1)}
                            aria-label={`Decrease ${item.name} quantity`}
                            className="w-8 h-8 flex items-center justify-center text-[#3B2314] hover:bg-[#F3EBDF] rounded-l-lg cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono-tabular text-xs font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartItemId, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                            className="w-8 h-8 flex items-center justify-center text-[#3B2314] hover:bg-[#F3EBDF] rounded-r-lg cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.cartItemId)}
                          aria-label={`Remove ${item.name}`}
                          className="text-xs text-[#6D4C3D] hover:text-[#B91C1C] inline-flex items-center gap-1 py-1 px-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Coupon Codes */}
              <div className="pt-4 border-t border-[#E6DDD1] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6D4C3D] inline-flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#C45512]" />
                    <span>Apply Coupon &amp; Bakery Offers</span>
                  </span>
                  {activeOffer && (
                    <button
                      type="button"
                      onClick={() => handlePromoApply('')}
                      className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (e.g. FESTIVE15)"
                    className="flex-1 px-3 py-2 text-xs font-mono-tabular uppercase bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                  />
                  <button
                    type="button"
                    onClick={() => handlePromoApply()}
                    className="px-4 py-2 text-xs font-medium bg-[#3B2314] text-white rounded-xl hover:bg-[#52321E] cursor-pointer whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>

                {settings.promoCodes.some((p) => p.active) && (
                  <div className="flex flex-wrap gap-2">
                    {settings.promoCodes
                      .filter((p) => p.active)
                      .map((offer) => (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => {
                            setPromoInput(offer.code);
                            handlePromoApply(offer.code);
                          }}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                            activeOffer?.code === offer.code
                              ? 'border-[#C45512] bg-[#C45512]/10 text-[#C45512] font-medium'
                              : 'border-[#E6DDD1] bg-[#FFFDF9] text-[#6D4C3D] hover:border-[#CBBBA7]'
                          }`}
                        >
                          <span className="font-mono-tabular font-semibold">{offer.code}</span>
                          <span className="mx-1.5">·</span>
                          <span>
                            {offer.discountType === 'percent'
                              ? `${offer.value}% off`
                              : `${formatMoney(offer.value, settings.currency)} off`}
                          </span>
                        </button>
                      ))}
                  </div>
                )}

                {promoFeedback && (
                  <p className="text-xs text-[#15803D]">{promoFeedback}</p>
                )}
              </div>

              {/* Scheduled Delivery Slot */}
              <div className="pt-4 border-t border-[#E6DDD1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#6D4C3D]">Scheduled Delivery</span>
                  <div className="inline-flex p-0.5 rounded-lg bg-[#EAE0D2]">
                    {(['Today', 'Tomorrow'] as const).map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onSelectDeliveryDay(day)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          deliveryDay === day
                            ? 'bg-[#FFFDF9] text-[#3B2314] shadow-xs'
                            : 'text-[#6D4C3D] hover:text-[#3B2314]'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#6D4C3D] block mb-2">
                    Select Delivery Window
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {settings.deliverySlots.map((slot) => {
                      const active = slot.id === activeSlot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => onSelectSlot(slot.id)}
                          className={`px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                            active
                              ? 'border-[#C45512] bg-[#C45512]/8 text-[#3B2314]'
                              : 'border-[#E6DDD1] bg-[#FFFDF9] text-[#6D4C3D] hover:border-[#CBBBA7]'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-medium text-[#3B2314]">{slot.label}</span>
                            <span className="mx-2 text-[#D6C9B8]">·</span>
                            <span className="font-mono-tabular text-xs text-[#6D4C3D]">
                              {slot.window}
                            </span>
                          </div>
                          <span className="text-xs text-[#6D4C3D] font-mono-tabular">
                            {slot.spotsRemaining} left
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="bag-note" className="block text-xs font-medium text-[#6D4C3D] mb-1.5">
                    Gift or Kitchen Note (Optional)
                  </label>
                  <input
                    id="bag-note"
                    type="text"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="e.g., Extra plates & candles, less sugar"
                    className="w-full px-3 py-2 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Checkout Form Step */
            <form id="bakery-checkout-form" onSubmit={(e) => void handleCheckoutSubmit(e)} className="space-y-5">
              {!user && (
                <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DDD1] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#3B2314]">
                      Sign in as Customer to place order
                    </p>
                    <p className="text-xs text-[#6D4C3D] mt-0.5">
                      Saves your delivery addresses and tracks your order live.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRequestSignIn}
                    className="px-3.5 py-2 bg-[#3B2314] hover:bg-[#52321E] text-white text-xs font-medium rounded-xl shrink-0 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
                >
                  {formError}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#F3EBDF] border border-[#E6DDD1] flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium text-[#3B2314]">
                    {deliveryDay}, {activeSlot.window}
                  </p>
                  <p className="text-[#6D4C3D] mt-0.5">
                    {zone.neighborhood} · Est. transit {zone.etaMinutes}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="text-[#C45512] font-medium underline underline-offset-2 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Saved Delivery Addresses Quick Picker */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#6D4C3D] inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C45512]" />
                    <span>Saved Delivery Addresses</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {savedAddresses.map((addr) => {
                      const isMatch =
                        customer.streetAddress.trim().toLowerCase() ===
                        addr.streetAddress.trim().toLowerCase();
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            isMatch
                              ? 'border-[#C45512] bg-[#C45512]/8'
                              : 'border-[#E6DDD1] bg-[#FFFDF9] hover:border-[#CBBBA7]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#3B2314]">
                            <span>{addr.label}</span>
                            <span className="font-mono-tabular text-[#6D4C3D]">{addr.postalCode}</span>
                          </div>
                          <p className="text-xs text-[#6D4C3D] mt-0.5 truncate">
                            {addr.streetAddress}
                            {addr.apartment ? `, ${addr.apartment}` : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#3B2314]">Recipient &amp; Delivery Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="chk-name" className="block text-xs text-[#6D4C3D] mb-1">
                      Full Name
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      required
                      value={customer.fullName}
                      onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                      placeholder="Karthik Rao"
                      className="w-full px-3 py-2 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-phone" className="block text-xs text-[#6D4C3D] mb-1">
                      Mobile Phone
                    </label>
                    <input
                      id="chk-phone"
                      type="tel"
                      required
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder={settings.phone}
                      className="w-full px-3 py-2 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="chk-street" className="block text-xs text-[#6D4C3D] mb-1">
                    Street Address
                  </label>
                  <input
                    id="chk-street"
                    type="text"
                    required
                    value={customer.streetAddress}
                    onChange={(e) => setCustomer({ ...customer, streetAddress: e.target.value })}
                    placeholder="Near Widdi Centre, Mangalagiri"
                    className="w-full px-3 py-2 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="chk-apt" className="block text-xs text-[#6D4C3D] mb-1">
                      Flat / Landmark
                    </label>
                    <input
                      id="chk-apt"
                      type="text"
                      value={customer.apartment}
                      onChange={(e) => setCustomer({ ...customer, apartment: e.target.value })}
                      placeholder="Flat 204"
                      className="w-full px-3 py-2 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-zip" className="block text-xs text-[#6D4C3D] mb-1">
                      Pin Code
                    </label>
                    <input
                      id="chk-zip"
                      type="text"
                      required
                      value={customer.postalCode}
                      onChange={(e) => {
                        setCustomer({ ...customer, postalCode: e.target.value });
                        onPostalCodeChange(e.target.value);
                      }}
                      placeholder="522503"
                      className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="chk-instructions" className="block text-xs text-[#6D4C3D] mb-1">
                    Delivery Instructions
                  </label>
                  <input
                    id="chk-instructions"
                    type="text"
                    value={customer.instructions}
                    onChange={(e) => setCustomer({ ...customer, instructions: e.target.value })}
                    placeholder="Ring doorbell once, call upon arrival"
                    className="w-full px-3 py-2 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                  />
                </div>

                {user && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-[#3B2314] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAddressChecked}
                        onChange={(e) => setSaveAddressChecked(e.target.checked)}
                        className="rounded border-[#D6C9B8] accent-[#C45512]"
                      />
                      <BookmarkCheck className="w-3.5 h-3.5 text-[#C45512]" />
                      <span>Save to my address book</span>
                    </label>
                    {saveAddressChecked && (
                      <input
                        type="text"
                        maxLength={20}
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        placeholder="Label (Home / Office)"
                        className="w-32 px-2.5 py-1 text-xs bg-[#FFFDF9] border border-[#D6C9B8] rounded-lg"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-3 pt-2 border-t border-[#E6DDD1]">
                <h3 className="text-sm font-semibold text-[#3B2314]">Payment Options</h3>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      {
                        id: 'upi_prepaid',
                        title: 'UPI — Google Pay, PhonePe & Paytm',
                        desc: merchantUpiId
                          ? 'Scan QR or launch Google Pay / PhonePe with exact total pre-filled'
                          : 'Bakery UPI ID not set yet — use Card, UPI on Delivery, or COD below',
                      },
                      {
                        id: 'online_card',
                        title: 'Credit / Debit Card',
                        desc: 'Pay via Visa, Mastercard, or RuPay (card terminal or payment link)',
                      },
                      {
                        id: 'card_on_delivery',
                        title: 'UPI / Card Swipe on Delivery',
                        desc: 'Pay via PhonePe/GPay QR or tap card when our rider arrives',
                      },
                      {
                        id: 'cash_on_delivery',
                        title: 'Cash on Delivery (COD)',
                        desc: 'Pay cash directly upon doorstep handoff',
                      },
                    ] as const
                  ).map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        paymentMethod === method.id
                          ? 'border-[#C45512] bg-[#C45512]/8'
                          : 'border-[#E6DDD1] bg-[#FFFDF9] hover:border-[#CBBBA7]'
                      }`}
                    >
                      <p className="text-sm font-medium text-[#3B2314]">{method.title}</p>
                      <p className="text-xs text-[#6D4C3D] mt-0.5">{method.desc}</p>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'online_card' && (
                  <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DDD1] space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#3B2314]">
                      <CreditCard className="w-4 h-4 text-[#C45512]" />
                      <span>Select Card Network</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['Visa', 'Mastercard', 'RuPay'].map((net) => (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setCardPreference(net)}
                          className={`py-2 text-xs font-medium rounded-lg border cursor-pointer ${
                            cardPreference === net
                              ? 'border-[#C45512] bg-[#C45512] text-white'
                              : 'border-[#E6DDD1] bg-[#FAF5EE] text-[#3B2314]'
                          }`}
                        >
                          {net}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#6D4C3D] leading-relaxed">
                      For card security, our rider brings a wireless POS card machine to your door or shares an encrypted payment link upon confirmation.
                    </p>
                  </div>
                )}

                {paymentMethod === 'upi_prepaid' && (
                  <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DDD1] space-y-3">
                    {merchantUpiId ? (
                      <>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="p-2.5 bg-white border border-[#E6DDD1] rounded-xl shrink-0">
                            <QRCodeSVG
                              value={upiUri}
                              size={128}
                              level="M"
                              bgColor="#FFFFFF"
                              fgColor="#3B2314"
                            />
                          </div>
                          <div className="flex-1 space-y-2 text-center sm:text-left">
                            <p className="text-xs font-medium text-[#6D4C3D]">
                              Scan with Google Pay, PhonePe or Paytm to pay{' '}
                              <span className="font-mono-tabular font-semibold text-[#3B2314]">
                                {formatMoney(total, settings.currency)}
                              </span>
                            </p>
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                              <code className="px-2 py-1 text-xs font-mono-tabular bg-[#F3EBDF] border border-[#E6DDD1] rounded text-[#3B2314]">
                                {merchantUpiId}
                              </code>
                              <button
                                type="button"
                                onClick={() => void handleCopyUpi()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#FAF5EE] border border-[#D6C9B8] rounded hover:border-[#3B2314] cursor-pointer"
                              >
                                {copiedUpi ? (
                                  <>
                                    <Check className="w-3 h-3 text-[#15803D]" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <a
                              href={upiUri}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#3B2314] hover:bg-[#52321E] text-white rounded-xl transition-colors"
                            >
                              <span>Open GPay / PhonePe</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E6DDD1]">
                          <label htmlFor="chk-utr" className="block text-xs font-medium text-[#3B2314] mb-1">
                            UPI Reference / UTR Number (Required after paying)
                          </label>
                          <input
                            id="chk-utr"
                            type="text"
                            maxLength={40}
                            value={upiReference}
                            onChange={(e) => setUpiReference(e.target.value)}
                            placeholder="Enter 12-digit UTR / Transaction ID"
                            className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#92400E] leading-relaxed">
                        Direct online UPI ID is not configured yet. Please choose{' '}
                        <strong>UPI / Card Swipe on Delivery</strong>, <strong>Credit / Debit Card</strong>, or{' '}
                        <strong>Cash on Delivery</strong>, or call{' '}
                        <span className="font-mono-tabular">{settings.phone}</span>.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Courier Tip */}
              <div className="space-y-2 pt-2 border-t border-[#E6DDD1]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#3B2314]">Delivery Partner Tip</span>
                  <span className="text-[#6D4C3D]">100% goes to your rider</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {tipPresets.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTip(amount)}
                      className={`py-2 text-xs font-mono-tabular font-medium rounded-xl border transition-colors cursor-pointer ${
                        tip === amount
                          ? 'border-[#C45512] bg-[#C45512] text-white'
                          : 'border-[#E6DDD1] bg-[#FFFDF9] text-[#3B2314] hover:border-[#CBBBA7]'
                      }`}
                    >
                      {amount === 0 ? 'None' : formatMoney(amount, settings.currency)}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E6DDD1] bg-[#FFFDF9] space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#6D4C3D]">
                <span>Item Total</span>
                <span className="font-mono-tabular text-[#3B2314]">
                  {formatMoney(subtotal, settings.currency)}
                </span>
              </div>
              {discount > 0 && activeOffer && (
                <div className="flex justify-between text-[#15803D] font-medium">
                  <span>Coupon ({activeOffer.code})</span>
                  <span className="font-mono-tabular">
                    -{formatMoney(discount, settings.currency)}
                  </span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-[#6D4C3D]">
                  <span>Bakery GST &amp; Packaging ({taxPercent}%)</span>
                  <span className="font-mono-tabular text-[#3B2314]">
                    {formatMoney(taxAmount, settings.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#6D4C3D]">
                <span>Delivery Charges</span>
                <span className="font-mono-tabular text-[#3B2314]">
                  {deliveryFee === 0 ? 'Free' : formatMoney(deliveryFee, settings.currency)}
                </span>
              </div>
              {step === 'checkout' && tip > 0 && (
                <div className="flex justify-between text-[#6D4C3D]">
                  <span>Rider Tip</span>
                  <span className="font-mono-tabular text-[#3B2314]">
                    {formatMoney(tip, settings.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E6DDD1] text-base font-semibold text-[#3B2314]">
                <span>To Pay</span>
                <span className="font-mono-tabular">
                  {formatMoney(step === 'bag' ? bagTotal : total, settings.currency)}
                </span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3 px-5 bg-[#C45512] hover:bg-[#A9450C] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                Proceed to Checkout
              </button>
            ) : (
              <button
                type="submit"
                form="bakery-checkout-form"
                disabled={submitting}
                className="w-full py-3 px-5 bg-[#C45512] hover:bg-[#A9450C] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Confirming Order...'
                  : user
                    ? `Confirm Order · ${formatMoney(total, settings.currency)}`
                    : `Sign In & Confirm · ${formatMoney(total, settings.currency)}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
