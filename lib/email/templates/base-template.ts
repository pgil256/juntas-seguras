/**
 * Base Email Template
 * Provides consistent styling and structure for all email templates
 */

export interface BaseTemplateOptions {
  title: string;
  previewText?: string;
  content: string;
  footerText?: string;
  ctaButton?: {
    text: string;
    url: string;
    color?: string;
  };
  showSocialLinks?: boolean;
}

// Brand colors
const colors = {
  primary: '#2563eb', // Blue-600
  primaryDark: '#1d4ed8', // Blue-700
  secondary: '#10b981', // Emerald-500
  text: '#1f2937', // Gray-800
  textLight: '#6b7280', // Gray-500
  background: '#f9fafb', // Gray-50
  white: '#ffffff',
  border: '#e5e7eb', // Gray-200
  success: '#059669', // Emerald-600
  warning: '#d97706', // Amber-600
  error: '#dc2626', // Red-600
};

// Generate the base template with all content wrapped
export function baseTemplate(options: BaseTemplateOptions): string {
  const {
    title,
    previewText,
    content,
    footerText,
    ctaButton,
    showSocialLinks = false,
  } = options;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://juntasseguras.com';
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  ${previewText ? `
  <!--[if !mso]><!-->
  <meta name="x-apple-disable-message-reformatting">
  <!--<![endif]-->
  <style>
    /* Hide preview text in email body */
    .preview-text {
      display: none;
      font-size: 1px;
      color: ${colors.background};
      line-height: 1px;
      max-height: 0px;
      max-width: 0px;
      opacity: 0;
      overflow: hidden;
    }
  </style>
  ` : ''}
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: ${colors.background};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    /* Button hover state for supported clients */
    .button:hover {
      background-color: ${colors.primaryDark} !important;
    }
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content {
        padding: 24px 16px !important;
      }
      .button {
        display: block !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background};">
  ${previewText ? `<span class="preview-text">${escapeHtml(previewText)}${'&nbsp;'.repeat(150)}</span>` : ''}

  <!-- Main container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${colors.background};">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Email content container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="container" style="max-width: 600px; background-color: ${colors.white}; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid ${colors.border};">
              <a href="${appUrl}" style="text-decoration: none;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${colors.primary};">
                  Juntas Seguras
                </h1>
              </a>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td class="content" style="padding: 40px;">
              ${content}

              ${ctaButton ? `
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(ctaButton.url)}"
                       class="button"
                       style="display: inline-block; padding: 14px 32px; background-color: ${ctaButton.color || colors.primary}; color: ${colors.white}; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; text-align: center;">
                      ${escapeHtml(ctaButton.text)}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${colors.background}; border-top: 1px solid ${colors.border}; border-radius: 0 0 12px 12px;">
              ${footerText ? `
              <p style="margin: 0 0 16px; font-size: 14px; color: ${colors.textLight}; text-align: center;">
                ${footerText}
              </p>
              ` : ''}

              ${showSocialLinks ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                  <td align="center">
                    <!-- Add social links here if needed -->
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 0; font-size: 12px; color: ${colors.textLight}; text-align: center;">
                &copy; ${currentYear} Juntas Seguras. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: ${colors.textLight}; text-align: center;">
                <a href="${appUrl}/settings" style="color: ${colors.textLight}; text-decoration: underline;">
                  Manage email preferences
                </a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Helper function to escape HTML
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper to create a styled heading
export function heading(text: string, level: 1 | 2 | 3 = 1): string {
  const sizes = { 1: '24px', 2: '20px', 3: '16px' };
  return `<h${level} style="margin: 0 0 16px; font-size: ${sizes[level]}; font-weight: 600; color: ${colors.text};">${escapeHtml(text)}</h${level}>`;
}

// Helper to create a paragraph
export function paragraph(text: string, options?: { muted?: boolean; centered?: boolean }): string {
  const color = options?.muted ? colors.textLight : colors.text;
  const align = options?.centered ? 'center' : 'left';
  return `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${color}; text-align: ${align};">${text}</p>`;
}

// Helper to create a highlighted box (for codes, important info)
export function highlightBox(content: string, variant: 'info' | 'success' | 'warning' | 'error' = 'info'): string {
  const bgColors = {
    info: '#eff6ff', // Blue-50
    success: '#ecfdf5', // Emerald-50
    warning: '#fffbeb', // Amber-50
    error: '#fef2f2', // Red-50
  };
  const borderColors = {
    info: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };
  return `
    <div style="margin: 24px 0; padding: 20px; background-color: ${bgColors[variant]}; border-left: 4px solid ${borderColors[variant]}; border-radius: 4px;">
      ${content}
    </div>
  `;
}

// Helper to create a large code display (for verification codes)
export function codeDisplay(code: string): string {
  return `
    <div style="margin: 24px 0; padding: 20px; background-color: ${colors.background}; border-radius: 8px; text-align: center;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${colors.primary}; font-family: monospace;">
        ${escapeHtml(code)}
      </span>
    </div>
  `;
}

// Helper to create a data row (label: value)
export function dataRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 8px 0; font-size: 14px; color: ${colors.textLight}; white-space: nowrap;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0 8px 16px; font-size: 14px; font-weight: 500; color: ${colors.text};">${escapeHtml(value)}</td>
    </tr>
  `;
}

// Helper to wrap data rows in a table
export function dataTable(rows: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      ${rows}
    </table>
  `;
}

// Helper to create a divider
export function divider(): string {
  return `<hr style="margin: 24px 0; border: none; border-top: 1px solid ${colors.border};" />`;
}

// Helper to create a link
export function link(text: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="color: ${colors.primary}; text-decoration: underline;">${escapeHtml(text)}</a>`;
}

// Helper to create an inline badge
export function badge(text: string, variant: 'default' | 'success' | 'warning' | 'error' = 'default'): string {
  const bgColors = {
    default: colors.background,
    success: '#d1fae5', // Emerald-100
    warning: '#fef3c7', // Amber-100
    error: '#fee2e2', // Red-100
  };
  const textColors = {
    default: colors.text,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };
  return `<span style="display: inline-block; padding: 4px 12px; background-color: ${bgColors[variant]}; color: ${textColors[variant]}; font-size: 12px; font-weight: 600; border-radius: 9999px;">${escapeHtml(text)}</span>`;
}

// Export colors for use in specific templates
export { colors };
