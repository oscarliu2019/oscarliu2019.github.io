const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, '..', 'public', 'images', 'chiikawa');
const outputPath = path.join(__dirname, '..', 'src', 'config', 'chiikawaImagePaths.js');

fs.readdir(imageDir, (err, files) => {
  if (err) {
    console.error('Error reading image directory:', err);
    process.exit(1);
  }

  const webpFiles = files.filter(file => file.endsWith('.webp'))
                         .map(file => `/images/chiikawa/${file}`); // Path relative to public folder

  const content = `// This file is auto-generated. Do not edit directly.
export const chiikawaImagePaths = ${JSON.stringify(webpFiles, null, 2)};
`;

  fs.writeFile(outputPath, content, err => {
    if (err) {
      console.error('Error writing image paths file:', err);
      process.exit(1);
    }
    console.log(`Successfully generated ${outputPath} with ${webpFiles.length} images.`);
  });
});