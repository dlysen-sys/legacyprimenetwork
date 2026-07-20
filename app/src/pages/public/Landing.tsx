import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Logo } from '../../components/Logo'

export function Landing() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-24 text-center">
      <div className="flex justify-center mb-8">
        <Logo size={64} withWord={false} />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-fg text-balance">
        Legacy<span className="text-accent">Prime</span>
      </h1>
      <p className="mt-4 text-muted max-w-xl mx-auto">
        A tiered (70 / 100 / 200 USDT) affiliate protocol on BNB Smart Chain — referral tree, global
        one-line, and an 8-way distribution with a 4× earnings cap.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link to="/login"><Button>Get started</Button></Link>
        <Link to="/dashboard"><Button variant="outline">Open dashboard</Button></Link>
      </div>
    </section>
  )
}
