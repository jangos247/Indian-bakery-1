import { useEffect, useState } from 'react';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  Check,
  Copy,
  ExternalLink,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  auth,
  db,
  emailToOwnerDocId,
  getResolvedUserEmail,
  googleProvider,
  isBootstrappedOwnerEmail,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isOwner: boolean;
  onOpenOwnerStudio: () => void;
  onOpenOrders: () => void;
  initialMode?: 'customer' | 'owner';
}

export function AuthModal({
  isOpen,
  onClose,
  user,
  isOwner,
  onOpenOwnerStudio,
  onOpenOrders,
  initialMode = 'customer',
}: AuthModalProps) {
  const [loadingRole, setLoadingRole] = useState<'customer' | 'owner' | null>(null);
  const [authMessage, setAuthMessage] = useState('');
  const [unauthorizedHost, setUnauthorizedHost] = useState('');
  const [copiedHost, setCopiedHost] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAuthMessage('');
      setUnauthorizedHost('');
      setCopiedHost(false);
      setLoadingRole(null);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedEmail = getResolvedUserEmail(user);
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const handleCopyHost = async () => {
    if (!unauthorizedHost) return;
    try {
      await navigator.clipboard.writeText(unauthorizedHost);
      setCopiedHost(true);
      window.setTimeout(() => setCopiedHost(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleGoogleSignIn = async (intendedRole: 'customer' | 'owner') => {
    setAuthMessage('');
    setUnauthorizedHost('');
    setLoadingRole(intendedRole);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = getResolvedUserEmail(result.user);
      if (intendedRole === 'owner') {
        let authorized = result.user.emailVerified && isBootstrappedOwnerEmail(email);
        if (!authorized && email && result.user.emailVerified) {
          try {
            const snap = await getDoc(doc(db, 'owners', emailToOwnerDocId(email)));
            authorized = snap.exists();
          } catch {
            authorized = false;
          }
        }
        if (authorized) {
          onClose();
          onOpenOwnerStudio();
        } else if (!email || !result.user.emailVerified) {
          setAuthMessage(
            'Google did not return a verified email address on this sign-in. In Firebase Console → Authentication → Settings → User account linking, select "Link accounts that use the same email", then sign out and sign in again.'
          );
        } else {
          setAuthMessage(
            `Signed in as ${email}. Only authorized bakery owner accounts can manage the store (an existing owner can add ${email} inside Owner Studio → Add Owner). You are signed in as a Customer.`
          );
        }
      } else {
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in cancelled or failed.';
      if (msg.includes('auth/unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedHost(host);
        setAuthMessage(
          `This website domain (${host}) needs to be whitelisted once in Firebase Authentication → Settings → Authorized domains before Google Sign-In works.`
        );
      } else if (msg.includes('auth/popup-blocked')) {
        setAuthMessage(
          'Your browser blocked the Google Sign-In popup. Please allow popups for this site and tap Sign In again.'
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setAuthMessage(msg);
      }
    } finally {
      setLoadingRole(null);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAuthMessage('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A180D]/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FAF5EE] border border-[#E6DDD1] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#FFFDF9] border-b border-[#E6DDD1] flex items-center justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-semibold text-[#3B2314]">
              {user ? 'Your Account' : 'Sign In & Registration'}
            </h2>
            <p className="text-xs text-[#6D4C3D]">
              Separate portals for Customers and Bakery Owners
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#6D4C3D] hover:text-[#3B2314] hover:bg-[#F3EBDF] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {authMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] leading-relaxed space-y-2.5"
            >
              <p>{authMessage}</p>
              {unauthorizedHost && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleCopyHost()}
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 bg-[#FFFDF9] border border-[#D6C9B8] text-[#3B2314] font-mono-tabular font-medium rounded-lg cursor-pointer"
                  >
                    {copiedHost ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" />
                        <span>Copied {unauthorizedHost}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy {unauthorizedHost}</span>
                      </>
                    )}
                  </button>
                  <a
                    href={firebaseAuthSettingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 bg-[#C45512] text-white font-medium rounded-lg"
                  >
                    <span>Open Authorized Domains</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="p-5 bg-[#FFFDF9] border border-[#E6DDD1] rounded-2xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#C45512]">
                    {isOwner ? 'Bakery Owner Account' : 'Customer Account'}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#3B2314]">
                    {user.displayName || 'Signed In User'}
                  </p>
                  <p className="text-xs font-mono-tabular text-[#6D4C3D]">
                    {resolvedEmail || 'Google Account'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#6D4C3D] hover:text-[#B91C1C] bg-[#F3EBDF] rounded-xl cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#E6DDD1] flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrders();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#3B2314] hover:bg-[#52321E] text-white rounded-xl cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>View My Orders</span>
                </button>

                {isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOwnerStudio();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Open Owner Studio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignIn('owner')}
                    disabled={loadingRole !== null}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-[#D6C9B8] bg-[#FFFDF9] hover:border-[#3B2314] text-[#3B2314] rounded-xl cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C45512]" />
                    <span>Switch to Owner Account</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Customer Login */}
              <div
                className={`p-5 bg-[#FFFDF9] border rounded-2xl flex flex-col justify-between gap-5 transition-colors ${
                  initialMode === 'customer' ? 'border-[#3B2314]' : 'border-[#E6DDD1]'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#F3EBDF] flex items-center justify-center text-[#3B2314] mb-3">
                    <UserIcon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#3B2314]">
                    Customer Sign In / Register
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#6D4C3D]">
                    Place home delivery orders, save addresses &amp; favourites, write reviews, and track cakes &amp; snacks live.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loadingRole !== null}
                  onClick={() => void handleGoogleSignIn('customer')}
                  className="w-full py-2.5 px-4 bg-[#3B2314] hover:bg-[#52321E] disabled:opacity-60 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  {loadingRole === 'customer' ? 'Signing in...' : 'Continue with Google'}
                </button>
              </div>

              {/* Option 2: Owner Login */}
              <div
                className={`p-5 bg-[#FFFDF9] border rounded-2xl flex flex-col justify-between gap-5 transition-colors ${
                  initialMode === 'owner' ? 'border-[#C45512]' : 'border-[#E6DDD1]'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#C45512]/12 flex items-center justify-center text-[#C45512] mb-3">
                    <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#3B2314]">
                    Bakery Owner Portal
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#6D4C3D]">
                    Manage Indian Bakery &amp; Cafe items, upload photos, run festival discounts, update taxes/UPI, and dispatch orders.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loadingRole !== null}
                  onClick={() => void handleGoogleSignIn('owner')}
                  className="w-full py-2.5 px-4 bg-[#C45512] hover:bg-[#A9450C] disabled:opacity-60 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  {loadingRole === 'owner' ? 'Verifying Owner...' : 'Sign In as Bakery Owner'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
