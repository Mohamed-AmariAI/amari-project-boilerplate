'use client'

import { useState } from 'react'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    setIsLoading(true)

    try {
      const result = await signOut()

      if (result?.error) {
        toast.error(result.error)
        setIsLoading(false)
      }
      // If successful, the action will redirect automatically
    } catch (error) {
      toast.error('Failed to sign out')
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isLoading}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
