import { getTranslations } from 'next-intl/server';
import { isPrereleaseBuild } from '../changelog/releases';
import classes from './TestBanner.module.css';

type BannerKind = "test" | "prerelease";

// Test builds come from the dev branch (GIT_TAG=dev, set by the Docker build).
// Release tags marked as pre-release on GitHub show a pre-release banner.
// SHOW_TEST_BANNER=true/false overrides the automatic detection.
async function bannerKind(): Promise<BannerKind | null> {
  const override = process.env.SHOW_TEST_BANNER;
  if (override === "true") return "test";
  if (override === "false") return null;
  const tag = process.env.GIT_TAG;
  if (tag === "dev") return "test";
  return (await isPrereleaseBuild(tag)) ? "prerelease" : null;
}

export async function TestBanner() {
  const kind = await bannerKind();
  if (!kind) return null;

  const t = await getTranslations("TestBanner");

  return (
    <div className={classes.banner} role="status">
      <span className={classes.label}>{kind === "prerelease" ? t('prereleaseLabel') : t('label')}</span>
      <span className={classes.text}>{kind === "prerelease" ? t('prereleaseText') : t('text')}</span>
    </div>
  );
}
