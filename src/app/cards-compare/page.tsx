// Temporary: side-by-side card style candidates. Delete after choosing.
const styles = [
  ['card-ink', 'A. Hairline: 1px border, 8px radius'],
  ['rounded-xl bg-card', 'B. Tonal light: card fill, no border'],
  ['rounded-md bg-card shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.08)]', 'C. Inset edge: tone + 1px inset ring, 6px radius'],
  ['card-quiet', 'D. Tonal dark: muted fill, no border'],
  ['border-t border-border/80', 'E. No box: rule-separated sections'],
] as const;

function Sample({ cls }: { cls: string }) {
  return (
    <div className="space-y-4">
      <div className={`${cls} p-5`}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Membership</p>
        <h3 className="font-teko text-2xl uppercase leading-none mt-1">Crate Notes</h3>
        <p className="mt-3"><span className="font-teko text-3xl">$5.50</span><span className="text-muted-foreground">/month</span></p>
        <p className="mt-3 text-sm text-muted-foreground">Get the notes behind each weekly playlist.</p>
        <div className="mt-4 border-t border-border/60 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span>Membership</span><span>$5.00</span></div>
          <div className="flex justify-between"><span>Service fee</span><span>$0.50</span></div>
          <div className="flex justify-between font-semibold"><span>Total per month</span><span>$5.50</span></div>
        </div>
        <button className="mt-5 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Join Crate Keeper</button>
      </div>
      <div className={`${cls} flex gap-4 p-4`}>
        <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">@cratekeeper / Apr 3</p>
          <p className="mt-1 font-semibold">Sunday Morning Selects</p>
          <p className="text-sm text-muted-foreground">A public playlist for slow starts.</p>
        </div>
      </div>
      <div className={`${cls} p-5`}>
        <div className="flex items-center justify-between"><p className="font-semibold">Launch checklist</p><span className="text-xs text-muted-foreground">0 of 5 done</span></div>
        <div className="mt-3 h-1 rounded bg-primary/20"><div className="h-1 w-1/5 rounded bg-primary" /></div>
        <ul className="mt-4 space-y-2 text-sm"><li>Create your free profile</li><li className="text-muted-foreground">Prepare and preview your offer</li><li className="text-muted-foreground">Start Curator Pro</li></ul>
      </div>
    </div>
  );
}

export default function CardsComparePage() {
  return (
    <main className="mx-auto max-w-[1700px] p-10">
      <h1 className="font-teko text-4xl uppercase">Card candidates</h1>
      <div className="mt-8 grid grid-cols-5 gap-8">
        {styles.map(([cls, label]) => (
          <section key={cls}>
            <p className="mb-4 text-sm text-muted-foreground">{label}</p>
            <Sample cls={cls} />
          </section>
        ))}
      </div>
      <div className="dark mt-16 rounded-2xl bg-background p-10 text-foreground">
        <div className="grid grid-cols-5 gap-8">
          {styles.map(([cls]) => <Sample key={cls} cls={cls} />)}
        </div>
      </div>
    </main>
  );
}
