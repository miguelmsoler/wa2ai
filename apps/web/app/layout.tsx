import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/context/theme-context";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "wa2ai - Dashboard",
  description: "WhatsApp to AI Agent Gateway - Manage connections and routes",
};

/**
 * Root layout component for the Next.js application.
 * 
 * Provides:
 * - HTML structure with theme support
 * - Font configuration (Outfit from Google Fonts)
 * - Theme provider for dark/light mode
 * - Toast notifications (Toaster component)
 * - Prevents hydration mismatch by applying theme before React hydration
 * 
 * The inline script in <head> applies theme class before React hydrates,
 * preventing flash of wrong theme on page load.
 * 
 * @param props - Root layout props
 * @param props.children - React children (page content)
 * @returns Root layout component with providers
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${outfit.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
