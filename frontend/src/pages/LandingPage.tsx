import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  FileText,
  Heart,
  DollarSign,
  Image,
  FolderHeart,
  ShieldCheck,
  HardDrive,
  Users,
  Smartphone,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react';

interface ShowcaseDoc {
  id: string;
  title: string;
  size: string;
  uploader: string;
  badge: string;
  date: string;
  summary: string;
}

const CATEGORIES: Record<string, { label: string; icon: typeof FileText; docs: ShowcaseDoc[] }> = {
  deeds: {
    label: 'Vital Deeds & Legal',
    icon: FileText,
    docs: [
      {
        id: 'doc-1',
        title: 'Ancestral Property Deed 2024.pdf',
        size: '2.4 MB',
        uploader: 'Dad',
        badge: 'Notarized Deed',
        date: 'Sep 2026',
        summary: 'Official land registry certificate and certified title deed for ancestral home. Verified with digital seal.',
      },
      {
        id: 'doc-2',
        title: 'Last Will & Family Testament.pdf',
        size: '1.1 MB',
        uploader: 'Dad',
        badge: 'Sealed Vault',
        date: 'Aug 2026',
        summary: 'Signed family testament and asset allocation directives. Encrypted with restricted family permissions.',
      },
      {
        id: 'doc-3',
        title: 'Passport & Citizenship Scans.pdf',
        size: '3.8 MB',
        uploader: 'Mom',
        badge: 'Identity Vault',
        date: 'Jul 2026',
        summary: 'High-resolution color biometric passport and national ID scans for all 4 family members.',
      },
    ],
  },
  health: {
    label: 'Health & Medical',
    icon: Heart,
    docs: [
      {
        id: 'doc-4',
        title: 'Comprehensive Family Health Policy 2026.pdf',
        size: '4.2 MB',
        uploader: 'Mom',
        badge: 'Active Policy',
        date: 'Sep 2026',
        summary: 'Annual health coverage policy terms, cashless hospital network directory, and member medical insurance ID cards.',
      },
      {
        id: 'doc-5',
        title: 'Grandpa Cardiology History & ECG.pdf',
        size: '1.9 MB',
        uploader: 'Grandma',
        badge: 'Clinical History',
        date: 'Aug 2026',
        summary: 'Continuous 12-lead ECG traces, cardiologist review reports, and prescription dosages from Apollo Cardiology.',
      },
    ],
  },
  finance: {
    label: 'Tax, Insurance & Finance',
    icon: DollarSign,
    docs: [
      {
        id: 'doc-6',
        title: 'Term Life Insurance Bond - HDFC Life.pdf',
        size: '3.1 MB',
        uploader: 'Dad',
        badge: 'Policy Bond',
        date: 'Jun 2026',
        summary: 'Rs 1.5 Cr coverage policy bond with family nominee allocations and death benefit claim filing checklist.',
      },
      {
        id: 'doc-7',
        title: 'Family Mutual Fund Portfolio Summary.pdf',
        size: '950 KB',
        uploader: 'Dad',
        badge: 'Asset Ledger',
        date: 'May 2026',
        summary: 'Consolidated account statement across equity and debt portfolios with joint folio signatures.',
      },
    ],
  },
  memories: {
    label: 'Heirloom Keepsakes & Media',
    icon: Image,
    docs: [
      {
        id: 'doc-8',
        title: 'Silver Jubilee Family Reunion 2024.mp4',
        size: '142 MB',
        uploader: 'Rohan',
        badge: '4K Keepsake',
        date: 'Jul 2026',
        summary: 'Uncompressed family reunion video montage preserved in original 4K resolution on pooled storage.',
      },
      {
        id: 'doc-9',
        title: 'Grandparents 50th Anniversary Album.zip',
        size: '88 MB',
        uploader: 'Mom',
        badge: 'Heritage Album',
        date: 'Apr 2026',
        summary: '320 restored photographs from the 1974 wedding album, color corrected and scanned at 1200 DPI.',
      },
    ],
  },
};

