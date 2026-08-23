// src/config/images.js
import { chiikawaImagePaths } from './chiikawaImagePaths'; // Assumes chiikawaImagePaths.js exists and exports this

// Fallback in case the imported array is undefined or null, though the script should ensure it's an array.
const effectiveChiikawaImages = Array.isArray(chiikawaImagePaths) ? chiikawaImagePaths : [];

// Stable images for named UI slots. Every path here exists under public/images/chiikawa.
// Keeping this mapping explicit avoids noisy "not found" warnings and prevents lobby
// artwork from changing on every render.
const NAMED_IMAGE_PATHS = {
  matchThreeLogo: '/images/chiikawa/1.webp',
  chiikawaQuizLogo: '/images/chiikawa/10.webp',
  zhenhuanQuizLogo: '/images/chiikawa/100.webp',
  sevenGhostGameLogo: '/images/chiikawa/101.webp',
  blackjackGameLogo: '/images/chiikawa/102.webp',
  whatToEatTodayLogo: '/images/chiikawa/103.webp',
  duiduipengGameLogo: '/images/chiikawa/104.webp',
  twentyFourGameLogo: '/images/chiikawa/105.webp',
  messageToPigLogo: '/images/chiikawa/23birthday.webp',
  chiikawaWin: '/images/chiikawa/106.webp',
  chiikawaLose: '/images/chiikawa/107.webp',
  chiikawaPush: '/images/chiikawa/108.webp'
};

export const getRandomImage = () => {
  if (effectiveChiikawaImages.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * effectiveChiikawaImages.length);
  return effectiveChiikawaImages[randomIndex]; // Paths are already correct (e.g., /images/chiikawa/name.webp)
};

export const getMultipleRandomImages = (count) => {
  if (effectiveChiikawaImages.length === 0) {
    return [];
  }

  const availableImages = [...effectiveChiikawaImages]; // Use a copy for shuffling

  if (count >= availableImages.length) {
    // If requesting more or equal images than available, return all (shuffled)
    return availableImages.sort(() => 0.5 - Math.random());
  }

  // Shuffle and take 'count' images
  const shuffled = availableImages.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};


export const getSpecificImage = (name) => {
  if (!name) {
    return null;
  }

  if (NAMED_IMAGE_PATHS[name]) return NAMED_IMAGE_PATHS[name];

  const imageName = name.endsWith('.webp') ? name : `${name}.webp`;
  const foundImage = effectiveChiikawaImages.find(path => path.endsWith(`/${imageName}`));

  return foundImage || null;
};

// The default export of the raw chiikawaImages array is no longer needed
// as components should use the functions above which rely on the generated paths.
// If a component was directly importing and using the default export, it might need adjustment.
// export default effectiveChiikawaImages;
