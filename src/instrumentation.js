export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        return
    }
    try {
        const { default: run } = await import('~/lib/mongodb/db')
        await run()
    } catch (error) {
        console.error('Mongo instrumentation ping failed:', error)
    }
}