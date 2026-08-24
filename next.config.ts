import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextType} */
const nextConfig = {
  /* Vos options Next.js existantes si nécessaire */
};

export default withNextIntl(nextConfig);