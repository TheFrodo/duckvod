import type { Metadata } from "next";
import { Container, Title } from "@mantine/core";
import Link from "next/link";
import classes from "../legal/LegalPage.module.css";
import { LEGAL_LAST_UPDATED, OPERATOR } from "../legal/operator";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzerklärung von DuckVOD: welche Daten wir verarbeiten, warum und welche Rechte Sie haben.",
  alternates: { canonical: "/datenschutz" },
};

export default function DatenschutzPage() {
  return (
    <Container size="xl" className={classes.root}>
      <div className={classes.card}>
        <Title order={1} className="duck-section-title">Datenschutzerklärung</Title>

        <div className={classes.content}>
          <h2>1. Verantwortlicher</h2>
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der
            Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <p>
            {OPERATOR.name}<br />
            {OPERATOR.street}<br />
            {OPERATOR.city}<br />
            {OPERATOR.country}<br />
            E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
          </p>
          <p>
            Weitere Angaben finden Sie im <Link href="/impressum">Impressum</Link>.
          </p>

          <h2>2. Allgemeines</h2>
          <p>
            DuckVOD ist eine nicht-kommerzielle Plattform der DuckSquad Community zum Archivieren von
            Twitch-VODs und Livestreams inklusive Chatverlauf. Wir verarbeiten personenbezogene Daten
            nur, soweit dies für den Betrieb der Website und unserer Funktionen erforderlich ist.
            Wir setzen <strong>keine</strong> Analyse-, Tracking- oder Werbedienste ein.
          </p>

          <h2>3. Hosting und Server-Logfiles</h2>
          <p>
            Beim Aufruf unserer Website werden durch den Webserver automatisch Informationen erfasst,
            die Ihr Browser übermittelt. Dazu gehören:
          </p>
          <ul>
            <li>IP-Adresse</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>aufgerufene Seite bzw. Datei</li>
            <li>Referrer-URL (die zuvor besuchte Seite)</li>
            <li>verwendeter Browser und Betriebssystem</li>
            <li>übertragene Datenmenge und HTTP-Statuscode</li>
          </ul>
          <p>
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes
            Interesse liegt in der sicheren und stabilen Bereitstellung der Website sowie in der
            Abwehr von Angriffen. Die Logfiles werden spätestens nach 14 Tagen gelöscht, sofern sie
            nicht zur Aufklärung eines konkreten Sicherheitsvorfalls benötigt werden.
          </p>

          <h2>4. Nutzerkonto und Anmeldung</h2>
          <p>
            Sie können ein Nutzerkonto anlegen. Dabei speichern wir Ihren Benutzernamen, Ihr Passwort
            (ausschließlich als kryptografischer Hash, nie im Klartext), Ihre Benutzerrolle sowie das
            Erstellungs- und Änderungsdatum des Kontos. Optional können Sie in Ihrem Profil eine
            Webhook-Adresse für Benachrichtigungen hinterlegen.
          </p>
          <p>
            Sofern die Anmeldung über einen externen Anmeldedienst (Single Sign-On) angeboten und von
            Ihnen genutzt wird, erhalten wir von diesem Dienst eine eindeutige Kennung und Ihren
            Benutzernamen. Für die Verarbeitung beim Anmeldedienst gilt dessen eigene
            Datenschutzerklärung.
          </p>
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhältnis). Die Daten werden
            gespeichert, bis Sie Ihr Konto löschen lassen. Eine Löschung können Sie jederzeit per
            E-Mail an uns beantragen.
          </p>

          <h2>5. Wiedergabefortschritt und Aufrufzahlen</h2>
          <p>
            Wenn Sie angemeldet sind, speichern wir zu jedem angesehenen Video Ihren
            Wiedergabefortschritt und ob Sie es zu Ende gesehen haben. So können Sie Videos später
            an derselben Stelle fortsetzen („Weiter ansehen“). Rechtsgrundlage ist Art. 6 Abs. 1
            lit. b DSGVO. Die Daten werden mit Ihrem Konto gelöscht.
          </p>
          <p>
            Zusätzlich zählen wir, wie oft ein Video auf DuckVOD abgespielt wurde. Dieser Zähler
            enthält keine Angaben dazu, wer das Video angesehen hat.
          </p>

          <h2>6. Cookies und lokale Speicherung</h2>
          <p>
            Wir verwenden ausschließlich technisch notwendige Cookies und Browser-Speicher. Eine
            Einwilligung ist dafür nach § 25 Abs. 2 Nr. 2 TDDDG nicht erforderlich.
          </p>
          <ul>
            <li>
              <code>session</code> (Cookie): hält Sie nach dem Login angemeldet. Das Cookie läuft
              nach 7 Tagen Inaktivität bzw. spätestens nach 30 Tagen ab und wird beim Abmelden
              gelöscht.
            </li>
            <li>
              <code>NEXT_LOCALE</code> (Cookie): speichert die von Ihnen gewählte Sprache.
            </li>
            <li>
              <code>auth-storage</code> und Einstellungen (Local Storage): speichern Ihren
              Anmeldestatus und Ihre Darstellungs- und Player-Einstellungen, z. B. Farbschema,
              Kinomodus oder Chat-Position.
            </li>
            <li>
              <code>ganymede-volume</code> (Local Storage): merkt sich die Lautstärke des Players.
            </li>
          </ul>
          <p>
            Die Daten im Local Storage verbleiben in Ihrem Browser und werden nicht an uns
            übertragen. Sie können sie jederzeit über die Einstellungen Ihres Browsers löschen.
          </p>

          <h2>7. Chat-Emotes und Badges von Drittanbietern</h2>
          <p>
            Beim Abspielen eines archivierten Chats werden Emotes und Abzeichen (Badges) direkt von
            den Servern der folgenden Anbieter in Ihren Browser geladen:
          </p>
          <ul>
            <li>Twitch Interactive, Inc., San Francisco, USA (static-cdn.jtvnw.net)</li>
            <li>BetterTTV (cdn.betterttv.net)</li>
            <li>FrankerFaceZ (cdn.frankerfacez.com)</li>
            <li>7TV (cdn.7tv.app)</li>
          </ul>
          <p>
            Dabei wird technisch bedingt Ihre IP-Adresse an den jeweiligen Anbieter übermittelt.
            Einige dieser Anbieter haben ihren Sitz außerhalb der EU, insbesondere in den USA.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in
            der originalgetreuen Darstellung des Chatverlaufs. Die Videos selbst, Vorschaubilder und
            Kanalbilder werden von unserem eigenen Server ausgeliefert.
          </p>

          <h2>8. Schriftarten</h2>
          <p>
            Die auf dieser Website verwendeten Schriftarten sind lokal eingebunden. Beim Seitenaufruf
            wird keine Verbindung zu Servern von Google oder anderen Schriftarten-Anbietern
            hergestellt.
          </p>

          <h2>9. Kontaktaufnahme</h2>
          <p>
            Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre Angaben zur Bearbeitung Ihrer
            Anfrage (Art. 6 Abs. 1 lit. f DSGVO). Die Daten werden gelöscht, sobald Ihre Anfrage
            abschließend bearbeitet ist und keine gesetzlichen Aufbewahrungspflichten bestehen.
          </p>

          <h2>10. Archivierte Inhalte</h2>
          <p>
            Die archivierten Streams und Chatverläufe stammen von öffentlich zugänglichen
            Twitch-Kanälen und können Benutzernamen und Nachrichten von Chat-Teilnehmern enthalten.
            Wenn Sie als Chat-Teilnehmer oder Kanalbetreiber die Entfernung Ihrer Daten wünschen,
            wenden Sie sich bitte an die oben genannte E-Mail-Adresse.
          </p>

          <h2>11. SSL-/TLS-Verschlüsselung</h2>
          <p>
            Diese Website nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Sie erkennen
            eine verschlüsselte Verbindung an „https://“ in der Adresszeile Ihres Browsers.
          </p>

          <h2>12. Ihre Rechte</h2>
          <p>Sie haben uns gegenüber folgende Rechte hinsichtlich Ihrer personenbezogenen Daten:</p>
          <ul>
            <li>Auskunft (Art. 15 DSGVO)</li>
            <li>Berichtigung (Art. 16 DSGVO)</li>
            <li>Löschung (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>
              Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
              (Art. 21 DSGVO)
            </li>
          </ul>
          <p>
            Zur Ausübung Ihrer Rechte genügt eine E-Mail an{" "}
            <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. Außerdem haben Sie das
            Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO),
            insbesondere in dem Bundesland Ihres Wohnsitzes oder unseres Sitzes.
          </p>

          <h2>13. Änderungen</h2>
          <p>
            Wir passen diese Datenschutzerklärung an, wenn sich unsere Datenverarbeitung oder die
            Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.
          </p>

          <p className={classes.updated}>Stand: {LEGAL_LAST_UPDATED}</p>
        </div>
      </div>
    </Container>
  );
}
