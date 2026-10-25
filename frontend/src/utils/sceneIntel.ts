/**
 * sceneIntel.ts
 * AI & Semantic Scene Intelligence for 360° Panoramas (AeroSphere 360)
 * Detects atmospheric tags (sunset, winter, river, forest, heritage) and provides localized heritage stories.
 */

import type { Panorama } from '../types';

export type SceneMood =
  | 'sunset'
  | 'golden_hour'
  | 'noon'
  | 'night'
  | 'floods'
  | 'heritage'
  | 'winter'
  | 'water'
  | 'forest';

export interface SceneMoodFilter {
  id: SceneMood;
  labelSk: string;
  labelEn: string;
  icon: string;
  descriptionSk: string;
  descriptionEn: string;
}

export const SCENE_MOODS: SceneMoodFilter[] = [
  {
    id: 'sunset',
    labelSk: 'Západ slnka',
    labelEn: 'Sunset & Dusk',
    icon: '🌅',
    descriptionSk: 'Nízke večerné slnko na horizonte a súmrak',
    descriptionEn: 'Low sun near horizon and evening twilight',
  },
  {
    id: 'golden_hour',
    labelSk: 'Zlatá hodinka',
    labelEn: 'Golden Hour',
    icon: '✨',
    descriptionSk: 'Teplé mäkké zlatisté svetlo s dlhými tieňmi',
    descriptionEn: 'Warm golden glow and long cinematic shadows',
  },
  {
    id: 'noon',
    labelSk: 'Obedňajšie slnko',
    labelEn: 'Noon & Midday',
    icon: '☀️',
    descriptionSk: 'Jasné obedňajšie slnečné svetlo (11:30 – 13:30)',
    descriptionEn: 'Bright midday sunshine (11:30 – 13:30)',
  },
  {
    id: 'night',
    labelSk: 'Nočné panorámy',
    labelEn: 'Night & Stars',
    icon: '🌙',
    descriptionSk: 'Panorámy fotené po zotmení, nočné mestá a hviezdna obloha',
    descriptionEn: 'Nighttime captures, illuminated towns and twilight stars',
  },
  {
    id: 'floods',
    labelSk: 'Záplavy & Povodne',
    labelEn: 'Floods & High Water',
    icon: '🌊',
    descriptionSk: 'Záplavové vlny, povodne a vyliate koryto rieky Morava',
    descriptionEn: 'Floods, swollen Morava riverbanks and inundations',
  },
  {
    id: 'heritage',
    labelSk: 'Hrady & Pamiatky',
    labelEn: 'Castles & Heritage',
    icon: '🏰',
    descriptionSk: 'Hrady, zámky, kaštiele a historické dominanty (Devín, Pajštún...)',
    descriptionEn: 'Castles, ruins, chateaus and historic regional monuments',
  },
  {
    id: 'winter',
    labelSk: 'Zima & Sneh',
    labelEn: 'Winter & Snow',
    icon: '❄️',
    descriptionSk: 'Zasnežená krajina, mrazivá atmosféra a zimné mesiace',
    descriptionEn: 'Snowscapes and crisp winter atmosphere',
  },
  {
    id: 'water',
    labelSk: 'Rieka & Voda',
    labelEn: 'River & Water',
    icon: '🛶',
    descriptionSk: 'Rieka Morava, Dunaj, ramená, jazerá a lužné vody',
    descriptionEn: 'Morava river, Danube, oxbow lakes and wetlands',
  },
  {
    id: 'forest',
    labelSk: 'Lužný les & Karpaty',
    labelEn: 'Forest & Nature',
    icon: '🌲',
    descriptionSk: 'Lužné lesy, borovicové porasty, Malé Karpaty a chránené územia',
    descriptionEn: 'Floodplain forests, pine woods and nature reserves',
  },
];

function normalizeIntelText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detects matching scene moods for a given panorama based on sun data, date, time, tags, folder, and geolocation.
 */
