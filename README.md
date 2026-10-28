# PitlaneOne

[![Quality gate](https://github.com/IamRedi/pitlaneone/actions/workflows/quality.yml/badge.svg)](https://github.com/IamRedi/pitlaneone/actions/workflows/quality.yml)

**Werkstattsoftware mit einer eigenen öffentlichen Website für jeden Betrieb.** Kunden, Fahrzeuge, Termine, offene Arbeiten, Rechnungen, Zahlungen, Bestand und Thekenverkauf laufen in einer mandantenfähigen Next.js-/Supabase-Anwendung zusammen.

[English](README.en.md) · [Architektur](docs/ARCHITECTURE.md) · [Prüfstand](EVIDENCE.md) · [Lokal auswerten](docs/LOCAL_EVALUATION.md) · [Grenzen](docs/KNOWN_LIMITATIONS.md)

## Implementierter Umfang

| Bereich | Im Quellcode vorhanden |
| --- | --- |
| Betriebe und Team | Unternehmenskontext, Rollen, Einladungen, Datenbank-RLS und Capability-Grenzen |
| Werkstatt | Kunden, mehrere Fahrzeuge, Servicehistorie, Kilometerstand, offene Arbeit und strukturierte Arbeits-/Materialpositionen |
| Rechnungen | Ausgabe, Teilzahlungen, Erstattungs-/Storno-Verknüpfung, eingefrorene Rechnungsdaten, private PDF/XML-Ablage und Buchhaltungsexporte |
| Bestand und Verkauf | SKU-/Barcode-Suche, Wareneingang, Bestandsbewegungen, Thekenverkauf und Belege |
| Termine | Öffentliche Anfragen, Betriebszeiten, Kalender, Bestätigung und Konfliktprüfung |
| Website | Markenauftritt unter `/b/[slug]`, Bilder, Vorlagen, Katalog und Vorschau |
| Sprachen | Albanisch, Englisch, Deutsch, Italienisch, Türkisch und Polnisch |
| Abrechnung der Plattform | Produktspezifische Grants, Trial-/Demo-Zustände und vorbereitete Stripe-Checkout-, Portal- und signierte Webhook-Endpunkte |

Das Repository enthält auch eine optionale BusinessSite-Produktoberfläche mit getrennten Berechtigungen. Sie verwendet denselben Plattformkern; ein Grant für ein Produkt darf das andere nicht freischalten.

## Stand vom 28. Oktober 2026

Dies ist ein **Source-Available-Showcase eines weit entwickelten Pilotprodukts**, keine Freigabe für einen öffentlichen kommerziellen Betrieb. Der aktuelle Quellcode wurde geprüft und separat exportiert. Historische Pilotprüfungen sind von neuen Build-/Quellcodeprüfungen getrennt dokumentiert. Eine aktuelle Zahl aktiver Kunden wird nicht behauptet.

Die bisherige gehostete Weboberfläche antwortete bei der Prüfung, ihr Datenbankprojekt wurde vom Anbieter jedoch als **INACTIVE** gemeldet. Deshalb wird sie hier nicht als funktionsfähige Live-Demo verlinkt. Stripe-Livebetrieb, vollständige Kundenabläufe und Datenbankmigrationen wurden bei dieser Veröffentlichung nicht live ausgeführt. [EVIDENCE.md](EVIDENCE.md) nennt den genauen Umfang.

Bekannte offene Punkte sind unter anderem fehlende Checkout-Rückkehrseiten, ein Konflikt zwischen Kamera-Scanner und Permissions-Policy sowie die Wiederholbarkeit einer neueren Billing-Migration. Die Details stehen in [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md). Build-Erfolg und statische Vertragschecks sind keine vollständige Tenant-, Billing- oder Rechtsprüfung.

Die öffentliche Kopie aktualisiert die betroffenen Abhängigkeiten getrennt vom bestehenden Produkt. Der Produktionsabhängigkeits-Audit meldete danach **0 Befunde**; die Versionsänderungen und Grenzen stehen in [DEPENDENCY_REFRESH.md](docs/DEPENDENCY_REFRESH.md).

## Quellcode auswerten

Node.js 22 und npm verwenden:

```bash
git clone https://github.com/IamRedi/pitlaneone.git
cd pitlaneone/frontend
npm ci
npm run lint
npm run typecheck
npm run test:i18n
npm run test:business-site-engine
npm run test:billing-grants
npm run test:xrechnung
npm run test:auth-redirect
npm run test:invitation-error
npm run test:validation
npm run build
```

Zum Starten der öffentlichen Landingpage reicht `npm run start -- -p 3011` nach dem Build. Ein vollständiger Workspace benötigt eine **eigene isolierte Supabase-Umgebung**, Auth-Benutzer und das Schema. Die Landingpage enthält eine gestaltete Dashboard-Illustration; sie ist kein Beleg für eine authentifizierte Werkstatt-Sitzung. Siehe [LOCAL_EVALUATION.md](docs/LOCAL_EVALUATION.md).

## Aufbau

```text
frontend/app/                 App Router, Server Actions und API-Routen
frontend/components/          Werkstatt-, Website- und Formularoberflächen
frontend/lib/                 Company/Auth, Billing, Dokumente und Website-Engine
frontend/messages/            sechs Locale-Kataloge
frontend/scripts/             deterministische Checks und lokale Testwerkzeuge
supabase/migrations/          versionierte Tabellen, RLS und atomare RPCs
docs/SOURCE_SNAPSHOT.json      Hashes und explizite Exportanpassungen
```

Der Export hat eine eigene Git-Historie. Private Kundendaten, Datenbank-Dumps, echte Zugangsdaten, gehostete Testidentitäten, private Betriebsdokumente und interne Repository-Historie sind nicht enthalten. Ein persönlicher Legacy-Admin-Bootstrap wurde entfernt; Testadministratoren müssen bewusst in der eigenen Umgebung eingerichtet werden.

## Lizenz

Lesen und Evaluieren gemäß [LICENSE](LICENSE). Das ist keine allgemeine Produktions-, Änderungs- oder kommerzielle Nutzungslizenz. Abhängigkeiten und bestehende Asset-Rechte bleiben bei ihren jeweiligen Rechteinhabern; siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
