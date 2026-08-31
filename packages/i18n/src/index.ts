export const supportedLocales = ['en', 'ar'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
