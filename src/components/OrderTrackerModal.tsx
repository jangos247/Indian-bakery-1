import { FormEvent, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Bike, Check, Clock, Flame, PackageCheck, RotateCcw, Search, X } from 'lucide-react';
import { formatMoney } from '../data/bakeryData';
import { CurrencySymbol, Order, OrderStage } from '../types/bakery';

export const ORDER_STAGES: { key: OrderStage; label: string; detail: string; icon: typeof Check }[] = [
  {
    key: 'confirmed',
    label: 'Order Placed',
    detail: 'Ticket received at Indian Bakery & Cafe',
    icon: Clock,
  },
  {
    key: 'baking',
    label: 'Preparing Your Order',
    detail: 'Freshly baked & customized for your delivery window',
    icon: Flame,
  },
  {
    key: 'packed',
    label: 'Ready for Delivery',
    detail: 'Sealed warm in ventilated bakery packaging',
    icon: PackageCheck,
  },
  {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    detail: 'En route with our neighborhood rider',
    icon: Bike,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    detail: 'Handed off safely at your doorstep',
    icon: Check,
  },
];

const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  upi_prepaid: 'UPI (GPay / PhonePe / Paytm)',
  card_on_delivery: 'UPI / Card on Delivery',
  cash_on_delivery: 'Cash on Delivery (COD)',
  online_card: 'Credit / Debit Card',
};

const PAYMENT_STATUS_LABELS: Record<NonNullable<Order['paymentStatus']>, string> = {
  pending: 'Pay upon delivery',
  verification_pending: 'Awaiting bakery UPI verification',
  verified: 'UPI payment verified',
  paid: 'Paid in full',
};

interface OrderTrackerContentProps {
  user: User | null;
  isOwner: boolean;
  currency: CurrencySymbol;
  orders: Order[];
  activeOrderId: string;
  onSelectOrder: (orderId: string) => void;
  onAdvanceStage: (orderId: string) => void;
  onReorder: (order: Order) => void;
  onRequestSignIn: () => void;
  onAfterReorder?: () => void;
}

