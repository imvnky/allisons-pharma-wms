import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../locales/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Default to English with localStorage persistence
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("allisons_lang") || "en";
  });

  const setLanguage = (lang) => {
    const validLang = lang === "pt" ? "pt" : "en";
    localStorage.setItem("allisons_lang", validLang);
    setLanguageState(validLang);
  };

  /**
   * Translate a key path, e.g. t("counting.title") or t("warehouse")
   * Supports fallback, key aliasing (common.x <-> x), and template variable interpolation {var}
   */
  const t = (path, fallback, params = {}) => {
    if (!path) return fallback || "";

    const resolve = (dict, keyPath) => {
      if (!dict) return undefined;
      const parts = keyPath.split(".");
      let cur = dict;
      for (const p of parts) {
        if (cur && cur[p] !== undefined) {
          cur = cur[p];
        } else {
          return undefined;
        }
      }
      return cur;
    };

    let result = resolve(translations[language], path);

    // If not found, check common.* alias or root alias
    if (result === undefined) {
      if (path.startsWith("common.")) {
        result = resolve(translations[language], path.replace(/^common\./, ""));
      } else {
        result = resolve(translations[language], `common.${path}`);
      }
    }

    // Fallback to English
    if (result === undefined) {
      result = resolve(translations["en"], path);
      if (result === undefined) {
        if (path.startsWith("common.")) {
          result = resolve(translations["en"], path.replace(/^common\./, ""));
        } else {
          result = resolve(translations["en"], `common.${path}`);
        }
      }
    }

    let finalStr = result !== undefined ? result : (fallback !== undefined ? fallback : path);

    // Interpolate template parameters like {count}, {warehouse}, etc.
    if (typeof finalStr === "string" && params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        finalStr = finalStr.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      }
    }

    return finalStr;
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

