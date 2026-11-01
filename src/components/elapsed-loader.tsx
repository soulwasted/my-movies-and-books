"use client";

import { useLoader } from "@/components/loader-provider";
import { LoaderVariant } from "@/components/loaders";

/**
 * Načítání s textem a počítadlem sekund, ať je vidět, že se něco děje a jak dlouho. Styl se volí v nastavení.
 * `steps` = skutečné kroky ze serveru (poslední právě běží).
 */
export function ElapsedLoader({
  label,
  steps,
  className = "",
}: {
  label: string;
  steps?: string[];
  className?: string;
}) {
  const { loader } = useLoader();

  return (
    <div role="status" className={`flex items-center text-sm text-muted-foreground ${className}`}>
      <LoaderVariant key={loader} id={loader} label={label} steps={steps} />
    </div>
  );
}
