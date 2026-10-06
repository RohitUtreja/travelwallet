'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useWallet } from '@/lib/useWallet'
import BottomNav from '@/components/BottomNav'
import PageHeader from '@/components/PageHeader'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { LinkButton } from '@/components/ui/Button'
import MonthNav from '@/components/wallet/MonthNav'
import Overview from '@/components/wallet/Overview'
import ExpensesPanel from '@/components/wallet/ExpensesPanel'
import BalancesPanel from '@/components/wallet/BalancesPanel'
import ManagePanel from '@/components/wallet/ManagePanel'

const TYPE_LABEL = { personal: 'Personal', family: 'Family', split: 'Split' }

export default function WalletPage() {
  const { id } = useParams()
  const w = useWallet(id)
  const now = new Date()
  const [month, setMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [tab, setTab] = useState('overview')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const bump = () => setReloadKey((n) => n + 1)
    window.addEventListener('fw:expenses-changed', bump)
    return () => window.removeEventListener('fw:expenses-changed', bump)
  }, [])

  if (w.loading || !w.group) {
    return (
      <div className="page"><PageHeader back="/groups" title=" " />
        <div className="flex flex-col gap-4 px-5 py-6"><Skeleton className="h-12" /><Skeleton className="h-44" /><Skeleton className="h-28" /></div>
      </div>
    )
  }
  if (w.error) return <div className="page p-6 text-coral" role="alert">{w.error}</div>

  const { group, members, user } = w
  const isSplit = group.type === 'split'
  const common = { group, members, user, month, reloadKey, isAdmin: w.isAdmin, canWrite: w.canWrite }

  return (
    <div className="page pb-32">
      <Tabs selectedKey={tab} onSelectionChange={setTab}>
        <div className="sticky top-0 z-30 bg-shell">
          <PageHeader back="/groups" eyebrow={`${TYPE_LABEL[group.type]} · ${group.currency}`} title={group.name} sticky={false}>
            {w.canWrite && (
              <LinkButton href={`/groups/${id}/add`} size="sm" className="hidden sm:inline-flex"><Plus aria-hidden size={16} /> Add</LinkButton>
            )}
          </PageHeader>
          <TabList aria-label="Wallet sections" className="bg-shell/90 backdrop-blur-xl">
            <Tab id="overview">Overview</Tab>
            <Tab id="expenses">Expenses</Tab>
            {isSplit && <Tab id="balances">Balances</Tab>}
            <Tab id="manage">{group.type === 'personal' ? 'Settings' : 'Manage'}</Tab>
          </TabList>
        </div>

        {(tab === 'overview' || tab === 'expenses') && (
          <div className="px-5 pt-5"><MonthNav value={month} onChange={setMonth} /></div>
        )}

        <TabPanel id="overview"><Overview {...common} /></TabPanel>
        <TabPanel id="expenses"><ExpensesPanel {...common} /></TabPanel>
        {isSplit && <TabPanel id="balances"><BalancesPanel {...common} /></TabPanel>}
        <TabPanel id="manage"><ManagePanel {...common} reload={w.reload} /></TabPanel>
      </Tabs>
      <BottomNav />
    </div>
  )
}
