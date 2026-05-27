import { supabase } from './supabase.js';

/**
 * Compress an image File to JPEG at given quality and max dimension.
 * Returns a new Blob ready to upload. Drastically reduces storage usage
 * (a 4MB phone photo → typically 200-400KB).
 */
export async function compressImage(file, { maxDim = 1080, quality = 0.85 } = {}) {
  // Decode the image
  const bitmap = await createImageBitmap(file);

  // Compute the target dimensions, preserving aspect ratio
  let { width, height } = bitmap;
  if (width > height && width > maxDim) {
    height = Math.round((height / width) * maxDim);
    width = maxDim;
  } else if (height > maxDim) {
    width = Math.round((width / height) * maxDim);
    height = maxDim;
  }

  // Draw to an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Export as JPEG blob
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * Upload a compressed photo to Supabase storage under the current user's folder.
 * Returns the public URL.
 */
export async function uploadQuestPhoto(file, userId) {
  const compressed = await compressImage(file);
  const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from('quest_photos')
    .upload(filename, compressed, {
      contentType: 'image/jpeg',
      cacheControl: '31536000'  // 1 year — photos are immutable
    });

  if (error) throw error;

  const { data } = supabase.storage.from('quest_photos').getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Get the user's current location once.
 * Returns { lat, lng } or null if denied/unavailable.
 */
export function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      _err => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

/**
 * Create a quest post (the proof + memory).
 * Optionally takes a photo file, caption, location.
 */
export async function createQuestPost({ questId, authorId, photoFile, caption = '', locationName = '', lat = null, lng = null }) {
  let photoUrl = null;
  if (photoFile) {
    photoUrl = await uploadQuestPhoto(photoFile, authorId);
  }

  const { data, error } = await supabase
    .from('quest_posts')
    .insert({
      quest_id: questId,
      author_id: authorId,
      photo_url: photoUrl,
      caption: caption.trim() || null,
      location_name: locationName.trim() || null,
      lat, lng
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
