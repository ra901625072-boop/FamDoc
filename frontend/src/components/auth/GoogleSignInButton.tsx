import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
            }
          ) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  label?: string;
  inviteCode?: string;
  onError?: (errorMessage: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({
  label = 'Continue with Google',
  inviteCode,
  onError,
  disabled = false,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const hiddenGisRef = useRef<HTMLDivElement>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '880666730218-pibibmhfcervtnpu9jch00g6sc3jg2k5.apps.googleusercontent.com';

  const handleCredentialResponse = async (response: { credential: string }) => {
    if (!response.credential) {
      onError?.('No credential returned from Google.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.googleVerify(response.credential, inviteCode);
      setAuth(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed.';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Dynamically inject Google Identity Services SDK script
    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initGIS = () => {
      if (window.google?.accounts?.id && clientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (hiddenGisRef.current) {
            window.google.accounts.id.renderButton(hiddenGisRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: label.toLowerCase().includes('sign up') ? 'signup_with' : 'continue_with',
              shape: 'rectangular',
            });
          }
          setGisReady(true);
        } catch (e) {
          console.warn('Google Identity Services init warning:', e);
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => initGIS();
      document.body.appendChild(script);
    } else {
      if (window.google?.accounts?.id) {
        initGIS();
      } else {
        script.addEventListener('load', initGIS);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener('load', initGIS);
      }
    };
  }, [clientId, label, inviteCode]);

  const isIpAddress = typeof window !== 'undefined' && window.location.hostname === '127.0.0.1';

  const handleCustomButtonClick = () => {
    if (disabled || loading) return;

    // Google OAuth 2.0 policy strictly disallows IP addresses like 127.0.0.1.
    // If accessed via 127.0.0.1, automatically redirect to localhost so Google origin check passes.
    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      const targetUrl = new URL(window.location.href);
      targetUrl.hostname = 'localhost';
      window.location.href = targetUrl.toString();
      return;
    }

    if (hiddenGisRef.current) {
      // Find the rendered Google iframe button and trigger click
      const nativeBtn = hiddenGisRef.current.querySelector('div[role="button"]') as HTMLElement | null;
      if (nativeBtn) {
        nativeBtn.click();
        return;
      }
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      onError?.('Google Identity Services is initializing. Please try again in a moment.');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Hidden container where native Google button renders for accurate OAuth trigger */}
      <div
        ref={hiddenGisRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.001,
          pointerEvents: gisReady && !isIpAddress ? 'auto' : 'none',
          zIndex: 2,
          overflow: 'hidden',
        }}
      />

      {/* Styled FamDoc Design System button with official 4-color Google G icon */}
      <button
        type="button"
        id="btn-google-auth"
        onClick={handleCustomButtonClick}
        disabled={disabled || loading}
        className="google-sso-btn"
        aria-label={label}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <svg className="google-sso-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.03 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{loading ? 'Connecting with Google...' : label}</span>
      </button>
    </div>
  );
}
