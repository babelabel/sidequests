import { supabase } from './supabase.js';

/**
 * Push my current GPS location to the server so friends can see me on the map.
 * Only call when the user explicitly opts in.
 */
export async function updateMyLocation(lat, lng) {
  const { error } = await supabase.rpc('update_my_location', { _lat: lat, _lng: lng });
  if (error) throw error;
}

/**
 * Get friends' last-known locations (within the past 24h, if they have sharing on).
 */
export async function getFriendLocations() {
  const { data, error } = await supabase.rpc('get_friend_locations');
  if (error) {
    console.error('getFriendLocations', error);
    return [];
  }
  return data || [];
}

/**
 * Turn off location sharing (clears coordinates).
 */
export async function stopSharingLocation() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('profiles')
    .update({ location_sharing: false, location_lat: null, location_lng: null })
    .eq('id', user.id);
}
