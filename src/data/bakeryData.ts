import heroBakerySpreadImg from '../assets/images/hero_bakery_spread_1794709198735.jpg';
import butterCroissantImg from '../assets/images/product_butter_croissant_1794709199262.jpg';
import cardamomBunImg from '../assets/images/product_cardamom_bun_1794709199070.jpg';
import celebrationCakeImg from '../assets/images/product_celebration_cake_1794713192625.jpg';
import countrySourdoughImg from '../assets/images/product_country_sourdough_1794709198566.jpg';
import figTartImg from '../assets/images/product_fig_tart_1794709200482.jpg';
import gulabSweetsImg from '../assets/images/product_gulab_sweets_1794713194369.jpg';
import masalaSavouriesImg from '../assets/images/product_masala_savouries_1794713194648.jpg';
import morningBoxImg from '../assets/images/product_morning_box_1794709200856.jpg';
import oliveFocacciaImg from '../assets/images/product_olive_focaccia_1794709200870.jpg';
import osmaniaCookiesImg from '../assets/images/product_osmania_cookies_1794713193306.jpg';
import paneerPuffImg from '../assets/images/product_paneer_puff_1794713193173.jpg';
import {
  BakeryCategory,
  BakerySettings,
  CurrencySymbol,
  DeliveryZone,
  Product,
  ProductCategory,
  PromoCodeOffer,
} from '../types/bakery';

export const BAKERY_LOGO_URL =
  '/assets/aistudio/file_00000000637882119de668bf805bc290_937ecd2f.png';

export const HERO_IMAGE = heroBakerySpreadImg;

const LEGACY_IMAGE_MAP: Record<string, string> = {
  '/src/assets/images/hero_bakery_spread_1794709198735.jpg': heroBakerySpreadImg,
  '/src/assets/images/product_butter_croissant_1794709199262.jpg': butterCroissantImg,
  '/src/assets/images/product_cardamom_bun_1794709199070.jpg': cardamomBunImg,
  '/src/assets/images/product_celebration_cake_1794713192625.jpg': celebrationCakeImg,
  '/src/assets/images/product_country_sourdough_1794709198566.jpg': countrySourdoughImg,
  '/src/assets/images/product_fig_tart_1794709200482.jpg': figTartImg,
  '/src/assets/images/product_gulab_sweets_1794713194369.jpg': gulabSweetsImg,
  '/src/assets/images/product_masala_savouries_1794713194648.jpg': masalaSavouriesImg,
  '/src/assets/images/product_morning_box_1794709200856.jpg': morningBoxImg,
  '/src/assets/images/product_olive_focaccia_1794709200870.jpg': oliveFocacciaImg,
  '/src/assets/images/product_osmania_cookies_1794713193306.jpg': osmaniaCookiesImg,
  '/src/assets/images/product_paneer_puff_1794713193173.jpg': paneerPuffImg,
};

export function resolveBakeryImageUrl(src: string): string {
  if (!src) return celebrationCakeImg;
  const trimmed = src.trim();
  if (LEGACY_IMAGE_MAP[trimmed]) {
    return LEGACY_IMAGE_MAP[trimmed];
  }
  const withLeadingSlash = trimmed.startsWith('src/assets/images/') ? `/${trimmed}` : trimmed;
  return LEGACY_IMAGE_MAP[withLeadingSlash] ?? trimmed;
}

export const CORE_BAKERY_CATEGORIES: BakeryCategory[] = [
  'Cakes',
  'Pastries',
  'Breads',
  'Puffs & Rolls',
  'Cookies & Biscuits',
  'Indian Sweets',
  'Savouries',
  'Beverages',
];

