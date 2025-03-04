import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'  // Fix the import path

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error during auth callback:', error.message)
        navigate('/login?error=Unable to verify email')
      } else {
        // Successful email confirmation
        navigate('/dashboard?message=Email confirmed')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
        <p>Please wait while we confirm your email address.</p>
      </div>
    </div>
  )
} 