import Link from 'next/link';
import classes from './Footer.module.css';

export function Footer() {
  return (
    <footer className={classes.footer}>
      <div className={classes.inner}>
        <div className={classes.brand}>
          <span className={classes.brandText}>Duck<span className={classes.brandAccent}>VOD</span></span>
          <span className={classes.tagline}>Ein Projekt der DuckSquad Community</span>
        </div>
        <nav className={classes.links}>
          <Link href="/impressum" className={classes.link}>Impressum</Link>
          <Link href="/datenschutz" className={classes.link}>Datenschutz</Link>
        </nav>
      </div>
    </footer>
  );
}
