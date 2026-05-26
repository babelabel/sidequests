import { supabase } from './supabase.js';

// ============================================================
// FRIEND OPERATIONS
// ============================================================

/**
 * Look up another user by their friend code.
 * Uses a SECURITY DEFINER function so we can find users we're not friends with yet.
 */
export async function findUserByFriendCode(code) {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return null;
  const { data, error } = await supabase.rpc('find_user_by_friend_code', { _code: cleaned });
  if (error) {
    console.error('find_user_by_friend_code', error);
    return null;
  }
  return (data && data[0]) || null;
}

/**
 * Send a friend request. Creates a pending friendship row.
 * If a pending request already exists in the other direction, accept it instead.
 */
export async function sendFriendRequest(targetUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  if (user.id === targetUserId) throw new Error("You can't add yourself");

  // Check if there's already a pending request from the target to us
  const { data: incoming } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('friend_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (incoming) {
    // They already requested us — accept it instead
    return acceptFriendRequest(targetUserId);
  }

  // Otherwise create our request
  const { error } = await supabase
    .from('friendships')
    .upsert({
      user_id: user.id,
      friend_id: targetUserId,
      status: 'pending'
    });
  if (error) throw error;
  return { status: 'sent' };
}

/**
 * Accept a friend request. Creates the reverse row so the friendship is symmetric.
 */
export async function acceptFriendRequest(requesterId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Mark their request as accepted
  await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_id', requesterId)
    .eq('friend_id', user.id);

  // Create our matching row
  await supabase
    .from('friendships')
    .upsert({
      user_id: user.id,
      friend_id: requesterId,
      status: 'accepted'
    });

  return { status: 'accepted' };
}

/**
 * Remove a friendship (or decline a pending request).
 * Deletes both rows of the symmetric pair.
 */
export async function removeFriend(otherUserId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  await supabase
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${user.id})`);
}

/**
 * Get the user's friends list. Returns array of profile objects with friendship status.
 */
export async function getFriends(userId, status = 'accepted') {
  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id, status, created_at, friend:profiles!friendships_friend_id_fkey(*)')
    .eq('user_id', userId)
    .eq('status', status);
  if (error) {
    console.error('getFriends', error);
    return [];
  }
  return (data || []).map(row => ({ ...row.friend, friendshipStatus: row.status, since: row.created_at }));
}

/**
 * Get incoming friend requests (others who want to befriend me).
 */
export async function getIncomingRequests(userId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('user_id, created_at, requester:profiles!friendships_user_id_fkey(*)')
    .eq('friend_id', userId)
    .eq('status', 'pending');
  if (error) {
    console.error('getIncomingRequests', error);
    return [];
  }
  return (data || []).map(row => ({ ...row.requester, requestedAt: row.created_at }));
}

// ============================================================
// GROUP OPERATIONS
// ============================================================

/**
 * Generate a memorable invite code: 6 uppercase alphanumeric chars,
 * no ambiguous characters (no 0/O, 1/I/L).
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new group. Adds the creator as the owner.
 */
export async function createGroup({ name, emoji = '🌅' }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // Try a few times in case of code collision (unlikely with 6 chars from 30 chars = ~700M combos)
  let attempts = 0;
  while (attempts < 5) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), emoji, invite_code: inviteCode, created_by: user.id })
      .select()
      .single();

    if (!error) {
      // Add creator as owner-role member
      await supabase
        .from('group_members')
        .insert({ group_id: data.id, user_id: user.id, role: 'owner' });
      return data;
    }

    // If the error is a unique-constraint violation on invite_code, retry
    if (error.code !== '23505') throw error;
    attempts++;
  }
  throw new Error('Could not generate unique invite code after 5 attempts');
}

/**
 * Join a group by its invite code. Uses the SECURITY DEFINER function
 * so the lookup works even though we're not a member yet.
 */
export async function joinGroupByCode(code) {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    _invite_code: code.trim().toUpperCase()
  });
  if (error) throw error;
  return (data && data[0]) || null;
}

/**
 * Get groups the current user is a member of, with member counts.
 */
export async function getMyGroups(userId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role, joined_at, group:groups(*)')
    .eq('user_id', userId);
  if (error) {
    console.error('getMyGroups', error);
    return [];
  }
  return (data || []).map(row => ({ ...row.group, myRole: row.role, joinedAt: row.joined_at }));
}

/**
 * Get members of a specific group.
 */
export async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, member:profiles(*)')
    .eq('group_id', groupId);
  if (error) {
    console.error('getGroupMembers', error);
    return [];
  }
  return (data || []).map(row => ({ ...row.member, role: row.role, joinedAt: row.joined_at }));
}

/**
 * Leave a group. If the user is the owner and there are other members,
 * the function ideally would transfer ownership — for now, we just remove the user.
 */
export async function leaveGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);
  if (error) throw error;
}

/**
 * Accept a quest on behalf of an entire group. Adds every group member
 * as a participant. Uses a SECURITY DEFINER function so we can insert
 * participant rows for other users.
 */
export async function acceptQuestForGroup(templateId, groupId) {
  const { data, error } = await supabase.rpc('accept_quest_for_group', {
    _template_id: templateId,
    _group_id: groupId
  });
  if (error) throw error;
  return data; // the new quest id
}
