import type { Metadata } from "next";
import { Container, Title } from "@mantine/core";
import { getLocale, getTranslations } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { getMainReleases } from "./releases";
import classes from "./ChangelogPage.module.css";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Neuerungen und Versionen von DuckVOD.",
  alternates: { canonical: "/changelog" },
};

export default async function ChangelogPage() {
  const t = await getTranslations("ChangelogPage");
  const locale = await getLocale();
  const releases = await getMainReleases();
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <Container size={900} className={classes.root}>
      <div className={classes.header}>
        <Title order={1} className="duck-section-title">{t("title")}</Title>
        <p className={classes.subtitle}>{t("subtitle")}</p>
      </div>

      {releases.length === 0 ? (
        <div className={classes.card}>{t("empty")}</div>
      ) : (
        <ol className={classes.timeline}>
          {releases.map((release, index) => (
            <li key={release.tag} className={classes.entry}>
              <article className={classes.card}>
                <header className={classes.entryHeader}>
                  <h2 className={classes.version}>{release.name}</h2>
                  {index === 0 && <span className={classes.latest}>{t("latest")}</span>}
                  {release.publishedAt && (
                    <time className={classes.date} dateTime={release.publishedAt}>
                      {date.format(new Date(release.publishedAt))}
                    </time>
                  )}
                </header>

                {release.body ? (
                  <div className={classes.body}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                        ),
                      }}
                    >
                      {release.body}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className={classes.noNotes}>{t("noNotes")}</p>
                )}

                <a href={release.url} target="_blank" rel="noopener noreferrer" className={classes.githubLink}>
                  {t("viewOnGithub")}
                </a>
              </article>
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}
