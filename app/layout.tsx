import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriCare",
  description: "Nutritional assessment platform for nutrition professionals",
  manifest: "/manifest.webmanifest",
  applicationName: "NutriCare",
};

export const viewport: Viewport = {
  themeColor: "#247a4b",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
