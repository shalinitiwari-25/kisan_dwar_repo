// Turns a picked file into the small payload the server accepts.
// Photos are shrunk in the browser (phone cameras make 4-8 MB pictures).
const MAX_PDF_BYTES = 1_000_000;
const MAX_DATAURL_CHARS = 1_300_000;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This picture could not be opened.'));
    img.src = src;
  });
}

export async function fileToPayload(file) {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error('PDF is too big. Please keep it under 1 MB.');
    return { fileName: file.name, mimeType: 'application/pdf', data: await readAsDataURL(file) };
  }
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Please choose a photo (JPG/PNG) or a PDF.');
  }

  const img = await loadImage(await readAsDataURL(file));
  let maxSide = 1200;
  let quality = 0.75;
  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', quality);
    if (data.length <= MAX_DATAURL_CHARS) {
      return { fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg', mimeType: 'image/jpeg', data };
    }
    maxSide = Math.round(maxSide * 0.8);
    quality = Math.max(0.5, quality - 0.08);
  }
  throw new Error('Picture is too big even after shrinking. Please try a smaller one.');
}
