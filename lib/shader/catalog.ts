import { FAMILY_LABELS } from "./labels";
import { motionForFamily, mulberry32, randomConfig, TUNING } from "./random";
import { BACKDROP_FAMILIES, CREATIVE_FAMILIES, FAMILIES, type CreativeFamily, type Family, type LegacyFamily, type MotionDNA, type ShaderConfig } from "./schema";

interface CreativeStyle {
  description: string;
  seed: number;
  palettes: readonly (readonly string[])[];
  scale: number;
  complexity: number;
  warp: number;
  motionDNA: MotionDNA;
  vignette?: number;
}

// These are authored compositions. Palette order is part of their art direction.
export const CREATIVE_STYLES: Record<CreativeFamily, CreativeStyle> = {
  liquidMetal: {
    description: "Sculpted chrome, flowing reflections and a molten silhouette.",
    seed: 1207, palettes: [["#070B12", "#283D58", "#8196AB", "#D6E6EF", "#FFFFFF"], ["#170D0A", "#69402A", "#B7834E", "#ECCD9A", "#FFF7DF"]],
    scale: 1.05, complexity: 0.55, warp: 0.6, motionDNA: "fluid",
  },
  iridescentGlass: {
    description: "Floating glass lenses with prismatic edges and luminous depth.",
    seed: 2903, palettes: [["#090E23", "#36318B", "#B57CE8", "#79E7E0", "#F9F1FF"], ["#0D1420", "#235E74", "#83BEED", "#FDA5BB", "#FFF6E7"]],
    scale: 1.15, complexity: 0.55, warp: 0.4, motionDNA: "cinematic",
  },
  ribbonSculpture: {
    description: "Interwoven ribbons, dimensional folds and choreographed twists.",
    seed: 4319, palettes: [["#120B20", "#492569", "#BA5BA3", "#FFAA82", "#FFF0D5"], ["#081B1D", "#14615C", "#4EACA0", "#CDF285", "#F7FFE1"]],
    scale: 1.05, complexity: 0.45, warp: 0.6, motionDNA: "fluid",
  },
  architecture: {
    description: "A procession of sculptural frames through an endless perspective.",
    seed: 6101, palettes: [["#070E17", "#164056", "#488C9A", "#E5AC78", "#FFE5C8"], ["#160D19", "#5B2E54", "#A96576", "#F3B48C", "#FFF0D4"]],
    scale: 1, complexity: 0.6, warp: 0.25, motionDNA: "hypnotic",
  },
  constellation: {
    description: "A deep field of particles tracing luminous, closed paths.",
    seed: 7907, palettes: [["#030713", "#173C70", "#437FDE", "#7AE9FA", "#EEF9FF"], ["#0F061D", "#46225D", "#B654A4", "#FFC38A", "#FFF5D9"]],
    scale: 1.05, complexity: 0.65, warp: 0.65, motionDNA: "cinematic",
  },
  luminousOrbits: {
    description: "Tilted halos and luminous bodies revolving around a dark focus.",
    seed: 9109, palettes: [["#080C16", "#293C68", "#707EE0", "#F0AE77", "#FFF3D8"], ["#081810", "#195445", "#58A989", "#CBE6AC", "#F7FCE9"]],
    scale: 1.1, complexity: 0.5, warp: 0.35, motionDNA: "hypnotic",
  },
  moire: {
    description: "Interfering line fields forming shifting optical sculptures.",
    seed: 13411, palettes: [["#EFEBDC", "#161E2C", "#284951", "#D56648", "#ECC49A"], ["#0B1020", "#D6E4F3", "#849FB4", "#C296E5", "#F4ECFF"]],
    scale: 1.1, complexity: 0.55, warp: 0.45, motionDNA: "hypnotic",
    vignette: 0,
  },
  nacreFlow: {
    description: "Continuous nacre folds with soft iridescence and slow shifting reflections.",
    seed: 15217, palettes: [["#1B1528", "#575275", "#B3ABC9", "#E3CDD2", "#FFF6E8"], ["#101C22", "#426D79", "#8EC5C6", "#DBE9CC", "#FFFFED"]],
    scale: 1.15, complexity: 0.5, warp: 0.65, motionDNA: "calm",
  },
  velvetFlow: {
    description: "Soft velvet currents with dimensional folds and unhurried movement.",
    seed: 17321, palettes: [["#050B13", "#263B55", "#66819F", "#CCDCEB", "#FFFFFF"], ["#1A0F0B", "#644331", "#C18F64", "#F5D5A5", "#FFF8E8"]],
    scale: 1.3, complexity: 0.6, warp: 0.5, motionDNA: "fluid",
  },
  glassVeil: {
    description: "Broad overlapping glass veils with subdued spectral edges.",
    seed: 19423, palettes: [["#080F20", "#274E79", "#8C71BE", "#8EE8DC", "#F7EFFF"], ["#190D1D", "#6A285C", "#D586AA", "#FEBCA2", "#FFF2CD"]],
    scale: 1.15, complexity: 0.6, warp: 0.55, motionDNA: "cinematic",
  },
  prismField: {
    description: "A quiet full-frame field of translucent prismatic planes.",
    seed: 21529, palettes: [["#0A1025", "#32386A", "#758EC9", "#B8DCE6", "#FFF3FA"], ["#121620", "#195F6B", "#52B4B5", "#CBEBAD", "#F5FFE5"]],
    scale: 1.1, complexity: 0.5, warp: 0.35, motionDNA: "cinematic",
  },
  satinDunes: {
    description: "Sculpted satin dunes with woven detail and glancing highlights.",
    seed: 23633, palettes: [["#221322", "#6F3E66", "#BA7998", "#E7B7B6", "#FFEAD8"], ["#0C2223", "#205851", "#5B9381", "#B2C9A2", "#F5F0CE"]],
    scale: 1.1, complexity: 0.4, warp: 0.55, motionDNA: "fluid", vignette: 0,
  },
  metallicWaves: {
    description: "Continuous corrugated metal, folded light and flowing reflections.",
    seed: 25741, palettes: [["#101521", "#37415C", "#6F8EAB", "#B7D6E0", "#F7FAFF"], ["#1E1114", "#6F3849", "#BA7A70", "#E6BB9A", "#FFF1D0"]],
    scale: 1.15, complexity: 0.45, warp: 0.6, motionDNA: "fluid", vignette: 0,
  },
  silkCurrent: {
    description: "Continuous flowing silk folds with soft glancing highlights.",
    seed: 27847, palettes: [["#170F26", "#63325E", "#B86391", "#ECACAA", "#FFF0D4"], ["#0D201B", "#275C47", "#74A672", "#D2DB94", "#FFFFDF"]],
    scale: 1.15, complexity: 0.65, warp: 0.5, motionDNA: "fluid",
  },
  aquaVeil: {
    description: "Overlapping translucent water curtains with subdued edge reflections.",
    seed: 29959, palettes: [["#020A1D", "#0D4776", "#5873C8", "#91E6F1", "#EFFFFF"], ["#14071F", "#4C246D", "#AE6BD1", "#F3ADE5", "#FFF4F8"]],
    scale: 1.15, complexity: 0.65, warp: 0.6, motionDNA: "cinematic",
  },
  mistLayers: {
    description: "Layered atmospheric mist drifting slowly through broad diffused color.",
    seed: 32063, palettes: [["#130E1C", "#552948", "#AC596F", "#F3A478", "#FFF0B9"], ["#061B20", "#185764", "#459C99", "#A4D7AC", "#F3FFDD"]],
    scale: 1.05, complexity: 0.6, warp: 0.5, motionDNA: "fluid",
  },
  magneticFlow: {
    description: "Smooth metallic currents with rippling studio reflections.",
    seed: 34171, palettes: [["#050810", "#1C2D44", "#506981", "#ACBFCB", "#F1FAFF"], ["#130B0D", "#4C2A2E", "#9B6051", "#DDB796", "#FFF4DB"]],
    scale: 1.1, complexity: 0.6, warp: 0.65, motionDNA: "hypnotic",
  },
  foldedCanopy: {
    description: "Full-frame folded planes with restrained light and shadow.",
    seed: 36277, palettes: [["#16121B", "#443047", "#95687E", "#D0A18C", "#FAE2BA"], ["#0E1920", "#24485C", "#64969E", "#BAD8C7", "#F7F3D8"]],
    scale: 1.1, complexity: 0.5, warp: 0.4, motionDNA: "hypnotic",
  },
  contourRelief: {
    description: "A continuous field of layered contours with breathing relief.",
    seed: 38381, palettes: [["#221522", "#543351", "#AD7F91", "#E7BBA8", "#FFF0D4"], ["#112221", "#285A52", "#73A48B", "#C9D7AE", "#F6F5D9"]],
    scale: 1.05, complexity: 0.7, warp: 0.5, motionDNA: "calm",
  },
  floatingVeils: {
    description: "Broad translucent folds drifting across an open color field.",
    seed: 40487, palettes: [["#071A20", "#294652", "#A96745", "#CE9962", "#F9E9CF"], ["#15192A", "#405877", "#818DBE", "#DEA89E", "#FFF0D4"]],
    scale: 1.1, complexity: 0.55, warp: 0.65, motionDNA: "calm",
  },
  prismCurtain: {
    description: "Broad prismatic curtains with calm phased reflections.",
    seed: 42589, palettes: [["#182B32", "#28505B", "#719188", "#CCA78D", "#F6D9AA"], ["#2A172B", "#6A3B64", "#AF7393", "#DCADAD", "#FFEDCC"]],
    scale: 1.05, complexity: 0.55, warp: 0.65, motionDNA: "hypnotic",
  },
  lightPainting: {
    description: "Broad calligraphic light currents moving softly across a full-frame field.",
    seed: 44699, palettes: [["#060B20", "#344B96", "#8B7DE8", "#ED9AD2", "#FFF0B4"], ["#041A1E", "#126D79", "#43B7B7", "#B2EAA4", "#FFFFD3"]],
    scale: 1.15, complexity: 0.6, warp: 0.5, motionDNA: "hypnotic",
  },
  spectralRibbons: {
    description: "Translucent spectral bands choreographed around a shared waveform.",
    seed: 46807, palettes: [["#060E1F", "#174D85", "#678BDA", "#C9A5DC", "#FFE5B9"], ["#170C1F", "#5C2C78", "#B46BA9", "#FFACA0", "#FFF0C6"]],
    scale: 1.15, complexity: 0.6, warp: 0.65, motionDNA: "fluid",
  },
  causticPool: {
    description: "Refracted cell boundaries drifting over a deep crystalline pool.",
    seed: 48911, palettes: [["#052938", "#085363", "#21828D", "#8ECEC0", "#EAFFDC"], ["#161D3C", "#3D3F80", "#837CBB", "#CABCDD", "#FFF1D8"]],
    scale: 1.1, complexity: 0.45, warp: 0.7, motionDNA: "fluid", vignette: 0,
  },
  eclipseHalo: {
    description: "A dark celestial disc, luminous corona and travelling diamond flare.",
    seed: 51019, palettes: [["#050916", "#243260", "#7883C4", "#DAB49D", "#FFF3D3"], ["#120915", "#5B214D", "#AA5667", "#E5A872", "#FFF5C7"]],
    scale: 1.25, complexity: 0.65, warp: 0.4, motionDNA: "cinematic",
  },
  starVortex: {
    description: "Luminous stellar arms winding around a bright tilted galactic core.",
    seed: 53129, palettes: [["#030714", "#24355D", "#675CA4", "#C5ADD5", "#FFF0DE"], ["#0D0715", "#4F254A", "#A64B69", "#F6AF83", "#FFF5CF"]],
    scale: 1.25, complexity: 0.7, warp: 0.55, motionDNA: "cinematic",
  },
  dustDrift: {
    description: "Soft out-of-focus luminous dust drifting through a deep field.",
    seed: 55231, palettes: [["#0C1423", "#334568", "#8195B5", "#D8C7D5", "#FFF4DF"], ["#101E1C", "#316956", "#8CB997", "#D7D6AB", "#FFF5D7"]],
    scale: 1.2, complexity: 0.6, warp: 0.4, motionDNA: "hypnotic",
  },
  cutPaper: {
    description: "Layered paper landscapes with organic cut edges and travelling shadows.",
    seed: 57337, palettes: [["#10252B", "#31515B", "#548A8A", "#92B7A1", "#E0D6AF"], ["#241735", "#573D72", "#966F9C", "#D2A6B4", "#F4DEC5"]],
    scale: 1, complexity: 0.6, warp: 0.65, motionDNA: "calm", vignette: 0,
  },
  opArtWeave: {
    description: "Raised woven strips flowing across a precise optical grid.",
    seed: 59441, palettes: [["#141925", "#354A5D", "#6C959E", "#C5CFBC", "#F2E4C9"], ["#211321", "#653D57", "#AF7B89", "#DFBEA8", "#FFF3D2"]],
    scale: 1.15, complexity: 0.35, warp: 0.65, motionDNA: "hypnotic", vignette: 0,
  },
  neonLattice: {
    description: "An illuminated dimensional grid with bright junctions and travelling currents.",
    seed: 61547, palettes: [["#020916", "#124C65", "#2087AC", "#6CE5D5", "#E0FFEA"], ["#11081F", "#47246B", "#9D49C0", "#F0A1CD", "#FFF0DD"]],
    scale: 1.1, complexity: 0.45, warp: 0.5, motionDNA: "tech",
  },
  auroraCanopy: {
    description: "Broad aurora waves unfurling overhead with flowing spectral curtains.",
    seed: 65761, palettes: [["#0B1836", "#165E75", "#41C5AD", "#A3A0F7", "#EFFFF7"], ["#23163E", "#7753B0", "#DE7CD0", "#F7C998", "#FFF7DE"]],
    scale: 1.15, complexity: 0.55, warp: 0.6, motionDNA: "cinematic",
  },
  tidalGlass: {
    description: "A continuous glassy water surface with broad swells and silver reflections.",
    seed: 67867, palettes: [["#0C354D", "#237D96", "#79CBCB", "#C1E5DD", "#F5FFF0"], ["#352440", "#826198", "#C7A2C5", "#F0D3BD", "#FFF7E4"]],
    scale: 1.25, complexity: 0.4, warp: 0.55, motionDNA: "fluid",
  },
  twilightHaze: {
    description: "An open twilight horizon washed with warm light and drifting atmospheric bands.",
    seed: 69973, palettes: [["#22345C", "#6866A0", "#CC869D", "#F1B98B", "#FFF0CC"], ["#163D52", "#427F8A", "#99BCB0", "#DED5B3", "#FFF3DB"]],
    scale: 1.1, complexity: 0.4, warp: 0.5, motionDNA: "calm",
  },
  cloudSea: {
    description: "Soft rolling cloud banks below an expansive sky with luminous cloud edges.",
    seed: 72077, palettes: [["#1A3558", "#507B9C", "#93B5CF", "#DEE5EB", "#FFF6E8"], ["#46304F", "#91697F", "#CEA09F", "#F3D5BC", "#FFF4DA"]],
    scale: 1.2, complexity: 0.5, warp: 0.6, motionDNA: "cinematic",
  },
  emberVeil: {
    description: "Warm amber light drifting through broad smoky veils without flashing sparks.",
    seed: 74189, palettes: [["#301A24", "#883F42", "#D87851", "#F9BC74", "#FFF0CB"], ["#27253B", "#655F97", "#A39BC7", "#DBC6DB", "#FFF0E0"]],
    scale: 1.15, complexity: 0.45, warp: 0.65, motionDNA: "fluid",
  },
  forestLight: {
    description: "Dappled canopy light and broad diagonal sunbeams shifting softly through green shade.",
    seed: 76297, palettes: [["#173D36", "#39765A", "#87AE6B", "#D3D991", "#FFF6CA"], ["#183E4D", "#388591", "#8ECAC0", "#D8E9CD", "#FFFFE2"]],
    scale: 1.2, complexity: 0.4, warp: 0.55, motionDNA: "calm",
  },
  rainWindow: {
    description: "Rain on glass refracting a soft field of color with delicate moving droplet reflections.",
    seed: 78401, palettes: [["#16354D", "#467F9A", "#91BACC", "#DADCE1", "#FFF3DE"], ["#352342", "#805B89", "#BD90B6", "#E8C1CE", "#FFF0DA"]],
    scale: 1.1, complexity: 0.4, warp: 0.5, motionDNA: "calm",
  },
  opalWash: {
    description: "Broad opalescent washes with flowing pearl color and diffuse spectral reflections.",
    seed: 80509, palettes: [["#3D5276", "#8F94C6", "#CBAED3", "#ACE1D7", "#FFF2E2"], ["#38595A", "#86B6A7", "#D6CF9F", "#E6B5BA", "#FFF4DE"]],
    scale: 1.25, complexity: 0.5, warp: 0.7, motionDNA: "fluid",
  },
  lightColumns: {
    description: "Soft columns of colored stage light opening into a spacious luminous field.",
    seed: 82613, palettes: [["#172540", "#4C6DC0", "#AB94E8", "#EFB8D5", "#FFF1DE"], ["#193E3E", "#3E9384", "#A0D7A3", "#ECE3AE", "#FFFFDD"]],
    scale: 1.2, complexity: 0.45, warp: 0.5, motionDNA: "cinematic",
  },
  lunarDunes: {
    description: "Layered moonlit dunes with gently shifting ridges and an open blue horizon.",
    seed: 84719, palettes: [["#243C60", "#5D7A9B", "#9AAFC6", "#D8D9DC", "#FFF0DA"], ["#3D3156", "#80658D", "#BA98B1", "#E3C4C5", "#FFF0D4"]],
    scale: 1.05, complexity: 0.5, warp: 0.55, motionDNA: "calm",
  },
  inkWash: {
    description: "Fluid ink washes with feathered pigment boundaries and layered watercolor texture.",
    seed: 86827, palettes: [["#163F58", "#3E7F98", "#88B9C0", "#CDD7CD", "#F6E8CC"], ["#4E294C", "#996184", "#CE99AA", "#E9CDBA", "#FFF0D5"]],
    scale: 1.2, complexity: 0.5, warp: 0.7, motionDNA: "fluid",
  },
  deepOcean: {
    description: "Broad shafts of refracted surface light drifting through layered ocean blues.",
    seed: 88937, palettes: [["#07374F", "#136987", "#45A9B6", "#9ED9CF", "#EFFFF0"], ["#212D57", "#4F5D99", "#919DD0", "#CFD3E6", "#FFF4DE"]],
    scale: 1.15, complexity: 0.5, warp: 0.6, motionDNA: "cinematic",
  },
};

