import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Utilisation de getTranslations pour les Server Components asynchrones
  const t = await getTranslations("HomePage");

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center max-w-4xl mx-auto py-12">
      <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
        {t("title")} <span className="text-indigo-500">BAKUMELO</span>
      </h1>
      
      <p className="text-base sm:text-lg text-slate-400 max-w-xl mb-8 leading-relaxed">
        {t("subtitle")}
      </p>

      <div>
        <Link
          href={`/${locale}/dashboard/create`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 inline-block text-center cursor-pointer"
        >
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}