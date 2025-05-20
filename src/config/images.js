// src/config/images.js
import { chiikawaImagePaths } from './chiikawaImagePaths'; // Assumes chiikawaImagePaths.js exists and exports this

// Fallback in case the imported array is undefined or null, though the script should ensure it's an array.
const effectiveChiikawaImages = Array.isArray(chiikawaImagePaths) ? chiikawaImagePaths : [];

export const getRandomImage = () => {
  if (effectiveChiikawaImages.length === 0) {
    console.warn('Image list (chiikawaImagePaths) is empty. Ensure images are in public/images/chiikawa/ and the generation script has run. Consider adding a placeholder.png to public/images/chiikawa/');
    // Return a default placeholder image path. Ensure this placeholder exists in public/images/chiikawa/
    return '/images/chiikawa/placeholder.png'; // Example placeholder
  }
  const randomIndex = Math.floor(Math.random() * effectiveChiikawaImages.length);
  return effectiveChiikawaImages[randomIndex]; // Paths are already correct (e.g., /images/chiikawa/name.webp)
};

export const getMultipleRandomImages = (count) => {
  if (effectiveChiikawaImages.length === 0) {
    console.warn('Image list (chiikawaImagePaths) is empty. Ensure images are in public/images/chiikawa/ and the generation script has run.');
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
    console.warn('No image name provided to getSpecificImage, returning a random image.');
    return getRandomImage();
  }

  const imageName = name.endsWith('.webp') ? name : `${name}.webp`;
  const foundImage = effectiveChiikawaImages.find(path => path.endsWith(`/${imageName}`));

  if (foundImage) {
    return foundImage;
  }

  console.warn(`Image "${name}" not found in chiikawaImagePaths, returning a random image.`);
  return getRandomImage();
};

// The default export of the raw chiikawaImages array is no longer needed
// as components should use the functions above which rely on the generated paths.
// If a component was directly importing and using the default export, it might need adjustment.
// export default effectiveChiikawaImages;