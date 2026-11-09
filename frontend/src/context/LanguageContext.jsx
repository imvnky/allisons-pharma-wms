import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../locales/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Default to Portuguese (Angola) with localStorage persistence
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("allisons_lang") || "pt";
  });

  const setLanguage = (lang) => {
    const validLang = lang === "en" ? "en" : "pt";
    localStorage.setItem("allisons_lang", validLang);
    setLanguageState(validLang);
  };

  /**
   * Translate a key path, e.g. t("counting.title") or t("warehouse")
   * Falls back gracefully to English or provided fallback string if missing.
   */
  const t = (path, fallback) => {
    if (!path) return fallback || "";
    const keys = path.split(".");

    // Try selected language
    let current = translations[language];
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        current = null;
        break;
      }
    }
    if (current !== null && current !== undefined) {
      return current;
    }

    // Fallback to English
    let fallbackObj = translations["en"];
    for (const key of keys) {
      if (fallbackObj && fallbackObj[key] !== undefined) {
        fallbackObj = fallbackObj[key];
      } else {
        fallbackObj = null;
        break;
      }
    }
    if (fallbackObj !== null && fallbackObj !== undefined) {
      return fallbackObj;
    }

    return fallback !== undefined ? fallback : path;
  };

  /**
   * Currency formatter for Angolan Kwanza (AOA / Kz)
   */
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    if (language === "pt") {
      return `${num.toLocaleString("pt-AO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kz`;
    }
    return `AOA ${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
