import React from 'react';

type LogoProps = { className?: string; title?: string };

/** Official YouTube play-button mark (full colour). */
export const YouTubeLogo: React.FC<LogoProps> = ({ className = 'h-6 w-auto', title = 'YouTube' }) => (
  <svg viewBox="0 0 576 512" className={className} role="img" aria-label={title} focusable="false">
    <path
      fill="#FF0000"
      d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6C15 167.1 15 256 15 256s0 88.9 11.3 131.9c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-12.3c23.5-6.3 42-24.1 48.3-47.8C561 344.9 561 256 561 256s0-88.9-11.3-131.9z"
    />
    <path fill="#FFFFFF" d="M232 338V174l142 82-142 82z" />
  </svg>
);

/** Official TikTok music-note mark (cyan / magenta / black offsets). */
export const TikTokLogo: React.FC<LogoProps> = ({ className = 'h-6 w-auto', title = 'TikTok' }) => (
  <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title} focusable="false">
    <path
      fill="#25F4EE"
      d="M18.7 19.1v3.9a8.4 8.4 0 0 0-1.4-.1 8.6 8.6 0 0 0 0 17.2 8.5 8.5 0 0 0 2-.2 8.6 8.6 0 0 1-6.6-8.4 8.6 8.6 0 0 1 6-8.2v-4.2a12.6 12.6 0 0 1 .0 0z"
    />
    <path
      fill="#25F4EE"
      d="M28.4 4h-3.9c.1.6.2 1.2.4 1.8A9.6 9.6 0 0 0 28.4 11V4z"
    />
    <path
      fill="#FE2C55"
      d="M38 12.6v3.9a13.3 13.3 0 0 1-7.7-2.5v13.6a12.7 12.7 0 0 1-12.7 12.7c-.7 0-1.4-.1-2-.2a12.7 12.7 0 0 0 14.7-12.5V14a13.3 13.3 0 0 0 7.7 2.5v-3.9z"
    />
    <path
      fill="currentColor"
      d="M30.3 27.6V14a13.3 13.3 0 0 0 7.7 2.5v-3.9a9.6 9.6 0 0 1-6.1-3.2A9.6 9.6 0 0 1 28.9 4h-4.4v27.4a4.3 4.3 0 1 1-3-4.1v-4.2a8.6 8.6 0 1 0 8.8 8.6v-4.1z"
    />
  </svg>
);
