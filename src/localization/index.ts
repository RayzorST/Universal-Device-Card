import en from './en.json';
import ru from './ru.json';

export type Language = 'en' | 'ru';

const translations: Record<Language, any> = {
  en,
  ru,
};

export function getLocalizedString(lang: Language, key: string, params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = translations[lang] || translations.en;
  
  for (const k of keys) {
    if (!value || !value[k]) {
      console.warn(`Translation key not found: ${key} for language: ${lang}`);
      return key;
    }
    value = value[k];
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${key} for language: ${lang}`);
    return key;
  }
  
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
  }
  
  return value;
}

export function getLocalizedStringForHass(hass: any, key: string, params?: Record<string, string>): string {
  const lang = (hass?.locale?.language || 'en') as Language;
  return getLocalizedString(lang, key, params);
}

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function t(key: string, params?: Record<string, string>): string {
  return getLocalizedString(currentLanguage, key, params);
}