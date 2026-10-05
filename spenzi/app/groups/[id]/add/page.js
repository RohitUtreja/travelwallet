'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@/lib/useWallet'
import ExpenseForm from '@/components/ExpenseForm'
import { Spinner } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export default function AddExpensePage() {
  const { id } = useParams()
  const router = useRouter()
  const { show } = useToast()
  const { group, members, user, loading, canWrite } = useWallet(id, { applyRecurring: false })

  useEffect(() => {
    if (!loading && group && !canWrite) {
      show('You have view-only access to this wallet', { type: 'error' })
      router.replace(`/groups/${id}`)
    }
  }, [loading, group, canWrite, id, router, show])

  if (loading || !group || !canWrite) {
    return <div className="flex min-h-dvh items-center justify-center text-gold"><Spinner className="h-7 w-7" /></div>
  }
  return <ExpenseForm group={group} members={members} user={user} />
}
