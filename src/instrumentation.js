import run from '~/lib/mongodb/db'

export async function register() {
    await run().catch(console.dir)
}