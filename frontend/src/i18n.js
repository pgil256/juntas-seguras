import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "src/locales/en/translation.json";
import esTranslation from "src/locales/es/translation.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      es: {
        translation: esTranslation
      }
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
