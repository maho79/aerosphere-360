export interface HelpDefinition {
  title: { sk: string; en: string };
  desc: { sk: string; en: string };
}

export const HELP_DEFINITIONS: Record<string, HelpDefinition> = {
  nav_logo: {
    title: { sk: '360° Panorámy', en: '360° Panoramas' },
    desc: {
      sk: 'Návrat na domovskú stránku s interaktívnou mapou všetkých panorám.',
      en: 'Return to the home page with the interactive map of all panoramas.',
    },
  },
  nav_home: {
    title: { sk: 'Mapa', en: 'Map View' },
    desc: {
      sk: 'Zobrazí interaktívnu mapu s geografickým rozmiestnením sférických panorám.',
      en: 'Displays the interactive map showing the geographic locations of spherical panoramas.',
    },
  },
  nav_stats: {
    title: { sk: 'Štatistiky', en: 'Stats' },
    desc: {
      sk: 'Prehľad sledovanosti, rebríček panorám a odhad dátového trafficu v tuneli.',
      en: 'Overview of views, panorama rankings, and tunnel network data traffic estimation.',
    },
  },
  nav_whatsnew: {
    title: { sk: 'Čo je nové', en: "What's New" },
    desc: {
      sk: 'Zoznam najnovších pridaných panorám a prehľad nedávnych vylepšení.',
      en: 'List of newly added panoramas and overview of recent updates.',
    },
  },
  nav_help: {
    title: { sk: 'Sprievodca', en: 'User Guide' },
    desc: {
      sk: 'Textový manuál a často kladené otázky k používaniu prehliadača.',
      en: 'Text guide and frequently asked questions about using the viewer.',
    },
  },
  nav_about: {
    title: { sk: 'O projekte', en: 'About' },
    desc: {
      sk: 'Informácie o autorovi, použitých technológiách a pozadí projektu.',
      en: 'Information about the author, technology, and background of the project.',
    },
  },
  nav_lang: {
    title: { sk: 'Jazyk (SK / EN)', en: 'Language (EN / SK)' },
    desc: {
      sk: 'Okamžite prepína jazyk celého používateľského rozhrania medzi slovenčinou a angličtinou.',
      en: 'Instantly switches the entire user interface between Slovak and English.',
    },
  },
  nav_ui_help: {
    title: { sk: 'Nápoveda k prvkom (?)', en: 'UI Elements Guide (?)' },
    desc: {
      sk: 'Otvorí prehľadné okno s popisom všetkých aktívnych prvkov na aktuálnej obrazovke.',
      en: 'Opens an overview popup describing all active elements on the current screen.',
    },
  },
  nav_mobile_menu: {
    title: { sk: 'Mobilné menu', en: 'Mobile Menu' },
    desc: {
      sk: 'Otvorí navigačné menu a ďalšie možnosti pre mobilné zariadenia.',
      en: 'Opens the navigation dropdown and additional options for mobile devices.',
    },
  },
  sidebar_toggle: {
    title: { sk: 'Bočný panel filtrov', en: 'Sidebar Filters' },
    desc: {
      sk: 'Otvorí alebo skryje bočný panel s podrobnými filtrami a zoznamom panorám.',
      en: 'Opens or hides the sidebar panel with detailed filters and panorama list.',
    },
  },
  filter_search: {
    title: { sk: 'Vyhľadávanie', en: 'Search' },
    desc: {
      sk: 'Filtruje panorámy v reálnom čase podľa názvu mesta, krajiny alebo kľúčového slova.',
      en: 'Filters panoramas in real time by city, country, or keyword.',
    },
  },
  filter_years: {
    title: { sk: 'Filter rokov', en: 'Year Filter' },
    desc: {
      sk: 'Umožňuje vybrať jeden alebo viacero konkrétnych rokov nasnímania panorám.',
      en: 'Allows selecting one or multiple specific years of panorama capture.',
    },
  },
  filter_months: {
    title: { sk: 'Filter mesiacov', en: 'Month Filter' },
    desc: {
      sk: 'Filtruje zobrazenie podľa mesiaca v roku, kedy boli fotografie odfotené.',
      en: 'Filters the view by month of the year when the photos were taken.',
    },
  },
  filter_resolutions: {
    title: { sk: 'Filter rozlíšenia', en: 'Resolution Filter' },
    desc: {
      sk: 'Filtruje panorámy podľa kvality (15K+, 8K+, 6K+ a štandardné rozlíšenie).',
      en: 'Filters panoramas by quality (15K+, 8K+, 6K+, and standard resolution).',
    },
  },
  status_chips: {
    title: { sk: 'Počítadlo a filtre', en: 'Counter & Active Filters' },
    desc: {
      sk: 'Zobrazuje počet nájdených panorám a umožňuje rýchlo zrušiť filtre kliknutím na krížik.',
      en: 'Shows the number of matched panoramas and lets you dismiss filters by clicking X.',
    },
  },
  map_tiles_toggle: {
    title: { sk: 'Mapa / Dlaždice', en: 'Map / Tiles Toggle' },
    desc: {
      sk: 'Prepína medzi interaktívnou mapou s pinmi a prehľadnou mriežkou dlaždíc všetkých fotografií.',
      en: 'Switches between the interactive pin map and a grid of tiles for all photos.',
    },
  },
  map_tiles_group_toggle: {
    title: { sk: 'Zoskupenie dlaždíc (Miesto / Dátum)', en: 'Tiles Grouping (Location / Date)' },
    desc: {
      sk: 'Zoskupí dlaždice podľa lokality (a vnútorne zoradí podľa dátumu a času) alebo podľa jednotlivých dní (a vnútorne zoradí podľa lokality).',
      en: 'Groups tiles by location (sorted internally by date & time) or by individual days (sorted internally by location).',
    },
  },
  map_menu_dots: {
    title: { sk: 'Vrstvy mapy a zdieľanie', en: 'Map Layers & Share' },
    desc: {
      sk: 'Umožňuje prepnúť podklad mapy (satelit, terén, ulice) a skopírovať odkaz na aktuálny výrez.',
      en: 'Allows switching map base layer (satellite, terrain, street) and sharing the current view link.',
    },
  },
  map_reset_filters: {
    title: { sk: 'Resetovať filtre', en: 'Reset Filters' },
    desc: {
      sk: 'Zruší všetky aplikované filtre a zobrazí všetky panorámy na mape.',
      en: 'Clears all active filters and displays all panoramas on the map.',
    },
  },
  map_box_select: {
    title: { sk: 'Hromadný výber', en: 'Marquee Selection' },
    desc: {
      sk: 'Kliknutím a ťahaním myšou na mape označíte naraz viacero panorám na hromadné úpravy.',
      en: 'Click and drag on the map to select multiple panoramas for bulk actions.',
    },
  },
  viewer_title: {
    title: { sk: 'Lokalita a GPS', en: 'Location & GPS' },
    desc: {
      sk: 'Zobrazuje mesto, štát, dátum vytvorenia a priamy odkaz na GPS súradnice v Google Maps.',
      en: 'Shows city, country, capture date, and a direct link to GPS coordinates in Google Maps.',
    },
  },
  viewer_resolution: {
    title: { sk: 'Rozlíšenie v kvalite K', en: 'K Resolution Quality' },
    desc: {
      sk: 'Indikuje maximálne horizontálne rozlíšenie fotografie a stav streamovania plnej kvality.',
      en: 'Indicates the maximum horizontal resolution and full-quality streaming status.',
    },
  },
  viewer_info: {
    title: { sk: 'Informácie a EXIF', en: 'Info & EXIF' },
    desc: {
      sk: 'Otvorí okno s technickými detailmi, veľkosťou súboru a fotografickými parametrami.',
      en: 'Opens modal with technical details, file size, and photographic parameters.',
    },
  },
  viewer_little_planet: {
    title: { sk: 'Little Planet (Glóbus)', en: 'Little Planet Globe' },
    desc: {
      sk: 'Prepína zobrazenie medzi klasickým 360° pohľadom a sférickou miniatúrnou planétou.',
      en: 'Toggles between normal 360° perspective and stereographic mini planet globe.',
    },
  },
  viewer_export: {
    title: { sk: 'Exportovať 4K záber', en: 'Export 4K Photo' },
    desc: {
      sk: 'Vyexportuje a stiahne čistý 4K obrázok aktuálneho pohľadu alebo celej Little Planet gule bez ikoniek.',
      en: 'Exports and downloads a clean 4K photo of current view or full Little Planet globe without UI icons.',
    },
  },
  viewer_share: {
    title: { sk: 'Zdieľať panorámu', en: 'Share Panorama' },
    desc: {
      sk: 'Skopíruje priamy odkaz na túto konkrétnu panorámu vrátane aktuálneho jazyka.',
      en: 'Copies a direct link to this specific panorama including current language.',
    },
  },
  viewer_favorite: {
    title: { sk: 'Pridať do obľúbených', en: 'Add to Favorites' },
    desc: {
      sk: 'Uloží túto panorámu do vašich osobných obľúbených, aby ste sa k nej mohli kedykoľvek vrátiť.',
      en: 'Saves this panorama to your personal favorites so you can easily find it later.',
    },
  },
  viewer_comments: {
    title: { sk: 'Komentáre k panoráme', en: 'Panorama Comments' },
    desc: {
      sk: 'Zobrazí komentáre ostatných návštevníkov a umožní vám napísať vlastný postreh.',
      en: 'Displays comments from visitors and lets you write your own comment.',
    },
  },
  filter_favorites: {
    title: { sk: 'Filter obľúbených', en: 'Favorites Filter' },
    desc: {
      sk: 'Vyfiltruje a zobrazí iba panorámy, ktoré ste si uložili do obľúbených.',
      en: 'Filters and displays only panoramas that you have saved to your favorites.',
    },
  },
  viewer_autopan: {
    title: { sk: 'Automatická rotácia (Rotate)', en: 'Auto-Rotate (Rotate)' },
    desc: {
      sk: 'Spustí alebo pozastaví plynulé automatické otáčanie 360° panorámy.',
      en: 'Starts or pauses continuous smooth auto-rotation of the 360° panorama.',
    },
  },
  viewer_fullscreen: {
    title: { sk: 'Celá obrazovka', en: 'Fullscreen Mode' },
    desc: {
      sk: 'Prepne na celú obrazovku pre ničím nerušený pohlcujúci zážitok zo sférickej fotografie.',
      en: 'Switches to fullscreen mode for a distraction-free spherical photo experience.',
    },
  },
  viewer_filmstrip: {
    title: { sk: '30 najbližších panorám', en: '30 Closest Panoramas' },
    desc: {
      sk: 'Filmový pás geograficky najbližších panorám zoradených podľa vzdialenosti od aktuálnej.',
      en: 'Filmstrip of geographically closest panoramas sorted by distance from current.',
    },
  },
  viewer_more: {
    title: { sk: 'Viac akcií', en: 'More Actions' },
    desc: {
      sk: 'Otvorí rozbaľovacie menu s ďalšími nástrojmi a akciami pre mobilné zariadenia.',
      en: 'Opens dropdown menu with additional tools and actions on mobile.',
    },
  },
  map_timeline_clusters_toggle: {
    title: { sk: 'Filter časových osí', en: 'Timeline Clusters Filter' },
    desc: {
      sk: 'Zobrazí iba lokality s viacerými zábermi naprieč rôznymi kalendárnymi dňami a rokmi pre porovnanie v čase.',
      en: 'Displays exclusively locations with multi-temporal captures across distinct calendar days for historical comparison.',
    },
  },
  filter_timeline_clusters: {
    title: { sk: 'Zhluky časovej osi', en: 'Timeline Clusters' },
    desc: {
      sk: 'Filtruje panorámy patriace do časových klastrov (opakované návštevy lokality v rôznych dátumoch).',
      en: 'Filters panoramas belonging to timeline clusters (repeated visits across different dates).',
    },
  },
  viewer_calibration: {
    title: { sk: 'Admin kalibrácia clustra (Shift+C)', en: 'Admin Cluster Calibration (Shift+C)' },
    desc: {
      sk: 'Vizuálne zrovnanie azimutu dvoch snímok v reálnom čase pomocou 50% WebGL prekryvu.',
      en: 'Real-time visual heading alignment between two cluster captures using 50% WebGL overlay blend.',
    },
  },
};
