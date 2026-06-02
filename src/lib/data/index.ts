import { aggregateVersionStats, aggregateVoiceLineStats } from "@/lib/data/aggregate";
import {
  loadCharacterImages,
  loadCharacters,
  loadGeneratedStats,
  loadRawVoiceEntries,
  loadVoiceLineDetails,
  loadVersions,
} from "@/lib/data/loaders";

export async function getCharacterListData() {
  return loadCharacters();
}

export async function getCharacterDetailData(id: string) {
  const [characters, stats, images, details] = await Promise.all([
    loadCharacters(),
    loadGeneratedStats(),
    loadCharacterImages(),
    loadVoiceLineDetails(),
  ]);
  const character = characters.find((item) => item.id === id);
  const characterStats = stats.filter((item) => item.characterId === id);
  const characterImages = images.filter((item) => item.characterId === id);
  const characterVoiceDetails = details.filter((item) => item.characterId === id);
  return { character, characterStats, characterImages, characterVoiceDetails };
}

export async function getVersionStatsPageData() {
  const [versions, characters, stats] = await Promise.all([
    loadVersions(),
    loadCharacters(),
    loadGeneratedStats(),
  ]);
  return aggregateVersionStats({ versions, characters, voiceStats: stats });
}

export async function computeStatsFromRaw() {
  const [versions, characters, entries] = await Promise.all([
    loadVersions(),
    loadCharacters(),
    loadRawVoiceEntries(),
  ]);
  return aggregateVoiceLineStats({ characters, versions, entries });
}
