"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import en from "./en";
import ko from "./ko";
import zh from "./zh";
import ja from "./ja";
import fr from "./fr";
import es from "./es";
import pt from "./pt";
import de from "./de";
import ru from "./ru";

export type Lang = "en" | "zh" | "ja" | "fr" | "es" | "ko" | "pt" | "de" | "ru";

export const languages: Record<Lang, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  fr: "Français",
  es: "Español",
  ko: "한국어",
  pt: "Português",
  de: "Deutsch",
  ru: "Русский",
};

const dictionaries: Record<Lang, typeof en> = { en, ko, zh, ja, fr, es, pt, de, ru };

const supportedLangs = Object.keys(languages) as Lang[];

interface I18nContext {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContext>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): string | undefined {
  const result = path.split(".").reduce((curr, key) => curr?.[key], obj);
  return typeof result === "string" ? result : undefined;
}

function detectLanguage(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("soundril-lang");
  if (stored && supportedLangs.includes(stored as Lang)) return stored as Lang;
  const browserLang = navigator.language.toLowerCase();
  const match = supportedLangs.find(
    (l) => browserLang.startsWith(l) || browserLang.startsWith(l.split("-")[0])
  );
  return match ?? "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectLanguage());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("soundril-lang", newLang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value =
        getNestedValue(dictionaries[lang], key) ??
        getNestedValue(dictionaries.en, key) ??
        key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value!.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return value;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
