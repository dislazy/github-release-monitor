import { getTranslations } from "next-intl/server";
import { getUpdateNotificationState } from "@/app/actions";
import { AutoRefresher } from "@/components/auto-refresher";
import { BackToTopButton } from "@/components/back-to-top-button";
import { Header } from "@/components/header";
import { HomePageClient } from "@/components/home-page-client";
import { getRepositories } from "@/lib/repository-storage";
import { getSettings } from "@/lib/settings-storage";
import type { AppSettings, EnrichedRelease, GithubRelease, Repository } from "@/types";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  let repositories: Repository[] = [];
  let releases: EnrichedRelease[] = [];
  let resolvedError: string | null = null;
  const lastUpdated = new Date();
  let settings: AppSettings;

  try {
    settings = await getSettings();
    repositories = await getRepositories();
    if (repositories.length > 0) {
      releases = repositories.map((repo) => {
        const cached = repo.latestRelease;
        const reconstructedRelease: GithubRelease | undefined = cached
          ? { ...cached, id: 0, prerelease: false, draft: false }
          : undefined;

        return {
          repoId: repo.id,
          repoUrl: repo.url,
          release: reconstructedRelease,
          isNew: repo.isNew,
          repoSettings: {
            releaseChannels: repo.releaseChannels,
            preReleaseSubChannels: repo.preReleaseSubChannels,
            releasesPerPage: repo.releasesPerPage,
            includeRegex: repo.includeRegex,
            excludeRegex: repo.excludeRegex,
            appriseTags: repo.appriseTags,
            appriseFormat: repo.appriseFormat,
          },
          newEtag: repo.etag,
        };
      });
    }
  } catch (error) {
    settings = {
      timeFormat: "24h",
      locale: "en",
      refreshInterval: 10,
      cacheInterval: 5,
      releaseChannels: ["stable"],
      preReleaseSubChannels: [],
      showAcknowledge: true,
      showMarkAsNew: true,
      releasesPerPage: 30,
      parallelRepoFetches: 1,
      appriseMaxCharacters: 1800,
      appriseTags: undefined,
      appriseFormat: "text",
      includeRegex: undefined,
      excludeRegex: undefined,
    };
    resolvedError = t("load_error");
  }

  const updateNotice = await getUpdateNotificationState();

  return (
    <div className="min-h-screen w-full">
      <AutoRefresher intervalMinutes={settings.refreshInterval} />
      <Header locale={locale} updateNotice={updateNotice} />
      <main className="container mx-auto px-4 py-8 md:px-6">
        <HomePageClient
          repositories={repositories}
          releases={releases}
          settings={settings}
          error={resolvedError}
          lastUpdated={lastUpdated}
          locale={locale}
        />
      </main>
      <BackToTopButton />
    </div>
  );
}
