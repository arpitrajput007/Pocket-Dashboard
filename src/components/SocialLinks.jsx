import { useState } from 'react';

const SOCIALS = [
  {
    key: 'telegram',
    label: 'Telegram',
    href: 'https://t.me/PocketDashAI',
    color: '#26A5E4',
    glow: 'rgba(38,165,228,0.35)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18">
        <path d="M11.944 0A12 12 0 1 0 24 12 12 12 0 0 0 11.944 0zm5.878 8.18-2.013 9.488c-.147.658-.538.818-1.09.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.882.733z"/>
      </svg>
    ),
  },
  {
    key: 'x',
    label: 'X (Twitter)',
    href: 'https://x.com/PocketDashAI',
    color: '#e2e8f0',
    glow: 'rgba(226,232,240,0.25)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="17" height="17">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/PocketDashAI',
    color: '#E1306C',
    glow: 'rgba(225,48,108,0.35)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
];

/**
 * @param {{ size?: 'sm' | 'md', variant?: 'dark' | 'footer' }} props
 */
export default function SocialLinks({ size = 'md', variant = 'dark' }) {
  const dim = size === 'sm' ? 34 : 40;
  const [hovered, setHovered] = useState(null);

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? '10px' : '12px' }}
      role="list"
      aria-label="Social media links"
    >
      {SOCIALS.map(({ key, label, href, color, glow, icon }) => {
        const isHovered = hovered === key;
        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow us on ${label}`}
            title={`Follow us on ${label}`}
            role="listitem"
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${dim}px`,
              height: `${dim}px`,
              borderRadius: '10px',
              textDecoration: 'none',
              flexShrink: 0,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease',
              background: isHovered
                ? `rgba(255,255,255,0.07)`
                : variant === 'footer'
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isHovered ? color + '55' : 'rgba(255,255,255,0.08)'}`,
              color: isHovered ? color : '#64748b',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: isHovered ? `0 6px 20px ${glow}` : 'none',
            }}
          >
            {icon}
          </a>
        );
      })}
    </div>
  );
}
