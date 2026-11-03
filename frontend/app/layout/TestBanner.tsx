import { getTranslations } from 'next-intl/server';
import classes from './TestBanner.module.css';

// Test builds come from the dev branch (GIT_TAG=dev, set by the Docker build).
// SHOW_TEST_BANNER=true/false overrides the automatic detection.
function isTestBuild(): boolean {
  const override = process.env.SHOW_TEST_BANNER;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.GIT_TAG === "dev";
}

export async function TestBanner() {
  if (!isTestBuild()) return null;

  const t = await getTranslations("TestBanner");

  return (
    <div className={classes.banner} role="status">
      <span className={classes.label}>{t('label')}</span>
      <span className={classes.text}>{t('text')}</span>
    </div>
  );
}
