import { FormEvent, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ArrowRight,
  BookmarkPlus,
  Clock,
  Heart,
  LogOut,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  User as UserIcon,
  WifiOff,
  X,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { AppTab, BottomNav } from './components/BottomNav';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { Header } from './components/Header';
import { OrderTrackerContent, OrderTrackerModal } from './components/OrderTrackerModal';
import { OwnerStudioModal } from './components/OwnerStudioModal';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ResilientImage } from './components/ResilientImage';
import {
  BAKERY_LOGO_URL,
  CATEGORY_DETAILS,
  CORE_BAKERY_CATEGORIES,
  DEFAULT_BAKERY_PRODUCTS,
  DEFAULT_BAKERY_SETTINGS,
  formatMoney,
  HERO_IMAGE,
  normalizeCategory,
  resolveDeliveryZone,
} from './data/bakeryData';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  auth,
  db,
  emailToOwnerDocId,
  getResolvedUserEmail,
  handleFirestoreError,
  isBootstrappedOwnerEmail,
  OperationType,
} from './lib/firebase';
import {
  BakeryCategory,
  BakerySettings,
  CartItem,
  CustomerProfile,
  Order,
  OrderStage,
  OwnerAccount,
  PaymentStatus,
  Product,
  ProductReview,
  SavedAddress,
} from './types/bakery';

const STORAGE_CART_KEY = 'ibc_bakery_cart_v1';
const STORAGE_WISHLIST_KEY = 'ibc_bakery_wishlist_v1';

const CATEGORIES_FILTER: ('All' | BakeryCategory)[] = ['All', ...CORE_BAKERY_CATEGORIES];
const DIETARY_FILTERS = ['All', 'Pure Veg', 'Vegan', 'Nut-Free'] as const;

const STAGE_SEQUENCE: OrderStage[] = [
  'confirmed',
  'baking',
  'packed',
  'out_for_delivery',
  'delivered',
];

const QUICK_SEARCH_TERMS = [
  'Truffle Cake',
  'Paneer Puff',
  'Osmania',
  'Gulab Jamun',
  'Irani Chai',
  'Khari',
  'Focaccia',
];

