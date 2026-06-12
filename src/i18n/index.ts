import en from './en.json';
import ru from './ru.json';

export type Locale = 'en' | 'ru';

const dictionaries: Record<Locale, Record<string, string>> = { en, ru };

let current: Locale = 'en';

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Все строки UI — только через t(), никаких строк в JSX. */
export function t(key: string): string {
  return dictionaries[current][key] ?? key;
}
