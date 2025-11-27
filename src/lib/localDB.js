import Dexie from 'dexie';

// Initialize database
export const db = new Dexie('ShadowSpaceDB');

db.version(1).stores({
  myPosts: '++id, postId, content, createdAt, synced, fake_region', // Local post tracking
  settings: 'key, value', // User preferences
});

// Graceful error handling for quota exceeded
db.on('blocked', () => {
  console.warn('Database upgrade blocked - close other tabs');
});

db.open().catch((err) => {
  console.error('Failed to open IndexedDB:', err);
  // Fallback: App still works without local storage
});

// === CORE FUNCTIONS ===

/**
 * Save a post locally after successful server creation
 * @param {Object} post - Post data from server
 * @returns {Promise<number>} Local ID
 */
export async function savePostLocally(post) {
  try {
    const localId = await db.myPosts.add({
      postId: post.id,
      content: post.content,
      fake_region: post.fake_region,
      createdAt: post.created_at || new Date().toISOString(),
      synced: true,
    });
    return localId;
  } catch (error) {
    console.error('Failed to save post locally:', error);
    // Non-blocking error - app continues working
    return null;
  }
}

/**
 * Get all locally stored posts
 * @returns {Promise<Array>} Array of local posts
 */
export async function getLocalPosts() {
  try {
    const posts = await db.myPosts
      .orderBy('createdAt')
      .reverse()
      .toArray();
    return posts;
  } catch (error) {
    console.error('Failed to retrieve local posts:', error);
    return [];
  }
}

/**
 * Get count of local posts (for warning)
 * @returns {Promise<number>} Number of posts
 */
export async function getLocalPostCount() {
  try {
    return await db.myPosts.count();
  } catch (error) {
    console.error('Failed to count local posts:', error);
    return 0;
  }
}

/**
 * Clear all local data (with user confirmation)
 * @returns {Promise<boolean>} Success status
 */
export async function clearLocalData() {
  try {
    await db.myPosts.clear();
    await db.settings.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear local data:', error);
    return false;
  }
}

/**
 * Check if browser supports IndexedDB
 * @returns {boolean}
 */
export function isIndexedDBSupported() {
  return typeof indexedDB !== 'undefined';
}
