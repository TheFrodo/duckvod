"use client"
import Link from 'next/link';
import { useState } from 'react';
import classes from './Footer.module.css';

// Hosting partner shown in the footer.
// The logo is served locally from frontend/public/images (no third-party request for visitors).
const HOSTING_PARTNER = {
  name: "Nexosystems",
  url: "https://nexo.systems/a/thefrodode",
  // light logo is shown on the dark color scheme, dark logo on the light color scheme
  logoLight: "/images/nexosystems-light.svg",
  logoDark: "/images/nexosystems-dark.svg",
};

export function Footer() {
  const [lightLogoFailed, setLightLogoFailed] = useState(false);
  const [darkLogoFailed, setDarkLogoFailed] = useState(false);

  const hostedBy = (
    <>
      <span className={classes.hostedLabel}>Hosted by</span>
      {!lightLogoFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={HOSTING_PARTNER.logoLight}
          alt={`${HOSTING_PARTNER.name} Logo`}
          className={`${classes.hostedLogo} ${classes.onDark}`}
          onError={() => setLightLogoFailed(true)}
        />
      )}
      {!darkLogoFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={HOSTING_PARTNER.logoDark}
          alt={`${HOSTING_PARTNER.name} Logo`}
          className={`${classes.hostedLogo} ${classes.onLight}`}
          onError={() => setDarkLogoFailed(true)}
        />
      )}
      {/* the logos already contain the name, only show it as text when no logo is available */}
      {lightLogoFailed && darkLogoFailed && (
        <span className={classes.hostedName}>{HOSTING_PARTNER.name}</span>
      )}
    </>
  );

  return (
    <footer className={classes.footer}>
      <div className={classes.inner}>
        <div className={classes.brand}>
          <span className={classes.brandText}>Duck<span className={classes.brandAccent}>VOD</span></span>
          <span className={classes.tagline}>Ein Projekt der DuckSquad Community</span>
        </div>

        {HOSTING_PARTNER.url ? (
          <a href={HOSTING_PARTNER.url} target="_blank" rel="noopener sponsored" className={classes.hosted}>
            {hostedBy}
          </a>
        ) : (
          <div className={classes.hosted}>{hostedBy}</div>
        )}

        <nav className={classes.links}>
          <Link href="/impressum" className={classes.link}>Impressum</Link>
          <Link href="/datenschutz" className={classes.link}>Datenschutz</Link>
        </nav>
      </div>
    </footer>
  );
}
