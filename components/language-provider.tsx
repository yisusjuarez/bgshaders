"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SPANISH } from "@/lib/translations";

export type Language = "en" | "es";

const STORAGE_KEY = "loop-studio-language";

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (english: string) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved === "en" || saved === "es"
      ? saved
      : navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser preference is unavailable during server rendering
    setLanguage(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const chooseLanguage = (next: Language) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLanguage(next);
  };

  const t = useCallback(
    (english: string) => language === "es" ? SPANISH[english] ?? english : english,
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage: chooseLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
