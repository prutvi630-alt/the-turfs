export const createTeamLogoDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
    reject(new Error('Choose a PNG, JPG, WEBP or GIF image.'));
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    reject(new Error('Team logo must be smaller than 8 MB.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('This image could not be read. Try another file.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('This image could not be opened. Try another file.'));
    image.onload = () => {
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Image preview is not available in this browser.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        reject(new Error('This image could not be prepared for upload.'));
      }
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});
