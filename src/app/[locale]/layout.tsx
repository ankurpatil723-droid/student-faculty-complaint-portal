import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'RSCOE Student Grievance & Complaint Portal',
  description: 'JSPM Rajarshi Shahu College of Engineering, Tathawade, Pune. Grievance Redressal Portal.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  // Fetch messages for the current locale
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Modern Typography from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Tailwind CSS CDN for instant styling */}
        <script src="https://cdn.tailwindcss.com"></script>
        {/* Google Identity Services SDK */}
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="min-h-screen bg-[#020617] text-slate-100 antialiased font-['Inter',sans-serif]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
