import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type { Conversation, Message } from '@/types/message';

const CONVERSATIONS = 'conversations';
const MESSAGES = 'messages';

// ---------- Subscriptions ----------

export function subscribeToConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  const q = query(
    collection(db, CONVERSATIONS),
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Conversation[];
    callback(conversations);
  });
}

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  messageLimit = 50
): () => void {
  const q = query(
    collection(db, CONVERSATIONS, conversationId, MESSAGES),
    orderBy('timestamp', 'desc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .reverse() as Message[];
    callback(messages);
  });
}

// ---------- Load older messages (pagination) ----------

export async function loadOlderMessages(
  conversationId: string,
  beforeTimestamp: Timestamp,
  messageLimit = 30
): Promise<Message[]> {
  const q = query(
    collection(db, CONVERSATIONS, conversationId, MESSAGES),
    orderBy('timestamp', 'desc'),
    startAfter(beforeTimestamp),
    limit(messageLimit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
    .reverse();
}

// ---------- Send message ----------

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  text: string,
  participants: string[],
  imageUrl?: string | null
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed && !imageUrl) return;

  // Add message to subcollection
  const messageData: Record<string, unknown> = {
    senderId,
    senderName,
    text: trimmed,
    timestamp: serverTimestamp(),
    readBy: [senderId],
  };
  if (imageUrl) {
    messageData.imageUrl = imageUrl;
  }
  await addDoc(collection(db, CONVERSATIONS, conversationId, MESSAGES), messageData);

  // Build unread increment for all participants except sender
  const unreadUpdates: Record<string, ReturnType<typeof increment>> = {};
  for (const uid of participants) {
    if (uid !== senderId) {
      unreadUpdates[`unreadCount.${uid}`] = increment(1);
    }
  }

  // Update conversation metadata
  const previewText = imageUrl
    ? (trimmed ? trimmed : 'Sent a photo')
    : trimmed;
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    lastMessage: {
      text: previewText.length > 100 ? previewText.slice(0, 100) + '...' : previewText,
      senderId,
      senderName,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
    ...unreadUpdates,
  });
}

// ---------- Mark as read ----------

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    [`unreadCount.${userId}`]: 0,
  });

  // Also mark individual messages as read by this user
  const recentQ = query(
    collection(db, CONVERSATIONS, conversationId, MESSAGES),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(recentQ);
  const batch = writeBatch(db);
  let updates = 0;

  for (const msgDoc of snapshot.docs) {
    const data = msgDoc.data();
    if (!data.readBy?.includes(userId)) {
      batch.update(msgDoc.ref, { readBy: arrayUnion(userId) });
      updates++;
    }
  }

  if (updates > 0) {
    await batch.commit();
  }
}

// ---------- Create conversation ----------

export async function findExisting1on1(
  userId: string,
  otherUserId: string
): Promise<Conversation | null> {
  // Query for conversations where current user is a participant
  const q = query(
    collection(db, CONVERSATIONS),
    where('type', '==', '1:1'),
    where('participants', 'array-contains', userId)
  );

  const snapshot = await getDocs(q);

  // Check if other user is also a participant
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.participants.includes(otherUserId)) {
      return { id: doc.id, ...data } as Conversation;
    }
  }

  return null;
}

export async function createConversation(
  type: '1:1' | 'group',
  participants: string[],
  participantNames: Record<string, string>,
  createdBy: string,
  groupName?: string
): Promise<string> {
  // For 1:1, check if conversation already exists
  if (type === '1:1' && participants.length === 2) {
    const existing = await findExisting1on1(participants[0], participants[1]);
    if (existing) return existing.id;
  }

  // For groups, check if an identical group already exists
  if (type === 'group') {
    const existing = await findExistingGroup(participants, createdBy);
    if (existing) return existing.id;
  }

  // Initialize unread count for all participants
  const unreadCount: Record<string, number> = {};
  for (const uid of participants) {
    unreadCount[uid] = 0;
  }

  const docRef = await addDoc(collection(db, CONVERSATIONS), {
    type,
    participants,
    participantNames,
    groupName: groupName || null,
    lastMessage: null,
    unreadCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });

  return docRef.id;
}