export const CATEGORY_DETAILS: {
  name: BakeryCategory;
  subtitle: string;
  image: string;
}[] = [
  {
    name: 'Cakes',
    subtitle: 'Celebration & custom occasion cakes',
    image: celebrationCakeImg,
  },
  {
    name: 'Pastries',
    subtitle: 'Croissants, tarts & layered slices',
    image: butterCroissantImg,
  },
  {
    name: 'Breads',
    subtitle: 'Soft milk loaves, buns & focaccia',
    image: countrySourdoughImg,
  },
  {
    name: 'Puffs & Rolls',
    subtitle: 'Hot oven paneer & masala puffs',
    image: paneerPuffImg,
  },
  {
    name: 'Cookies & Biscuits',
    subtitle: 'Osmania & almond butter biscuits',
    image: osmaniaCookiesImg,
  },
  {
    name: 'Indian Sweets',
    subtitle: 'Ghee gulab jamun, kaju katli & peda',
    image: gulabSweetsImg,
  },
  {
    name: 'Savouries',
    subtitle: 'Khari biscuits, mixture & snacks',
    image: masalaSavouriesImg,
  },
  {
    name: 'Beverages',
    subtitle: 'Irani chai & chilled shakes',
    image: morningBoxImg,
  },
];

export function normalizeCategory(category: ProductCategory): BakeryCategory {
  switch (category) {
    case 'Cakes':
    case 'Cakes & Tarts':
      return 'Cakes';
    case 'Pastries':
    case 'Gift & Morning Boxes':
      return 'Pastries';
    case 'Breads':
    case 'Buns & Loaves':
      return 'Breads';
    case 'Puffs & Rolls':
    case 'Puffs & Pastries':
      return 'Puffs & Rolls';
    case 'Cookies & Biscuits':
      return 'Cookies & Biscuits';
    case 'Indian Sweets':
      return 'Indian Sweets';
    case 'Savouries':
      return 'Savouries';
    case 'Beverages':
    case 'Irani Chai & Cafe':
      return 'Beverages';
    default:
      return 'Pastries';
  }
}

export const PRESET_PRODUCT_IMAGES: { label: string; url: string }[] = [
  {
    label: 'Chocolate Truffle Celebration Cake',
    url: celebrationCakeImg,
  },
  {
    label: 'Golden Paneer Masala Puffs',
    url: paneerPuffImg,
  },
  {
    label: 'Osmania & Butter Cookies Tin',
    url: osmaniaCookiesImg,
  },
  {
    label: 'Kaju Katli & Gulab Jamun Platter',
    url: gulabSweetsImg,
  },
  {
    label: 'Khari, Masala Mixture & Irani Chai',
    url: masalaSavouriesImg,
  },
  {
    label: 'Morning Chai & Bakery Box',
    url: morningBoxImg,
  },
  {
    label: 'Cardamom Braided Buns',
    url: cardamomBunImg,
  },
  {
    label: 'Butter Croissants & Puffs',
    url: butterCroissantImg,
  },
  {
    label: 'Crusty Hearth Loaf',
    url: countrySourdoughImg,
  },
  {
    label: 'Herb & Olive Focaccia',
    url: oliveFocacciaImg,
  },
  {
    label: 'Fig & Pistachio Tart',
    url: figTartImg,
  },
];

export const FESTIVAL_PRESETS: {
  campaignName: string;
  headline: string;
  promoCode: string;
  offer: PromoCodeOffer;
}[] = [
  {
    campaignName: 'IBC Festive Bake Days',
    headline: '15% OFF cakes, sweets & bakery boxes above ₹299',
    promoCode: 'FESTIVE15',
    offer: {
      id: 'festive-15',
      code: 'FESTIVE15',
      title: 'Festive Bake Days · 15% Off',
      discountType: 'percent',
      value: 15,
      minOrder: 299,
      active: true,
    },
  },
  {
    campaignName: 'Mangalagiri Weekend Special',
    headline: 'Flat ₹50 OFF on celebration cakes & pastries above ₹349',
    promoCode: 'IBC50',
    offer: {
      id: 'ibc-50',
      code: 'IBC50',
      title: 'Weekend Flat ₹50 Off',
      discountType: 'flat',
      value: 50,
      minOrder: 349,
      active: true,
    },
  },
  {
    campaignName: 'Irani Chai Happy Hours',
    headline: '10% Instant Discount on evening puffs & snacks above ₹199',
    promoCode: 'CHAI10',
    offer: {
      id: 'chai-10',
      code: 'CHAI10',
      title: 'Irani Chai 10% Off',
      discountType: 'percent',
      value: 10,
      minOrder: 199,
      active: true,
    },
  },
];