export function detectPanoramaMoods(p: Panorama): SceneMood[] {
  const moods = new Set<SceneMood>();

  // 1. Sun & Elevation analysis
  let sunElev: number | null = null;
  if (p.sun_data?.astro_elevation !== undefined && p.sun_data.astro_elevation !== null) {
    sunElev = Number(p.sun_data.astro_elevation);
  }

  // Time & Month extraction
  const timeMatch = (p.date || '').match(/[T ](\d{2}):(\d{2})/);
  const hour = timeMatch ? parseInt(timeMatch[1], 10) : null;
  const minute = timeMatch ? parseInt(timeMatch[2], 10) : null;
  const timeDec = hour !== null ? hour + (minute || 0) / 60 : null;

  const monthMatch = (p.date || '').match(/-(\d{2})-/);
  const month = monthMatch ? parseInt(monthMatch[1], 10) : null;

  const corpus = normalizeIntelText(
    [
      p.city,
      p.title,
      p.folder,
      p.original_filename,
      p.original_filepath,
      p.filename,
      Array.isArray(p.custom_tags) ? p.custom_tags.join(' ') : p.custom_tags || '',
    ].join(' ')
  );

  // 1. Záplavy & Povodne (Floods)
  const floodKeywords = ['zaplav', 'povod', 'flood', 'inundat', 'vyliat', 'vysoka voda'];
  const isFloodPeriod =
    (p.date || '').startsWith('2024-09-1') ||
    (p.date || '').startsWith('2024-09-2') ||
    (p.date || '').startsWith('2020-10-1') ||
    (p.date || '').startsWith('2013-06-0');
  if (floodKeywords.some((kw) => corpus.includes(kw)) || (isFloodPeriod && corpus.includes('morav'))) {
    moods.add('floods');
  }

  // 2. Hrady & Pamiatky (Castles & Heritage)
  const castleKeywords = [
    'hrad',
    'castle',
    'pajstun',
    'devin',
    'cachtic',
    'beckov',
    'bran',
    'schloss',
    'zamok',
    'kastiel',
    'ruin',
    'ruina',
    'kaplnka',
    'kostol',
    'katedrala',
    'palac',
    'pamiatk',
  ];
  if (castleKeywords.some((kw) => corpus.includes(kw))) {
    moods.add('heritage');
  }

  // 3. Západ slnka & Súmrak (Sunset & Dusk)
  if (
    (sunElev !== null && sunElev >= -4 && sunElev <= 8) ||
    (sunElev === null && timeDec !== null && timeDec >= 17.5 && timeDec <= 20.5)
  ) {
    moods.add('sunset');
  }

  // 4. Zlatá hodinka (Golden Hour: warm low sun 4° to 18°)
  if (
    (sunElev !== null && sunElev >= 4 && sunElev <= 18) ||
    (sunElev === null &&
      timeDec !== null &&
      ((timeDec >= 16.5 && timeDec <= 19) || (timeDec >= 6 && timeDec <= 8.5)))
  ) {
    moods.add('golden_hour');
  }

  // 5. Obedňajšie slnko (Noon / Midday: 11:30 – 13:30 or peak elevation >= 52°)
  if ((timeDec !== null && timeDec >= 11.5 && timeDec <= 13.5) || (sunElev !== null && sunElev >= 52)) {
    moods.add('noon');
  }

  // 6. Nočné panorámy (Night & Stars: sun elevation < -6° or late hours 21:00 - 05:00)
  const nightKeywords = ['noc', 'night', 'stars', 'hviezdy', 'tma', 'vecer'];
  if (
    (sunElev !== null && sunElev < -6) ||
    (timeDec !== null && (timeDec >= 21.0 || timeDec <= 5.0)) ||
    nightKeywords.some((kw) => corpus.includes(kw))
  ) {
    moods.add('night');
  }

  // 7. Zima & Sneh (Winter & Snow)
  const winterKeywords = ['sneh', 'snow', 'zima', 'winter', 'mraz', 'lad', 'vlocky'];
  if ((month !== null && (month === 12 || month === 1 || month === 2)) || winterKeywords.some((kw) => corpus.includes(kw))) {
    moods.add('winter');
  }

  // 8. Rieka & Voda (River & Water)
  const waterKeywords = [
    'morava',
    'morave',
    'dunaj',
    'voda',
    'river',
    'water',
    'jazero',
    'rybnik',
    'rameno',
    'mrtverameno',
    'marchegg',
    'suchohrad',
    'angern',
  ];
  if (waterKeywords.some((kw) => corpus.includes(kw)) || moods.has('floods')) {
    moods.add('water');
  }

  // 9. Lužný les & Karpaty (Forest & Nature)
  const forestKeywords = [
    'les',
    'forest',
    'nature',
    'priroda',
    'chko',
    'karpaty',
    'sandberg',
    'kobyla',
    'strom',
    'borovic',
    'dub',
    'luhy',
  ];
  if (forestKeywords.some((kw) => corpus.includes(kw))) {
    moods.add('forest');
  }

  return Array.from(moods);
}