// ---------- Group management ----------

export async function addParticipant(
  conversationId: string,
  userId: string,
  userName: string,
  currentParticipants: string[]
): Promise<void> {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    participants: [...currentParticipants, userId],
    [`participantNames.${userId}`]: userName,
    [`unreadCount.${userId}`]: 0,
  });
}

// ---------- Find existing group by exact participants ----------

export async function findExistingGroup(
  participants: string[],
  asUser?: string
): Promise<Conversation | null> {
  if (participants.length < 2) return null;

  // Query groups containing the requesting user (or first participant)
  // Must use a participant in the query to satisfy Firestore security rules
  const queryUser = asUser || participants[0];
  const q = query(
    collection(db, CONVERSATIONS),
    where('type', '==', 'group'),
    where('participants', 'array-contains', queryUser)
  );

  const snapshot = await getDocs(q);

  // Check for exact participant match (same members, same count)
  const sorted = [...participants].sort();
  for (const d of snapshot.docs) {
    const data = d.data();
    const docParticipants = [...(data.participants as string[])].sort();
    if (
      docParticipants.length === sorted.length &&
      docParticipants.every((p, i) => p === sorted[i])
    ) {
      return { id: d.id, ...data } as Conversation;
    }
  }

  return null;
}

// ---------- Find or create job-linked chat ----------

export async function findOrCreateJobChat(
  jobId: string,
  participants: string[],
  participantNames: Record<string, string>,
  createdBy: string,
  groupName: string
): Promise<string> {
  // Look for existing conversation linked to this job
  // Must include array-contains for current user to satisfy Firestore security rules
  const q = query(
    collection(db, CONVERSATIONS),
    where('jobId', '==', jobId),
    where('participants', 'array-contains', createdBy)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existing = snapshot.docs[0];
    const data = existing.data();
    const existingParticipants = data.participants as string[];

    // Sync participants — add any new crew members
    const newMembers = participants.filter((p) => !existingParticipants.includes(p));
    if (newMembers.length > 0) {
      const updates: Record<string, unknown> = {
        participants: [...existingParticipants, ...newMembers],
      };
      for (const uid of newMembers) {
        updates[`participantNames.${uid}`] = participantNames[uid] || 'Unknown';
        updates[`unreadCount.${uid}`] = 0;
      }
      await updateDoc(existing.ref, updates);
    }

    return existing.id;
  }

  // Create new job-linked group conversation
  const unreadCount: Record<string, number> = {};
  for (const uid of participants) {
    unreadCount[uid] = 0;
  }

  const docRef = await addDoc(collection(db, CONVERSATIONS), {
    type: 'group',
    participants,
    participantNames,
    groupName,
    jobId,
    lastMessage: null,
    unreadCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });

  return docRef.id;
}

export async function updateGroupName(
  conversationId: string,
  groupName: string
): Promise<void> {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), { groupName });
}

// ---------- Find or create request-linked chat ----------

export async function findOrCreateRequestChat(
  requestId: string,
  requestType: 'labor' | 'service',
  participants: string[],
  participantNames: Record<string, string>,
  createdBy: string,
  groupName: string
): Promise<string> {
  // Look for existing conversation linked to this request
  const q = query(
    collection(db, CONVERSATIONS),
    where('requestId', '==', requestId),
    where('participants', 'array-contains', createdBy)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existing = snapshot.docs[0];
    const data = existing.data();
    const existingParticipants = data.participants as string[];

    // Sync participants — add any new members
    const newMembers = participants.filter((p) => !existingParticipants.includes(p));
    if (newMembers.length > 0) {
      const updates: Record<string, unknown> = {
        participants: [...existingParticipants, ...newMembers],
      };
      for (const uid of newMembers) {
        updates[`participantNames.${uid}`] = participantNames[uid] || 'Unknown';
        updates[`unreadCount.${uid}`] = 0;
      }
      await updateDoc(existing.ref, updates);
    }

    return existing.id;
  }

  // Create new request-linked group conversation
  const unreadCount: Record<string, number> = {};
  for (const uid of participants) {
    unreadCount[uid] = 0;
  }

  const docRef = await addDoc(collection(db, CONVERSATIONS), {
    type: participants.length > 2 ? 'group' : '1:1',
    participants,
    participantNames,
    groupName: participants.length > 2 ? groupName : null,
    requestId,
    requestType,
    lastMessage: null,
    unreadCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });

  return docRef.id;
}

