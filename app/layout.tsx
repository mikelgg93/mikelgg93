import RouteLoader from "@/components/RouteLoader";
import Resume from "@/components/data/RESUME.json";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandMenu } from "@/components/ui/command-menu";
import type { Metadata } from "next";
import { Inter, Noto_Serif_Display } from "next/font/google";

// Import global CSS
import { Header } from "@/components/header";
import "./globals.css";

// Fonts
const inter = Inter({ subsets: ["latin"] });
const notoserif = Noto_Serif_Display({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${Resume.basics.name} | ${Resume.basics.summary}`,
  description: Resume.basics.summary,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={notoserif.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex h-full flex-col items-center bg-[radial-gradient(ellipse_at_top, _var(--tw-gradient-stops))] from-white to-slate-500">
            <RouteLoader />
            <Header />
            {children}
            <CommandMenu
              links={[
                {
                  url: "",
                  title: "Personal Website",
                },
              ]}
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