/**
 * Returns an enriched localized geographic & historical context story for the panorama.
 */
export function getPanoramaHeritageStory(p: Panorama, lang: 'sk' | 'en' = 'sk'): { title: string; story: string; highlights: string[] } {
  const isSk = lang.startsWith('sk');
  const city = (p.city || '').toLowerCase();
  const title = (p.title || '').toLowerCase();
  const folder = (p.folder || '').toLowerCase();
  const fullText = `${city} ${title} ${folder}`;

  if (fullText.includes('vysoká') || fullText.includes('vysoka')) {
    return {
      title: isSk ? 'Vysoká pri Morave & Lužné luhy' : 'Vysoká pri Morave & Floodplains',
      story: isSk
        ? 'Oblasť leží v srdci Chránenej krajinnej oblasti Záhorie pozdĺž meandrujúcej rieky Morava. Zábery zachytávajú lužné lesy, staré ramená a cyklotrasu Železnej opony (EuroVelo 13). Z výšky je nádherne vidno rakúske polia Marchfeldu a masív Malých Karpát na východe.'
        : 'Situated along the meandering Morava River within the Záhorie Protected Landscape Area. Captures pristine floodplain forests, oxbow lakes, and the Iron Curtain Trail (EuroVelo 13), with panoramic views of the Austrian Marchfeld and the Small Carpathians.',
      highlights: isSk
        ? ['CHKO Záhorie', 'EuroVelo 13 (Železná opona)', 'Rieka Morava (hranica s Rakúskom)', 'Bocianie hniezdiská']
        : ['Záhorie Nature Reserve', 'Iron Curtain Trail (EuroVelo 13)', 'Morava River Border', 'Stork Sanctuary'],
    };
  }

  if (fullText.includes('záhorská') || fullText.includes('zahorska')) {
    return {
      title: isSk ? 'Záhorská Ves – Najzápadnejší bod SR' : 'Záhorská Ves – Westernmost Slovakia',
      story: isSk
        ? 'Záhorská Ves je najzápadnejšou obcou Slovenskej republiky. Známa je medzinárodnou riečnou kompu spájajúcou Slovensko s rakúskou obcou Angern an der March. Panorámy ponúkajú unikátny pohľad na riečny hraničný priechod a zachované luhy.'
        : 'The westernmost municipality in Slovakia, famous for the international river ferry connecting Slovakia with Angern an der March, Austria. The aerial sphere shows the border river crossings and intact alluvial wetlands.',
      highlights: isSk
        ? ['Najzápadnejší bod Slovenska', 'Riečna kompa do Rakúska', 'Meandre Moravy', 'Rybárske revíry']
        : ['Westernmost Point of Slovakia', 'Cross-Border River Ferry', 'Morava River Meanders', 'Fishing Wetlands'],
    };
  }

  if (fullText.includes('devín') || fullText.includes('devin') || fullText.includes('sandberg')) {
    return {
      title: isSk ? 'Devín & Devínska Kobyla' : 'Devín Castle & Devínska Kobyla',
      story: isSk
        ? 'Miesto sútoku Dunaja a Moravy pod monumentálnou skalou hradu Devín. Z masívu Devínskej Kobyly (514 m n. m.) a pieskovcového vrchu Sandberg sa otvára jeden z najfascinujúcejších výhľadov v strednej Európe smerom na Viedeň a rakúske Alpy.'
        : 'The iconic confluence of the Danube and Morava rivers beneath the dramatic cliff of Devín Castle. Devínska Kobyla (514m) and the prehistoric marine sandstone Sandberg provide panoramic views across Vienna and the Austrian Alps.',
      highlights: isSk
        ? ['Sútok Dunaja a Moravy', 'Hrad Devín', 'Praveký útes Sandberg', 'Výhľad na rakúske Alpy']
        : ['Danube-Morava Confluence', 'Devín Castle', 'Prehistoric Sandberg Reef', 'Alps Horizon View'],
    };
  }

  if (fullText.includes('marchegg')) {
    return {
      title: isSk ? 'Marchegg & Bociania rezervácia' : 'Marchegg & Stork Reserve',
      story: isSk
        ? 'Rakúske mestečko Marchegg pri slovenskej hranici sa pýši najväčšou kolóniou bocianov bielych hniezdiacich na stromoch v strednej Európe a zrekonštruovaným barokovým zámkom Schloss Marchegg uprostred lužných lúk Marchauen.'
        : 'The historic Austrian border town boasting Central Europe’s largest tree-nesting white stork colony and the restored Baroque Schloss Marchegg amidst the Marchauen protected alluvial plains.',
      highlights: isSk
        ? ['Najväčšia kolónia bocianov v strednej Európe', 'Zámok Schloss Marchegg', 'Prírodná rezervácia Marchauen']
        : ['Central Europe Stork Colony', 'Baroque Schloss Marchegg', 'Marchauen Nature Reserve'],
    };
  }

  if (fullText.includes('stupava') || fullText.includes('borinka') || fullText.includes('pajštún') || fullText.includes('pajstun')) {
    return {
      title: isSk ? 'Stupava, Borinka & Hrad Pajštún' : 'Stupava, Borinka & Pajštún Castle',
      story: isSk
        ? 'Podhorie južných Malých Karpát so zrúcaninou stredovekého kráľovského pohraničného hradu Pajštún týčiaceho sa na vápencovom brale nad Borinkou, obklopené bukovými lesmi a stupavským kaštieľskym parkom.'
        : 'The foothills of the Small Carpathians featuring the medieval border stronghold ruin of Pajštún Castle perched on limestone cliffs, flanked by vast beech forests and historic Stupava manor park.',
      highlights: isSk
        ? ['Zrúcanina hradu Pajštún', 'Vápencové bralá Borinky', 'Kaštieľsky park Stupava', 'Malokarpatské lesy']
        : ['Pajštún Castle Ruin', 'Borinka Limestone Cliffs', 'Stupava Manor Park', 'Carpathian Woodlands'],
    };
  }

  if (fullText.includes('tatr') || fullText.includes('lomnic')) {
    return {
      title: isSk ? 'Vysoké Tatry & Podhorie' : 'High Tatras & Foothills',
      story: isSk
        ? 'Najvyššie pohorie Karpát s majestátnymi žulovými štítmi a ľadovcovými dolinami. Panorámy zachytávajú panoramatické výhľady na Lomnický a Slavkovský štít s rozsiahlymi lúkami podhoria.'
        : 'The highest range in the Carpathian Mountains with towering granite peaks and glacial valleys. Offers vistas towards Lomnický and Slavkovský peaks across pristine sub-montane meadows.',
      highlights: isSk
        ? ['Panoráma štítov Tatier', 'Lomnický štít v pozadí', 'Podtatranská kotlina']
        : ['High Tatras Skyline', 'Lomnický Peak Backdrop', 'Sub-Tatras Valley'],
    };
  }

  // Generic fallback with astronomical & spatial context
  const dateStr = (p.date || '').slice(0, 10);
  const widthK = p.width ? `${Math.round(p.width / 1000)}K` : '8K';
  return {
    title: isSk ? `${p.city || 'Panoráma'} • 360° Letecký Pohľad` : `${p.city || 'Panorama'} • 360° Aerial Sphere`,
    story: isSk
      ? `Sférická 360° letecká panoráma nasnímaná dronom vo vysokom rozlíšení ${widthK} (${p.width || 8192} × ${p.height || 4096} px). Zachytáva unikátnu perspektívu s presnou solárnou kalibráciou a orientáciou na svetové strany.`
      : `High-resolution ${widthK} aerial 360° spherical panorama captured via drone (${p.width || 8192} × ${p.height || 4096} px). Features true solar calibration and geographic alignment.`,
    highlights: isSk
      ? [`Dátum záberu: ${dateStr}`, `Ultra-rozlíšenie ${widthK}`, 'Solárna kalibrácia']
      : [`Captured on: ${dateStr}`, `${widthK} Ultra-Resolution`, 'Solar Calibration'],
  };
}
