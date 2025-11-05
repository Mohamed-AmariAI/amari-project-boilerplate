import { createClient } from './server'

/**
 * Creates a new shipment request entry in the database
 * @param title - Title of the shipment request
 * @param description - Optional description
 * @param userId - Authenticated user's ID
 * @returns Object with success status and either the created ID or error message
 */
export async function createShipmentRequest(
  title: string,
  description: string | undefined,
  userId: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('shipment_requests')
      .insert({
        title,
        description: description || null,
        status: 'pending',
        user_id: userId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create shipment request',
      }
    }

    if (!data || !data.id) {
      return {
        success: false,
        error: 'No ID returned from database',
      }
    }

    return {
      success: true,
      id: data.id,
    }
  } catch (err) {
    console.error('Unexpected error creating shipment request:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}