export function LandingPage() {
  const [activeCategory, setActiveCategory] = useState<string>('deeds');
  const [selectedDoc, setSelectedDoc] = useState<ShowcaseDoc | null>(null);

  const currentDocs = CATEGORIES[activeCategory]?.docs || [];

  return (
    <div className="min-h-screen bg-[var(--bg-linen)] text-[var(--text-ink)] selection:bg-[var(--color-primary-container)]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--surface-card)]/80 backdrop-blur-md border-b border-[var(--border-paper)] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-[var(--text-ink)] no-underline">
          <img src="/img/logo.svg" alt="FamDoc Logo" className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight leading-tight">
              Fam<span className="text-emerald-600 dark:text-emerald-400">Doc</span>
            </span>
            <span className="text-[10px] text-[var(--text-ink-muted)] leading-none">Keepsake Vault</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-ink)] hover:bg-[var(--surface-paper-hover)] border border-[var(--border-paper)] transition-colors no-underline"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            id="btn-get-started"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-sm transition-all no-underline"
          >
            Create Vault
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 sm:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-container)] text-[var(--color-primary-dark)] dark:text-emerald-300 mb-6 border border-emerald-500/20">
          <FolderHeart className="w-3.5 h-3.5" />
          <span>Unified Family Document Management</span>
        </div>

        <h1 className="hero-title landing-hero-title text-3xl sm:text-5xl md:text-6xl font-extrabold text-[var(--text-ink)] tracking-tight leading-tight mb-6">
          The Keepsake Vault for <span className="text-emerald-600 dark:text-emerald-400">Everything</span> That Matters
        </h1>

        <p className="text-base sm:text-lg text-[var(--text-ink-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
          Pool your family's Google Drive accounts into one secure, unified cloud vault. Keep legal deeds, health
          records, financial policies, and heirlooms safe and accessible across generations.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link
            to="/register"
            className="px-6 py-3.5 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold text-sm shadow-lg shadow-emerald-700/20 transition-all flex items-center gap-2 no-underline"
          >
            <span>Start Free Family Vault</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/join"
            className="px-6 py-3.5 rounded-2xl bg-[var(--surface-card)] hover:bg-[var(--surface-paper-hover)] border border-[var(--border-paper)] text-[var(--text-ink)] font-semibold text-sm transition-colors no-underline"
          >
            Join with Secret Code
          </Link>
          <a
            href="/apk/FamDoc.apk"
            download
            className="px-4 py-3.5 rounded-2xl bg-[var(--surface-paper-tint)] hover:bg-[var(--surface-paper-hover)] border border-[var(--border-paper)] text-[var(--text-ink)] font-medium text-xs flex items-center gap-2 no-underline"
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Download Android App</span>
          </a>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left mb-16">
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
            <HardDrive className="w-6 h-6 text-emerald-600 mb-2" />
            <h2 className="text-sm font-bold text-[var(--text-ink)]">Storage Pooling</h2>
            <p className="text-xs text-[var(--text-ink-muted)] mt-1">Combine free Google Drive accounts into 100+ GB.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
            <ShieldCheck className="w-6 h-6 text-blue-600 mb-2" />
            <h2 className="text-sm font-bold text-[var(--text-ink)]">Bank-Grade Security</h2>
            <p className="text-xs text-[var(--text-ink-muted)] mt-1">Direct Cloudflare R2 and Google Drive encryption.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
            <Users className="w-6 h-6 text-amber-600 mb-2" />
            <h2 className="text-sm font-bold text-[var(--text-ink)]">Elder-Friendly</h2>
            <p className="text-xs text-[var(--text-ink-muted)] mt-1">Simple shared folders, easy codes, no complex setup.</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] shadow-xs">
            <FolderHeart className="w-6 h-6 text-pink-600 mb-2" />
            <h2 className="text-sm font-bold text-[var(--text-ink)]">Generational Keepsakes</h2>
            <p className="text-xs text-[var(--text-ink-muted)] mt-1">Preserve photos and heirlooms without compression.</p>
          </div>
        </div>
      </section>

      {/* Interactive Category Showcase */}
      <section className="py-12 px-4 sm:px-8 max-w-5xl mx-auto border-t border-[var(--border-paper)]">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-ink)]">Explore the Interactive Vault</h2>
          <p className="text-xs text-[var(--text-ink-muted)] mt-1">
            Click through categories to see how real families organize their keepsakes
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                data-category={key}
                onClick={() => setActiveCategory(key)}
                className={`category-pill category-tab vault-category-pill flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                    : 'bg-[var(--surface-card)] text-[var(--text-ink)] border-[var(--border-paper)] hover:bg-[var(--surface-paper-hover)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Document Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-paper)] hover:border-[var(--color-primary)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-paper-tint)] text-[var(--text-ink-muted)] border border-[var(--border-paper)]">
                    {doc.badge}
                  </span>
                  <span className="text-[10px] text-[var(--text-ink-muted)]">{doc.date}</span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-ink)] line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors mb-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-[var(--text-ink-muted)] line-clamp-2 leading-relaxed mb-4">
                  {doc.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-paper)]/60 text-[11px] text-[var(--text-ink-muted)]">
                <span>By {doc.uploader}</span>
                <span className="flex items-center gap-1 text-[var(--color-primary)] font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Document Preview Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="w-full max-w-lg bg-[var(--surface-card)] rounded-3xl p-6 border border-[var(--border-paper)] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--surface-paper-hover)] text-[var(--text-ink-muted)]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 mb-2">
              {selectedDoc.badge}
            </span>
            <h3 className="text-lg font-bold text-[var(--text-ink)] mb-2">{selectedDoc.title}</h3>
            <p className="text-xs text-[var(--text-ink-muted)] mb-4">{selectedDoc.summary}</p>

            <div className="p-3.5 rounded-xl bg-[var(--surface-paper-tint)] text-xs text-[var(--text-ink)] space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-[var(--text-ink-muted)]">Uploaded By:</span>
                <span className="font-semibold">{selectedDoc.uploader}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-ink-muted)]">File Size:</span>
                <span className="font-semibold">{selectedDoc.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-ink-muted)]">Storage Tier:</span>
                <span className="font-semibold text-emerald-600">Google Drive Pool</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                to="/register"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-white text-center text-xs font-semibold shadow-xs hover:bg-[var(--color-primary-dark)] no-underline"
              >
                Create Your Own Vault
              </Link>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="py-2.5 px-4 rounded-xl border border-[var(--border-paper)] text-xs font-semibold hover:bg-[var(--surface-paper-hover)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-[var(--border-paper)] text-center text-xs text-[var(--text-ink-muted)] space-y-2">
        <p>&copy; {new Date().getFullYear()} FamDoc. Designed for generational family security.</p>
        <div className="flex justify-center gap-4">
          <a href="/privacy.html" className="hover:underline">Privacy Policy</a>
          <a href="/terms.html" className="hover:underline">Terms of Service</a>
          <a href="/apk/FamDoc.apk" download className="hover:underline">Android APK</a>
        </div>
      </footer>
    </div>
  );
}
