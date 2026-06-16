export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        return
    }
    const { default: run } = await import('~/lib/mongodb/db')
    await run().catch(console.dir)
}