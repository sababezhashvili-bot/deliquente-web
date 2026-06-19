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
    /* საიტზე სექციების თანმიმდევრობა (built-in + custom id-ები). ცარიელი = საწყისი რიგი.
       custom სექციების id იწყება "cs-"-ით. იმართება "⚡ სექციები" პანელიდან გადათრევით. */
    sectionOrder: ["works", "about", "studio", "exhibitions", "journal", "photography", "contact"],
    /* ვალუტის კურსები — რამდენი ლარია 1 ერთეული. იცვლება "✎ ტექსტები" → Pricing-ში.
       მაგ: USD: 2.65 = 1$ = 2.65₾.  ფასი ინახება თანხა+ვალუტით, საიტი თვითონ გადაითვლის. */
    fx: { USD: 2.65, EUR: 2.85 },
    // ⚠️ ეს მსუბუქი დაცვაა (კლიენტის მხარეს). შეცვალე შენთვის სასურველი პაროლით.
    adminPassword: "saba2026"
  },

  /* ---- CUSTOM SECTIONS ---------------------------------------------
     ადმინიდან დამატებული თავისუფალი სექციები. თითო: eyebrow + სათაური +
     intro + ტექსტი + სურათების ბადე. იმართება "⚡ სექციები" პანელიდან.
     ----------------------------------------------------------------- */
  customSections: [],

  /* ---- UI MICROCOPY & NAV ------------------------------------------
     ყველა "ჩაკეტილი" ტექსტი ახლა აქედან იმართება — ნავიგაცია, სექციების
     ნომრები, ფორმის წარწერები, დეტალის გვერდის ღილაკები და სხვ.
     რედაქტირდება ადმინ-პანელის "✎ ტექსტები" მენიუდან ან პირდაპირ გვერდზე.
     ----------------------------------------------------------------- */
  ui: {
    nav: {
      /* label = ჩანს მენიუში · target = რომელ სექციას გადახტება (#id) */
      links: [
        { label: "Works",       target: "works" },
        { label: "About",       target: "about" },
        { label: "Studio",      target: "studio" },
        { label: "Exhibitions", target: "exhibitions" },
        { label: "Photography", target: "photography" },
        { label: "Journal",     target: "journal" },
        { label: "Contact",     target: "contact" }
      ]
    },
    sectionNums: {
      works:       "01 — PORTFOLIO",
      about:       "02 — THE ARTIST",
      studio:      "03 — BEHIND THE WORK",
      exhibitions: "04 — CV",
      journal:     "05 — NOTES",
      photography: "06 — PHOTOGRAPHY",
      contact:     "07 — CONTACT"
    },
    scrollCue: "SCROLL",
    dragHint:  "← DRAG / SCROLL →",
    menuLabel: "MENU",
    detail: {
      back:        "← BACK TO WORKS",
      eyebrow:     "DELIQUENTE PENSAMIENTO",
      photosTitle: "Detail Photos",
      videoTitle:  "Video",
      specYear:       "Year",
      specMedium:     "Medium",
      specDimensions: "Dimensions",
      inquire:  "Inquire",
      allWorks: "← All works",
      buy:      "შეძენა / Buy"
    },
    form: {
      nameLabel:       "Name",
      namePlaceholder: "Your name",
      emailLabel:       "Email",
      emailPlaceholder: "you@email.com",
      typeLabel:   "Type",
      /* მძიმით გამოყოფილი ვარიანტები ჩამოსაშლელისთვის */
      typeOptions: "Commission, Exhibition, Studio visit, Other",
      msgLabel:       "Message",
      msgPlaceholder: "Tell me about the project…",
      submit: "Send request",
      okMsg:  "✓ Thanks — your message is ready to send."
    }
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
    { id:"w01", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051034/deliquente/Bed.jpg",               title:"BED",         year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w02", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051065/deliquente/Dab629.jpg",            title:"DAB",         year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w03", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051111/deliquente/IMG_0023.jpg",          title:"WORK 03",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w04", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051237/deliquente/IMG_0058.jpg",          title:"WORK 04",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w05", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051293/deliquente/IMG_0060.jpg",          title:"WORK 05",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w06", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051301/deliquente/IMG_0062.jpg",          title:"WORK 06",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w07", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051323/deliquente/IMG_0154.jpg",          title:"WORK 07",     year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w08", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051327/deliquente/IMG_0155.jpg",          title:"WORK 08",     year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w09", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051358/deliquente/IMG_0156.jpg",          title:"WORK 09",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w10", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051365/deliquente/IMG_0157.jpg",          title:"WORK 10",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w11", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051387/deliquente/IMG_0165.jpg",          title:"WORK 11",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w12", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051423/deliquente/IMG_0167.jpg",          title:"WORK 12",     year:"2024", medium:"Painting", size:"wide", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w13", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051438/deliquente/IMG_0171.jpg",          title:"WORK 13",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w14", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051445/deliquente/IMG_0172.jpg",          title:"WORK 14",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w15", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051448/deliquente/IMG_0173.jpg",          title:"WORK 15",     year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w16", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051464/deliquente/IMG_0224.jpg",          title:"WORK 16",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w17", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051482/deliquente/IMG_0226.jpg",          title:"WORK 17",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w18", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051503/deliquente/IMG_0252.jpg",          title:"WORK 18",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w19", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051518/deliquente/IMG_0253.jpg",          title:"WORK 19",     year:"2023", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w20", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051530/deliquente/IMG_0254.jpg",          title:"WORK 20",     year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w21", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051618/deliquente/Untitled_Artwork_3.jpg",title:"UNTITLED III", year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w22", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051621/deliquente/work-01.jpg",           title:"WORK 22",     year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w23", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051623/deliquente/work-02.jpg",           title:"WORK 23",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w24", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051626/deliquente/work-03.jpg",           title:"WORK 24",     year:"2024", medium:"Painting", size:"md",   dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w25", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051629/deliquente/work-04.jpg",           title:"WORK 25",     year:"2024", medium:"Painting", size:"tall", dimensions:"", desc:"", photos:[], videos:[] },
    { id:"w26", img:"https://res.cloudinary.com/dvytkqzbc/image/upload/c_limit,f_auto,h_2400,q_auto:good,w_2400/v1781051631/deliquente/work-05.jpg",           title:"WORK 26",     year:"2024", medium:"Painting", size:"lg",   dimensions:"", desc:"", photos:[], videos:[] }
  ]
};
