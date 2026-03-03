import { supabase } from './supabaseClient';

const BUCKET = 'crm-attachments';

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  if (!data?.user?.id) {
    throw new Error('Your session has expired. Please log in again.');
  }

  return data.user.id;
}

export async function listEntityAttachments(entityType, entityId) {
  const { data, error } = await supabase
    .from('attachments')
    .select('id, file_name, storage_path, created_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const attachments = data || [];
  const withUrls = await Promise.all(
    attachments.map(async (attachment) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(attachment.storage_path, 60 * 60);

      if (signedError) {
        throw signedError;
      }

      return {
        ...attachment,
        downloadUrl: signedData.signedUrl
      };
    })
  );

  return withUrls;
}

export async function uploadEntityAttachment({ entityType, entityId, file }) {
  const ownerId = await getAuthenticatedUserId();
  const safeFileName = file.name.replace(/\s+/g, '_');
  const uniquePart = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = `${entityType}/${entityId}/${uniquePart}_${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: insertError } = await supabase
    .from('attachments')
    .insert({
      owner_id: ownerId,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      storage_path: storagePath
    })
    .select('id')
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  return data.id;
}

export async function deleteEntityAttachment({ attachmentId, storagePath }) {
  const { error: deleteMetaError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteMetaError) {
    throw deleteMetaError;
  }

  const { error: deleteStorageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  if (deleteStorageError) {
    throw deleteStorageError;
  }
}
