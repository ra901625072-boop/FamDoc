import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  modalBackdropVariants,
  modalDialogVariants,
  tactilePress,
  tactileCard,
  fadeInVariants,
  springs,
} from '../lib/motion';

interface ShowcaseDoc {
  id: string;
  title: string;
  type: 'pdf' | 'img' | 'doc';
  icon: string;
  iconClass: string;
  size: string;
  uploader: string;
  badge: string;
  drive: string;
  date: string;
  sha: string;
  previewSummary: string;
}

interface CategoryInfo {
  label: string;
  icon: string;
  docs: ShowcaseDoc[];
}

const VAULT_CATEGORIES: Record<string, CategoryInfo> = {
  deeds: {
    label: 'Vital Deeds & Legal',
    icon: 'fas fa-file-contract',
    docs: [
      {
        id: 'doc-1',
        title: 'Ancestral Property Deed 2024.pdf',
        type: 'pdf',
        icon: 'fas fa-file-pdf',
        iconClass: 'doc-icon-pdf',
        size: '2.4 MB',
        uploader: 'Dad',
        badge: 'Notarized Deed',
        drive: 'Google Drive Pool A',
        date: 'Sep 2026',
        sha: 'SHA-256: 4f8b92a1...c8e4',
        previewSummary:
          'Official land registry certificate and certified title deed for ancestral home. Verified with digital seal and legal registry records.',
      },
      {
        id: 'doc-2',
        title: 'Last Will & Family Testament.pdf',
        type: 'pdf',
        icon: 'fas fa-file-pdf',
        iconClass: 'doc-icon-pdf',
        size: '1.1 MB',
        uploader: 'Dad',
        badge: 'Sealed Vault',
        drive: 'Google Drive Pool B',
        date: 'Aug 2026',
        sha: 'SHA-256: e71c4509...31ab',
        previewSummary:
          'Signed family testament and asset allocation directives. Encrypted with restricted family permissions and zero cloud tracking.',
      },
      {
        id: 'doc-3',
        title: 'Passport & Citizenship Scans.pdf',
        type: 'pdf',
        icon: 'fas fa-passport',
        iconClass: 'doc-icon-pdf',
        size: '3.8 MB',
        uploader: 'Mom',
        badge: 'Identity Vault',
        drive: 'Google Drive Pool A',
        date: 'Jul 2026',
        sha: 'SHA-256: a82d6341...19fe',
        previewSummary:
          'High-resolution color biometric passport and national ID scans for all 4 family members, stored with Fernet AES-128 encryption.',
      },
      {
        id: 'doc-4',
        title: 'Vehicle Title & Registration.pdf',
        type: 'pdf',
        icon: 'fas fa-car',
        iconClass: 'doc-icon-pdf',
        size: '820 KB',
        uploader: 'Dad',
        badge: 'Official Record',
        drive: 'Google Drive Pool C',
        date: 'Jun 2026',
        sha: 'SHA-256: d03a985e...77c2',
        previewSummary:
          'Original vehicular certificate, road tax receipts, insurance endorsement, and transfer authorization papers.',
      },
    ],
  },
  health: {
    label: 'Health & Medical',
    icon: 'fas fa-heartbeat',
    docs: [
      {
        id: 'doc-5',
        title: 'Comprehensive Family Health Policy 2026.pdf',
        type: 'pdf',
        icon: 'fas fa-file-medical',
        iconClass: 'doc-icon-pdf',
        size: '4.2 MB',
        uploader: 'Mom',
        badge: 'Active Policy',
        drive: 'Google Drive Pool B',
        date: 'Sep 2026',
        sha: 'SHA-256: 3c9f104d...821e',
        previewSummary:
          'Annual health coverage policy terms, cashless hospital network directory, and member medical insurance ID cards.',
      },
      {
        id: 'doc-6',
        title: 'Grandpa Cardiology History & ECG.pdf',
        type: 'pdf',
        icon: 'fas fa-notes-medical',
        iconClass: 'doc-icon-pdf',
        size: '1.9 MB',
        uploader: 'Grandma',
        badge: 'Critical Medical',
        drive: 'Google Drive Pool A',
        date: 'Aug 2026',
        sha: 'SHA-256: 9b20ea61...f04c',
        previewSummary:
          'Detailed cardiologist assessment reports, stress test records, and specialist medication consultation notes.',
      },
      {
        id: 'doc-7',
        title: 'Childhood Immunization & Vaccine Chart.pdf',
        type: 'pdf',
        icon: 'fas fa-syringe',
        iconClass: 'doc-icon-pdf',
        size: '760 KB',
        uploader: 'Mom',
        badge: 'Pediatric Log',
        drive: 'Google Drive Pool C',
        date: 'Jul 2026',
        sha: 'SHA-256: 12de48ac...9b74',
        previewSummary:
          'Complete birth-to-adolescence vaccination records, dosage milestones, and pediatrician signatures.',
      },
      {
        id: 'doc-8',
        title: 'Family Blood Groups & Emergency Allergies.docx',
        type: 'doc',
        icon: 'fas fa-file-word',
        iconClass: 'doc-icon-doc',
        size: '310 KB',
        uploader: 'Dad',
        badge: 'Emergency Reference',
        drive: 'Google Drive Pool B',
        date: 'May 2026',
        sha: 'SHA-256: f4619d82...50ea',
        previewSummary:
          'Emergency clinical cheat-sheet containing blood typings, antibiotic allergies, and 24/7 doctor contact numbers.',
      },
    ],
  },
  keepsakes: {
    label: 'Family Keepsakes',
    icon: 'fas fa-gem',
    docs: [
      {
        id: 'doc-9',
        title: 'Grandparents Wedding Day 1968.jpg',
        type: 'img',
        icon: 'fas fa-image',
        iconClass: 'doc-icon-img',
        size: '5.4 MB',
        uploader: 'Grandma',
        badge: 'Restored Photo',
        drive: 'Google Drive Pool A',
        date: 'Sep 2026',
        sha: 'SHA-256: 8a71c390...4f18',
        previewSummary:
          'Digitally remastered vintage wedding photograph captured on Kodak black-and-white negative film, preserved in ultra high resolution.',
      },
      {
        id: 'doc-10',
        title: 'Ancestral Handwritten Recipe Journal.pdf',
        type: 'pdf',
        icon: 'fas fa-book-open',
        iconClass: 'doc-icon-pdf',
        size: '3.2 MB',
        uploader: 'Grandma',
        badge: 'Generational Heirloom',
        drive: 'Google Drive Pool B',
        date: 'Aug 2026',
        sha: 'SHA-256: c68201de...63a9',
        previewSummary:
          'High-resolution scan of 48-page handwritten culinary heritage notebook dating back to 1942, featuring traditional spices and dishes.',
      },
      {
        id: 'doc-11',
        title: 'Family Reunion Golden Jubilee 2025.jpg',
        type: 'img',
        icon: 'fas fa-camera',
        iconClass: 'doc-icon-img',
        size: '6.8 MB',
        uploader: 'Mom',
        badge: 'Original RAW',
        drive: 'Google Drive Pool C',
        date: 'Jun 2026',
        sha: 'SHA-256: b10438cf...241d',
        previewSummary:
          'Panoramic family portrait gathered for 50th jubilee celebration in lossless RAW resolution.',
      },
      {
        id: 'doc-12',
        title: 'University Gold Medal Certificate.png',
        type: 'img',
        icon: 'fas fa-award',
        iconClass: 'doc-icon-img',
        size: '2.1 MB',
        uploader: 'Dad',
        badge: 'Milestone',
        drive: 'Google Drive Pool A',
        date: 'Apr 2026',
        sha: 'SHA-256: 7d1a5802...11b5',
        previewSummary:
          'Original scanned master degree with distinction honors and university chancellor gold seal.',
      },
    ],
  },
  tax: {
    label: 'Tax & Financials',
    icon: 'fas fa-calculator',
    docs: [
      {
        id: 'doc-13',
        title: 'Property Municipal Tax Receipt FY25.pdf',
        type: 'pdf',
        icon: 'fas fa-receipt',
        iconClass: 'doc-icon-pdf',
        size: '1.4 MB',
        uploader: 'Dad',
        badge: 'Tax Clearance',
        drive: 'Google Drive Pool B',
        date: 'Aug 2026',
        sha: 'SHA-256: 22ea4518...90cf',
        previewSummary:
          'Official electronic assessment and zero-liability payment confirmation issued by city municipal corporation.',
      },
      {
        id: 'doc-14',
        title: 'Annual Income Tax Return Acknowledgment.pdf',
        type: 'pdf',
        icon: 'fas fa-file-invoice-dollar',
        iconClass: 'doc-icon-pdf',
        size: '2.7 MB',
        uploader: 'Dad',
        badge: 'Filed & Verified',
        drive: 'Google Drive Pool A',
        date: 'Jul 2026',
        sha: 'SHA-256: 550b7194...e32a',
        previewSummary:
          'Statutory tax audit confirmation and digital acknowledgement receipt for FY2025-2026.',
      },
      {
        id: 'doc-15',
        title: 'Fixed Deposit & Treasury Bond Receipts.pdf',
        type: 'pdf',
        icon: 'fas fa-university',
        iconClass: 'doc-icon-pdf',
        size: '950 KB',
        uploader: 'Grandma',
        badge: 'Banking Vault',
        drive: 'Google Drive Pool C',
        date: 'May 2026',
        sha: 'SHA-256: 4180f6bc...5710',
        previewSummary:
          'Certificates of deposit and sovereign gold bond certificates with interest maturity schedule tables.',
      },
      {
        id: 'doc-16',
        title: 'Home Loan Discharge & NOC Certificate.pdf',
        type: 'pdf',
        icon: 'fas fa-home',
        iconClass: 'doc-icon-pdf',
        size: '1.8 MB',
        uploader: 'Dad',
        badge: 'Debt Free',
        drive: 'Google Drive Pool A',
        date: 'Feb 2026',
        sha: 'SHA-256: a918342f...08dc',
        previewSummary:
          'Official bank no-objection certificate confirming 100% full repayment and release of residential property mortgage.',
      },
    ],
  },
};

