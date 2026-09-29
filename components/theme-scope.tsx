import { derivePalette, paletteToCssVars } from "@/lib/theme";

/**
 * Scopes a derived palette to a subtree. Because the Tailwind colour aliases
 * read `var(--brand-*)`, dropping these variables on any element re-skins
 * everything below it — so many differently coloured profiles can live on the
 * same page.
 */
export function ThemeScope({
  mainColor,
  className,
  children,
}: {
  mainColor: string;
  className?: string;
  children: React.ReactNode;
}) {
  const palette = derivePalette(mainColor);

  return (
    <div
      style={paletteToCssVars(palette)}
      data-accent={palette.accent}
      className={className}
    >
      {children}
    </div>
  );
}