export default function App() {
  const isOnline = useOnlineStatus();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [products, setProducts] = useState<Product[]>(DEFAULT_BAKERY_PRODUCTS);
  const [settings, setSettings] = useState<BakerySettings>(DEFAULT_BAKERY_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CART_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [guestWishlist, setGuestWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WISHLIST_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | BakeryCategory>('All');
  const [dietaryFilter, setDietaryFilter] = useState<(typeof DIETARY_FILTERS)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [postalCode, setPostalCode] = useState('522503');
  const [deliveryDay, setDeliveryDay] = useState<'Today' | 'Tomorrow'>('Today');
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    () => DEFAULT_BAKERY_SETTINGS.deliverySlots[0].id
  );

  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isOwnerStudioOpen, setIsOwnerStudioOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'customer' | 'owner'>('customer');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; showCartAction?: boolean } | null>(null);
  const [isDynamicOwner, setIsDynamicOwner] = useState(false);
  const [ownersList, setOwnersList] = useState<OwnerAccount[]>([]);

  // Profile tab address form state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('Home');
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrApt, setNewAddrApt] = useState('');
  const [newAddrPin, setNewAddrPin] = useState('522503');

  const resolvedUserEmail = getResolvedUserEmail(user);
  const isOwner = Boolean(
    user &&
      user.emailVerified &&
      (isBootstrappedOwnerEmail(resolvedUserEmail) || isDynamicOwner)
  );

  const wishlistIds = user && customerProfile?.wishlist ? customerProfile.wishlist : guestWishlist;

  // Save cart & guest wishlist locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_WISHLIST_KEY, JSON.stringify(guestWishlist));
    } catch {
      // Ignore storage quota errors
    }
  }, [guestWishlist]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Check if current signed-in user is in dynamic /owners collection
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !resolvedUserEmail) {
      setIsDynamicOwner(false);
      return;
    }
    if (isBootstrappedOwnerEmail(resolvedUserEmail)) {
      setIsDynamicOwner(true);
      return;
    }

    const ownerDocId = emailToOwnerDocId(resolvedUserEmail);
    const unsub = onSnapshot(
      doc(db, 'owners', ownerDocId),
      (snap) => {
        setIsDynamicOwner(snap.exists());
      },
      () => {
        setIsDynamicOwner(false);
      }
    );
    return () => unsub();
  }, [authReady, user, resolvedUserEmail]);

  // Listen to full /owners list when signed in as an owner
  useEffect(() => {
    if (!authReady || !isOwner) {
      setOwnersList([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'owners'),
      (snap) => {
        setOwnersList(snap.docs.map((d) => d.data() as OwnerAccount));
      },
      (err) => {
        if (auth.currentUser) {
          handleFirestoreError(err, OperationType.LIST, 'owners');
        }
      }
    );
    return () => unsub();
  }, [authReady, isOwner]);

  // Listen to public Settings in Firestore
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'store');
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as BakerySettings;
          setSettings({
            ...DEFAULT_BAKERY_SETTINGS,
            ...data,
            taxPercent: data.taxPercent ?? DEFAULT_BAKERY_SETTINGS.taxPercent,
            festivalBanner: data.festivalBanner ?? DEFAULT_BAKERY_SETTINGS.festivalBanner,
            promoCodes: data.promoCodes ?? DEFAULT_BAKERY_SETTINGS.promoCodes,
            upiId: data.upiId ?? '',
          });
        }
      },
      (err) => {
        console.error('Settings sync error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Listen to public Menu Products in Firestore
  useEffect(() => {
    const productsRef = collection(db, 'products');
    const unsub = onSnapshot(
      productsRef,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as Product);
          setProducts(list);
        }
      },
      (err) => {
        console.error('Products sync error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Listen to public Customer Reviews in Firestore
  useEffect(() => {
    const reviewsRef = collection(db, 'reviews');
    const unsub = onSnapshot(
      reviewsRef,
      (snap) => {
        setReviews(snap.docs.map((d) => d.data() as ProductReview));
      },
      (err) => {
        console.error('Reviews sync error:', err);
      }
    );
    return () => unsub();
  }, []);

  // Auto-seed initial defaults to Firestore when Owner signs in if empty
  useEffect(() => {
    if (!authReady || !isOwner || !isOnline) return;

    let cancelled = false;
    let retryTimer: number | undefined;

    const seedIfNeeded = async (retried = false) => {
      try {
        const batch = writeBatch(db);
        const settingsRef = doc(db, 'settings', 'store');
        const settingsSnap = await getDoc(settingsRef);
        let needsCommit = false;
        if (!settingsSnap.exists()) {
          batch.set(settingsRef, {
            ...DEFAULT_BAKERY_SETTINGS,
            updatedAt: serverTimestamp(),
          });
          needsCommit = true;
        }
        const prodSnap = await getDocs(collection(db, 'products'));
        if (prodSnap.empty) {
          for (const item of DEFAULT_BAKERY_PRODUCTS) {
            batch.set(doc(db, 'products', item.id), {
              ...item,
              updatedAt: serverTimestamp(),
            });
          }
          needsCommit = true;
        }
        if (needsCommit && !cancelled) {
          await batch.commit();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (
          !retried &&
          !cancelled &&
          (message.includes('offline') || message.includes('unavailable'))
        ) {
          retryTimer = window.setTimeout(() => {
            void seedIfNeeded(true);
          }, 3000);
          return;
        }
        if (message.includes('offline') || message.includes('unavailable')) {
          console.warn('Initial seed deferred while Firestore reconnects.');
          return;
        }
        console.error('Initial seed skipped/error:', err);
      }
    };

    void seedIfNeeded();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [authReady, isOwner, isOnline]);

  // Listen to Customer Profile & Orders when signed in
  useEffect(() => {
    if (!authReady || !user) {
      setOrders([]);
      setCustomerProfile(null);
      setActiveOrderId('');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setCustomerProfile(snap.data() as CustomerProfile);
        }
      },
      (err) => {
        if (auth.currentUser) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }
    );

    const ordersQuery = isOwner
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'orders'), where('customerId', '==', user.uid));

    const getOrderCreatedMs = (data: Record<string, unknown>): number => {
      const ts = data.createdAt;
      if (ts instanceof Timestamp) return ts.toMillis();
      if (
        ts &&
        typeof ts === 'object' &&
        'toMillis' in ts &&
        typeof (ts as { toMillis?: unknown }).toMillis === 'function'
      ) {
        return (ts as { toMillis: () => number }).toMillis();
      }
      return 0;
    };

    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const sortedDocs = [...snap.docs].sort(
          (a, b) =>
            getOrderCreatedMs(b.data() as Record<string, unknown>) -
            getOrderCreatedMs(a.data() as Record<string, unknown>)
        );
        const list = sortedDocs.map((d) => d.data() as Order);
        setOrders(list);
        if (list.length > 0) {
          setActiveOrderId((curr) => (curr && list.some((o) => o.id === curr) ? curr : list[0].id));
        } else {
          setActiveOrderId('');
        }
      },
      (err) => {
        if (auth.currentUser) {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        }
      }
    );

    return () => {
      unsubProfile();
      unsubOrders();
    };
  }, [authReady, user, isOwner]);

  const reviewsByProduct = useMemo(() => {
    const map: Record<string, ProductReview[]> = {};
    for (const rev of reviews) {
      if (!map[rev.productId]) map[rev.productId] = [];
      map[rev.productId].push(rev);
    }
    return map;
  }, [reviews]);

  const getProductRatingStats = (product: Product) => {
    const prodReviews = reviewsByProduct[product.id] ?? [];
    if (prodReviews.length === 0) {
      return {
        ratingValue: product.rating ?? 4.8,
        reviewCount: product.reviewCount ?? 12,
      };
    }
    const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
    return { ratingValue: avg, reviewCount: prodReviews.length };
  };

  const filteredProducts = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const normalized = normalizeCategory(product.category);
      const matchesCategory =
        selectedCategory === 'All' || normalized === selectedCategory;
      const matchesDietary =
        dietaryFilter === 'All' ||
        (dietaryFilter === 'Pure Veg'
          ? (product.vegType ?? 'veg') === 'veg'
          : product.dietary.includes(dietaryFilter));
      const matchesSearch =
        queryText === '' ||
        product.name.toLowerCase().includes(queryText) ||
        normalized.toLowerCase().includes(queryText) ||
        product.shortDescription.toLowerCase().includes(queryText) ||
        product.ingredients.some((ing) => ing.toLowerCase().includes(queryText));
      return matchesCategory && matchesDietary && matchesSearch;
    });
  }, [products, selectedCategory, dietaryFilter, searchQuery]);

  const bestSellers = useMemo(() => {
    const marked = products.filter((p) => p.isBestSeller);
    return (marked.length > 0 ? marked : products).slice(0, 3);
  }, [products]);

  const todaysSpecials = useMemo(() => {
    const marked = products.filter((p) => p.isTodaysSpecial);
    return (marked.length > 0 ? marked : products.slice(3, 6)).slice(0, 3);
  }, [products]);

  const recommendedProducts = useMemo(() => {
    const marked = products.filter((p) => p.isRecommended);
    return (marked.length > 0 ? marked : products).slice(0, 3);
  }, [products]);

  const wishlistedProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds]
  );

  const activeProduct = useMemo(
    () => (activeProductId ? products.find((p) => p.id === activeProductId) ?? null : null),
    [products, activeProductId]
  );

  const showToast = (message: string, showCartAction = false) => {
    setToastInfo({ message, showCartAction });
    window.setTimeout(() => {
      setToastInfo((curr) => (curr?.message === message ? null : curr));
    }, 2800);
  };

  const bagCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const bagSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const activeOrdersCount = orders.filter((o) => o.stage !== 'delivered').length;
  const deliveryZone = resolveDeliveryZone(postalCode, settings);
  const activeSlot =
    settings.deliverySlots.find((s) => s.id === selectedSlotId) ??
    settings.deliverySlots[0] ??
    DEFAULT_BAKERY_SETTINGS.deliverySlots[0];
  const latestOrder = orders.find((o) => o.id === activeOrderId) ?? orders[0];

  const handleTabSwitch = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategoryShortcut = (cat: BakeryCategory) => {
    setSelectedCategory(cat);
    if (activeTab === 'home') {
      const el = document.getElementById('menu');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddToCart = (
    product: Product,
    optionId: string,
    quantity: number,
    customizationSummary?: string
  ) => {
    if (!product.inStock) return;
    const option = product.options.find((o) => o.id === optionId) ?? product.options[0];
    const cartItemId = customizationSummary
      ? `${product.id}::${option.id}::${customizationSummary}`
      : `${product.id}::${option.id}`;
    const unitPrice = product.price + option.priceDelta;

    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const nextItem: CartItem = {
        cartItemId,
        productId: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        optionId: option.id,
        optionLabel: option.label,
        unitPrice,
        quantity,
      };
      if (customizationSummary) {
        nextItem.customizationSummary = customizationSummary;
      }
      return [...prev, nextItem];
    });

    setJustAddedId(product.id);
    showToast(`Added ${product.name} to cart`, true);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  const handleQuickAdd = (product: Product) => {
    const defaultOption = product.options[0];
    if (defaultOption) {
      handleAddToCart(product, defaultOption.id, 1);
    }
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const handleToggleWishlist = async (productId: string) => {
    const exists = wishlistIds.includes(productId);
    const updated = exists
      ? wishlistIds.filter((id) => id !== productId)
      : [...wishlistIds, productId].slice(0, 50);

    setGuestWishlist(updated);
    const canSyncCustomerDoc =
      user &&
      (user.emailVerified ||
        user.providerData.some((provider) => provider.providerId === 'google.com'));
    if (canSyncCustomerDoc) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            email: resolvedUserEmail,
            fullName: customerProfile?.fullName || user.displayName || 'Customer',
            wishlist: updated,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    }
  };

  const handleSaveAddress = async (addr: Omit<SavedAddress, 'id'>) => {
    if (!user) return;
    const currentList = customerProfile?.savedAddresses ?? [];
    const newAddr: SavedAddress = {
      ...addr,
      id: `addr-${Date.now()}`,
    };
    const deduplicated = currentList.filter(
      (a) =>
        a.streetAddress.trim().toLowerCase() !== addr.streetAddress.trim().toLowerCase()
    );
    const updatedAddresses = [newAddr, ...deduplicated].slice(0, 10);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: resolvedUserEmail,
          fullName: customerProfile?.fullName || addr.fullName || user.displayName || 'Customer',
          savedAddresses: updatedAddresses,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user || !customerProfile?.savedAddresses) return;
    const updatedAddresses = customerProfile.savedAddresses.filter((a) => a.id !== addressId);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: resolvedUserEmail,
          fullName: customerProfile.fullName || user.displayName || 'Customer',
          savedAddresses: updatedAddresses,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSubmitReview = async (productId: string, rating: number, comment: string) => {
    if (!user) return;
    const reviewId = `rev-${Date.now()}-${Math.floor(Math.random() * 999)}`;
    try {
      await setDoc(doc(db, 'reviews', reviewId), {
        id: reviewId,
        productId,
        authorId: user.uid,
        authorName: user.displayName || customerProfile?.fullName || 'Customer',
        rating,
        comment,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
    }
  };

  const handlePlaceOrder = async (
    orderInput: Omit<Order, 'customerId' | 'customerEmail'>
  ) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const orderPayload: Record<string, unknown> = {
      ...orderInput,
      customerId: user.uid,
      customerEmail: resolvedUserEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (!orderInput.discount) delete orderPayload.discount;
    if (!orderInput.promoCode) delete orderPayload.promoCode;
    if (!orderInput.tax) delete orderPayload.tax;
    if (!orderInput.note) delete orderPayload.note;
    if (!orderInput.upiReference) delete orderPayload.upiReference;

    try {
      await setDoc(doc(db, 'orders', orderInput.id), orderPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderInput.id}`);
    }

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: resolvedUserEmail,
          fullName: orderInput.customer.fullName,
          phone: orderInput.customer.phone,
          streetAddress: orderInput.customer.streetAddress,
          apartment: orderInput.customer.apartment,
          postalCode: orderInput.customer.postalCode,
          instructions: orderInput.customer.instructions,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }

    setActiveOrderId(orderInput.id);
    setCart([]);
    setIsBagOpen(false);
    setActiveTab('orders');
    setIsTrackerOpen(true);
  };

  const handleAdvanceOrderStage = async (orderId: string) => {
    if (!isOwner) return;
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const currentIndex = STAGE_SEQUENCE.indexOf(target.stage);
    const nextStage =
      STAGE_SEQUENCE[Math.min(STAGE_SEQUENCE.length - 1, currentIndex + 1)];
    const courierName =
      nextStage === 'out_for_delivery' || nextStage === 'delivered'
        ? 'Imran S. (Delivery Rider #02)'
        : target.courierName;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        stage: nextStage,
        courierName,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleUpdatePaymentStatus = async (
    orderId: string,
    paymentStatus: PaymentStatus
  ) => {
    if (!isOwner) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleReorder = (order: Order) => {
    const validItems: CartItem[] = [];
    let skippedCount = 0;

    for (const item of order.items) {
      const liveProd = products.find((p) => p.id === item.productId);
      if (!liveProd || !liveProd.inStock) {
        skippedCount += 1;
        continue;
      }
      const matchedOpt = liveProd.options.find((o) => o.id === item.optionId) ?? liveProd.options[0];
      validItems.push({
        ...item,
        image: liveProd.image,
        name: liveProd.name,
        unitPrice: liveProd.price + (matchedOpt?.priceDelta ?? 0),
      });
    }

    if (validItems.length === 0) {
      showToast('Items from that order are currently sold out.');
      return;
    }

    setCart(validItems);
    setIsBagOpen(true);
    if (skippedCount > 0) {
      showToast(`Loaded ${validItems.length} items (${skippedCount} currently unavailable).`);
    }
  };

  const handleSaveProduct = async (savedProduct: Product) => {
    try {
      await setDoc(doc(db, 'products', savedProduct.id), {
        ...savedProduct,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${savedProduct.id}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  };

  const handleToggleStock = async (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    try {
      await updateDoc(doc(db, 'products', productId), {
        inStock: !prod.inStock,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const handleUpdateSettings = async (updatedSettings: BakerySettings) => {
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        ...updatedSettings,
        upiId: (updatedSettings.upiId ?? '').trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/store');
    }
  };

  const handleResetDefaults = async () => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'store'), {
        ...DEFAULT_BAKERY_SETTINGS,
        updatedAt: serverTimestamp(),
      });
      for (const item of DEFAULT_BAKERY_PRODUCTS) {
        batch.set(doc(db, 'products', item.id), {
          ...item,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products/defaults');
    }
  };

  const handleAddOwner = async (emailInput: string, labelInput?: string) => {
    if (!isOwner) return;
    const normalizedEmail = emailInput.trim().toLowerCase();
    const id = emailToOwnerDocId(normalizedEmail);
    const payload: Record<string, unknown> = {
      id,
      email: normalizedEmail,
      addedBy: resolvedUserEmail,
      createdAt: serverTimestamp(),
    };
    if (labelInput?.trim()) {
      payload.label = labelInput.trim();
    }
    try {
      await setDoc(doc(db, 'owners', id), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `owners/${id}`);
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    if (!isOwner) return;
    try {
      await deleteDoc(doc(db, 'owners', ownerId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `owners/${ownerId}`);
    }
  };

  const handleAddAddressSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newAddrStreet.trim() || !newAddrPin.trim()) return;
    await handleSaveAddress({
      label: newAddrLabel.trim() || 'Home',
      fullName: newAddrName.trim() || user.displayName || 'Customer',
      phone: newAddrPhone.trim() || settings.phone,
      streetAddress: newAddrStreet.trim(),
      apartment: newAddrApt.trim(),
      postalCode: newAddrPin.trim(),
      instructions: '',
    });
    setNewAddrStreet('');
    setNewAddrApt('');
    setShowNewAddressForm(false);
  };

  const renderProductGrid = (list: Product[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
      {list.map((product) => {
        const stats = getProductRatingStats(product);
        return (
          <ProductCard
            key={product.id}
            product={product}
            currency={settings.currency}
            isWishlisted={wishlistIds.includes(product.id)}
            isJustAdded={justAddedId === product.id}
            ratingValue={stats.ratingValue}
            reviewCount={stats.reviewCount}
            onOpenProduct={(prod) => setActiveProductId(prod.id)}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={(id) => void handleToggleWishlist(id)}
          />
        );
      })}
    </div>
  );

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FAF5EE] text-[#3B2314] pb-16 md:pb-0">
      {/* Slim Festival / Offer Banner */}
      {settings.festivalBanner?.active && !bannerDismissed && (
        <div className="bg-[#3B2314] text-white px-4 h-9 sm:h-10 flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Tag className="w-3.5 h-3.5 text-[#FDBA74] shrink-0" />
            <span className="font-semibold text-[#FDBA74] shrink-0">
              {settings.festivalBanner.campaignName}
            </span>
            <span className="hidden sm:inline text-white/60">·</span>
            <span className="truncate text-white/95">{settings.festivalBanner.headline}</span>
          </div>

          {settings.festivalBanner.promoCode && (
            <button
              type="button"
              onClick={() => {
                setAppliedPromoCode(settings.festivalBanner.promoCode);
                setIsBagOpen(true);
              }}
              className="px-2.5 py-0.5 rounded-md bg-[#C45512] hover:bg-[#A9450C] text-white font-mono-tabular font-medium shrink-0 cursor-pointer"
            >
              Use {settings.festivalBanner.promoCode}
            </button>
          )}

          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss offer banner"
            className="p-1 text-white/70 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Header
        bakeryName={settings.bakeryName}
        neighborhood={deliveryZone.neighborhood}
        bagCount={bagCount}
        activeTab={activeTab}
        user={user}
        isOwner={isOwner}
        onSelectTab={handleTabSwitch}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenOwnerStudio={() => setIsOwnerStudioOpen(true)}
      />

      <main className="flex-1">
        {/* TAB 1: HOME SCREEN */}
        {activeTab === 'home' && (
          <>
            {/* Delivery Location Bar & Search Input */}
            <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="p-3 sm:p-4 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Location Selector */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#C45512]/10 text-[#C45512] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#6D4C3D] font-medium">
                        Delivering to ({deliveryZone.etaMinutes})
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[#3B2314]">
                        {deliveryZone.neighborhood}
                      </span>
                    </div>
                  </div>
                  <select
                    aria-label="Select delivery location pin code"
                    value={
                      settings.deliveryZones.some((z) =>
                        postalCode.startsWith(z.postalPrefix)
                      )
                        ? settings.deliveryZones.find((z) =>
                            postalCode.startsWith(z.postalPrefix)
                          )?.postalPrefix
                        : postalCode
                    }
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono-tabular bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl text-[#3B2314] focus:outline-none focus:border-[#C45512]"
                  >
                    {settings.deliveryZones.map((zone) => (
                      <option key={zone.postalPrefix} value={zone.postalPrefix}>
                        {zone.postalPrefix} · {zone.neighborhood}
                      </option>
                    ))}
                    {!settings.deliveryZones.some((z) =>
                      postalCode.startsWith(z.postalPrefix)
                    ) && (
                      <option value={postalCode}>
                        {postalCode} · {deliveryZone.neighborhood}
                      </option>
                    )}
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 md:max-w-md">
                  <Search className="w-4 h-4 text-[#6D4C3D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cakes, snacks, sweets..."
                    aria-label="Search cakes, snacks, sweets"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl text-[#3B2314] placeholder:text-[#8D7262] focus:outline-none focus:border-[#C45512]"
                  />
                </div>
              </div>
            </section>

            {/* Hero & Promotional Banner */}
            <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 lg:pt-8 lg:pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-3.5">
                      <img
                        src={BAKERY_LOGO_URL}
                        alt="IBC Indian Bakery & Cafe"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-[#D6C9B8] shadow-xs shrink-0"
                      />
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-[#C45512]">
                          INDIAN BAKERY &amp; CAFE · WIDDI CENTRE
                        </p>
                        <p className="text-xs text-[#3B2314] font-medium mt-0.5">
                          {settings.address}
                        </p>
                        <p className="text-xs text-[#6D4C3D] mt-0.5 font-mono-tabular">
                          Call:{' '}
                          <a
                            href={`tel:${settings.phone}`}
                            className="hover:text-[#C45512] underline underline-offset-2"
                          >
                            {settings.phone}
                          </a>
                          {settings.secondaryPhone && (
                            <>
                              {' · '}
                              <a
                                href={`tel:${settings.secondaryPhone}`}
                                className="hover:text-[#C45512] underline underline-offset-2"
                              >
                                {settings.secondaryPhone}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.08] font-semibold tracking-tight text-[#3B2314] text-balance">
                      Warm Indian bakery classics, custom cakes &amp; Irani chai at your doorstep.
                    </h1>

                    <p className="mt-3.5 text-[15px] sm:text-base leading-relaxed text-[#6D4C3D] max-w-[54ch]">
                      Celebration cakes baked to order, crisp masala puffs, Hyderabadi Osmania biscuits, pure ghee sweets, and piping-hot Irani chai—crafted fresh every morning in Mangalagiri.
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-[#E6DDD1] flex flex-wrap items-center gap-3">
                    <a
                      href="#menu"
                      className="inline-flex items-center gap-2 px-5 py-3 bg-[#C45512] hover:bg-[#A9450C] text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
                    >
                      <span>Order Fresh Today</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleSelectCategoryShortcut('Cakes')}
                      className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#3B2314] bg-[#FFFDF9] border border-[#D6C9B8] hover:border-[#C45512] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 text-[#C45512]" />
                      <span>Custom Cakes</span>
                    </button>

                    <PWAInstallButton />
                  </div>
                </div>

                {/* Promotional Showcase Image Card */}
                <div className="lg:col-span-6">
                  <div className="relative w-full h-full min-h-[260px] aspect-[4/3] overflow-hidden rounded-2xl bg-[#EAE0D2] border border-[#E6DDD1] shadow-sm">
                    <ResilientImage
                      src={HERO_IMAGE}
                      alt="Freshly baked celebration cakes, Indian sweets, puffs, and bakery loaves"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-[#2A180D]/85 via-[#2A180D]/45 to-transparent text-white flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FDBA74]">
                          Today&apos;s Bakery Offer
                        </p>
                        <p className="text-sm sm:text-base font-display font-semibold">
                          Free Home Delivery above {formatMoney(settings.freeDeliveryThreshold, settings.currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromoCode(settings.festivalBanner.promoCode || 'FESTIVE15');
                          setIsBagOpen(true);
                        }}
                        className="px-3.5 py-2 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl cursor-pointer shrink-0"
                      >
                        Claim Offer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Slot & Order Status Strip */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-[#E6DDD1]">
                <div className="p-4 flex flex-col justify-between gap-2">
                  <span className="text-xs font-medium text-[#6D4C3D] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C45512]" />
                    <span>Scheduled Delivery Window</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {settings.deliverySlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`px-2.5 py-1 text-xs font-mono-tabular rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          slot.id === activeSlot.id
                            ? 'border-[#C45512] bg-[#C45512] text-white'
                            : 'border-[#E6DDD1] bg-[#FAF5EE] text-[#6D4C3D] hover:border-[#CBBBA7]'
                        }`}
                      >
                        {slot.window.split(' – ')[0]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6D4C3D]">
                    {deliveryDay}: {activeSlot.label} · {activeSlot.spotsRemaining} spots left
                  </p>
                </div>

                <div className="p-4 flex flex-col justify-between gap-1.5">
                  <span className="text-xs font-medium text-[#6D4C3D]">Accepted Payments</span>
                  <p className="text-sm font-semibold text-[#3B2314]">
                    UPI · GPay · PhonePe · Cards · COD
                  </p>
                  <p className="text-xs text-[#6D4C3D]">
                    {formatMoney(settings.deliveryFee, settings.currency)} local delivery · Free over{' '}
                    {formatMoney(settings.freeDeliveryThreshold, settings.currency)}
                  </p>
                </div>

                <div className="p-4 flex flex-col justify-between gap-1.5">
                  <span className="text-xs font-medium text-[#6D4C3D]">Real-Time Order Tracking</span>
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('orders')}
                    className="text-left group cursor-pointer"
                  >
                    {latestOrder ? (
                      <>
                        <p className="text-sm font-semibold text-[#3B2314] group-hover:text-[#C45512] transition-colors">
                          Order <span className="font-mono-tabular">#{latestOrder.id}</span>
                        </p>
                        <p className="text-xs text-[#C45512] underline underline-offset-2 mt-0.5">
                          View live kitchen &amp; rider status
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-[#3B2314] group-hover:text-[#C45512] transition-colors">
                          5-Step Live Status
                        </p>
                        <p className="text-xs text-[#C45512] underline underline-offset-2 mt-0.5">
                          {user ? 'Open live order tracker' : 'Sign in to track orders'}
                        </p>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* 8 Bakery Categories Grid */}
            <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-10">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3B2314] tracking-tight">
                    Browse by Category
                  </h2>
                  <p className="text-sm text-[#6D4C3D] mt-1">
                    Eight freshly stocked bakery departments crafted every day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('categories')}
                  className="text-xs font-semibold text-[#C45512] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                >
                  View All 8
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5">
                {CATEGORY_DETAILS.map((cat) => {
                  const isActive = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleSelectCategoryShortcut(cat.name)}
                      className={`group text-left bg-[#FFFDF9] border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer ${
                        isActive
                          ? 'border-[#C45512] ring-2 ring-[#C45512]/20'
                          : 'border-[#E6DDD1] hover:border-[#CBBBA7]'
                      }`}
                    >
                      <div className="aspect-[16/10] w-full overflow-hidden bg-[#F3EBDF]">
                        <ResilientImage
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3 sm:p-3.5">
                        <p className="text-sm font-semibold text-[#3B2314] truncate">{cat.name}</p>
                        <p className="text-[11px] text-[#6D4C3D] truncate mt-0.5">{cat.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Show Filtered Results immediately if user typed search or picked category */}
            {(searchQuery.trim() !== '' || selectedCategory !== 'All' || dietaryFilter !== 'All') ? null : (
              <>
                {/* Best Sellers Section */}
                <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 border-t border-[#E6DDD1]">
                  <div className="flex items-end justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3B2314] tracking-tight">
                        Best Sellers
                      </h2>
                      <p className="text-sm text-[#6D4C3D] mt-1">
                        Most ordered favourites across Mangalagiri &amp; Tadepalli.
                      </p>
                    </div>
                  </div>
                  {renderProductGrid(bestSellers)}
                </section>

                {/* Today's Special Section */}
                <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 border-t border-[#E6DDD1]">
                  <div className="flex items-end justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3B2314] tracking-tight">
                        Today&apos;s Special
                      </h2>
                      <p className="text-sm text-[#6D4C3D] mt-1">
                        Chef-picked seasonal highlights straight from the deck ovens.
                      </p>
                    </div>
                  </div>
                  {renderProductGrid(todaysSpecials)}
                </section>

                {/* Recommended Section */}
                <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 border-t border-[#E6DDD1]">
                  <div className="flex items-end justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3B2314] tracking-tight">
                        Recommended for You
                      </h2>
                      <p className="text-sm text-[#6D4C3D] mt-1">
                        Pair warm pastries and sweets with Irani chai for family evenings.
                      </p>
                    </div>
                  </div>
                  {renderProductGrid(recommendedProducts)}
                </section>
              </>
            )}

            {/* Complete Daily Menu with Interactive Category & Dietary Filter */}
            <section
              id="menu"
              className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 border-t border-[#E6DDD1]"
            >
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#3B2314] tracking-tight">
                    Full Bakery Menu
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6D4C3D] max-w-xl">
                    Tap any cake or item for sizes, cake messages, ingredients, and customer reviews.
                  </p>
                </div>

                {/* Dietary Segmented Filter */}
                <div className="inline-flex items-center p-1 rounded-xl bg-[#EAE0D2] border border-[#E6DDD1] self-start">
                  {DIETARY_FILTERS.map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setDietaryFilter(diet)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        dietaryFilter === diet
                          ? 'bg-[#FFFDF9] text-[#3B2314] shadow-xs'
                          : 'text-[#6D4C3D] hover:text-[#3B2314]'
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter Bar */}
              <div className="mt-5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {CATEGORIES_FILTER.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#C45512] border-[#C45512] text-white'
                          : 'bg-[#FFFDF9] border-[#E6DDD1] text-[#6D4C3D] hover:border-[#CBBBA7] hover:text-[#3B2314]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="mt-8 py-12 px-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl text-center">
                  <p className="font-display text-lg font-semibold text-[#3B2314]">
                    No bakery items match your current search or filter
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setDietaryFilter('All');
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 bg-[#C45512] text-white text-xs font-medium rounded-xl hover:bg-[#A9450C] cursor-pointer"
                  >
                    Show All Items
                  </button>
                </div>
              ) : (
                <div className="mt-6">{renderProductGrid(filteredProducts)}</div>
              )}
            </section>
          </>
        )}

        {/* TAB 2: CATEGORIES DIRECTORY */}
        {activeTab === 'categories' && (
          <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
            <div>
              <h1 className="font-display text-3xl font-semibold text-[#3B2314]">
                Bakery Categories
              </h1>
              <p className="text-sm text-[#6D4C3D] mt-1">
                Select a category below to explore fresh bakes, snacks, sweets, and beverages.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {CATEGORY_DETAILS.map((cat) => {
                const count = products.filter(
                  (p) => normalizeCategory(p.category) === cat.name
                ).length;
                const active = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(active ? 'All' : cat.name)
                    }
                    className={`group text-left bg-[#FFFDF9] border rounded-2xl overflow-hidden transition-all cursor-pointer ${
                      active
                        ? 'border-[#C45512] ring-2 ring-[#C45512]/20'
                        : 'border-[#E6DDD1] hover:border-[#CBBBA7]'
                    }`}
                  >
                    <div className="aspect-[16/10] bg-[#F3EBDF] overflow-hidden">
                      <ResilientImage
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3.5">
                      <p className="text-sm font-semibold text-[#3B2314]">{cat.name}</p>
                      <p className="text-xs text-[#6D4C3D] mt-0.5 font-mono-tabular">
                        {count} {count === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#E6DDD1] space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-[#3B2314]">
                  {selectedCategory === 'All' ? 'All Bakery Items' : selectedCategory}
                </h2>
                {selectedCategory !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    className="text-xs font-medium text-[#C45512] hover:underline cursor-pointer"
                  >
                    Show All Categories
                  </button>
                )}
              </div>
              {renderProductGrid(
                products.filter(
                  (p) =>
                    selectedCategory === 'All' ||
                    normalizeCategory(p.category) === selectedCategory
                )
              )}
            </div>
          </section>
        )}

        {/* TAB 3: SEARCH SCREEN */}
        {activeTab === 'search' && (
          <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div>
              <h1 className="font-display text-3xl font-semibold text-[#3B2314]">
                Search Our Bakery
              </h1>
              <p className="text-sm text-[#6D4C3D] mt-1">
                Find celebration cakes, savoury puffs, Osmania biscuits, sweets, or chai combos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#6D4C3D] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cakes, snacks, sweets..."
                  aria-label="Search cakes, snacks, sweets"
                  className="w-full pl-11 pr-4 py-3 text-sm bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl text-[#3B2314] focus:outline-none focus:border-[#C45512]"
                />
              </div>

              <div className="inline-flex items-center p-1 rounded-xl bg-[#EAE0D2] border border-[#E6DDD1] self-start">
                {DIETARY_FILTERS.map((diet) => (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => setDietaryFilter(diet)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      dietaryFilter === diet
                        ? 'bg-[#FFFDF9] text-[#3B2314] shadow-xs'
                        : 'text-[#6D4C3D]'
                    }`}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Searches */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#6D4C3D]">Popular:</span>
              {QUICK_SEARCH_TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="px-3 py-1.5 text-xs bg-[#FFFDF9] border border-[#E6DDD1] hover:border-[#C45512] rounded-xl text-[#3B2314] cursor-pointer"
                >
                  {term}
                </button>
              ))}
              {(searchQuery || dietaryFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDietaryFilter('All');
                    setSelectedCategory('All');
                  }}
                  className="px-3 py-1.5 text-xs text-[#C45512] font-medium hover:underline cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-12 px-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl text-center">
                <p className="font-display text-lg font-semibold text-[#3B2314]">
                  No matches for &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-xs text-[#6D4C3D] mt-1">
                  Try searching for cake, puff, cookies, jamun, or bread.
                </p>
              </div>
            ) : (
              renderProductGrid(filteredProducts)
            )}
          </section>
        )}

        {/* TAB 4: ORDERS & LIVE TRACKING SCREEN */}
        {activeTab === 'orders' && (
          <section className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div>
              <h1 className="font-display text-3xl font-semibold text-[#3B2314]">
                Orders &amp; Live Tracking
              </h1>
              <p className="text-sm text-[#6D4C3D] mt-1">
                Real-time updates from Order Placed → Preparing Your Order → Ready for Delivery → Out for Delivery → Delivered.
              </p>
            </div>

            <OrderTrackerContent
              user={user}
              isOwner={isOwner}
              currency={settings.currency}
              orders={orders}
              activeOrderId={activeOrderId}
              onSelectOrder={setActiveOrderId}
              onAdvanceStage={handleAdvanceOrderStage}
              onReorder={handleReorder}
              onRequestSignIn={() => {
                setAuthInitialMode('customer');
                setIsAuthModalOpen(true);
              }}
            />
          </section>
        )}

        {/* TAB 5: PROFILE, WISHLIST, ADDRESSES & OWNER ACCESS */}
        {activeTab === 'profile' && (
          <section className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* Account Header Card */}
            <div className="p-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F3EBDF] border border-[#E6DDD1] flex items-center justify-center text-[#C45512] shrink-0">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#C45512]">
                    {user ? (isOwner ? 'Verified Bakery Owner' : 'Valued Customer') : 'Guest Shopper'}
                  </p>
                  <h1 className="font-display text-2xl font-semibold text-[#3B2314]">
                    {user ? user.displayName || 'Account Holder' : 'Sign in to Your Account'}
                  </h1>
                  <p className="text-xs text-[#6D4C3D] font-mono-tabular">
                    {resolvedUserEmail || 'Save addresses, favourites & reorder in 1 tap'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {user ? (
                  <>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setIsOwnerStudioOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Open Owner Studio</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthInitialMode('customer');
                        setIsAuthModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-[#F3EBDF] hover:bg-[#E6DDD1] text-[#3B2314] rounded-xl cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Account / Switch</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthInitialMode('customer');
                        setIsAuthModalOpen(true);
                      }}
                      className="px-4 py-2.5 text-xs font-medium bg-[#3B2314] hover:bg-[#52321E] text-white rounded-xl cursor-pointer"
                    >
                      Customer Login / Register
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthInitialMode('owner');
                        setIsAuthModalOpen(true);
                      }}
                      className="px-4 py-2.5 text-xs font-medium border border-[#D6C9B8] bg-[#FFFDF9] hover:border-[#C45512] text-[#3B2314] rounded-xl cursor-pointer"
                    >
                      Owner Login
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Wishlist / Favourites */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-[#3B2314] flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#C45512] fill-[#C45512]" />
                  <span>Wishlist &amp; Favourites ({wishlistedProducts.length})</span>
                </h2>
              </div>

              {wishlistedProducts.length === 0 ? (
                <div className="p-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl text-sm text-[#6D4C3D]">
                  Tap the heart icon on any cake, sweet box, or savoury pack to save it here for quick ordering.
                </div>
              ) : (
                renderProductGrid(wishlistedProducts)
              )}
            </div>

            {/* Saved Delivery Addresses */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold text-[#3B2314]">
                  Saved Delivery Addresses
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setIsAuthModalOpen(true);
                    } else {
                      setShowNewAddressForm((prev) => !prev);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#FFFDF9] border border-[#D6C9B8] hover:border-[#C45512] rounded-xl text-[#3B2314] cursor-pointer"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-[#C45512]" />
                  <span>{showNewAddressForm ? 'Cancel' : 'Add Address'}</span>
                </button>
              </div>

              {showNewAddressForm && user && (
                <form
                  onSubmit={(e) => void handleAddAddressSubmit(e)}
                  className="p-5 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newAddrLabel}
                      onChange={(e) => setNewAddrLabel(e.target.value)}
                      placeholder="Label (Home, Office)"
                      className="px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl"
                    />
                    <input
                      type="text"
                      value={newAddrName}
                      onChange={(e) => setNewAddrName(e.target.value)}
                      placeholder="Recipient Name"
                      className="px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl"
                    />
                    <input
                      type="tel"
                      value={newAddrPhone}
                      onChange={(e) => setNewAddrPhone(e.target.value)}
                      placeholder="Phone number"
                      className="px-3 py-2 text-xs font-mono-tabular bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={newAddrStreet}
                      onChange={(e) => setNewAddrStreet(e.target.value)}
                      placeholder="Street Address / Colony"
                      className="sm:col-span-2 px-3 py-2 text-xs bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl"
                    />
                    <input
                      type="text"
                      required
                      value={newAddrPin}
                      onChange={(e) => setNewAddrPin(e.target.value)}
                      placeholder="Pin Code (522503)"
                      className="px-3 py-2 text-xs font-mono-tabular bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl cursor-pointer"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              {(customerProfile?.savedAddresses?.length ?? 0) === 0 ? (
                <div className="p-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl text-sm text-[#6D4C3D]">
                  {customerProfile?.streetAddress ? (
                    <div>
                      <p className="font-semibold text-[#3B2314]">Primary Checkout Address</p>
                      <p className="text-xs mt-1">
                        {customerProfile.fullName} · {customerProfile.streetAddress} ({customerProfile.postalCode})
                      </p>
                    </div>
                  ) : (
                    'No saved addresses yet. Add one here or check "Save to my address book" at checkout.'
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customerProfile?.savedAddresses?.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl flex items-start justify-between gap-3"
                    >
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-sm text-[#3B2314]">{addr.label}</p>
                        <p className="text-[#6D4C3D]">
                          {addr.fullName} · <span className="font-mono-tabular">{addr.phone}</span>
                        </p>
                        <p className="text-[#3B2314]">
                          {addr.streetAddress}
                          {addr.apartment ? `, ${addr.apartment}` : ''} —{' '}
                          <span className="font-mono-tabular">{addr.postalCode}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAddress(addr.id)}
                        aria-label={`Delete ${addr.label}`}
                        className="p-1.5 text-[#8D7262] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order History & Quick Reorder */}
            {user && orders.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-semibold text-[#3B2314]">
                  Recent Order History
                </h2>
                <div className="space-y-3">
                  {orders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="text-xs space-y-0.5">
                        <p className="font-mono-tabular font-semibold text-sm text-[#3B2314]">
                          #{ord.id} · {formatMoney(ord.total, settings.currency)}
                        </p>
                        <p className="text-[#6D4C3D]">
                          {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveOrderId(ord.id);
                            handleTabSwitch('orders');
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-[#FAF5EE] border border-[#D6C9B8] rounded-xl text-[#3B2314] cursor-pointer"
                        >
                          Track
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(ord)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Install App & Contact Card */}
            <div className="p-5 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-[#3B2314]">
                  {settings.bakeryName}
                </p>
                <p className="text-xs text-[#6D4C3D] mt-0.5">
                  {settings.address} · Call {settings.phone}
                </p>
              </div>
              <PWAInstallButton />
            </div>
          </section>
        )}
      </main>

      {/* Clean Desktop Footer */}
      <footer className="hidden md:block border-t border-[#E6DDD1] bg-[#FFFDF9]">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-[#6D4C3D]">
          <div className="flex items-center gap-3.5">
            <img
              src={BAKERY_LOGO_URL}
              alt="IBC Indian Bakery & Cafe"
              className="w-11 h-11 rounded-full object-cover border border-[#E6DDD1]"
            />
            <div>
              <p className="font-display text-base font-semibold text-[#3B2314]">
                {settings.bakeryName}
              </p>
              <p className="mt-0.5 text-xs">{settings.address}</p>
              <p className="mt-0.5 text-xs font-mono-tabular">
                Call:{' '}
                <a
                  href={`tel:${settings.phone}`}
                  className="hover:text-[#3B2314] underline underline-offset-2"
                >
                  {settings.phone}
                </a>
                {settings.secondaryPhone && (
                  <>
                    {' / '}
                    <a
                      href={`tel:${settings.secondaryPhone}`}
                      className="hover:text-[#3B2314] underline underline-offset-2"
                    >
                      {settings.secondaryPhone}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleTabSwitch('home')}
              className="hover:text-[#3B2314] transition-colors cursor-pointer whitespace-nowrap"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('categories')}
              className="hover:text-[#3B2314] transition-colors cursor-pointer whitespace-nowrap"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('orders')}
              className="hover:text-[#3B2314] transition-colors cursor-pointer whitespace-nowrap"
            >
              Track Orders
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthInitialMode('customer');
                setIsAuthModalOpen(true);
              }}
              className="hover:text-[#3B2314] transition-colors cursor-pointer whitespace-nowrap"
            >
              Customer Login
            </button>
            <button
              type="button"
              onClick={() => {
                if (isOwner) {
                  setIsOwnerStudioOpen(true);
                } else {
                  setAuthInitialMode('owner');
                  setIsAuthModalOpen(true);
                }
              }}
              className="text-[#C45512] hover:underline underline-offset-4 transition-colors cursor-pointer whitespace-nowrap"
            >
              Owner Login
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile 5-Tab Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleTabSwitch}
        activeOrdersCount={activeOrdersCount}
      />

      {/* Mobile Sticky Cart Summary Bar */}
      {bagCount > 0 && !isBagOpen && !activeProduct && !isOwnerStudioOpen && (
        <div className="fixed bottom-[68px] md:bottom-5 left-4 right-4 md:left-auto md:right-6 md:w-80 z-30">
          <button
            type="button"
            onClick={() => setIsBagOpen(true)}
            className="w-full min-h-[48px] px-4 py-2.5 bg-[#3B2314] hover:bg-[#52321E] text-white rounded-xl shadow-lg flex items-center justify-between gap-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 text-left min-w-0">
              <ShoppingBag className="w-4 h-4 text-[#FDBA74] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">
                  {bagCount} {bagCount === 1 ? 'item' : 'items'} in cart
                </p>
                <p className="font-mono-tabular text-[11px] text-[#FDBA74]">
                  {formatMoney(bagSubtotal, settings.currency)} plus taxes
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#C45512] px-3 py-1.5 rounded-lg shrink-0">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      )}

      {/* Action Feedback Toast */}
      {toastInfo && (
        <div
          role="status"
          className="fixed top-16 right-4 z-50 max-w-xs bg-[#3B2314] text-white border border-[#5C3A24] rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3 text-xs"
        >
          <span className="flex-1 leading-snug">{toastInfo.message}</span>
          {toastInfo.showCartAction && (
            <button
              type="button"
              onClick={() => {
                setToastInfo(null);
                setIsBagOpen(true);
              }}
              className="text-[#FDBA74] font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Cart
            </button>
          )}
        </div>
      )}

      {/* Offline Connectivity Banner */}
      {!isOnline && (
        <div
          role="status"
          className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#3B2314] px-3.5 py-2 text-xs font-medium text-white shadow-lg"
        >
          <WifiOff className="w-3.5 h-3.5 text-[#FDBA74]" />
          <span>Offline Mode — Cached menu displayed</span>
        </div>
      )}

      {/* Modals & Drawers */}
      <ProductModal
        product={activeProduct}
        currency={settings.currency}
        user={user}
        isWishlisted={activeProduct ? wishlistIds.includes(activeProduct.id) : false}
        reviews={activeProduct ? reviewsByProduct[activeProduct.id] ?? [] : []}
        onClose={() => setActiveProductId(null)}
        onToggleWishlist={(id) => void handleToggleWishlist(id)}
        onRequestSignIn={() => {
          setAuthInitialMode('customer');
          setIsAuthModalOpen(true);
        }}
        onSubmitReview={handleSubmitReview}
        onAddToCart={handleAddToCart}
      />

      <CartCheckoutDrawer
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        user={user}
        customerProfile={customerProfile}
        items={cart}
        settings={settings}
        appliedPromoCode={appliedPromoCode}
        onApplyPromoCode={setAppliedPromoCode}
        selectedSlotId={selectedSlotId}
        onSelectSlot={setSelectedSlotId}
        deliveryDay={deliveryDay}
        onSelectDeliveryDay={setDeliveryDay}
        postalCode={postalCode}
        onPostalCodeChange={setPostalCode}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onRequestSignIn={() => setIsAuthModalOpen(true)}
        onSaveAddress={handleSaveAddress}
        onPlaceOrder={handlePlaceOrder}
      />

      <OrderTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        user={user}
        isOwner={isOwner}
        currency={settings.currency}
        orders={orders}
        activeOrderId={activeOrderId}
        onSelectOrder={setActiveOrderId}
        onAdvanceStage={handleAdvanceOrderStage}
        onReorder={handleReorder}
        onRequestSignIn={() => setIsAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        isOwner={isOwner}
        initialMode={authInitialMode}
        onOpenOwnerStudio={() => setIsOwnerStudioOpen(true)}
        onOpenOrders={() => {
          setIsAuthModalOpen(false);
          handleTabSwitch('orders');
        }}
      />

      <OwnerStudioModal
        isOpen={isOwnerStudioOpen}
        onClose={() => setIsOwnerStudioOpen(false)}
        isOwner={isOwner}
        onRequestOwnerSignIn={() => {
          setAuthInitialMode('owner');
          setIsAuthModalOpen(true);
        }}
        products={products}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onToggleStock={handleToggleStock}
        onResetDefaults={handleResetDefaults}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        orders={orders}
        onAdvanceOrderStage={handleAdvanceOrderStage}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
        owners={ownersList}
        currentUserEmail={resolvedUserEmail}
        onAddOwner={handleAddOwner}
        onRemoveOwner={handleRemoveOwner}
      />
    </div>
  );
}
