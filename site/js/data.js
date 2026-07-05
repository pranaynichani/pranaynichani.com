// All site content lives here. Edit this file to add/update projects —
// every page (home, work, project, timeline) reads from it.
//
// Fields:
//   slug      — must match the image filename in assets/stills/
//   img       — image file extension
//   type      — 'feature' | 'series' | 'short' | 'commercial'
//   start/end — years on the career timeline (end defaults to year)
//   award     — short award label shown as a tag (or null)
//   laurels   — longer awards line for the project page (or null)
//   trailer   — YouTube/Vimeo embed URL (or null = no trailer button yet)
//   featured  — true = appears in Selected Work on the homepage

const PROJECTS = [
  {
    slug: "to-kill-a-tiger", title: "To Kill a Tiger", year: 2022, start: 2018, end: 2023,
    img: "jpg", type: "feature",
    role: "Media Specialist / Post-Production Coordinator / Assistant Editor",
    credit: "National Film Board | Notice Pictures · Dir: Nisha Pahuja · Editors: Dave Kazala, Mike Munn · Prod: Cornelia Principe, David Oppenheim",
    desc: "To Kill a Tiger follows Ranjit, a farmer in rural India, as he demands justice for his 13-year-old daughter after a brutal assault, defying deeply entrenched patriarchal traditions in a village where such advocacy is virtually unheard of.",
    award: "Academy Award nominee",
    laurels: "Nominated for Best Documentary Feature at the 96th Academy Awards. Winner of 20+ awards including Best Documentary at Palm Springs, Best Feature Length Documentary at the Canadian Screen Awards, and the TIFF Amplify Voices Award.",
    trailer: null, featured: true
  },
  {
    slug: "any-other-way-the-jackie-shane-story", title: "Any Other Way: The Jackie Shane Story", year: 2024,
    img: "jpg", type: "feature",
    role: "Lead Assistant Editor",
    credit: "Banger Films · Dir: Michael Mabbott · Editor: Mike Munn",
    desc: "The life of pioneering Black trans soul singer Jackie Shane, who captivated Toronto's music scene in the 1960s alongside Etta James and Little Richard before mysteriously vanishing on the cusp of stardom.",
    award: "Peabody Award winner",
    laurels: "Winner of a Peabody Award and the Rogers Best Canadian Documentary Award (Toronto Film Critics Association). Best Music Documentary at the Krakow Film Festival; IDA Award and Allan King Award nominations.",
    trailer: null, featured: true
  },
  {
    slug: "your-tomorrow", title: "Your Tomorrow", year: 2024,
    img: "jpg", type: "feature",
    role: "Assistant Editor",
    credit: "Dir: Ali Weinstein · Editor: Caitlin Durlak · Blue Ice Docs",
    desc: "An observational documentary following an eccentric group of park regulars and staff living out the final year of Ontario Place, Toronto's iconic waterfront park, as it faces a controversial transformation.",
    award: "TIFF People's Choice runner-up",
    laurels: "Premiered at TIFF 2024, where it won the People's Choice Documentary Award Runner-up.",
    trailer: null, featured: true
  },
  {
    slug: "dark-side-of-comedy", title: "Dark Side of Comedy", year: 2025, start: 2024, end: 2025,
    img: "png", type: "series",
    role: "Assistant Editor",
    credit: "Vice TV · Narrated by Dave Foley · From the creators of Dark Side of the Ring",
    desc: "A Vice TV series exploring the internal battles, addiction struggles, and tragic circumstances behind the laughter of legendary comedians including Chris Farley, Robin Williams, Richard Pryor, and Sam Kinison.",
    award: "CSA winner — Best Direction, Doc Series",
    laurels: "Winner of the Canadian Screen Award for Best Direction in a Documentary Series.",
    trailer: null, featured: true
  },
  {
    slug: "eye-of-the-hurricane", title: "Eye of the Hurricane", year: 2024,
    img: "jpg", type: "feature",
    role: "Additional Editor",
    credit: "The Red Car · Dir: Peter Thurling · Editor: Dave Kazala · Prod: Joan Schafer",
    desc: "Legendary boxer Rubin “Hurricane” Carter was a destroyer in the ring until 1966, when he was wrongfully imprisoned. Diagnosed with terminal cancer — sick but feisty — he brings his story full circle, fighting one final opponent.",
    award: null, laurels: null, trailer: null, featured: true
  },
  {
    slug: "it-happens-to-us", title: "It Happens to Us", year: 2023,
    img: "jpeg", type: "short",
    role: "Editor",
    credit: "Dir: Anubhav Singh · Canada Arts Council",
    desc: "The Baig sisters attempt to rescue their schizophrenic father, only to have their misfortune turn for the worst when they must rely on an emergency helpline.",
    award: "Best Canadian Short — IFFSA 2024",
    laurels: "Winner of Best Canadian Short Film at IFFSA Toronto 2024. Official selections at The Mosquers (Canada), SanGiò Verona Video Festival (Italy), and Slemani International Film Festival (Iraq).",
    trailer: null, featured: true
  },
  {
    slug: "black-life-a-canadian-history", title: "Black Life: Untold Stories", year: 2023, start: 2021, end: 2023,
    img: "jpg", type: "series",
    role: "Media Specialist / Assistant Editor",
    credit: "Studio 112 / CBC · Dir: Nadia Louis · Prod: Leslie Norville · Editor: Mike Munn",
    desc: "An eight-part CBC series reframing over 400 years of Black experiences in Canada — enslavement, empowerment, hip-hop culture, immigration, policing, and settlement. Premiered at TIFF 2023.",
    award: "CSA nominee",
    laurels: "Premiered at the 2023 Toronto International Film Festival. Canadian Screen Award nominations including Best Direction in a Documentary Series.",
    trailer: null, featured: false
  },
  {
    slug: "witness", title: "WITNESS", year: 2025, start: 2023, end: 2025,
    img: "png", type: "series",
    role: "Media Specialist / Assistant Editor",
    credit: "Scarborough Pictures / CBC Gem · Created by Amar Wala · Editor: Caitlin Durlak",
    desc: "A six-part CBC Gem series exploring some of the most riveting viral videos of our time through the eyes of the people who captured them. Premiered at Hot Docs 2023.",
    award: null, laurels: "Premiered at the 2023 Hot Docs Film Festival.", trailer: null, featured: false
  },
  {
    slug: "72-summit-series", title: "Summit '72", year: 2022,
    img: "jpg", type: "series",
    role: "Assistant Editor",
    credit: "Mercury Films / CBC · Dir/Prod: Nick de Pencier, Robert MacAskill, Ravi Baichwal · Editor: Mike Munn",
    desc: "A CBC series marking the 50th anniversary of the 1972 Canada–USSR Summit Series, with never-before-seen 16mm archival footage restored in 4K and interviews with Paul Henderson, Phil Esposito, Bobby Clarke, and Ken Dryden.",
    award: "CSA nominee",
    laurels: "Canadian Screen Award nomination for Best History Documentary Program or Series.",
    trailer: null, featured: false
  },
  {
    slug: "evil-by-design", title: "Evil By Design: Surviving Nygård", year: 2022,
    img: "jpeg", type: "series",
    role: "Lead Assistant Editor",
    credit: "Blue Ant Media · CBC/Starz · Dir: Deb Wainwright · Editors: Pamela Bayne, Deb Palloway, Barry McMann",
    desc: "A three-part investigative series examining decades of alleged abuse by fashion mogul Peter Nygård, featuring exclusive interviews with survivors, many speaking out for the first time.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "coven", title: "Coven", year: 2023,
    img: "jpg", type: "feature",
    role: "Assistant Editor",
    credit: "Dir: Rama Rau · Prod: Ed Barreveld · Editor: Rob Ruzic",
    desc: "Three millennial women who practice witchcraft, including musician Witch Prophet. Premiered at the 2023 Hot Docs Canadian International Documentary Festival.",
    award: null, laurels: "Premiered at Hot Docs 2023.", trailer: null, featured: false
  },
  {
    slug: "bodies-for-rent", title: "Bodies for Rent", year: 2024,
    img: "png", type: "feature",
    role: "Assistant Editor",
    credit: "90th Parallel / IJB · Dirs: John Choi, Habiba Nosheen, Anu Singh · Editor: Edwin Janzen · CBC The Passionate Eye",
    desc: "Inside the hidden world of pharmaceutical drug testing: two professional clinical trial subjects make their living renting out their bodies for experimental drugs, facing real medical risk.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "crush", title: "Crush: Message in a Bottle", year: 2024,
    img: "jpg", type: "feature",
    role: "Media Specialist / Assistant Editor",
    credit: "Red Queen Productions · Dir: Maya Gallus · Editor: Dave Kazala · Prod: Howard Fraiberg",
    desc: "The changing face of the wine industry through eco-minded artisanal winemakers in Ontario's Niagara region, over the course of one punishing harvest season. Premiered at Santa Barbara IFF 2024.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "bots", title: "Bots", year: 2025,
    img: "jpg", type: "short",
    role: "Assistant Editor",
    credit: "Dir/Editor: Rich Williamson · Prod: Shasha Nakhai",
    desc: "A wickedly sharp satirical short following a unit of dedicated bots scheming chaos and divisiveness from their office desks. Premiered at TIFF 2025.",
    award: "TIFF 2025",
    laurels: "Premiered at the 2025 Toronto International Film Festival.",
    trailer: null, featured: false
  },
  {
    slug: "bangla-surf-girls", title: "Bangla Surf Girls", year: 2021, start: 2019, end: 2021,
    img: "png", type: "feature",
    role: "Assistant Editor / Media Management / Subtitle Translation",
    credit: "Insync Media, Chicken and Egg Pictures · Dir: Elizabeth D. Costa · Prod: Lalita Krishna",
    desc: "Three teenage girls from Cox's Bazar, Bangladesh dare to determine their own futures by becoming the country's first women surfers.",
    award: "Multiple festival wins",
    laurels: "Best Documentary Feature at Bushwick and Coronado Island; Women in Surf Award (Portuguese Surf Festival); Best Canadian Feature (Vancouver Asian Film Festival).",
    trailer: null, featured: false
  },
  {
    slug: "the-long-weekend", title: "The Long Weekend", year: 2021,
    img: "png", type: "feature",
    role: "Assistant Editor",
    credit: "Feature documentary",
    desc: "On the busiest Labour Day weekend in Algonquin Park's history, first-time campers — a Zimbabwean-Canadian family and two gay immigrants — claim their space in the natural world.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "the-nine", title: "The Nine", year: 2016, start: 2014, end: 2016,
    img: "jpg", type: "feature",
    role: "Assistant Editor / Media Management",
    credit: "Dirs: Katy Grannan, Hannah Hughes · Editor: Stephen Berger · Prod: Marc Smolowitz",
    desc: "Celebrated photographer Katy Grannan's searing, nonjudgmental portrait of the drifters and hustlers of South Ninth Street in Modesto, California.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "illusion-bound", title: "Illusion BOUND", year: 2016,
    img: "png", type: "feature",
    role: "Editor",
    credit: "Dir: Jagdish Metla · Independent feature, India",
    desc: "Two strangers come together to stage an extreme protest against control of thought, feeling, and expression.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "art-school-of-horrors", title: "Art School of Horrors", year: 2015,
    img: "png", type: "short",
    role: "BTS Documentary Team Lead / Director",
    credit: "Dir: Thijs Bazelmans · EP: Roger Corman · Starring Jeffrey Combs",
    desc: "Behind the scenes of a horror-comedy where pretentious, bloodthirsty art comes to life — executive produced by the legendary Roger Corman.",
    award: null, laurels: null, trailer: null, featured: false
  },
  {
    slug: "commercial-work", title: "Commercial Work", year: 2025, start: 2016, end: 2025,
    img: "png", type: "commercial",
    role: "Editor / DP / Motion Graphics",
    credit: "GM · Chevrolet · Loblaws · Shoppers Drug Mart · Intel · NFB · Royal LePage · UHN and more",
    desc: "Documentary-style commercials, brand films, and motion graphics for major brands and agencies — including the BILD Award-winning Scout Condos campaign of real-people neighbourhood stories.",
    award: "BILD Award — Best Long Video",
    laurels: "Best Long Video, Marketing Category, BILD Awards 2019 (Scout Condos, LA Ads).",
    trailer: null, featured: false
  }
];

// Career timeline extras (non-project clips)
const TIMELINE_EXTRAS = [
  { title: "Teaching — Seneca DFI", detail: "Professor, Non-Fiction Editing", start: 2022, end: 2026, type: "teaching" },
  { title: "Transfer", detail: "Editor — Best Editing, Int'l British Film Fest 2020", start: 2020, end: 2020.9, type: "short" }
];

const TYPE_LABELS = { feature: "Feature", series: "Series", short: "Short", commercial: "Commercial", teaching: "Teaching" };