export const LandingPage = () => {
  const [activeCategory, setActiveCategory] = useState<string>('deeds');
  const [selectedDoc, setSelectedDoc] = useState<ShowcaseDoc | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const currentDocs = VAULT_CATEGORIES[activeCategory]?.docs || VAULT_CATEGORIES.deeds.docs;

  return (
    <div className="landing-page fd-page-enter">
      {/* Ambient Multi-Layered Glow */}
      <div className="landing-ambient-glow" aria-hidden="true" />

      {/* Sticky Glassmorphism Header Bar */}
      <div className="landing-header-wrap">
        <div className="landing-container">
          <header role="banner" className="landing-navbar">
            <Link to="/" className="nav-brand-group" aria-label="FamDoc Home">
              <div className="nav-brand-crest">
                <img src="/img/logo.svg" alt="FamDoc Crest Logo" className="nav-brand-logo" width="30" height="30" />
              </div>
              <div className="nav-brand-text">
                <span className="nav-brand-name">
                  Fam<span className="accent">Doc</span>
                </span>
                <span className="nav-brand-tagline">Family Vault</span>
              </div>
            </Link>

            {/* In-Page Smooth Scroll Links */}
            <nav role="navigation" aria-label="Main Navigation">
              <ul className="nav-links-menu">
                <li className="nav-link-item">
                  <button type="button" onClick={() => scrollToSection('section-showcase')}>
                    <i className="fas fa-layer-group" aria-hidden="true" />
                    <span>Live Vault</span>
                    <span className="nav-badge">Test Drive</span>
                  </button>
                </li>
                <li className="nav-link-item">
                  <button type="button" onClick={() => scrollToSection('section-pillars')}>
                    <i className="fas fa-cubes" aria-hidden="true" />
                    <span>Architecture</span>
                  </button>
                </li>
                <li className="nav-link-item">
                  <button type="button" onClick={() => scrollToSection('section-android')}>
                    <i className="fab fa-android" aria-hidden="true" />
                    <span>Android App</span>
                  </button>
                </li>
                <li className="nav-link-item">
                  <button type="button" onClick={() => scrollToSection('section-faq')}>
                    <i className="fas fa-question-circle" aria-hidden="true" />
                    <span>FAQ</span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* Controls */}
            <div className="nav-controls-group">
              <div className="nav-theme-btn guest-theme-toggle">
                <ThemeToggle />
              </div>
              <Link to="/login" className="nav-login-btn" id="navLoginBtn">
                <i className="fas fa-sign-in-alt" aria-hidden="true" />
                <span>Sign In</span>
              </Link>
              <button
                type="button"
                className="nav-mobile-toggle"
                id="mobileMenuToggle"
                aria-label="Toggle navigation menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'} aria-hidden="true" />
              </button>
            </div>
          </header>

          {/* Mobile Navigation Dropdown Drawer */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                className="mobile-nav-drawer"
                id="mobileNavDrawer"
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={springs.gentle}
              >
                <button type="button" onClick={() => scrollToSection('section-showcase')}>
                  <span>
                    <i className="fas fa-layer-group" style={{ marginRight: '0.6rem' }} /> Live Vault
                  </span>
                  <span className="nav-badge">Test Drive</span>
                </button>
                <button type="button" onClick={() => scrollToSection('section-pillars')}>
                  <span>
                    <i className="fas fa-cubes" style={{ marginRight: '0.6rem' }} /> Architecture
                  </span>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                </button>
                <button type="button" onClick={() => scrollToSection('section-android')}>
                  <span>
                    <i className="fab fa-android" style={{ marginRight: '0.6rem' }} /> Android App
                  </span>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                </button>
                <button type="button" onClick={() => scrollToSection('section-faq')}>
                  <span>
                    <i className="fas fa-question-circle" style={{ marginRight: '0.6rem' }} /> FAQ
                  </span>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <main role="main">
        {/* 1. Hero Section */}
        <section className="landing-hero-section">
          <div className="landing-container">
            <div className="hero-pill-badge">
              <i className="fas fa-shield-alt" aria-hidden="true" />
              <span>Private Family Keepsake &amp; Document Platform</span>
            </div>

            <h1 className="hero-title" id="main-headline">
              Your Family's Legacy &amp; Keepsakes,
              <br />
              <span className="hero-title-highlight">Guarded in One Timeless Vault.</span>
            </h1>

            <p className="hero-description">
              Aggregate free Google Drive storage into an unbreakable family pool. Protected by dual-tier failover
              encryption, native Android biometrics, and zero subscription fees.
            </p>

            {/* Action Cluster */}
            <div className="hero-cta-cluster" role="region" aria-label="Primary Call to Actions">
              <Link to="/register" className="hero-btn-primary" id="btn-create-vault">
                <i className="fas fa-plus-circle" aria-hidden="true" />
                <span>Create a Family Vault</span>
              </Link>
              <Link to="/join" className="hero-btn-secondary" id="btn-join-code">
                <i className="fas fa-key key-icon" aria-hidden="true" />
                <span>Join with Family Code</span>
              </Link>
              <a href="/apk/FamDoc.apk" download className="hero-btn-apk" id="btn-hero-apk">
                <i className="fab fa-android" aria-hidden="true" />
                <span>Get Android App</span>
                <span className="apk-badge-size">19.6 MB</span>
              </a>
            </div>

            <div className="hero-login-sublink">
              <span>Already part of a family vault?</span>{' '}
              <Link to="/login" id="heroLoginSubLink" style={{ whiteSpace: 'nowrap' }}>
                Sign In to Your Vault <span className="link-arrow">&rarr;</span>
              </Link>
            </div>

            {/* Trust Signals Strip */}
            <div className="hero-trust-strip" aria-label="Platform Guarantees">
              <div className="trust-chip">
                <i className="fas fa-lock" aria-hidden="true" />
                <span>
                  Google Restricted <code>drive.file</code> Scope
                </span>
              </div>
              <div className="trust-chip">
                <i className="fas fa-key" aria-hidden="true" />
                <span>Fernet AES-128 Encryption</span>
              </div>
              <div className="trust-chip">
                <i className="fas fa-hdd" aria-hidden="true" />
                <span>Dual-Tier Local Vault Failover</span>
              </div>
              <div className="trust-chip">
                <i className="fas fa-fingerprint" aria-hidden="true" />
                <span>Jetpack Compose Biometrics</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Live Vault Showcase (Test Drive) */}
        <section className="vault-showcase-section" id="section-showcase" aria-labelledby="showcase-title">
          <div className="landing-container">
            <div className="section-header-block">
              <div className="section-pretitle">Interactive Experience</div>
              <h2 className="section-title" id="showcase-title">
                Experience the FamDoc Vault First-Hand
              </h2>
              <p className="section-subtitle">
                Click through our real family document categories below to see how records are categorized, pooled,
                and previewed with sub-50ms speed.
              </p>
            </div>

            {/* Vault Window Container */}
            <div className="vault-window-frame">
              {/* Top Bar */}
              <div className="vault-window-topbar">
                <div className="window-dots" aria-hidden="true">
                  <span className="window-dot dot-red" />
                  <span className="window-dot dot-yellow" />
                  <span className="window-dot dot-green" />
                </div>
                <div className="window-title">
                  <i className="fas fa-shield-alt" aria-hidden="true" />
                  <span>The Rajput Family Vault &bull; Multi-Account Pool Active</span>
                </div>
                <div className="window-status-pill">
                  <span className="pulse-dot" />
                  <span>3 Accounts Connected</span>
                </div>
              </div>

              {/* Multi-Account Google Drive Pool Meter */}
              <div className="vault-storage-meter-box">
                <div className="storage-meter-header">
                  <span className="storage-pool-label">
                    <i className="fab fa-google-drive" aria-hidden="true" />
                    <span>Unified Google Drive Storage Pool</span>
                  </span>
                  <span className="storage-pool-stats" id="storage-pool-stats">
                    <strong>17.6 GB</strong> of <strong>45.0 GB</strong> Pooled (61% Free)
                  </span>
                </div>
                <div
                  className="storage-progress-track"
                  role="progressbar"
                  aria-valuenow={39}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="progress-segment seg-mom" style={{ width: '14%' }} title="Mom's Google Drive: 6.3 GB used" />
                  <div className="progress-segment seg-dad" style={{ width: '16%' }} title="Dad's Google Drive: 7.2 GB used" />
                  <div className="progress-segment seg-grandma" style={{ width: '7%' }} title="Grandma's Google Drive: 3.1 GB used" />
                  <div className="progress-segment seg-local" style={{ width: '2%' }} title="Local Failover Buffer: 1.0 GB" />
                </div>
                <div className="storage-accounts-legend">
                  <div className="legend-item">
                    <span className="legend-dot seg-mom" />
                    <span>Mom's Drive (15 GB)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot seg-dad" />
                    <span>Dad's Drive (15 GB)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot seg-grandma" />
                    <span>Grandma's Drive (15 GB)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot seg-local" />
                    <span>Encrypted Local Cache</span>
                  </div>
                </div>
              </div>

              {/* Interactive Category Filter Tabs */}
              <div className="vault-category-tabs" role="tablist" aria-label="Vault Categories">
                {Object.entries(VAULT_CATEGORIES).map(([key, cat]) => (
                  <motion.button
                    key={key}
                    type="button"
                    className={`vault-tab-btn ${activeCategory === key ? 'active' : ''}`}
                    onClick={() => setActiveCategory(key)}
                    role="tab"
                    aria-selected={activeCategory === key}
                    {...tactilePress}
                  >
                    <i className={cat.icon} aria-hidden="true" />
                    <span>{cat.label}</span>
                    <span className="tab-count-badge">{cat.docs.length}</span>
                  </motion.button>
                ))}
              </div>

              {/* Dynamic Documents Grid */}
              <div className="vault-documents-grid" role="region" aria-live="polite">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    className="vault-documents-grid-inner"
                    variants={fadeInVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{ display: 'contents' }}
                  >
                    {currentDocs.map((doc) => (
                      <motion.article
                        key={doc.id}
                        className="showcase-doc-card"
                        onClick={() => setSelectedDoc(doc)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Preview ${doc.title}`}
                        {...tactileCard}
                      >
                        <div className={`doc-icon-box ${doc.iconClass}`}>
                          <i className={doc.icon} aria-hidden="true" />
                        </div>
                        <div className="doc-content">
                          <h4 className="doc-title">{doc.title}</h4>
                          <div className="doc-meta">
                            <span>{doc.size}</span>
                            <span>&bull;</span>
                            <span>{doc.date}</span>
                            <span>&bull;</span>
                            <span className="doc-owner-tag">
                              <i className="fas fa-user-circle" aria-hidden="true" /> {doc.uploader}
                            </span>
                          </div>
                          <div className="doc-actions">
                            <span className="doc-security-seal">
                              <i className="fas fa-lock" aria-hidden="true" /> {doc.badge}
                            </span>
                            <button
                              type="button"
                              className="doc-preview-trigger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc);
                              }}
                            >
                              <i className="fas fa-eye" aria-hidden="true" /> Preview
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* 3. The 3 Core FamDoc Superpowers */}
        <section className="landing-pillars-section" id="section-pillars" aria-labelledby="pillars-title">
          <div className="landing-container">
            <div className="section-header-block">
              <div className="section-pretitle">Engineered For Resilience</div>
              <h2 className="section-title" id="pillars-title">
                The Three Pillars of FamDoc
              </h2>
              <p className="section-subtitle">
                Built specifically to eliminate the frustrations of fragmented cloud drives, monthly subscriptions, and
                elder confusion.
              </p>
            </div>

            <div className="pillars-bento-grid">
              <article className="pillar-card">
                <div className="pillar-icon-badge badge-pool">
                  <i className="fas fa-cloud-upload-alt" aria-hidden="true" />
                </div>
                <h3 className="pillar-title">Multi-Account Drive Pooling</h3>
                <p className="pillar-desc">
                  Pool Mom, Dad, and Grandma's individual 15 GB Google Drive accounts into one combined, shared storage
                  volume. Expand capacity as your family grows with zero monthly subscription fees.
                </p>
                <ul className="pillar-feature-list">
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Zero monthly cloud subscription bills
                  </li>
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Transparent round-robin quota balancing
                  </li>
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Restricted <code>drive.file</code> permissions
                  </li>
                </ul>
              </article>

              <article className="pillar-card">
                <div className="pillar-icon-badge badge-failover">
                  <i className="fas fa-shield-virus" aria-hidden="true" />
                </div>
                <h3 className="pillar-title">Unbreakable Dual-Tier Vault</h3>
                <p className="pillar-desc">
                  Never lose a file during an upload. Direct uploads stream to Google Drive; if home Wi-Fi drops or API
                  quotas throttle, files immediately write to an encrypted local server disk cache and auto-promote when
                  reconnected.
                </p>
                <ul className="pillar-feature-list">
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Zero data loss during network outages
                  </li>
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Automatic background promotion queue
                  </li>
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Local encrypted failover disk cache
                  </li>
                </ul>
              </article>

              <article className="pillar-card">
                <div className="pillar-icon-badge badge-generations">
                  <i className="fas fa-users" aria-hidden="true" />
                </div>
                <h3 className="pillar-title">Engineered For Every Generation</h3>
                <p className="pillar-desc">
                  Grandparents onboard effortlessly with simple one-click family code stubs — no complex passwords.
                  Parents get one-touch biometric fingerprint lock on Android, and everyone enjoys lightning-fast web
                  previews.
                </p>
                <ul className="pillar-feature-list">
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Perforated family code stubs for elders
                  </li>
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> AndroidX Biometrics (Fingerprint / Face)
                  </li>
                  <li>
                    <i className="fas fa-check" aria-hidden="true" /> Sub-50ms cached preview engine
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* 4. Native Android App Showcase */}
        <section className="android-showcase-section" id="section-android" aria-labelledby="android-title">
          <div className="landing-container">
            <div className="android-showcase-card">
              <div className="android-info-content">
                <div className="android-badge-chip">
                  <i className="fab fa-android" aria-hidden="true" />
                  <span>Native Android App &bull; Kotlin &amp; Jetpack Compose</span>
                </div>
                <h2 className="android-headline" id="android-title">
                  Your Family Vault in Your Pocket
                </h2>
                <p className="android-text">
                  Experience FamDoc natively on Android. Built with Material 3 dynamic theming, offline-first cached
                  previews, camera document scanning, and hardware-backed biometric security.
                </p>

                <div className="android-highlights-grid">
                  <div className="android-highlight-item">
                    <i className="fas fa-fingerprint" aria-hidden="true" />
                    <div>
                      <div className="hl-title">Biometric Lock</div>
                      <div className="hl-sub">Instant Fingerprint &amp; Face Unlock</div>
                    </div>
                  </div>
                  <div className="android-highlight-item">
                    <i className="fas fa-hdd" aria-hidden="true" />
                    <div>
                      <div className="hl-title">Offline Cache</div>
                      <div className="hl-sub">View critical documents without Internet</div>
                    </div>
                  </div>
                  <div className="android-highlight-item">
                    <i className="fas fa-camera" aria-hidden="true" />
                    <div>
                      <div className="hl-title">Instant Camera Scan</div>
                      <div className="hl-sub">Snap certificates directly into the vault</div>
                    </div>
                  </div>
                  <div className="android-highlight-item">
                    <i className="fas fa-palette" aria-hidden="true" />
                    <div>
                      <div className="hl-title">Material You Design</div>
                      <div className="hl-sub">Royal Blue &amp; Obsidian Dark theme</div>
                    </div>
                  </div>
                </div>

                <div className="android-cta-box">
                  <a href="/apk/FamDoc.apk" download className="android-download-btn" id="btn-download-apk-card">
                    <i className="fas fa-download" aria-hidden="true" />
                    <span>Download FamDoc APK (v1.0)</span>
                  </a>
                  <span className="android-apk-details">Direct APK &bull; 19.6 MB &bull; Android 8.0+</span>
                </div>
              </div>

              {/* Android Phone Mockup Graphic */}
              <div className="android-phone-mockup" aria-hidden="true">
                <div className="phone-screen">
                  <div className="phone-status-bar">
                    <span>9:41 AM</span>
                    <span>
                      <i className="fas fa-wifi" /> <i className="fas fa-battery-full" />
                    </span>
                  </div>
                  <div className="phone-app-bar">
                    <span>
                      <i className="fas fa-shield-alt" /> FamDoc
                    </span>
                    <i className="fas fa-search" />
                  </div>
                  <div className="phone-doc-item">
                    <i className="fas fa-file-pdf" style={{ color: '#EF4444' }} />
                    <div>
                      <div>Ancestral Property Deed</div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-ink-muted)' }}>2.4 MB &bull; Verified</span>
                    </div>
                  </div>
                  <div className="phone-doc-item">
                    <i className="fas fa-image" style={{ color: '#3B82F6' }} />
                    <div>
                      <div>Grandparents Wedding 1968</div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-ink-muted)' }}>5.4 MB &bull; Restored</span>
                    </div>
                  </div>
                  <div className="phone-biometric-prompt">
                    <i className="fas fa-fingerprint" />
                    <span>Touch sensor to unlock private vault</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Family FAQ Accordion Section */}
        <section className="landing-faq-section" id="section-faq" aria-labelledby="faq-title">
          <div className="landing-container">
            <div className="section-header-block">
              <div className="section-pretitle">Transparency &amp; Trust</div>
              <h2 className="section-title" id="faq-title">
                Frequently Asked Questions
              </h2>
              <p className="section-subtitle">
                Clear, honest answers about privacy, pooling, outages, and family onboarding.
              </p>
            </div>

            <div className="faq-list-container">
              <details className="faq-card" open>
                <summary>
                  <span>How does FamDoc pool multiple Google Drive accounts without monthly fees?</span>
                  <i className="fas fa-chevron-down faq-chevron" aria-hidden="true" />
                </summary>
                <div className="faq-answer-content">
                  Google provides 15 GB of free cloud storage for every Google account. FamDoc connects to Mom, Dad,
                  and other family members' accounts using OAuth 2.0. Our backend storage manager aggregates these into
                  a unified volume (e.g. 3 accounts = 45 GB). Uploads are intelligently balanced across connected
                  accounts, giving your family abundant cloud storage at zero monthly subscription cost.
                </div>
              </details>

              <details className="faq-card">
                <summary>
                  <span>Can FamDoc read my personal Google Photos or existing Drive documents?</span>
                  <i className="fas fa-chevron-down faq-chevron" aria-hidden="true" />
                </summary>
                <div className="faq-answer-content">
                  <strong>No, absolutely not.</strong> FamDoc exclusively requests Google's restricted{' '}
                  <code>drive.file</code> OAuth scope. This strict permission physically prevents the application from
                  viewing, reading, or listing any photos, emails, or files not explicitly created or uploaded through
                  FamDoc. Your personal Drive stays completely untouched.
                </div>
              </details>

              <details className="faq-card">
                <summary>
                  <span>What happens if our home Wi-Fi drops while uploading large files?</span>
                  <i className="fas fa-chevron-down faq-chevron" aria-hidden="true" />
                </summary>
                <div className="faq-answer-content">
                  FamDoc is built with a dual-tier storage architecture. If Google Drive is unreachable or your internet
                  connection disconnects mid-upload, the file safely buffers to an encrypted local server disk cache (
                  <code>local_vault</code>). Once internet connectivity is restored, an asynchronous background queue
                  automatically promotes the file to your Google Drive pool with zero data loss.
                </div>
              </details>

              <details className="faq-card">
                <summary>
                  <span>How do elderly grandparents join without creating complex passwords?</span>
                  <i className="fas fa-chevron-down faq-chevron" aria-hidden="true" />
                </summary>
                <div className="faq-answer-content">
                  The vault organizer (such as a parent) generates a simple, perforated family code stub (e.g.,{' '}
                  <code>FAM-7K9W2X</code>). Grandparents simply enter this code on the Join screen or scan a QR code to
                  be instantly enrolled into the vault. No complicated password requirements, two-factor authenticator
                  apps, or confusing cloud setups.
                </div>
              </details>

              <details className="faq-card">
                <summary>
                  <span>What happens if a family member accidentally deletes an important deed?</span>
                  <i className="fas fa-chevron-down faq-chevron" aria-hidden="true" />
                </summary>
                <div className="faq-answer-content">
                  FamDoc incorporates non-destructive soft deletion. When a file is removed, it moves to the family
                  Recycle Bin where it is safely preserved with full recovery capability. Only designated vault
                  administrators have the authority to permanently purge records.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* 6. Call To Action Banner */}
        <section className="landing-cta-banner-section">
          <div className="landing-container">
            <div className="cta-banner-box">
              <h2 className="cta-banner-title">Give Your Family Records the Sanctuary They Deserve</h2>
              <p className="cta-banner-desc">
                Start pooling your family's storage today. Set up in less than two minutes, invite your loved ones, and
                keep your precious memories and vital papers safe for generations.
              </p>
              <div className="cta-banner-actions">
                <Link to="/register" className="cta-btn-light" id="btn-cta-register">
                  <i className="fas fa-plus-circle" aria-hidden="true" />
                  <span>Create Free Family Vault</span>
                </Link>
                <Link to="/join" className="cta-btn-ghost" id="btn-cta-join">
                  <i className="fas fa-key" aria-hidden="true" />
                  <span>Join Existing Family</span>
                </Link>
                <a href="/apk/FamDoc.apk" download className="cta-btn-ghost" id="btn-cta-apk">
                  <i className="fab fa-android" aria-hidden="true" />
                  <span>Download Android App</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Symmetrical Modern Footer */}
      <footer role="contentinfo" className="landing-footer-section">
        <div className="landing-container">
          <div className="footer-content-grid">
            <div className="footer-brand-column">
              <Link to="/" className="nav-brand-group">
                <div className="nav-brand-crest">
                  <img src="/img/logo.svg" alt="FamDoc Crest" className="nav-brand-logo" width="28" height="28" />
                </div>
                <div className="nav-brand-text">
                  <span className="nav-brand-name">
                    Fam<span className="accent">Doc</span>
                  </span>
                  <span className="nav-brand-tagline">Family Vault</span>
                </div>
              </Link>
              <p>
                Enterprise-grade, resilient family keepsake &amp; document vault platform with native Android
                biometrics and multi-account Google Drive storage pooling.
              </p>
            </div>

            <div className="footer-column-product">
              <div className="footer-column-title">Product</div>
              <ul className="footer-links-list">
                <li>
                  <Link to="/register">Create Vault</Link>
                </li>
                <li>
                  <Link to="/join">Join with Code</Link>
                </li>
                <li>
                  <Link to="/login">Sign In</Link>
                </li>
                <li>
                  <a href="/apk/FamDoc.apk" download>
                    Download Android APK
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-column-legal">
              <div className="footer-column-title">Legal &amp; Privacy</div>
              <ul className="footer-links-list">
                <li>
                  <a href="/privacy.html">Privacy Policy</a>
                </li>
                <li>
                  <a href="/terms.html">Terms of Service</a>
                </li>
                <li>
                  <a
                    href="https://developers.google.com/drive/api/guides/api-specific-auth"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google API Disclosure
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-column-author">
              <div className="footer-column-title">Author &amp; Source</div>
              <ul className="footer-links-list">
                <li>
                  <a href="https://portfolioakshay.in" target="_blank" rel="noopener noreferrer">
                    Author Portfolio
                  </a>
                </li>
                <li>
                  <a href="https://github.com/ra901625072-boop/FamDoc" target="_blank" rel="noopener noreferrer">
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn Profile
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div className="footer-author-attribution">
              Architected &amp; Engineered by <strong>Akshaysinh Rajput</strong> (MCA) &bull; FamDoc Platform v1.0
            </div>
            <div className="footer-social-chips">
              <a
                href="https://portfolioakshay.in"
                target="_blank"
                rel="noopener noreferrer"
                className="social-chip"
                aria-label="Portfolio"
              >
                <i className="fas fa-globe" aria-hidden="true" /> <span>Portfolio</span>
              </a>
              <a
                href="https://github.com/ra901625072-boop/FamDoc"
                target="_blank"
                rel="noopener noreferrer"
                className="social-chip"
                aria-label="GitHub"
              >
                <i className="fab fa-github" aria-hidden="true" /> <span>GitHub</span>
              </a>
              <a
                href="https://www.linkedin.com/in/akshaysinh-rajput-8a575532b/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-chip"
                aria-label="LinkedIn"
              >
                <i className="fab fa-linkedin" aria-hidden="true" /> <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Document Preview Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            className="vault-modal-overlay active"
            id="vaultPreviewModal"
            role="dialog"
            aria-modal="true"
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              className="vault-modal-box"
              variants={modalDialogVariants}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 id="modalDocTitle">{selectedDoc.title}</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  id="modalCloseBtn"
                  aria-label="Close preview modal"
                  onClick={() => setSelectedDoc(null)}
                >
                  <i className="fas fa-times" aria-hidden="true" />
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-preview-canvas">
                  <i className={selectedDoc.icon} id="modalDocIcon" aria-hidden="true" />
                  <h4 id="modalDocHeadline">{selectedDoc.title}</h4>
                  <p id="modalDocSummary">{selectedDoc.previewSummary}</p>
                </div>
                <div className="modal-meta-grid">
                  <div className="meta-row">
                    <span className="label">Vault Storage Node</span>
                    <span className="val" id="modalDocDrive">
                      {selectedDoc.drive}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Uploader</span>
                    <span className="val" id="modalDocUploader">
                      {selectedDoc.uploader}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="label">File Size</span>
                    <span className="val" id="modalDocSize">
                      {selectedDoc.size}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Security Seal</span>
                    <span className="val" id="modalDocSecurity">
                      Fernet AES-128 Encrypted
                    </span>
                  </div>
                  <div className="meta-row" style={{ gridColumn: 'span 2' }}>
                    <span className="label">Cryptographic Checksum</span>
                    <span className="val" id="modalDocSha" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {selectedDoc.sha}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>
                  Close
                </button>
                <Link to="/register" className="btn btn-primary" id="modalCtaBtn">
                  Secure Your Documents &rarr;
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
