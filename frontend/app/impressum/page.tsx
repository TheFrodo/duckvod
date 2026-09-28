import type { Metadata } from "next";
import { Container, Title } from "@mantine/core";
import Link from "next/link";
import classes from "../legal/LegalPage.module.css";
import { LEGAL_LAST_UPDATED, OPERATOR } from "../legal/operator";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung von DuckVOD, einem Projekt der DuckSquad Community.",
  alternates: { canonical: "/impressum" },
};

export default function ImpressumPage() {
  return (
    <Container size="xl" className={classes.root}>
      <div className={classes.card}>
        <Title order={1} className="duck-section-title">Impressum</Title>

        <div className={classes.content}>
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            {OPERATOR.name}<br />
            {OPERATOR.street}<br />
            {OPERATOR.city}<br />
            {OPERATOR.country}
          </p>

          <h2>Kontakt</h2>
          <p>
            E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a><br />
            Telefon: {OPERATOR.phone}
          </p>

          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>{OPERATOR.responsible}</p>

          <h2>Über DuckVOD</h2>
          <p>
            DuckVOD ist eine Plattform zum Archivieren von Twitch-VODs und Livestreams mit einem
            Echtzeit-Chat-Erlebnis. Jedes Archiv enthält einen gerenderten Chat, der auch außerhalb
            von DuckVOD angesehen werden kann. Die Dateien werden in einem benutzerfreundlichen Format
            gespeichert, das eine Nutzung ohne DuckVOD ermöglicht. DuckVOD ist ein nicht-kommerzielles
            Projekt der DuckSquad Community.
          </p>

          <h2>Haftung für Inhalte</h2>
          <p>
            Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte
            fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
            rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
            von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
            diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir
            diese Inhalte umgehend entfernen.
          </p>

          <h2>Haftung für Links</h2>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
            Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter oder Betreiber
            der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
            mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zu diesem Zeitpunkt nicht
            erkennbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
            entfernen.
          </p>

          <h2>Urheberrecht</h2>
          <p>
            Die archivierten Streams, Videos, Vorschaubilder und Chatverläufe sind Inhalte der
            jeweiligen Kanalbetreiber und Chat-Teilnehmer und unterliegen deren Urheber- und
            Nutzungsrechten. Twitch ist eine Marke von Twitch Interactive, Inc.; DuckVOD steht in
            keiner Verbindung zu Twitch. Sollten Sie als Rechteinhaber der Meinung sein, dass ein
            Inhalt auf DuckVOD Ihre Rechte verletzt, kontaktieren Sie uns bitte unter der oben
            angegebenen E-Mail-Adresse. Wir entfernen betroffene Inhalte nach Prüfung umgehend.
          </p>

          <h2>Verbraucherstreitbeilegung</h2>
          <p>
            Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>

          <p>
            Informationen zum Umgang mit personenbezogenen Daten finden Sie in unserer{" "}
            <Link href="/datenschutz">Datenschutzerklärung</Link>.
          </p>

          <p className={classes.updated}>Stand: {LEGAL_LAST_UPDATED}</p>
        </div>
      </div>
    </Container>
  );
}
