/* =====================================================================
   DELIQUENTE PENSAMIENTO — DEFAULT SEED DATA
   ---------------------------------------------------------------------
   ეს არის საიტის "ქარხნული" შიგთავსი. ადმინ-პანელიდან შეტანილი
   ცვლილებები ინახება ბრაუზერში (localStorage). რომ ცვლილებები ყველა
   ვიზიტორმა დაინახოს — ადმინ-პანელში დააჭირე "Export JSON" და ჩაანაცვლე
   ამ ფაილში DEFAULT_DATA-ს მნიშვნელობა (ან ატვირთე GitHub-ზე).
   ===================================================================== */

const DEFAULT_DATA = {
  meta: {
    siteTitle: "DELIQUENTE PENSAMIENTO",
    navTitle: "SABA BEZHASHVILI",
    navSubtitle: "DELIQUENTE PENSAMIENTO",
    city: "TBILISI · GE",
    hiddenSections: [],
    // ⚠️ ეს მსუბუქი დაცვაა (კლიენტის მხარეს). შეცვალე შენთვის სასურველი პაროლით.
    adminPassword: "saba2026"
  },

  worksSection: {
    heading: "Featured\nWorks",
    tagline: "A living archive — click any piece to step inside it."
  },

  hero: {
    eyebrow: "CONTEMPORARY PAINTER · VISUAL ARTIST · TBILISI",
    name: "SABA\nBEZHASHVILI",
    role: "Visual Artist / Painter",
    statement: "Art exists between memory, emotion and chaos.",
    btnPrimary: "View Portfolio",
    btnSecondary: "Contact",
    featuredWorkId: "w01",
    /* sliderWorkIds: [] = show all works; [...] = show only chosen works in that order */
    sliderWorkIds: []
  },

  /* ---- PURCHASE REQUESTS ------------------------------------------
     Filled client-side when a visitor clicks "Buy" on a work detail.
     Admin views these in the ◉ შეკვეთები panel.
     ----------------------------------------------------------------- */
  purchaseRequests: [],

  about: {
    heading: "ABOUT THE ARTIST",
    portraitWorkId: "w17",
    bioTitle: "Biography",
    bio: "Saba Bezhashvili is a contemporary painter working between raw figuration and symbolic abstraction. Born and based in Tbilisi, he builds dense visual worlds where faces, eyes and scrawled words collide — half memory, half dream. His work sits at the intersection of Neo-Expressionism and street-art language: fast, instinctive, unfiltered.",
    philosophyTitle: "Artistic Philosophy",
    philosophy: "I paint the noise inside the head before it organises itself into sense. Every mark is a small confession. The arrow, the open eye, the scrawled word — these are not decoration, they are a private alphabet for things that words refuse to hold.",
    influencesTitle: "Influences",
    influences: "Jean-Michel Basquiat · Cy Twombly · Outsider & graffiti art · Georgian folk symbolism · jazz improvisation · the texture of city walls.",
    processTitle: "Creative Process",
    process: "Work begins without a plan — a stain, a line, a word. Layers are built and destroyed until something stares back. The unfinished is kept on purpose: the scratch, the drip and the correction are the truest part of the picture.",
    studioNote1: "in the studio",
    studioNote2: "↳ memory & chaos",
    notes: ["fast hand", "no plan", "keep the mistake", "let it breathe"]
  },

  studio: {
    heading: "STUDIO / PROCESS",
    intro: "Behind the surface — sketches, layers, materials and the mess that makes the work.",
    captions: [
      { workId: "w13", label: "First marks — chalk on blue ground" },
      { workId: "w06", label: "Building the symbol field" },
      { workId: "w14", label: "Cut-outs & hands study" },
      { workId: "w15", label: "Colour blocking session" },
      { workId: "w11", label: "Floating city — pencil stage" },
      { workId: "w18", label: "Late night, last layer" }
    ]
  },

  exhibitions: {
    heading: "EXHIBITIONS & AWARDS",
    items: [
      { year: "2025", type: "Solo", title: "DELIQUENTE PENSAMIENTO", venue: "Project Space, Tbilisi" },
      { year: "2024", type: "Group", title: "Raw Tongues — New Expressionists", venue: "Gallery 4710, Tbilisi" },
      { year: "2024", type: "Award", title: "Emerging Painter Prize — Shortlist", venue: "Caucasus Art Foundation" },
      { year: "2023", type: "Residency", title: "Studio Residency", venue: "Batumi Art House" },
      { year: "2023", type: "Group", title: "Symbols & Static", venue: "Window Project, Tbilisi" },
      { year: "2022", type: "Publication", title: "Feature — New Georgian Painting", venue: "Indigo Magazine" }
    ]
  },

  journal: {
    heading: "JOURNAL",
    intro: "Notes from the studio — fragments, thoughts, process.",
    posts: [
      { tag: "PROCESS", title: "Why I keep the mistake", excerpt: "The correction is more honest than the line it tried to fix. A short note on leaving the scaffolding visible.", date: "MAY 2026", workId: "w08" },
      { tag: "SYMBOL", title: "A private alphabet", excerpt: "On the marks we invent to name what words refuse to hold.", date: "APR 2026", workId: "w01" },
      { tag: "NOTE", title: "Painting the noise", excerpt: "On working before the idea arrives — instinct over intention.", date: "MAR 2026", workId: "w19" }
    ]
  },

  contact: {
    heading: "LET'S MAKE\nSOMETHING",
    intro: "Commissions, exhibitions, studio visits — the door is open.",
    email: "studio@deliquentepensamiento.art",
    instagram: "@deliquente.pensamiento",
    instagramUrl: "https://instagram.com/",
    behance: "behance.net/deliquente",
    behanceUrl: "https://behance.net/",
    formNote: "Commission request"
  },

  photography: {
    heading: "PHOTOGRAPHY",
    intro: "Through the lens — moments, places, light.",
    photos: []
  },

  bgFrags: {
    items: []
  },

  works: [
    { id:"w01", img:"images/Bed.jpg",               title:"BED",                  year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w02", img:"images/Dab629.jpg",            title:"DAB",                  year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w03", img:"images/IMG_0023.JPG",          title:"WORK 03",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w04", img:"images/IMG_0034.JPG",          title:"WORK 04",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w05", img:"images/IMG_0058.JPG",          title:"WORK 05",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w06", img:"images/IMG_0060.JPG",          title:"WORK 06",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w07", img:"images/IMG_0062.JPG",          title:"WORK 07",              year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w08", img:"images/IMG_0154.jpg",          title:"WORK 08",              year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w09", img:"images/IMG_0155.JPG",          title:"WORK 09",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w10", img:"images/IMG_0156.JPG",          title:"WORK 10",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w11", img:"images/IMG_0157.JPG",          title:"WORK 11",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w12", img:"images/IMG_0165.JPG",          title:"WORK 12",              year:"2024", medium:"Painting", size:"wide", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w13", img:"images/IMG_0166.JPG",          title:"WORK 13",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w14", img:"images/IMG_0167.JPG",          title:"WORK 14",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w15", img:"images/IMG_0171.JPG",          title:"WORK 15",              year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w16", img:"images/IMG_0172.JPG",          title:"WORK 16",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w17", img:"images/IMG_0173.JPG",          title:"WORK 17",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w18", img:"images/IMG_0224.JPG",          title:"WORK 18",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w19", img:"images/IMG_0226.JPG",          title:"WORK 19",              year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w20", img:"images/IMG_0252.JPG",          title:"WORK 20",              year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w21", img:"images/IMG_0253.JPG",          title:"WORK 21",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w22", img:"images/IMG_0254.JPG",          title:"WORK 22",              year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w23", img:"images/IMG_0256.JPG",          title:"WORK 23",              year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w24", img:"images/Untitled_Artwork_3.jpg",title:"UNTITLED III",         year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w25", img:"images/Untitled_Artwork.jpg",  title:"UNTITLED",             year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w26", img:"images/Untitled_Artwork7.jpg", title:"UNTITLED VII",         year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] }
  ]
};
