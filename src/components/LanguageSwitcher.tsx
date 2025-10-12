import React from 'react';
import { useSafeTranslation } from '@/utils/safeTranslation';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n, t } = useSafeTranslation();

  const toggleLanguage = () => {
    if (!i18n || !i18n.language) return;
    const newLang = i18n.language === 'en' ? 'ru' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ease-out hover:scale-[1.03] text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      aria-label={t('language.selectLanguage')}
      title={t('language.selectLanguage')}
    >
      <Languages className="w-5 h-5" />
      <span className="text-sm font-medium uppercase">{i18n?.language || 'en'}</span>
    </button>
  );
}

