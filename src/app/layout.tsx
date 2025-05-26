import type { Metadata } from "next";
import { Inter, Lora, Amiri_Quran, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";

// Light mode font (Parchment theme)
const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

// Dark mode font (Dark theme)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const amiri = Amiri_Quran({
  subsets: ['arabic'],
  variable: '--font-amiri',
  weight: "400",
  display: 'swap',
});

const arabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap'
});

export const metadata: Metadata = {
  applicationName: "Course Search Engine",
  title: {  
    template: "%s | Course Search Engine",
    absolute: 'Course Search Engine',
  },
  generator: "Next.js, Gemini, Tailwind, Shadcn",
  keywords: ["course", "AI", "search engine", "course creator", "learn", "education"],
  description: "Course Search Engine and Learn with AI-powered courses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning className={`${lora.variable} ${inter.variable} ${arabic.variable}`}>
      <body className="font-lora dark:font-inter">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}