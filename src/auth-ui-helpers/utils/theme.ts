/**
 * Theme Utilities
 * Norwegian design system theme helpers
 * Enterprise Standards v4.0.0 compliant
 */

import type { AuthTheme } from '../types.js';

/**
 * Default Norwegian government theme
 */
export const norwegianTheme: AuthTheme = {
  colors: {
    primary: '#0054a6', // Norwegian blue
    secondary: '#f47920', // Norwegian orange
    error: '#ba3a26',
    warning: '#ff9100',
    success: '#4caf50',
    background: '#ffffff',
    text: '#212121',
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  borderRadius: '4px',
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px',
  },
};

/**
 * Dark theme variant
 */
export const darkTheme: AuthTheme = {
  ...norwegianTheme,
  colors: {
    ...norwegianTheme.colors,
    primary: '#4d9fff',
    background: '#121212',
    text: '#ffffff',
  },
};

/**
 * High contrast theme for accessibility
 */
export const highContrastTheme: AuthTheme = {
  ...norwegianTheme,
  colors: {
    primary: '#000000',
    secondary: '#000000',
    error: '#ff0000',
    warning: '#ff6600',
    success: '#008000',
    background: '#ffffff',
    text: '#000000',
  },
};

/**
 * Apply theme to CSS variables
 */
export function applyTheme(theme: AuthTheme): void {
  const root = document.documentElement;
  
  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--auth-color-${key}`, value);
  });
  
  // Fonts
  root.style.setProperty('--auth-font-body', theme.fonts.body);
  root.style.setProperty('--auth-font-heading', theme.fonts.heading);
  
  // Border radius
  root.style.setProperty('--auth-border-radius', theme.borderRadius);
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--auth-spacing-${key}`, value);
  });
}

/**
 * Get CSS for theme
 */
export function getThemeCSS(theme: AuthTheme): string {
  return `
    :root {
      /* Colors */
      --auth-color-primary: ${theme.colors.primary};
      --auth-color-secondary: ${theme.colors.secondary};
      --auth-color-error: ${theme.colors.error};
      --auth-color-warning: ${theme.colors.warning};
      --auth-color-success: ${theme.colors.success};
      --auth-color-background: ${theme.colors.background};
      --auth-color-text: ${theme.colors.text};
      
      /* Fonts */
      --auth-font-body: ${theme.fonts.body};
      --auth-font-heading: ${theme.fonts.heading};
      
      /* Border radius */
      --auth-border-radius: ${theme.borderRadius};
      
      /* Spacing */
      --auth-spacing-small: ${theme.spacing.small};
      --auth-spacing-medium: ${theme.spacing.medium};
      --auth-spacing-large: ${theme.spacing.large};
    }
    
    /* Base styles */
    .auth-login-form {
      font-family: var(--auth-font-body);
      color: var(--auth-color-text);
    }
    
    .auth-login-form .form-group {
      margin-bottom: var(--auth-spacing-medium);
    }
    
    .auth-login-form label {
      display: block;
      margin-bottom: var(--auth-spacing-small);
      font-weight: 500;
    }
    
    .auth-login-form input {
      width: 100%;
      padding: var(--auth-spacing-small) var(--auth-spacing-medium);
      border: 1px solid #ccc;
      border-radius: var(--auth-border-radius);
      font-size: 16px;
    }
    
    .auth-login-form button {
      padding: var(--auth-spacing-small) var(--auth-spacing-medium);
      border: none;
      border-radius: var(--auth-border-radius);
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .auth-login-form .submit-button {
      width: 100%;
      background-color: var(--auth-color-primary);
      color: white;
    }
    
    .auth-login-form .submit-button:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--auth-color-primary) 85%, black);
    }
    
    .auth-login-form .submit-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    /* Norwegian ID buttons */
    .norwegian-id-button {
      display: flex;
      align-items: center;
      gap: var(--auth-spacing-small);
      padding: var(--auth-spacing-small) var(--auth-spacing-medium);
      background-color: var(--primary-color);
      color: white;
      border: none;
      border-radius: var(--auth-border-radius);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .norwegian-id-button:hover:not(:disabled) {
      background-color: var(--hover-color);
    }
    
    .norwegian-id-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .norwegian-id-button .provider-logo {
      height: 24px;
      width: auto;
    }
    
    /* Session timer */
    .session-timer {
      display: inline-flex;
      align-items: center;
      gap: var(--auth-spacing-small);
      padding: 4px 12px;
      border-radius: var(--auth-border-radius);
      font-size: 14px;
    }
    
    .session-timer.normal {
      background-color: #e3f2fd;
      color: #1976d2;
    }
    
    .session-timer.warning {
      background-color: #fff3e0;
      color: #f57c00;
    }
    
    /* Session warning dialog */
    .session-warning-dialog {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .session-warning-dialog .dialog-overlay {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .session-warning-dialog .dialog-content {
      position: relative;
      background-color: var(--auth-color-background);
      padding: var(--auth-spacing-large);
      border-radius: var(--auth-border-radius);
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .session-warning-dialog h2 {
      margin: 0 0 var(--auth-spacing-medium);
      font-family: var(--auth-font-heading);
    }
    
    .session-warning-dialog .dialog-actions {
      display: flex;
      gap: var(--auth-spacing-small);
      margin-top: var(--auth-spacing-large);
    }
    
    .session-warning-dialog button {
      flex: 1;
      padding: var(--auth-spacing-small) var(--auth-spacing-medium);
      border: none;
      border-radius: var(--auth-border-radius);
      font-size: 16px;
      cursor: pointer;
    }
    
    .session-warning-dialog .button-primary {
      background-color: var(--auth-color-primary);
      color: white;
    }
    
    .session-warning-dialog .button-secondary {
      background-color: #e0e0e0;
      color: var(--auth-color-text);
    }
  `;
}