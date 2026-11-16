import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { BakerySettings } from '../types/bakery';

interface PublishTabPanelProps {
  settings: BakerySettings;
  productsCount: number;
}

interface ManifestProbe {
  status: 'checking' | 'ready' | 'error';
  name: string;
  shortName: string;
  iconCount: number;
}

export function PublishTabPanel({ settings, productsCount }: PublishTabPanelProps) {
  const [provider, setProvider] = useState<'own_host' | 'firebase'>('own_host');
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');
  const [manifestProbe, setManifestProbe] = useState<ManifestProbe>({
    status: 'checking',
    name: '',
    shortName: '',
    iconCount: 0,
  });

  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';

  const isPreviewHost =
    currentHostname.startsWith('ais-dev-') ||
    currentHostname.startsWith('ais-pre-') ||
    currentHostname === 'localhost' ||
    currentHostname === '127.0.0.1';

  const probeManifest = async () => {
    setManifestProbe((prev) => ({ ...prev, status: 'checking' }));
    try {
      const res = await fetch('/manifest.webmanifest', { cache: 'no-store' });
      if (!res.ok) throw new Error('Manifest unavailable');
      const json = (await res.json()) as {
        name?: string;
        short_name?: string;
        icons?: unknown[];
      };
      setManifestProbe({
        status: json.name ? 'ready' : 'error',
        name: json.name ?? 'Missing',
        shortName: json.short_name ?? '',
        iconCount: Array.isArray(json.icons) ? json.icons.length : 0,
      });
    } catch {
      setManifestProbe({
        status: 'error',
        name: 'Unavailable',
        shortName: '',
        iconCount: 0,
      });
    }
  };

  useEffect(() => {
    void probeManifest();
  }, []);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? '' : curr));
      }, 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const cleanedCustomDomain = customDomain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');

  const domainToWhitelist =
    cleanedCustomDomain ||
    (isPreviewHost ? `${firebaseConfig.projectId}.web.app` : currentHostname);

  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
  const firebaseHostingUrl = `https://${firebaseConfig.projectId}.web.app`;

  return (
    <div className="space-y-6">
      {/* 1. Live Pre-Publish Readiness Summary */}
      <div className="p-5 sm:p-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#3B2314]">
              Web App Publish Readiness
            </h3>
            <p className="text-xs text-[#6D4C3D] mt-0.5">
              Live check of your storefront, web app manifest, and current hosting address
            </p>
          </div>
          <button
            type="button"
            onClick={() => void probeManifest()}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-medium text-[#3B2314] bg-[#FAF5EE] hover:bg-[#F3EBDF] border border-[#D6C9B8] rounded-xl cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-check</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Check 1: Public Host */}
          <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {isPreviewHost ? (
                <>
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span className="text-[#B45309]">Private Preview URL</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span className="text-[#15803D]">Public Host Active</span>
                </>
              )}
            </div>
            <p className="font-mono-tabular text-xs text-[#3B2314] truncate">
              {currentHostname || 'Preview'}
            </p>
            <p className="text-[11px] text-[#6D4C3D] leading-snug">
              {isPreviewHost
                ? 'Requires your Google login. Publish below to get a public website link.'
                : 'Open to all customers, Google Search indexing, and instant mobile browser access.'}
            </p>
          </div>

          {/* Check 2: Manifest & Icons */}
          <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {manifestProbe.status === 'ready' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span className="text-[#15803D]">Manifest Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span className="text-[#B45309]">
                    {manifestProbe.status === 'checking' ? 'Checking...' : 'Check Needed'}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs font-semibold text-[#3B2314]">
              {manifestProbe.name || 'Indian Bakery'}
            </p>
            <p className="text-[11px] text-[#6D4C3D] font-mono-tabular">
              {manifestProbe.iconCount} PWA icons · standalone app mode
            </p>
          </div>

          {/* Check 3: Store & UPI */}
          <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {productsCount > 0 && settings.phone ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                  <span className="text-[#15803D]">Store Configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0" />
                  <span className="text-[#B45309]">Needs Store Info</span>
                </>
              )}
            </div>
            <p className="text-xs font-semibold text-[#3B2314] font-mono-tabular">
              {productsCount} menu items · {settings.upiId ? 'UPI QR active' : 'COD / Delivery UPI'}
            </p>
            <p className="text-[11px] text-[#6D4C3D] truncate">
              {settings.address}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Android Phone Zero-Terminal Publishing Guide */}
      <div className="p-5 sm:p-6 bg-[#FFFDF9] border border-[#E6DDD1] rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#3B2314] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#C45512]" />
              <span>Publish from Android Chrome (No Computer Needed)</span>
            </h3>
            <p className="text-xs text-[#6D4C3D] mt-0.5">
              Auto-deploy files for Vercel, Netlify, Cloudflare &amp; Firebase Hosting are bundled in this project.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-[#EAE0D2] border border-[#E6DDD1] self-start">
            <button
              type="button"
              onClick={() => setProvider('own_host')}
              className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                provider === 'own_host'
                  ? 'bg-[#FFFDF9] text-[#3B2314] shadow-xs'
                  : 'text-[#6D4C3D] hover:text-[#3B2314]'
              }`}
            >
              Own Host / Custom Domain
            </button>
            <button
              type="button"
              onClick={() => setProvider('firebase')}
              className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                provider === 'firebase'
                  ? 'bg-[#FFFDF9] text-[#3B2314] shadow-xs'
                  : 'text-[#6D4C3D] hover:text-[#3B2314]'
              }`}
            >
              Firebase Hosting
            </button>
          </div>
        </div>

        {provider === 'own_host' ? (
          <div className="space-y-4">
            <ol className="space-y-3 text-xs text-[#6D4C3D]">
              <li className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-1.5">
                <p className="text-sm font-semibold text-[#3B2314]">
                  01. Reveal Toolbar &amp; Save to GitHub on Your Phone
                </p>
                <p className="leading-relaxed">
                  In Chrome on Android, tap the top-right <strong className="text-[#3B2314]">⋮ menu → Desktop site</strong> so all toolbar buttons appear. Tap the <strong className="text-[#3B2314]">Save to GitHub</strong> (or <strong className="text-[#3B2314]">Download</strong>) button at the top right to put this project into a GitHub repository.
                </p>
              </li>

              <li className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-2.5">
                <p className="text-sm font-semibold text-[#3B2314]">
                  02. Connect Your Repo to Your Own Free Web Host
                </p>
                <p className="leading-relaxed">
                  Open Vercel or Netlify in Chrome, sign in with GitHub, and select your repository. Both platforms read our bundled routing config automatically—or confirm these exact build settings:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[#FFFDF9] border border-[#E6DDD1] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-[#6D4C3D]">Build Command</span>
                      <code className="font-mono-tabular text-xs font-semibold text-[#3B2314]">
                        npm run build
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy('build-cmd', 'npm run build')}
                      className="min-h-[40px] px-2.5 py-1 text-xs font-medium text-[#3B2314] bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'build-cmd' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#15803D]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FFFDF9] border border-[#E6DDD1] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-[#6D4C3D]">Output Directory</span>
                      <code className="font-mono-tabular text-xs font-semibold text-[#3B2314]">
                        dist
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopy('out-dir', 'dist')}
                      className="min-h-[40px] px-2.5 py-1 text-xs font-medium text-[#3B2314] bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'out-dir' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#15803D]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <a
                    href="https://vercel.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium bg-[#3B2314] hover:bg-[#52321E] text-white rounded-xl"
                  >
                    <span>Deploy on Vercel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://app.netlify.com/start"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl"
                  >
                    <span>Deploy on Netlify</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-[#6D4C3D]">
            <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-2">
              <p className="text-sm font-semibold text-[#3B2314]">
                Auto-Deploy to Firebase Hosting ({firebaseConfig.projectId}.web.app)
              </p>
              <p className="leading-relaxed">
                A GitHub Actions auto-deploy workflow is already configured for project{' '}
                <code className="font-mono-tabular font-semibold text-[#3B2314]">
                  {firebaseConfig.projectId}
                </code>
                . Once you export to GitHub and add a <code className="font-mono-tabular">FIREBASE_SERVICE_ACCOUNT</code> repository secret, every push deploys live to{' '}
                <span className="font-mono-tabular font-semibold text-[#3B2314]">
                  {firebaseHostingUrl}
                </span>
                .
              </p>
              <div className="p-2.5 rounded-lg bg-[#FFFDF9] border border-[#E6DDD1] flex items-center justify-between gap-2">
                <code className="font-mono-tabular text-[11px] text-[#3B2314] truncate">
                  npm install &amp;&amp; npm run build &amp;&amp; npx firebase-tools deploy --only hosting
                </code>
                <button
                  type="button"
                  onClick={() =>
                    void handleCopy(
                      'fb-cli',
                      'npm install && npm run build && npx firebase-tools deploy --only hosting'
                    )
                  }
                  className="min-h-[40px] px-2.5 py-1 text-xs font-medium text-[#3B2314] bg-[#FAF5EE] border border-[#D6C9B8] rounded-lg inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedKey === 'fb-cli' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#15803D]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Required Domain Whitelist Helper for Google Login */}
        <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#3B2314]">
              03. Allow Google Sign-In on Your New Public Website
            </p>
            <p className="text-xs text-[#6D4C3D] mt-0.5 leading-relaxed">
              After your website goes live, enter your new domain below (for example <span className="font-mono-tabular">indianbakery.vercel.app</span> or your own <span className="font-mono-tabular">.com</span>) and add it to Firebase Authentication Authorized Domains so Customer &amp; Owner login works.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder={`Enter your live domain (e.g., indianbakery.vercel.app)`}
              className="flex-1 min-h-[44px] px-3 py-2 text-xs font-mono-tabular bg-[#FFFDF9] border border-[#D6C9B8] rounded-xl focus:outline-none focus:border-[#C45512]"
            />
            <button
              type="button"
              onClick={() => void handleCopy('domain-whitelist', domainToWhitelist)}
              className="min-h-[44px] px-4 py-2 text-xs font-medium bg-[#FFFDF9] hover:bg-[#F3EBDF] border border-[#D6C9B8] text-[#3B2314] rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              {copiedKey === 'domain-whitelist' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>Copied Domain</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy {domainToWhitelist}</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <a
              href={firebaseAuthSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium bg-[#C45512] hover:bg-[#A9450C] text-white rounded-xl"
            >
              <span>Open Firebase Authorized Domains</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 4. Final Step: Google Search & Customer Web App Link */}
        <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#E6DDD1] space-y-3">
          <p className="text-sm font-semibold text-[#3B2314]">
            04. Submit to Google Search &amp; Share Your Web App
          </p>
          <p className="text-xs text-[#6D4C3D] leading-relaxed">
            Once your public URL is live, verify it in <strong className="text-[#3B2314]">Google Search Console</strong> so customers can find <strong className="text-[#3B2314]">Indian Bakery</strong> on Google. Anyone opening your link in mobile Chrome can also tap <strong className="text-[#3B2314]">Add to Home screen</strong> for a full-screen web app experience—no APK needed.
          </p>

          <div className="flex flex-wrap gap-2.5">
            {!isPreviewHost && currentOrigin && (
              <button
                type="button"
                onClick={() => void handleCopy('live-web-url', currentOrigin)}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium bg-[#3B2314] hover:bg-[#52321E] text-white rounded-xl cursor-pointer"
              >
                {copiedKey === 'live-web-url' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#86EFAC]" />
                    <span>Copied Web App Link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Live Web App Link</span>
                  </>
                )}
              </button>
            )}

            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-medium bg-[#FFFDF9] hover:bg-[#F3EBDF] border border-[#D6C9B8] text-[#3B2314] rounded-xl"
            >
              <Globe className="w-3.5 h-3.5 text-[#C45512]" />
              <span>Google Search Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