export const DEFAULT_BAKERY_SETTINGS: BakerySettings = {
  bakeryName: 'Indian Bakery & Cafe',
  tagline: 'Fresh Cakes, Warm Puffs, Indian Sweets & Irani Chai',
  address: 'Widdi Centre, Mangalagiri (Old Best India Hotel)',
  phone: '9491250264',
  secondaryPhone: '9496341756',
  currency: '₹',
  deliveryFee: 30,
  freeDeliveryThreshold: 1000,
  taxPercent: 5,
  deliverySlots: [
    {
      id: 'morning',
      label: 'Morning Chai Run',
      window: '07:30 – 09:30',
      cutoffNote: 'First oven & chai brew',
      spotsRemaining: 8,
    },
    {
      id: 'midday',
      label: 'Midday Bake',
      window: '12:00 – 14:00',
      cutoffNote: 'Fresh puff & loaf dispatch',
      spotsRemaining: 12,
    },
    {
      id: 'evening',
      label: 'Evening Irani Chai',
      window: '16:30 – 19:30',
      cutoffNote: 'Teatime bun maska & cakes',
      spotsRemaining: 10,
    },
  ],
  deliveryZones: [
    { postalPrefix: '522503', neighborhood: 'Mangalagiri (Widdi Centre)', etaMinutes: '20–30 min', fee: 30 },
    { postalPrefix: '522501', neighborhood: 'Tadepalli & Undavalli', etaMinutes: '25–35 min', fee: 35 },
    { postalPrefix: '52200', neighborhood: 'Guntur Main & Arundelpet', etaMinutes: '35–45 min', fee: 50 },
    { postalPrefix: '52000', neighborhood: 'Vijayawada Central', etaMinutes: '35–50 min', fee: 50 },
  ],
  festivalBanner: {
    active: true,
    campaignName: 'IBC Festive Bake Days',
    headline: '15% OFF orders above ₹299 with code FESTIVE15',
    promoCode: 'FESTIVE15',
  },
  promoCodes: [
    {
      id: 'festive-15',
      code: 'FESTIVE15',
      title: 'Festive Bake Days · 15% Off',
      discountType: 'percent',
      value: 15,
      minOrder: 299,
      active: true,
    },
    {
      id: 'ibc-50',
      code: 'IBC50',
      title: 'Instant Flat ₹50 Off',
      discountType: 'flat',
      value: 50,
      minOrder: 349,
      active: true,
    },
    {
      id: 'chai-10',
      code: 'CHAI10',
      title: 'Evening Chai Snacks · 10% Off',
      discountType: 'percent',
      value: 10,
      minOrder: 199,
      active: true,
    },
  ],
  upiId: '',
};

export const CAKE_FLAVOR_OPTIONS = [
  'Belgian Dark Truffle',
  'Classic Pineapple Cream',
  'Rasmalai & Saffron Pistachio',
  'Butterscotch Caramel Crunch',
  'Black Forest Kirsch',
  'Red Velvet Cream Cheese',
];

export const CAKE_OCCASION_OPTIONS = [
  'Birthday Celebration',
  'Anniversary',
  'Wedding / Engagement',
  'Festival / Family Gathering',
  'Just Because / Gift',
];