export function OrderTrackerContent({
  user,
  isOwner,
  currency,
  orders,
  activeOrderId,
  onSelectOrder,
  onAdvanceStage,
  onReorder,
  onRequestSignIn,
  onAfterReorder,
}: OrderTrackerContentProps) {
  const [lookupInput, setLookupInput] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');

  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? orders[0];
  const currentStageIdx = activeOrder
    ? ORDER_STAGES.findIndex((s) => s.key === activeOrder.stage)
    : 0;

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = lookupInput.trim().toUpperCase();
    if (!cleaned) return;
    const found = orders.find((o) => o.id.toUpperCase() === cleaned);
    if (found) {
      onSelectOrder(found.id);
      setLookupMessage('');
    } else {
      setLookupMessage(`No order found matching "${cleaned}".`);
    }
  };

  if (!user) {
    return (
      <div className="py-12 px-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl text-center space-y-3">
        <p className="font-display text-xl font-semibold text-[#3B2314]">
          Sign in to track your orders
        </p>
        <p className="text-xs text-[#6D4C3D] max-w-sm mx-auto leading-relaxed">
          Sign in with your Customer account to follow live bakery preparation, rider status, and 1-tap reorder history.
        </p>
        <button
          type="button"
          onClick={onRequestSignIn}
          className="mt-2 px-5 py-2.5 bg-[#C45512] hover:bg-[#A9450C] text-white text-xs font-medium rounded-xl cursor-pointer"
        >
          Customer Sign In
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-12 px-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl text-center space-y-2">
        <p className="font-display text-xl font-semibold text-[#3B2314]">
          No orders placed yet
        </p>
        <p className="text-xs text-[#6D4C3D] max-w-sm mx-auto">
          Once you order cakes, puffs, sweets, or chai combos, live status from Order Placed to Delivered will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lookup & Order History Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form onSubmit={handleLookup} className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6D4C3D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              placeholder="Find Order ID (e.g. IBC-1054)"
              className="w-full pl-9 pr-3 py-2 text-sm font-mono-tabular bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-medium bg-[#3B2314] text-white rounded-xl hover:bg-[#52321E] transition-colors cursor-pointer whitespace-nowrap"
          >
            Find
          </button>
        </form>

        {orders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-[#6D4C3D] shrink-0">Recent:</span>
            {orders.slice(0, 6).map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => onSelectOrder(ord.id)}
                className={`px-2.5 py-1.5 text-xs font-mono-tabular rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  ord.id === activeOrder?.id
                    ? 'border-[#C45512] bg-[#C45512] text-white'
                    : 'border-[#E6DDD1] bg-[#FFFDF9] text-[#6D4C3D] hover:border-[#CBBBA7]'
                }`}
              >
                {ord.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {lookupMessage && (
        <p className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-xl">
          {lookupMessage}
        </p>
      )}

      {activeOrder && (
        <>
          {/* Active Order Summary Banner */}
          <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E6DDD1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center flex-wrap gap-2 text-xs text-[#6D4C3D]">
                <span className="font-mono-tabular font-semibold text-[#3B2314]">
                  Order #{activeOrder.id}
                </span>
                <span aria-hidden="true">·</span>
                <span>Placed {activeOrder.createdAtLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{activeOrder.neighborhood}</span>
              </div>
              <p className="mt-1 font-display text-lg font-semibold text-[#3B2314]">
                {ORDER_STAGES[currentStageIdx]?.label}
              </p>
              <p className="mt-0.5 text-xs text-[#6D4C3D]">
                Scheduled: {activeOrder.deliveryDay}, {activeOrder.deliveryWindow} · Rider:{' '}
                {activeOrder.courierName}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {isOwner && activeOrder.stage !== 'delivered' && (
                <button
                  type="button"
                  onClick={() => onAdvanceStage(activeOrder.id)}
                  className="px-3.5 py-2 text-xs font-medium border border-[#C45512] text-[#C45512] hover:bg-[#C45512] hover:text-white rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Advance Stage
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onReorder(activeOrder);
                  onAfterReorder?.();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F3EBDF] hover:bg-[#E6DDD1] text-[#3B2314] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reorder</span>
              </button>
            </div>
          </div>

          {/* 5-Stage Progress Timeline */}
          <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E6DDD1]">
            <ol className="space-y-4">
              {ORDER_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                const Icon = stage.icon;
                return (
                  <li key={stage.key} className="flex items-start gap-4">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                        isCurrent
                          ? 'bg-[#C45512] border-[#C45512] text-white'
                          : isCompleted
                            ? 'bg-[#C45512]/12 border-[#C45512]/35 text-[#C45512]'
                            : 'bg-[#F3EBDF] border-[#E6DDD1] text-[#8D7262]'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            isCurrent || isCompleted ? 'text-[#3B2314]' : 'text-[#8D7262]'
                          }`}
                        >
                          {stage.label}
                        </p>
                        <span className="text-xs text-[#6D4C3D]">
                          {isCurrent ? 'In progress' : isCompleted ? 'Done' : 'Upcoming'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6D4C3D] mt-0.5">{stage.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Delivery Details & Itemized Receipt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E6DDD1] space-y-2 text-sm">
              <h3 className="text-xs font-medium text-[#6D4C3D]">Delivery Destination</h3>
              <p className="font-medium text-[#3B2314]">{activeOrder.customer.fullName}</p>
              <p className="text-[#6D4C3D]">
                {activeOrder.customer.streetAddress}
                {activeOrder.customer.apartment ? `, ${activeOrder.customer.apartment}` : ''}
              </p>
              <p className="font-mono-tabular text-xs text-[#6D4C3D]">
                {activeOrder.customer.postalCode} · {activeOrder.customer.phone}
              </p>
              {activeOrder.customer.instructions && (
                <p className="pt-2 border-t border-[#E6DDD1] text-xs text-[#6D4C3D]">
                  Note: {activeOrder.customer.instructions}
                </p>
              )}
              <div className="pt-1 text-xs text-[#6D4C3D] space-y-0.5">
                <p>
                  Payment:{' '}
                  <span className="text-[#3B2314] font-medium">
                    {PAYMENT_LABELS[activeOrder.paymentMethod]}
                  </span>
                </p>
                {activeOrder.paymentStatus && (
                  <p>
                    Status:{' '}
                    <span
                      className={
                        activeOrder.paymentStatus === 'verified' ||
                        activeOrder.paymentStatus === 'paid'
                          ? 'text-[#15803D] font-medium'
                          : 'text-[#92400E] font-medium'
                      }
                    >
                      {PAYMENT_STATUS_LABELS[activeOrder.paymentStatus]}
                    </span>
                  </p>
                )}
                {activeOrder.upiReference && (
                  <p className="font-mono-tabular">UTR Ref: {activeOrder.upiReference}</p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E6DDD1] space-y-2.5 text-sm">
              <h3 className="text-xs font-medium text-[#6D4C3D]">Order Summary</h3>
              <ul className="space-y-1.5 text-xs text-[#6D4C3D]">
                {activeOrder.items.map((item) => (
                  <li key={item.cartItemId} className="space-y-0.5">
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-[#3B2314]">
                        <span className="font-mono-tabular">{item.quantity}×</span> {item.name}
                      </span>
                      <span className="font-mono-tabular shrink-0 text-[#3B2314]">
                        {formatMoney(item.unitPrice * item.quantity, currency)}
                      </span>
                    </div>
                    {item.customizationSummary && (
                      <p className="text-[11px] text-[#C45512]">{item.customizationSummary}</p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#E6DDD1] space-y-1 text-xs">
                {activeOrder.discount && activeOrder.discount > 0 && (
                  <div className="flex justify-between text-[#15803D]">
                    <span>Coupon ({activeOrder.promoCode})</span>
                    <span className="font-mono-tabular">
                      -{formatMoney(activeOrder.discount, currency)}
                    </span>
                  </div>
                )}
                {activeOrder.tax && activeOrder.tax > 0 && (
                  <div className="flex justify-between text-[#6D4C3D]">
                    <span>Taxes &amp; Packaging</span>
                    <span className="font-mono-tabular">
                      {formatMoney(activeOrder.tax, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[#6D4C3D]">
                  <span>Delivery</span>
                  <span className="font-mono-tabular">
                    {activeOrder.deliveryFee === 0
                      ? 'Free'
                      : formatMoney(activeOrder.deliveryFee, currency)}
                  </span>
                </div>
                {activeOrder.tip > 0 && (
                  <div className="flex justify-between text-[#6D4C3D]">
                    <span>Rider Tip</span>
                    <span className="font-mono-tabular">
                      {formatMoney(activeOrder.tip, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm text-[#3B2314] pt-1">
                  <span>Total</span>
                  <span className="font-mono-tabular">
                    {formatMoney(activeOrder.total, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface OrderTrackerModalProps extends OrderTrackerContentProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderTrackerModal({
  isOpen,
  onClose,
  ...rest
}: OrderTrackerModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A180D]/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracker-heading"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#FAF5EE] border border-[#E6DDD1] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6DDD1] bg-[#FFFDF9] flex items-center justify-between gap-4">
          <div>
            <h2 id="tracker-heading" className="font-display text-xl font-semibold text-[#3B2314]">
              Live Order Tracking
            </h2>
            <p className="text-xs text-[#6D4C3D]">
              Order Placed → Preparing Your Order → Ready for Delivery → Out for Delivery → Delivered
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order tracker"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#6D4C3D] hover:text-[#3B2314] hover:bg-[#F3EBDF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <OrderTrackerContent
            {...rest}
            onRequestSignIn={() => {
              onClose();
              rest.onRequestSignIn();
            }}
            onAfterReorder={onClose}
          />
        </div>
      </div>
    </div>
  );
}