// ---------- Delete request-linked chat ----------

export async function deleteRequestChat(
  requestId: string,
  userId: string
): Promise<void> {
  const q = query(
    collection(db, CONVERSATIONS),
    where('requestId', '==', requestId),
    where('participants', 'array-contains', userId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  for (const convDoc of snapshot.docs) {
    const messagesSnap = await getDocs(
      collection(db, CONVERSATIONS, convDoc.id, MESSAGES)
    );
    const batch = writeBatch(db);
    messagesSnap.docs.forEach((msgDoc) => batch.delete(msgDoc.ref));
    if (messagesSnap.docs.length > 0) {
      await batch.commit();
    }
    await deleteDoc(convDoc.ref);
  }
}

// ---------- Delete job-linked chat ----------

export async function deleteJobChat(
  jobId: string,
  userId: string
): Promise<void> {
  // Find conversation linked to this job
  const q = query(
    collection(db, CONVERSATIONS),
    where('jobId', '==', jobId),
    where('participants', 'array-contains', userId)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  for (const convDoc of snapshot.docs) {
    // Delete all messages in the subcollection first
    const messagesSnap = await getDocs(
      collection(db, CONVERSATIONS, convDoc.id, MESSAGES)
    );
    const batch = writeBatch(db);
    messagesSnap.docs.forEach((msgDoc) => batch.delete(msgDoc.ref));
    if (messagesSnap.docs.length > 0) {
      await batch.commit();
    }

    // Delete the conversation document
    await deleteDoc(convDoc.ref);
  }
}

// ---------- Delete conversation ----------

export async function deleteConversation(
  conversationId: string
): Promise<void> {
  // Delete all messages in the subcollection first
  const messagesSnap = await getDocs(
    collection(db, CONVERSATIONS, conversationId, MESSAGES)
  );

  // Batch delete in chunks of 500 (Firestore limit)
  const docs = messagesSnap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    docs.slice(i, i + 500).forEach((msgDoc) => batch.delete(msgDoc.ref));
    await batch.commit();
  }

  // Delete the conversation document
  await deleteDoc(doc(db, CONVERSATIONS, conversationId));
}

// ---------- Archive conversation ----------

export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    archivedBy: arrayUnion(userId),
  });
}

export async function unarchiveConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, CONVERSATIONS, conversationId), {
    archivedBy: arrayRemove(userId),
  });
}

// ---------- Reactions ----------

export async function toggleReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const msgRef = doc(db, CONVERSATIONS, conversationId, MESSAGES, messageId);
  const msgSnap = await getDoc(msgRef);

  if (!msgSnap.exists()) return;

  const data = msgSnap.data();
  const reactions: Record<string, string[]> = data.reactions || {};
  const users = reactions[emoji] || [];

  if (users.includes(userId)) {
    // Remove reaction
    const updated = users.filter((uid) => uid !== userId);
    if (updated.length === 0) {
      // Remove the emoji key entirely
      const { [emoji]: _, ...rest } = reactions;
      await updateDoc(msgRef, { reactions: rest });
    } else {
      await updateDoc(msgRef, { [`reactions.${emoji}`]: updated });
    }
  } else {
    // Add reaction
    await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(userId) });
  }
}

// ---------- Get total unread count ----------

export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const q = query(
    collection(db, CONVERSATIONS),
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, (snapshot) => {
    let total = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      total += data.unreadCount?.[userId] || 0;
    }
    callback(total);
  });
}