export function isCreativeFamily(family: Family): family is CreativeFamily {
  return (CREATIVE_FAMILIES as readonly string[]).includes(family);
}

export function curatedConfig(family: CreativeFamily): ShaderConfig {
  const style = CREATIVE_STYLES[family];
  const backdrop = (BACKDROP_FAMILIES as readonly string[]).includes(family);
  return {
    name: FAMILY_LABELS[family], family, seed: style.seed,
    colors: [...style.palettes[0]], speed: 1, scale: style.scale,
    complexity: style.complexity * (backdrop ? 0.8 : 1), warp: style.warp,
    grain: backdrop ? 0.006 : 0.012, sharpness: 0, vignette: style.vignette ?? (backdrop ? 0 : 0.18),
    duration: backdrop ? 16 : 8, secondaryFamily: null, blendMode: "mix", blendAmount: 0.5,
    motionDNA: style.motionDNA, bpm: 120, beats: backdrop ? 32 : 16,
  };
}

/** Expanded catalog. Explicit family draws use that family's own tuning. */
export function catalogConfig(seed?: number, requestedFamily?: Family): ShaderConfig {
  const s = seed ?? Math.floor(Math.random() * 1_000_000);
  const rng = mulberry32(s ^ 0x6c8e9cf5);
  const family = requestedFamily === "accretion" ? "starVortex" : requestedFamily ?? FAMILIES[Math.floor(rng() * FAMILIES.length)];
  if (isCreativeFamily(family)) {
    const base = curatedConfig(family);
    const style = CREATIVE_STYLES[family];
    return {
      ...base, seed: s,
      colors: [...style.palettes[Math.floor(rng() * style.palettes.length)]],
      scale: style.scale * (0.85 + rng() * 0.3),
      complexity: Math.max(0, Math.min(1, style.complexity + (rng() - 0.5) * 0.3)),
      warp: Math.max(0, Math.min(1, style.warp + (rng() - 0.5) * 0.3)),
    };
  }
  const base = randomConfig(s);
  const tuning = TUNING[family as LegacyFamily];
  const draw = (range: [number, number]) => range[0] + rng() * (range[1] - range[0]);
  return { ...base, family, motionDNA: motionForFamily(family), scale: draw(tuning.scale), complexity: draw(tuning.complexity), warp: draw(tuning.warp) };
}
