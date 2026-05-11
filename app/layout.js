import "./globals.css";

export const metadata = {
  title: "Airlines from UK airports",
  description: "Find which airlines fly from any UK airport.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
