# WK 2026 poule – automatische live versie

Deze repository is opgezet voor **GitHub Pages + GitHub Actions**.

## Wat je krijgt
- **Automatische publicatie** van de website zodra je een nieuwe versie van `WK2026_poule_beheer.xlsx` naar de repository pusht.
- **Excel-achtige layout** met:
  - links alle wedstrijden, uitslagen en **alle voorspellingen onder elkaar**;
  - rechts een vaste kolom met de **stand**;
  - onderaan een vergelijking van de **bonusvragen**.

## Bestandsstructuur
- `src/` → bronbestanden van de site
- `generate_site.py` → leest het Excelbestand uit en bouwt `site/data.js`
- `site/` → publiceerbare output voor GitHub Pages
- `.github/workflows/deploy-pages.yml` → automatische deployment workflow
- `requirements.txt` → Python dependency (`openpyxl`)

## Ingebruikname in 6 stappen
1. Maak een **nieuwe GitHub repository** aan.
2. Upload **alle bestanden uit dit pakket** naar de repository.
3. Zet jouw Excelbestand in de root van de repo als `WK2026_poule_beheer.xlsx`.
4. Ga in GitHub naar **Settings → Pages**.
5. Kies bij **Source**: **GitHub Actions**.
6. Push naar `main`.

Daarna bouwt GitHub Actions automatisch de site en publiceert die op GitHub Pages.

## Hoe update je de website?
1. vervang `WK2026_poule_beheer.xlsx` in de repo door een nieuwe versie;
2. commit/push naar `main`;
3. GitHub Actions draait automatisch;
4. je website is bijgewerkt.

## Lokaal testen
```bash
python -m pip install -r requirements.txt
python generate_site.py
```
Open daarna `site/index.html` in je browser.

## Belangrijk
Deze opzet is **automatisch live na iedere push naar GitHub**.
Wil je later een versie die **rechtstreeks uit OneDrive / SharePoint / Excel Online** ververst zonder handmatig committen, dan kunnen we dit later uitbreiden met Power Automate of een kleine API-koppeling.
