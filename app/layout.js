import './globals.css'

export const metadata = {
  title: 'LinkedIn Profile Scraper',
  description: 'A tool to scrape LinkedIn profile data',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
} 