export const DEFAULT_BAKERY_PRODUCTS: Product[] = [
  {
    id: 'royal-chocolate-truffle-cake',
    name: 'Royal Chocolate Truffle Celebration Cake',
    category: 'Cakes',
    price: 680,
    originalPrice: 780,
    offerLabel: 'Best Seller',
    weight: '500g',
    bakeTime: '08:00',
    featuredNote: 'Custom message ready',
    vegType: 'veg',
    isBestSeller: true,
    isTodaysSpecial: false,
    isRecommended: true,
    isCakeCustomizable: true,
    rating: 4.9,
    reviewCount: 48,
    inStock: true,
    shortDescription:
      'Rich dark chocolate ganache layered over moist cocoa sponge with toasted almond crumble and piped chocolate rosettes.',
    fullDescription:
      'Hand-frosted fresh to order for birthdays, anniversaries, and Mangalagiri family celebrations. Choose 500g, 1kg, or 1.5kg and personalize your flavor, eggless option, and message plaque.',
    ingredients: [
      '70% dark couverture chocolate',
      'Fresh whipping cream',
      'Dutch-process cocoa',
      'Toasted almonds',
      'Unbleached cake flour',
    ],
    allergens: 'Wheat, Dairy, Tree Nuts (Almonds)',
    dietary: ['Vegetarian'],
    reheatTip: 'Keep refrigerated until 20 minutes before cutting for the silkiest truffle texture.',
    image: celebrationCakeImg,
    options: [
      { id: 'half-kg', label: '500g Celebration (Serves 5)', priceDelta: 0, weightLabel: '500g' },
      { id: 'one-kg', label: '1kg Party Cake (Serves 10)', priceDelta: 560, weightLabel: '1kg' },
      { id: 'tier-15kg', label: '1.5kg Grand Cake (Serves 16)', priceDelta: 1080, weightLabel: '1.5kg' },
    ],
  },
  {
    id: 'fig-pistachio-tart',
    name: 'Fig & Roasted Pistachio Cake Tart',
    category: 'Cakes',
    price: 520,
    originalPrice: 590,
    offerLabel: 'Chef Special',
    weight: '640g',
    bakeTime: '07:15',
    featuredNote: 'Custom occasion option',
    vegType: 'egg',
    isBestSeller: false,
    isTodaysSpecial: true,
    isRecommended: true,
    isCakeCustomizable: true,
    rating: 4.8,
    reviewCount: 22,
    inStock: true,
    shortDescription:
      'Crisp butter shortcrust filled with almond frangipane, fresh black figs, and crushed green pistachios.',
    fullDescription:
      'Handcrafted every morning with honeyed almond cream, seasonal figs, and toasted green pistachio crumble over a golden shortcrust shell.',
    ingredients: [
      'Almond meal',
      'Fresh black figs',
      'Roasted pistachios',
      'Cultured butter',
      'Pastry flour',
      'Wildflower honey',
    ],
    allergens: 'Wheat, Dairy, Eggs, Tree Nuts',
    dietary: ['Vegetarian'],
    reheatTip: 'Serve chilled or at room temperature alongside Irani chai or black coffee.',
    image: figTartImg,
    options: [
      { id: 'petite', label: '6-inch (Serves 4)', priceDelta: 0, weightLabel: '640g' },
      { id: 'grand', label: '9-inch (Serves 8)', priceDelta: 340, weightLabel: '1.15kg' },
    ],
  },
  {
    id: 'paneer-masala-puff-box',
    name: 'Hot Oven Paneer & Spice Puffs',
    category: 'Puffs & Rolls',
    price: 140,
    originalPrice: 170,
    offerLabel: 'Hot Batch',
    weight: '280g',
    bakeTime: '11:30',
    featuredNote: 'Flaky 27-layer pastry',
    vegType: 'veg',
    isBestSeller: true,
    isTodaysSpecial: true,
    isRecommended: false,
    isCakeCustomizable: false,
    rating: 4.9,
    reviewCount: 64,
    inStock: true,
    shortDescription:
      'Crisp golden laminated bakery puffs stuffed with spiced malai paneer, caramelized onions, and coriander.',
    fullDescription:
      'Classic Indian bakery-style masala paneer puffs baked fresh through the day. Packed in ventilated boxes so every flaky layer reaches you crisp and piping hot.',
    ingredients: [
      'Cultured puff pastry',
      'Fresh paneer cubes',
      'Roasted cumin & garam masala',
      'Caramelized onions',
      'Fresh coriander',
    ],
    allergens: 'Wheat, Dairy',
    dietary: ['Vegetarian', 'Nut-Free'],
    reheatTip: 'Re-crisp in a 180°C air-fryer or oven for 3 minutes before serving with tomato chutney.',
    image: paneerPuffImg,
    options: [
      { id: 'pack-2', label: 'Snack Duo (2 Puffs)', priceDelta: 0, weightLabel: '280g' },
      { id: 'pack-4', label: 'Family Pack (4 Puffs)', priceDelta: 120, weightLabel: '560g' },
      { id: 'pack-8', label: 'Office Box (8 Puffs)', priceDelta: 340, weightLabel: '1.1kg' },
    ],
  },
  {
    id: 'butter-croissant-trio',
    name: 'Flaky Butter & Chocolate Pastry Box',
    category: 'Pastries',
    price: 220,
    weight: '290g',
    bakeTime: '06:30',
    featuredNote: 'French-style lamination',
    vegType: 'egg',
    isBestSeller: true,
    isTodaysSpecial: false,
    isRecommended: true,
    isCakeCustomizable: false,
    rating: 4.8,
    reviewCount: 31,
    inStock: true,
    shortDescription:
      'Two golden laminated butter croissants and one dark-chocolate pain au chocolat.',
    fullDescription:
      'Three-day cold-fermented pastry dough laminated with cultured butter and baked until deep amber and crisp.',
    ingredients: [
      'Pastry flour',
      'Cultured table butter',
      '70% dark chocolate batons',
      'Pasture milk',
      'Sea salt',
    ],
    allergens: 'Wheat, Dairy, Soy (trace in chocolate)',
    dietary: ['Vegetarian', 'Nut-Free'],
    reheatTip: 'Crisp in a 175°C oven for 3 minutes. Avoid microwaving to keep layers flaky.',
    image: butterCroissantImg,
    options: [
      { id: 'trio', label: 'Trio (2 Butter + 1 Choc)', priceDelta: 0, weightLabel: '3 pastries' },
      { id: 'six-pack', label: 'Family Box of 6', priceDelta: 200, weightLabel: '6 pastries' },
    ],
  },
  {
    id: 'hyderabadi-osmania-biscuits',
    name: 'Hyderabadi Osmania & Almond Cookies Tin',
    category: 'Cookies & Biscuits',
    price: 190,
    originalPrice: 230,
    offerLabel: 'Chai Favourite',
    weight: '350g',
    bakeTime: '07:00',
    featuredNote: 'Melt-in-mouth salt-sweet',
    vegType: 'veg',
    isBestSeller: true,
    isTodaysSpecial: false,
    isRecommended: true,
    isCakeCustomizable: false,
    rating: 4.9,
    reviewCount: 73,
    inStock: true,
    shortDescription:
      'Signature salt-sweet Osmania butter biscuits paired with saffron pistachio & toasted almond cookies.',
    fullDescription:
      'Our bestselling cookie tin straight from old-cafe recipes: delicate, sandy-crisp Osmania biscuits with a whisper of cardamom and roasted nuts, crafted to dunk in Irani chai.',
    ingredients: [
      'Clarified butter & creamery butter',
      'Refined wheat flour',
      'Slivered almonds & pistachios',
      'Green cardamom',
      'Sea salt & sugar',
    ],
    allergens: 'Wheat, Dairy, Tree Nuts',
    dietary: ['Vegetarian'],
    reheatTip: 'Store in the airtight tin for up to 14 days; enjoy at room temperature with hot tea.',
    image: osmaniaCookiesImg,
    options: [
      { id: 'tin-350', label: 'Classic Tin (350g)', priceDelta: 0, weightLabel: '350g' },
      { id: 'tin-700', label: 'Gift Tin (700g)', priceDelta: 170, weightLabel: '700g' },
    ],
  },
  {
    id: 'royal-mithai-gulab-kaju-box',
    name: 'Kaju Katli & Ghee Gulab Jamun Platter',
    category: 'Indian Sweets',
    price: 360,
    originalPrice: 420,
    offerLabel: 'Festival Sweet',
    weight: '500g',
    bakeTime: '08:30',
    featuredNote: 'Pure cow ghee',
    vegType: 'veg',
    isBestSeller: false,
    isTodaysSpecial: true,
    isRecommended: true,
    isCakeCustomizable: false,
    rating: 4.9,
    reviewCount: 39,
    inStock: true,
    shortDescription:
      'Silver-leaf cashew fudge diamonds, warm rose-cardamom gulab jamun, and saffron milk peda.',
    fullDescription:
      'Hand-rolled Indian mithai prepared daily with pure cow ghee, Goan cashews, khoya, and Kashmiri kesar. Packed in leak-proof festive sweet boxes.',
    ingredients: [
      'Whole cashew nuts',
      'Fresh milk khoya',
      'Pure cow ghee',
      'Rosewater & saffron',
      'Green cardamom',
    ],
    allergens: 'Dairy, Tree Nuts (Cashews, Pistachios)',
    dietary: ['Vegetarian'],
    reheatTip: 'Warm the gulab jamun lightly for 20 seconds before serving for authentic halwai warmth.',
    image: gulabSweetsImg,
    options: [
      { id: 'box-500', label: 'Festive Box (500g)', priceDelta: 0, weightLabel: '500g' },
      { id: 'box-1kg', label: 'Celebration Box (1kg)', priceDelta: 330, weightLabel: '1kg' },
    ],
  },
  {
    id: 'khari-mixture-savouries-combo',
    name: 'Bakery Khari, Masala Mixture & Twist Box',
    category: 'Savouries',
    price: 165,
    weight: '400g',
    bakeTime: '07:45',
    featuredNote: 'Crisp teatime crunch',
    vegType: 'veg',
    isBestSeller: false,
    isTodaysSpecial: false,
    isRecommended: true,
    isCakeCustomizable: false,
    rating: 4.7,
    reviewCount: 28,
    inStock: true,
    shortDescription:
      'Feather-light jeera puff khari biscuits, crispy cheese-herb straws, and spiced curry-leaf masala mixture.',
    fullDescription:
      'Every Mangalagiri household needs an evening crunch jar. Our bakery savoury box combines flaky jeera khari, crisp baked cheese straws, and roasted peanut masala mixture.',
    ingredients: [
      'Puff pastry flour',
      'Gram flour & peanuts',
      'Roasted cumin & black pepper',
      'Fresh curry leaves',
      'Cold-pressed groundnut oil',
    ],
    allergens: 'Wheat, Peanuts, Dairy (butter in khari)',
    dietary: ['Vegetarian'],
    reheatTip: 'Keep sealed between chai breaks to lock in signature oven crispness.',
    image: masalaSavouriesImg,
    options: [
      { id: 'combo-400', label: 'Teatime Assortment (400g)', priceDelta: 0, weightLabel: '400g' },
      { id: 'combo-800', label: 'Family Saver (800g)', priceDelta: 150, weightLabel: '800g' },
    ],
  },
  {
    id: 'country-hearth-loaf',
    name: 'Heritage Country Hearth Bread Loaf',
    category: 'Breads',
    price: 180,
    weight: '850g',
    bakeTime: '06:00',
    featuredNote: '36h natural ferment',
    vegType: 'veg',
    isBestSeller: false,
    isTodaysSpecial: false,
    isRecommended: false,
    isCakeCustomizable: false,
    rating: 4.8,
    reviewCount: 19,
    inStock: true,
    shortDescription:
      'Stone-milled wheat sourdough boule with a blistered caramelized crust and tender open crumb.',
    fullDescription:
      'Fermented for 36 hours using our house starter and baked on hot hearth stone. Ideal for buttered toast, bun maska style spreads, or wholesome sandwiches.',
    ingredients: [
      'Stone-milled bread flour',
      'Whole wheat flour',
      'Filtered water',
      'Sea salt',
      'Natural levain starter',
    ],
    allergens: 'Wheat (Gluten)',
    dietary: ['Vegan', 'Nut-Free'],
    reheatTip: 'Sprinkle lightly with water and toast at 190°C for 5 minutes for fresh-oven crust.',
    image: countrySourdoughImg,
    options: [
      { id: 'whole', label: 'Whole Boule', priceDelta: 0, weightLabel: '850g' },
      { id: 'sliced', label: 'Thick-Sliced', priceDelta: 0, weightLabel: '14 slices' },
    ],
  },
  {
    id: 'rosemary-olive-focaccia',
    name: 'Rosemary & Olive Herb Focaccia Bread',
    category: 'Breads',
    price: 210,
    weight: '620g',
    bakeTime: '07:00',
    featuredNote: 'Cold-pressed olive oil',
    vegType: 'veg',
    isBestSeller: false,
    isTodaysSpecial: true,
    isRecommended: false,
    isCakeCustomizable: false,
    rating: 4.7,
    reviewCount: 16,
    inStock: true,
    shortDescription:
      'Airy high-hydration focaccia slab dimpled with extra-virgin olive oil, black olives, and rosemary.',
    fullDescription:
      'Soft, cloud-like crumb with an olive-oil crisped base, studded with pitted Kalamata olives, garden rosemary sprigs, and flaky sea salt.',
    ingredients: [
      'Refined Tipo 00 flour',
      'Extra-virgin olive oil',
      'Black olives',
      'Fresh rosemary',
      'Flaky sea salt',
    ],
    allergens: 'Wheat (Gluten)',
    dietary: ['Vegan', 'Nut-Free'],
    reheatTip: 'Warm in a dry skillet or 200°C oven for 4 minutes before slicing.',
    image: oliveFocacciaImg,
    options: [
      { id: 'half-slab', label: 'Half Slab', priceDelta: 0, weightLabel: '620g' },
      { id: 'full-slab', label: 'Party Slab', priceDelta: 180, weightLabel: '1.2kg' },
    ],
  },
  {
    id: 'elaichi-cardamom-buns',
    name: 'Elaichi Cardamom Knots (Maska Style)',
    category: 'Breads',
    price: 160,
    originalPrice: 190,
    offerLabel: 'Instant Offer',
    weight: '320g',
    bakeTime: '06:45',
    featuredNote: 'Pairs with Irani Chai',
    vegType: 'veg',
    isBestSeller: true,
    isTodaysSpecial: false,
    isRecommended: false,
    isCakeCustomizable: false,
    rating: 4.9,
    reviewCount: 52,
    inStock: true,
    shortDescription:
      'Soft hand-braided brioche knots infused with roasted green elaichi, cultured butter, and pearl sugar.',
    fullDescription:
      'Baked specifically to pair with slow-simmered Irani chai. Each knot is folded with freshly crushed green cardamom pods and browned butter.',
    ingredients: [
      'Unbleached wheat flour',
      'Cultured butter',
      'Freshly ground green cardamom',
      'Raw cane & pearl sugar',
      'Farm milk',
    ],
    allergens: 'Wheat, Dairy',
    dietary: ['Vegetarian', 'Nut-Free'],
    reheatTip: 'Warm gently for 2 minutes in an oven or air-fryer before dipping into chai.',
    image: cardamomBunImg,
    options: [
      { id: 'pair', label: 'Pack of 2 Buns', priceDelta: 0, weightLabel: '320g' },
      { id: 'box-four', label: 'Cafe Box of 4', priceDelta: 140, weightLabel: '640g' },
    ],
  },
  {
    id: 'irani-chai-flask-combo',
    name: 'IBC Irani Chai Flask & Bun Maska Combo',
    category: 'Beverages',
    price: 295,
    originalPrice: 340,
    offerLabel: 'Chai Combo',
    weight: '500ml + 2 Buns',
    bakeTime: 'Live Brew',
    featuredNote: 'Hot insulated flask',
    vegType: 'veg',
    isBestSeller: true,
    isTodaysSpecial: true,
    isRecommended: true,
    isCakeCustomizable: false,
    rating: 4.9,
    reviewCount: 84,
    inStock: true,
    shortDescription:
      'Slow-reduced mawa Irani dum chai in a piping-hot travel flask served with two soft buttered maska buns.',
    fullDescription:
      'Our iconic Widdi Centre Irani dum chai brewed slowly with khoya/mawa, Assam CTC leaves, and green elaichi—paired with oven-warm sweet buns layered with salted creamery butter.',
    ingredients: [
      'Full-cream buffalo milk',
      'Milk khoya (mawa)',
      'Strong Assam CTC tea',
      'Green cardamom pods',
      'Soft bun maska',
    ],
    allergens: 'Wheat, Dairy',
    dietary: ['Vegetarian', 'Nut-Free'],
    reheatTip: 'Pour steaming straight from the insulated pouch into warmed ceramic cups.',
    image: morningBoxImg,
    options: [
      { id: 'serves-2', label: 'Serves 2 (300ml + 2 Buns)', priceDelta: 0, weightLabel: '500g' },
      { id: 'serves-4', label: 'Family Flask (600ml + 4 Buns)', priceDelta: 220, weightLabel: '1kg' },
    ],
  },
  {
    id: 'badam-saffron-cold-milk',
    name: 'Chilled Saffron Badam Milk & Cookie Pair',
    category: 'Beverages',
    price: 145,
    weight: '300ml',
    bakeTime: 'Chilled',
    featuredNote: 'Slow-simmered kesar milk',
    vegType: 'veg',
    isBestSeller: false,
    isTodaysSpecial: false,
    isRecommended: true,
    isCakeCustomizable: false,
    rating: 4.7,
    reviewCount: 25,
    inStock: true,
    shortDescription:
      'Velvety chilled saffron almond milk topped with pistachio slivers, served alongside two Osmania biscuits.',
    fullDescription:
      'Simmered milk infused with crushed California almonds, Kashmiri kesar strands, and a touch of nutmeg—chilled in glass-style bottles and paired with two fresh biscuits.',
    ingredients: [
      'Reduced whole milk',
      'Blanched almonds',
      'Kashmiri saffron',
      'Cardamom & nutmeg',
      '2 Osmania butter biscuits',
    ],
    allergens: 'Dairy, Tree Nuts (Almonds, Pistachios), Wheat',
    dietary: ['Vegetarian'],
    reheatTip: 'Shake gently and serve chilled straight from the fridge.',
    image: osmaniaCookiesImg,
    options: [
      { id: 'single-bottle', label: '300ml Bottle + 2 Biscuits', priceDelta: 0, weightLabel: '300ml' },
      { id: 'duo-bottles', label: '2 Bottles + 4 Biscuits', priceDelta: 130, weightLabel: '600ml' },
    ],
  },
];

export function formatMoney(amount: number, currency: CurrencySymbol): string {
  const formatted = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return currency === 'AED' ? `AED ${formatted}` : `${currency}${formatted}`;
}

export function resolveDeliveryZone(
  postalCode: string,
  settings: BakerySettings
): DeliveryZone {
  const cleaned = postalCode.trim().replace(/\s+/g, '');
  const matched = settings.deliveryZones.find((zone) =>
    cleaned.startsWith(zone.postalPrefix)
  );
  if (matched) {
    return matched;
  }
  return {
    postalPrefix: cleaned.slice(0, 3) || 'Local',
    neighborhood:
      cleaned.length >= 3 ? `Local Area (${cleaned.slice(0, 6)})` : 'Local Delivery Zone',
    etaMinutes: '30–45 min',
    fee: settings.deliveryFee,
  };
}
